import { useState, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { DeepgramClient } from '@deepgram/sdk';

const API_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') 
  : 'http://localhost:5000';

export const useAudioCapture = (socket: Socket | null, setTranscript: (transcript: string) => void) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dgSocketRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  const startRecording = useCallback(async () => {
    try {
      // Deepgram WebSocket Connectivity:
      // To secure API credentials, temporary JWT access tokens are retrieved from our proxy backend.
      // The browser never exposes the permanent Deepgram API key.
      const response = await fetch(`${API_URL}/api/deepgram/token`);
      const data = await response.json();
      if (!data.token) throw new Error('Could not get Deepgram token');

      // Microphone Capture Configuration:
      // Uses the browser's `getUserMedia` API to capture hardware microphone input.
      // Echo-cancellation and noise-suppression are explicitly disabled to pass raw ambient audio
      // to Deepgram for better multi-speaker background parsing, while keeping auto-gain control to normalize volume.
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

      const dgClient = new DeepgramClient({ accessToken: data.token });
      
      // Deepgram Listen Connection Configuration:
      // Configures the live transcription model. We use the advanced `nova-2` model tailored for Hindi/English 
      // (`hi` language script). `interim_results` are enabled to provide immediate streaming feedback before the sentence ends.
      const dgConnection = await dgClient.listen.v1.connect({
        model: 'nova-2',
        language: 'hi',
        smart_format: 'true',
        interim_results: 'true',
        vad_events: 'true'
      });
      
      dgSocketRef.current = dgConnection as any;

      dgConnection.on('open', () => {
        const mediaRecorder = new MediaRecorder(stream, { 
          mimeType: 'audio/webm;codecs=opus' 
        });
        
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && dgConnection.readyState === 1) {
            dgConnection.sendMedia(event.data);
          }
        };

        // 250ms Interval Recording Buffer:
        // We configure the MediaRecorder to slice and emit WebM/Opus audio blobs every 250 milliseconds.
        // This frequent packetization feeds the live stream aggressively to achieve ultra-low latency transcription.
        mediaRecorder.start(250);
        setIsRecording(true);
      });

      dgConnection.on('message', (received: any) => {
        if (received.type === 'Results' && received.channel?.alternatives?.[0]) {
          const transcript = received.channel.alternatives[0].transcript;
          if (transcript && received.is_final) {
            transcriptRef.current += transcript + ' ';
            
            // Rolling Word Window Slicing:
            // LLMs have token limits and processing long transcripts causes latency spikes.
            // We maintain a rolling buffer of exactly the last 400 words. This keeps the prompt size optimal
            // for the risk analysis engine while maintaining enough context to detect long-con scams.
            const words = transcriptRef.current.split(' ');
            if (words.length > 400) {
              transcriptRef.current = words.slice(words.length - 400).join(' ');
            }
            
            // Send updated transcript to backend for risk scoring
            if (socket) {
              socket.emit('transcript:update', transcriptRef.current);
            }
            setTranscript(transcriptRef.current);
          } else if (transcript) {
            // Show interim results on screen without emitting to backend
            setTranscript(transcriptRef.current + transcript);
          }
        }
      });

      dgConnection.on('error', (error: any) => {
        console.error('Deepgram WebSocket Error', error);
      });

      dgConnection.connect();

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Microphone access denied.';
      console.error('Error accessing microphone:', err);
      setPermissionError(message);
      setHasPermission(false);
    }
  }, [socket, setTranscript]);

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
      if (typeof dgSocketRef.current.sendCloseStream === 'function') {
        dgSocketRef.current.sendCloseStream({ type: 'CloseStream' });
      }
      if (dgSocketRef.current.close) {
        dgSocketRef.current.close();
      }
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
