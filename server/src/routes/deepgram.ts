import express, { Request, Response, NextFunction } from 'express';
import { createClient } from '@deepgram/sdk';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/token', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY || '';
    if (!apiKey) {
      res.status(500).json({ message: 'Deepgram API key not configured' });
      return;
    }

    const deepgram = createClient(apiKey);
    
    // Fetch the project ID
    const { result: projectsResult, error: projectsError } = await deepgram.manage.v1.getProjects();
    
    if (projectsError || !projectsResult || projectsResult.projects.length === 0) {
      logger.error('Failed to get Deepgram projects', { error: projectsError });
      res.status(500).json({ message: 'Failed to access Deepgram project' });
      return;
    }
    
    const projectId = projectsResult.projects[0].project_id;
    
    // Create a temporary key valid for 3600 seconds
    const { result: keyResult, error: keyError } = await deepgram.manage.v1.createProjectKey(projectId, {
      comment: 'Temporary Client Key',
      scopes: ['usage:write'],
      time_to_live_in_seconds: 3600
    });
    
    if (keyError || !keyResult) {
      logger.error('Failed to create Deepgram temporary key', { error: keyError });
      res.status(500).json({ message: 'Failed to generate token' });
      return;
    }

    res.json({ token: keyResult.key });
  } catch (err: any) {
    logger.error('Error generating Deepgram token', { error: err.message });
    next(err);
  }
});

export default router;
