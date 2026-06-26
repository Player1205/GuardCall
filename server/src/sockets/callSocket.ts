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
  let dgReady = false;
  let pendingChunks: Buffer[] = [];

  socket.on('session:start', async ({ callerNumber, sessionId, userId }) => {
    logger.info(`Session started: ${sessionId}`);

    // Clean up any previous session before starting a new one
    cleanup();

    let isAborted = false;
    
    // Store the cleanup flag on the socket or a local function so cleanup can access it
    const currentCleanup = () => {
      isAborted = true;
    };
    
    // We need to attach this specific session's cleanup to the socket's general cleanup
    // We can just use the outer variable, but wait, the socket has multiple events.
    // Let's just track the active session ID.
    const currentSessionId = sessionId;
    sessionData = { callerNumber, sessionId, userId, peakRiskScore: 0 };
    rollingTranscript = '';
    peakRiskScore = 0;
    dgReady = false;
    pendingChunks = [];

    try {
      const conn = await setupDeepgram((transcriptChunk: string) => {
        // Only process if this is still the active session
        if (sessionData?.sessionId !== currentSessionId) return;
        
        rollingTranscript += transcriptChunk + ' ';

        const words = rollingTranscript.split(' ');
        if (words.length > 400) {
          rollingTranscript = words.slice(words.length - 400).join(' ');
        }

        socket.emit('transcript:update', rollingTranscript);
      });

      // If the session was cleared or changed while we were waiting for setupDeepgram, abort
      if (!sessionData || sessionData.sessionId !== currentSessionId) {
        if (conn) {
           try { conn.close(); } catch (e) {}
        }
        return;
      }

      if (conn) {
        dgConnection = conn;
        dgReady = true;

        // Flush any audio chunks that arrived while we were connecting
        for (const chunk of pendingChunks) {
          try {
            dgConnection.sendMedia(chunk);
          } catch (e: any) {
            logger.error('Error flushing buffered audio chunk', { error: e.message });
          }
        }
        pendingChunks = [];
        logger.info('Deepgram connection ready, buffered chunks flushed');
      } else {
        logger.error('Deepgram setup returned null — transcription will be unavailable for this session');
        socket.emit('error:deepgram', { message: 'Speech-to-text service is unavailable. Please try again.' });
      }
    } catch (error: any) {
      logger.error('Error during Deepgram setup in session:start', { error: error.message });
      socket.emit('error:deepgram', { message: 'Speech-to-text service encountered an error.' });
    }

    riskScoreInterval = setInterval(async () => {
      if (rollingTranscript.trim().length > 10) {
        try {
          const { risk, signal, coaching } = await scoreRisk(rollingTranscript);

          if (risk > peakRiskScore) {
            peakRiskScore = risk;
          }

          socket.emit('risk:update', { risk, signal, coaching, peakRiskScore });
        } catch (e: any) {
          logger.error('Error scoring risk', { error: e.message });
        }
      }
    }, 10000);
  });

  socket.on('audio:chunk', (chunk: Buffer) => {
    if (dgReady && dgConnection) {
      try {
        dgConnection.sendMedia(chunk);
      } catch (e: any) {
        logger.error('Error sending audio chunk to Deepgram', { error: e.message });
      }
    } else {
      // Buffer chunks until Deepgram is ready (max 40 chunks ≈ 10s at 250ms intervals)
      if (pendingChunks.length < 40) {
        pendingChunks.push(chunk);
      }
    }
  });

  socket.on('session:end', async () => {
    logger.info('Session ended');
    cleanup();

    if (!sessionData) return;
    sessionData.peakRiskScore = peakRiskScore;

    try {
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
    } catch (e: any) {
      logger.error('Error during session:end processing', { error: e.message });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
    cleanup();
  });

  function cleanup() {
    if (riskScoreInterval) {
      clearInterval(riskScoreInterval);
      riskScoreInterval = null;
    }
    if (dgConnection) {
      try {
        dgConnection.close();
      } catch (e: any) {
        logger.error('Error closing Deepgram connection', { error: e.message });
      }
      dgConnection = null;
    }
    dgReady = false;
    pendingChunks = [];
    sessionData = null;
  }
};
