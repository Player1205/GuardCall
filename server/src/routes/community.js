import express from 'express';
import CommunityReport from '../models/CommunityReport.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/community/check/:number
// @desc    Check a caller number against community DB
router.get('/check/:number', async (req, res, next) => {
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

// @route   POST /api/community
// @desc    Add a number to community DB
router.post('/', protect, async (req, res, next) => {
  try {
    const { callerNumber, riskScore } = req.body;
    
    let report = await CommunityReport.findOne({ callerNumber });
    
    if (report) {
      // Recalculate average
      const newTotalScore = (report.averageRiskScore * report.reportsCount) + riskScore;
      report.reportsCount += 1;
      report.averageRiskScore = newTotalScore / report.reportsCount;
      report.lastReportedAt = Date.now();
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
