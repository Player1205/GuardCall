import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export const setupDeepgram = (onTranscript) => {
  try {
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    
    // Create a live transcription connection
    const connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'hi', // Hindi-English mix support
      smart_format: true,
      encoding: 'webm', // Depending on client MediaRecorder
    });

    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('Deepgram connection opened');
      
      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel.alternatives[0].transcript;
        if (transcript) {
          onTranscript(transcript);
        }
      });
      
      connection.on(LiveTranscriptionEvents.Error, (err) => {
        console.error('Deepgram error:', err);
      });
    });

    return connection;
  } catch (error) {
    console.error('Failed to setup Deepgram:', error.message);
    return null;
  }
};
