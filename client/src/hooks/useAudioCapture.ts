import { useState, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useAudioCapture = (socket: Socket | null) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dgSocketRef = useRef<WebSocket | null>(null);
  const transcriptRef = useRef<string>('');

  const startRecording = useCallback(async () => {
    try {
      // Fetch temporary Deepgram token from our backend
      const response = await fetch(`${API_URL}/api/deepgram/token`);
      const data = await response.json();
      if (!data.token) throw new Error('Could not get Deepgram token');

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      setHasPermission(true);
      setPermissionError(null);
      transcriptRef.current = '';

      // Connect directly to Deepgram WebSocket
      const dgSocket = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2&language=hi&smart_format=true&interim_results=true&vad_events=true', ['token', data.token]);
      
      dgSocketRef.current = dgSocket;

      dgSocket.onopen = () => {
        const mediaRecorder = new MediaRecorder(stream, { 
          mimeType: 'audio/webm;codecs=opus' 
        });
        
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && dgSocket.readyState === WebSocket.OPEN) {
            dgSocket.send(event.data);
          }
        };

        // Emit chunks every 250ms for near-real-time streaming
        mediaRecorder.start(250);
        setIsRecording(true);
      };

      dgSocket.onmessage = (message) => {
        const received = JSON.parse(message.data);
        if (received.type === 'Results') {
          const transcript = received.channel.alternatives[0].transcript;
          if (transcript && received.is_final) {
            transcriptRef.current += transcript + ' ';
            
            // Keep a rolling window of max 400 words
            const words = transcriptRef.current.split(' ');
            if (words.length > 400) {
              transcriptRef.current = words.slice(words.length - 400).join(' ');
            }
            
            // Forward the updated transcript to the backend for AI scoring
            if (socket) {
              socket.emit('transcript:update', transcriptRef.current);
            }
          }
        }
      };

      dgSocket.onerror = (error) => {
        console.error('Deepgram WebSocket Error', error);
      };

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Microphone access denied.';
      console.error('Error accessing microphone:', err);
      setPermissionError(message);
      setHasPermission(false);
    }
  }, [socket]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (dgSocketRef.current) {
      // Send a close frame before closing connection
      if (dgSocketRef.current.readyState === WebSocket.OPEN) {
        dgSocketRef.current.send(JSON.stringify({ type: 'CloseStream' }));
      }
      dgSocketRef.current.close();
      dgSocketRef.current = null;
    }
  }, []);

  return { 
    startRecording, 
    stopRecording, 
    isRecording, 
    hasPermission, 
    permissionError 
  };
};
