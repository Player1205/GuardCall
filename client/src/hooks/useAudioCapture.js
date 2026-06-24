import { useState, useRef, useCallback } from 'react';

export const useAudioCapture = (socket) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      // NOTE: echoCancellation and noiseSuppression MUST be false — 
      // these filters remove the scammer's voice coming from the speaker
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

      // Chunk every 250ms as per Deepgram real-time best practices
      mediaRecorder.start(250);
      setIsRecording(true);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setPermissionError(err.message);
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
