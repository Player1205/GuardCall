import { Socket, Server } from 'socket.io';
import { setupDeepgram } from '../services/deepgramService.js';
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
  let riskScoreInterval: NodeJS.Timeout | null = null;
  let dgConnection: any = null;

  socket.on('session:start', ({ callerNumber, sessionId, userId }) => {
    logger.info(`Session started: ${sessionId}`);
    sessionData = { callerNumber, sessionId, userId, peakRiskScore: 0 };
    rollingTranscript = '';
    peakRiskScore = 0;

    setupDeepgram((transcriptChunk: string) => {
      rollingTranscript += transcriptChunk + ' ';
      
      const words = rollingTranscript.split(' ');
      if (words.length > 400) {
        rollingTranscript = words.slice(words.length - 400).join(' ');
      }
      
      socket.emit('transcript:update', rollingTranscript);
    }).then(conn => {
      dgConnection = conn;
    });

    riskScoreInterval = setInterval(async () => {
      if (rollingTranscript.trim().length > 10) {
        const { risk, signal, coaching } = await scoreRisk(rollingTranscript);
        
        if (risk > peakRiskScore) {
          peakRiskScore = risk;
        }

        socket.emit('risk:update', { risk, signal, coaching, peakRiskScore });
      }
    }, 10000);
  });

  socket.on('audio:chunk', (chunk: Buffer) => {
    if (dgConnection && dgConnection.socket && dgConnection.socket.readyState === 1) {
      dgConnection.socket.send(chunk);
    }
  });

  socket.on('session:end', async () => {
    logger.info('Session ended');
    cleanup();

    if (!sessionData) return;
    sessionData.peakRiskScore = peakRiskScore;

    if (peakRiskScore < 40) {
      await handleSessionEnd(sessionData, null);
      socket.emit('session:safe');
    } else {
      const scrubbedTranscript = await scrubPII(rollingTranscript);
      const reportContent = await generateReport(
        scrubbedTranscript, 
        peakRiskScore, 
        sessionData.callerNumber, 
        "Unknown"
      );

      const savedReport = await handleSessionEnd(sessionData, reportContent);

      socket.emit('report:ready', {
        requiresConfirmation: peakRiskScore < 70,
        report: savedReport
      });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
    cleanup();
  });

  function cleanup() {
    if (riskScoreInterval) clearInterval(riskScoreInterval);
    if (dgConnection) {
      try {
        dgConnection.socket.close();
      } catch (e: any) {
        logger.error('Error closing deepgram:', { error: e.message });
      }
    }
  }
};
