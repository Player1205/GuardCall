import express from 'express';
import CallSession from '../models/CallSession.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/sessions
// @desc    Start a new session
router.post('/', protect, async (req, res, next) => {
  try {
    const { sessionId, callerNumber } = req.body;
    const session = await CallSession.create({
      userId: req.user._id,
      sessionId,
      callerNumber
    });
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/sessions/:sessionId
// @desc    Get session details
router.get('/:sessionId', protect, async (req, res, next) => {
  try {
    const session = await CallSession.findOne({ 
      sessionId: req.params.sessionId,
      userId: req.user._id 
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
