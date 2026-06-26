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
      /**
       * CRITICAL: echoCancellation and noiseSuppression MUST be set to false.
       *
       * GuardCall records the user's phone call via the device microphone picking up
       * both sides of the conversation (the user speaking + the scammer's voice from
       * the phone speaker). If echoCancellation is enabled, the browser's audio
       * processing pipeline treats the scammer's voice as "echo" and aggressively
       * filters it out, making it inaudible to the AI transcription engine.
       * Similarly, noiseSuppression can strip out the scammer's voice as background
       * noise. Both MUST remain false so the full conversation reaches the backend
       * for accurate scam detection.
       */
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

      // Emit chunks every 250ms for near-real-time streaming
      mediaRecorder.start(250);
      setIsRecording(true);

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
  }, []);

  return { 
    startRecording, 
    stopRecording, 
    isRecording, 
    hasPermission, 
    permissionError 
  };
};
