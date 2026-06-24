import { DeepgramClient } from '@deepgram/sdk';
import logger from '../utils/logger.js';

export const setupDeepgram = async (onTranscript: (transcript: string) => void) => {
  try {
    const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY || '' });
    
    // @ts-expect-error Deepgram SDK types are incorrect here and require Authorization
    const connection = await deepgram.listen.v1.connect({
      model: 'nova-2',
      language: 'hi', 
      smart_format: "true",
      encoding: 'webm', 
    });

    connection.on('open', () => {
      logger.info('Deepgram connection opened');
    });

    connection.on('message', (data: any) => {
      if (data.type === "Results") {
        const transcript = data.channel?.alternatives[0]?.transcript;
        if (transcript) {
          onTranscript(transcript);
        }
      }
    });
      
    connection.on('error', (err: any) => {
      logger.error('Deepgram error:', { error: err });
    });

    connection.connect();
    await connection.waitForOpen();

    return connection;
  } catch (error: any) {
    logger.error('Failed to setup Deepgram', { error: error.message });
    return null;
  }
};
