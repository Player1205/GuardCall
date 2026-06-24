import { useState, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket.js';
import { useSessionContext } from '../context/SessionContext.jsx';
import { useAudioCapture } from './useAudioCapture.js';
import { v4 as uuidv4 } from 'uuid'; // Need to add uuid to client deps if not there, or use crypto.randomUUID

export const useSession = () => {
  const { socket, isConnected } = useSocket();
  const { callerNumber, sessionActive, setSessionActive, sessionId, setSessionId } = useSessionContext();
  const { startRecording, stopRecording, isRecording, permissionError } = useAudioCapture(socket);

  const [transcript, setTranscript] = useState('');
  const [riskData, setRiskData] = useState({ risk: 0, signal: '', coaching: '', peakRiskScore: 0 });
  const [reportResult, setReportResult] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('transcript:update', (text) => {
      setTranscript(text);
    });

    socket.on('risk:update', (data) => {
      setRiskData(data);
    });

    socket.on('report:ready', (data) => {
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
    
    // In a real app we'd have the real userId from auth
    const userId = "anonymous-or-logged-in-user-id"; 
    
    socket.emit('session:start', { callerNumber, sessionId: newSessionId, userId });
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
    permissionError
  };
};
