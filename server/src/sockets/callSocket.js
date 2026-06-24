import { setupDeepgram } from '../services/deepgramService.js';
import { scoreRisk, generateReport, scrubPII } from '../services/groqService.js';
import { handleSessionEnd } from '../services/reportService.js';

export const setupCallSocket = (socket, io) => {
  let rollingTranscript = '';
  let peakRiskScore = 0;
  let sessionData = null;
  let riskScoreInterval = null;
  let dgConnection = null;

  socket.on('session:start', ({ callerNumber, sessionId, userId }) => {
    console.log(`Session started: ${sessionId}`);
    sessionData = { callerNumber, sessionId, userId };
    rollingTranscript = '';
    peakRiskScore = 0;

    // Setup Deepgram stream
    dgConnection = setupDeepgram((transcriptChunk) => {
      rollingTranscript += transcriptChunk + ' ';
      
      // Keep last 120 seconds of text approx (let's say ~400 words)
      const words = rollingTranscript.split(' ');
      if (words.length > 400) {
        rollingTranscript = words.slice(words.length - 400).join(' ');
      }
      
      socket.emit('transcript:update', rollingTranscript);
    });

    // Score risk every 10 seconds
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

  socket.on('audio:chunk', (chunk) => {
    if (dgConnection && dgConnection.getReadyState() === 1 /* OPEN */) {
      dgConnection.send(chunk);
    }
  });

  socket.on('session:end', async () => {
    console.log('Session ended');
    cleanup();

    if (!sessionData) return;
    sessionData.peakRiskScore = peakRiskScore;

    if (peakRiskScore < 40) {
      await handleSessionEnd(sessionData, null);
      socket.emit('session:safe');
    } else {
      // Scrub PII before reporting
      const scrubbedTranscript = await scrubPII(rollingTranscript);
      const reportContent = await generateReport(
        scrubbedTranscript, 
        peakRiskScore, 
        sessionData.callerNumber, 
        "Unknown" // Can track duration based on session start/end
      );

      const savedReport = await handleSessionEnd(sessionData, reportContent);

      socket.emit('report:ready', {
        requiresConfirmation: peakRiskScore < 70,
        report: savedReport
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    cleanup();
  });

  function cleanup() {
    if (riskScoreInterval) clearInterval(riskScoreInterval);
    if (dgConnection) {
      try {
        dgConnection.requestClose();
      } catch (e) {
        console.error('Error closing deepgram:', e);
      }
    }
  }
};
