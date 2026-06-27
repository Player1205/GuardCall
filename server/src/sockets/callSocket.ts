import { Socket, Server } from 'socket.io';
import { scoreRisk, generateReport, scrubPII } from '../services/groqService.js';
import { handleSessionEnd } from '../services/reportService.js';
import logger from '../utils/logger.js';

interface SessionData {
  callerNumber: string;
  sessionId: string;
  userId: string;
  peakRiskScore: number;
}

export const setupCallSocket = (socket: Socket, io: Server) => {
  let rollingTranscript = '';
  let peakRiskScore = 0;
  let sessionData: SessionData | null = null;
  let lastScoreTime = 0;
  let isScoring = false;

  socket.on('session:start', ({ callerNumber, sessionId, userId }) => {
    logger.info(`Session started: ${sessionId}`);

    cleanup();

    sessionData = { callerNumber, sessionId, userId, peakRiskScore: 0 };
    rollingTranscript = '';
    peakRiskScore = 0;
    lastScoreTime = 0;
    isScoring = false;
  });

  socket.on('transcript:update', async (newTranscript: string) => {
    if (!sessionData) return;
    
    rollingTranscript = newTranscript;

    // Debounce: Only score if not currently scoring AND at least 2.5s have passed
    const now = Date.now();
    if (rollingTranscript.trim().length > 10 && !isScoring && (now - lastScoreTime > 2500)) {
      isScoring = true;
      lastScoreTime = now;
      
      try {
        const { risk, signal, coaching } = await scoreRisk(rollingTranscript);

        if (risk > peakRiskScore) {
          peakRiskScore = risk;
        }

        socket.emit('risk:update', { risk, signal, coaching, peakRiskScore });
      } catch (e: any) {
        logger.error('Error scoring risk', { error: e.message });
      } finally {
        isScoring = false;
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
