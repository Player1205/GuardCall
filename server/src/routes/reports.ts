import express, { Response, NextFunction } from 'express';
import { z } from 'zod';
import Report from '../models/Report.js';
import { protect, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const createReportSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  callerNumber: z.string().min(10, 'Invalid phone number'),
  summary: z.string().min(1, 'Summary is required'),
  scamType: z.string().min(1, 'Scam type is required'),
  redFlags: z.array(z.string()).default([]),
  psychologicalTactics: z.array(z.string()).default([]),
  evidenceLog: z.array(z.object({
    time: z.string(),
    event: z.string()
  })).default([]),
  recommendedAction: z.string().optional(),
  formalComplaintText: z.string().optional(),
  peakRiskScore: z.number().min(0).max(100),
}).strip();

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

router.post('/', protect, validate(createReportSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
