import { useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';
import { useSessionStore, RiskData, ReportResult } from '../store/useSessionStore';
import { useAudioCapture } from './useAudioCapture';

export type { RiskData, ReportResult };

export const useSession = () => {
  const { socket, isConnected } = useSocket();
  const {
    callerNumber,
    sessionActive,
    setSessionActive,
    setSessionId,
    transcript,
    setTranscript,
    riskData,
    setRiskData,
    reportResult,
    setReportResult,
  } = useSessionStore();
  const { startRecording, stopRecording, isRecording, permissionError } = useAudioCapture(socket, setTranscript);

  useEffect(() => {
    if (!socket) return;

    socket.on('transcript:update', (text: string) => {
      setTranscript(text);
    });

    socket.on('risk:update', (data: RiskData) => {
      setRiskData(data);
    });

    socket.on('report:ready', (data: ReportResult) => {
      setReportResult(data);
    });

    socket.on('session:safe', () => {
      setReportResult({ safe: true });
    });

    return () => {
      socket.off('transcript:update');
      socket.off('risk:update');
      socket.off('report:ready');
      socket.off('session:safe');
    };
  }, [socket, setTranscript, setRiskData, setReportResult]);

  const startSession = useCallback(async () => {
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    setReportResult(null);
    setTranscript('');
    setRiskData({ risk: 0, signal: '', coaching: '', peakRiskScore: 0 });
    
    const userId = "anonymous-or-logged-in-user-id"; 
    
    if (socket) {
      socket.emit('session:start', { callerNumber, sessionId: newSessionId, userId });
    }
    await startRecording();
    setSessionActive(true);
  }, [socket, callerNumber, setSessionId, setSessionActive, startRecording, setReportResult, setTranscript, setRiskData]);

  const endSession = useCallback(() => {
    stopRecording();
    if (socket) {
      socket.emit('session:end');
    }
    setSessionActive(false);
  }, [socket, stopRecording, setSessionActive]);

  return {
    startSession,
    endSession,
    isRecording,
    sessionActive,
    transcript,
    riskData,
    reportResult,
    permissionError,
    isConnected
  };
};
