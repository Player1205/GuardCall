import express, { Request, Response, NextFunction } from 'express';
import https from 'https';
import dns from 'dns/promises';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/token', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY || '';
    if (!apiKey) {
      res.status(500).json({ message: 'Deepgram API key not configured' });
      return;
    }

    /**
     * ─── MANUAL DNS RESOLUTION PROXYING ───
     * Manually resolves the hostname (dns.resolve) to bypass intermittent DNS lookup 
     * limits and ENOTFOUND issues common on local/Windows environments.
     */
    let targetIp = '208.184.56.200';
    try {
      const addresses = await dns.resolve('api.deepgram.com');
      if (addresses && addresses.length > 0) {
        targetIp = addresses[0];
      }
    } catch (dnsErr) {
      logger.warn('DNS resolution for api.deepgram.com failed, using fallback IP.');
    }

    /**
     * ─── HTTPS OPTIONS & SNI HOST OVERRIDE ───
     * Constructs the request targeting the resolved direct IP.
     * Crucially overrides standard HTTP SNI Host headers (Host: api.deepgram.com) 
     * to allow Deepgram to authenticate request signatures properly despite using a direct IP.
     */
    const options = {
      hostname: targetIp,
      port: 443,
      path: '/v1/auth/grant',
      method: 'POST',
      headers: {
        'Host': 'api.deepgram.com',
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (response.statusCode === 200 && result.access_token) {
            res.json({ token: result.access_token });
          } else if (response.statusCode === 403 || result.err_code === 'FORBIDDEN') {
            res.status(403).json({ 
              message: 'Deepgram API Key lacks sufficient permissions. Please ensure your API key has Admin role.'
            });
          } else {
            logger.error('Failed to create Deepgram temporary token', { status: response.statusCode, data: result });
            res.status(500).json({ message: 'Failed to generate Deepgram token' });
          }
        } catch (e: any) {
          logger.error('Error parsing Deepgram response', { error: e.message });
          res.status(500).json({ message: 'Failed to parse Deepgram response' });
        }
      });
    });

    request.on('error', (err) => {
      logger.error('Network error reaching Deepgram API', { error: err.message });
      res.status(502).json({ message: 'Backend failed to reach Deepgram API (Network Error)' });
    });

    request.write(JSON.stringify({ ttl_seconds: 3600 }));
    request.end();

  } catch (err: any) {
    logger.error('Error generating Deepgram token', { error: err.message });
    next(err);
  }
});

export default router;
