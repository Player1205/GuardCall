import { useState, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export const useAudioCapture = (socket: Socket | null) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
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

      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus' 
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socket) {
          socket.emit('audio:chunk', event.data);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);

    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      setPermissionError(err.message || 'Microphone access denied.');
      setHasPermission(false);
    }
  }, [socket]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [isRecording]);

  return { 
    startRecording, 
    stopRecording, 
    isRecording, 
    hasPermission, 
    permissionError 
  };
};
