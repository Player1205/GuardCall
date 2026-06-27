import express, { Response, NextFunction } from 'express';
import CallSession from '../models/CallSession.js';
import { protect, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized');
    }
    const { sessionId, callerNumber } = req.body;
    const session = await CallSession.create({
      userId: req.user._id.toString(),
      sessionId,
      callerNumber
    });
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

router.get('/:sessionId', protect, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized');
    }
    const session = await CallSession.findOne({ 
      sessionId: req.params.sessionId,
      userId: req.user._id.toString()
    });
    
    if (session) {
      res.json(session);
    } else {
      res.status(404);
      throw new Error('Session not found');
    }
  } catch (err) {
    next(err);
  }
});

export default router;
