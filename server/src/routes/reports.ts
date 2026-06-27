import express, { Response, NextFunction } from 'express';
import Report from '../models/Report.js';
import { protect, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.get('/:sessionId', protect, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized');
    }
    const report = await Report.findOne({ 
      sessionId: req.params.sessionId,
      userId: req.user._id.toString()
    });
    
    if (report) {
      res.json(report);
    } else {
      res.status(404);
      throw new Error('Report not found');
    }
  } catch (err) {
    next(err);
  }
});

router.post('/', protect, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized');
    }
    const reportData = req.body;
    reportData.userId = req.user._id.toString();
    
    const report = await Report.create(reportData);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

export default router;
