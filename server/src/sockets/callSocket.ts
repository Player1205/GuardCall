import { Socket, Server } from 'socket.io';
import { scoreRisk, generateReport, scrubPII } from '../services/groqService.js';
import { handleSessionEnd } from '../services/reportService.js';
import logger from '../utils/logger.js';

interface SessionData {
  callerNumber: string;
  sessionId: string;
  userId: string;
  peakRiskScore: number;
  lastCoachingSent?: string;
}

export const setupCallSocket = (socket: Socket, io: Server) => {
  let rollingTranscript = '';
  let peakRiskScore = 0;
  let sessionData: SessionData | null = null;
  let turnStartTime = 0;
  let isScoring = false;

  let lastScoredTranscript = '';
  let lastReceivedTranscript = '';
  let turnTimer: NodeJS.Timeout | null = null;

  socket.on('session:start', ({ callerNumber, sessionId, userId }) => {
    logger.info(`Session started: ${sessionId}`);

    cleanup();

    sessionData = { callerNumber, sessionId, userId, peakRiskScore: 0 };
    rollingTranscript = '';
    lastScoredTranscript = '';
    lastReceivedTranscript = '';
    peakRiskScore = 0;
    turnStartTime = 0;
    isScoring = false;
    if (turnTimer) {
      clearTimeout(turnTimer);
      turnTimer = null;
    }
  });

  socket.on('transcript:update', async (newTranscript: string) => {
    if (!sessionData) return;
    
    // Ignore duplicate or whitespace-only updates from the STT engine
    if (newTranscript.trim() === lastReceivedTranscript.trim()) {
      return;
    }
    
    lastReceivedTranscript = newTranscript;
    rollingTranscript = newTranscript;

    // Reset turn timer — new words arrived
    if (turnTimer) {
      clearTimeout(turnTimer);
    }

    const isTranscriptChanged = rollingTranscript.trim() !== lastScoredTranscript.trim();

    if (rollingTranscript.trim().length > 10 && isTranscriptChanged) {
      const now = Date.now();
      
      // Mark the start of a continuous speaking turn
      if (turnStartTime === 0) {
        turnStartTime = now;
      }

      const triggerScore = async () => {
        if (isScoring) return;
        isScoring = true;
        
        // Reset turn timer after scoring
        turnStartTime = 0;
        lastScoredTranscript = rollingTranscript;
        
        try {
          const { risk, signal, phase, coaching } = await scoreRisk(rollingTranscript, sessionData!.lastCoachingSent || '');

          // Abort if session ended while awaiting AI response
          if (!sessionData) {
            return;
          }

          if (risk > peakRiskScore) {
            peakRiskScore = risk;
          }

          if (coaching) {
            sessionData.lastCoachingSent = coaching;
          }

          socket.emit('risk:update', { risk, signal, phase, coaching, peakRiskScore });
        } catch (e: any) {
          logger.error('Error scoring risk', { error: e.message });
        } finally {
          isScoring = false;
        }
      };

      // Check if newly spoken words contain critical triggers
      const newText = rollingTranscript.substring(lastScoredTranscript.length).toLowerCase();
      const criticalKeywords = ['arrest', 'police', 'money', 'rupees', 'account', 'otp', 'password', 'transfer', 'security', 'cbi', 'customs', 'illegal', 'warrant'];
      const hasCriticalKeyword = criticalKeywords.some(kw => newText.includes(kw));

      /**
       * ─── TURN DETECTION & SCORING DEBOUNCE LOGIC ───
       * Implements a three-stage debounce logic for transcript scoring:
       * 1. Universal Safety Net: If speaking duration exceeds 1.5 seconds, force prompt processing 
       *    to prevent huge context delay.
       * 2. Keyword Snapper: If a critical keyword ('arrest', 'police', 'money', etc.) is matched, 
       *    drop silence debounce down to 0.8 seconds to alert the victim immediately.
       * 3. Normal Debounce: Else, wait for a 1.5-second silence interval before invoking the scoring API.
       */
      if (turnStartTime > 0 && (now - turnStartTime > 1500) && !isScoring) {
        triggerScore();
      } 
      else if (hasCriticalKeyword && !isScoring) {
        turnTimer = setTimeout(triggerScore, 800);
      } 
      else {
        turnTimer = setTimeout(triggerScore, 1500);
      }
    }
  });

  /**
   * ─── SESSION FINALIZATION LOGIC ───
   * When a session ends securely or due to disconnect:
   * 1. Executes PII scrubbing on the transcript to redact sensitive data.
   * 2. Compiles a formal complaint report via Groq LLM models.
   * 3. Writes the compiled records and final peak risk scores to Mongoose DB tables.
   */
  socket.on('session:end', async () => {
    logger.info('Session ended');
    
    const activeSessionData = sessionData;
    cleanup();

    if (!activeSessionData) return;
    activeSessionData.peakRiskScore = peakRiskScore;

    try {
      if (peakRiskScore < 40) {
        await handleSessionEnd(activeSessionData, null);
        socket.emit('session:safe');
      } else {
        const scrubbedTranscript = await scrubPII(rollingTranscript);
        const reportContent = await generateReport(
          scrubbedTranscript,
          peakRiskScore,
          activeSessionData.callerNumber,
          "Unknown"
        );

        const savedReport = await handleSessionEnd(activeSessionData, reportContent);

        socket.emit('report:ready', {
          requiresConfirmation: peakRiskScore < 70,
          report: savedReport
        });
      }
    } catch (e: any) {
      logger.error('Error during session:end processing', { error: e.message });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
    cleanup();
  });

  function cleanup() {
    sessionData = null;
    isScoring = false;
  }
};
