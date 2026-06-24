import express, { Request, Response, NextFunction } from 'express';
import CommunityReport from '../models/CommunityReport.js';
import { protect, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.get('/check/:number', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { number } = req.params;
    const report = await CommunityReport.findOne({ callerNumber: number });
    
    if (report) {
      res.json({
        flagged: report.reportsCount >= 3 && report.averageRiskScore > 60,
        reportsCount: report.reportsCount,
        averageRiskScore: report.averageRiskScore,
        lastReportedAt: report.lastReportedAt
      });
    } else {
      res.json({ flagged: false, reportsCount: 0 });
    }
  } catch (err) {
    next(err);
  }
});

router.post('/', protect, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { callerNumber, riskScore } = req.body;
    
    let report = await CommunityReport.findOne({ callerNumber });
    
    if (report) {
      const newTotalScore = (report.averageRiskScore * report.reportsCount) + riskScore;
      report.reportsCount += 1;
      report.averageRiskScore = newTotalScore / report.reportsCount;
      report.lastReportedAt = new Date();
      await report.save();
    } else {
      report = await CommunityReport.create({
        callerNumber,
        reportsCount: 1,
        averageRiskScore: riskScore
      });
    }
    
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

export default router;
