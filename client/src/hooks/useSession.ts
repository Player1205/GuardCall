import { useState, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';
import { useSessionStore } from '../store/useSessionStore';
import { useAudioCapture } from './useAudioCapture';

export interface RiskData {
  risk: number;
  signal: string;
  coaching: string;
  peakRiskScore: number;
}

export interface ReportResult {
  safe?: boolean;
  report?: any; // replace with proper report type
}

export const useSession = () => {
  const { socket, isConnected } = useSocket();
  const { callerNumber, sessionActive, setSessionActive, setSessionId } = useSessionStore();
  const { startRecording, stopRecording, isRecording, permissionError } = useAudioCapture(socket);

  const [transcript, setTranscript] = useState<string>('');
  const [riskData, setRiskData] = useState<RiskData>({ risk: 0, signal: '', coaching: '', peakRiskScore: 0 });
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('transcript:update', (text: string) => {
      setTranscript(text);
    });

    socket.on('risk:update', (data: RiskData) => {
      setRiskData(data);
    });

    socket.on('report:ready', (data: { report: any }) => {
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
  }, [socket]);

  const startSession = useCallback(async () => {
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    
    const userId = "anonymous-or-logged-in-user-id"; 
    
    if (socket) {
      socket.emit('session:start', { callerNumber, sessionId: newSessionId, userId });
    }
    await startRecording();
    setSessionActive(true);
  }, [socket, callerNumber, setSessionId, setSessionActive, startRecording]);

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
