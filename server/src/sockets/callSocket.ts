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

    // Reset the turn timer because NEW words have arrived.
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
        
        // Reset turn start time since we just scored this chunk
        turnStartTime = 0;
        lastScoredTranscript = rollingTranscript;
        
        try {
          const { risk, signal, phase, coaching } = await scoreRisk(rollingTranscript, sessionData!.lastCoachingSent || '');

          // If the session ended while we were waiting for the AI response, safely abort
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

      // 1. Universal Safety Net: Force a score if they've been speaking continuously for 1.5 seconds
      if (turnStartTime > 0 && (now - turnStartTime > 1500) && !isScoring) {
        triggerScore();
      } 
      // 2. Keyword Snapper: If a critical keyword is spoken, reduce the silence debounce to 0.8s
      else if (hasCriticalKeyword && !isScoring) {
        turnTimer = setTimeout(triggerScore, 800);
      } 
      // 3. Normal Debounce: Wait for 1.5 seconds of silence
      else {
        turnTimer = setTimeout(triggerScore, 1500);
      }
    }
  });

  socket.on('session:end', async () => {
    logger.info('Session ended');
    
    // Save a reference to sessionData before cleanup clears it
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
