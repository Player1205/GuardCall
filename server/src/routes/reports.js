import express from 'express';
import Report from '../models/Report.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/reports/:sessionId
// @desc    Get report for a specific session
router.get('/:sessionId', protect, async (req, res, next) => {
  try {
    const report = await Report.findOne({ 
      sessionId: req.params.sessionId,
      userId: req.user._id 
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

// @route   POST /api/reports
// @desc    Manually generate/save a report
router.post('/', protect, async (req, res, next) => {
  try {
    const reportData = req.body;
    reportData.userId = req.user._id;
    
    const report = await Report.create(reportData);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

export default router;
