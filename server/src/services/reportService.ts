import Report, { IReport } from '../models/Report.js';
import CallSession from '../models/CallSession.js';
import CommunityReport from '../models/CommunityReport.js';
import logger from '../utils/logger.js';
import { GeneratedReport } from './groqService.js';

interface SessionData {
  sessionId: string;
  userId: string;
  callerNumber: string;
  peakRiskScore: number;
}

export const handleSessionEnd = async (sessionData: SessionData, finalReport: GeneratedReport | null): Promise<IReport | null | undefined> => {
  try {
    const { sessionId, userId, callerNumber, peakRiskScore } = sessionData;

    await CallSession.updateOne(
      { sessionId }, 
      { endTime: new Date(), peakRiskScore }
    );

    if (peakRiskScore < 40) {
      await CallSession.deleteOne({ sessionId });
      return null;
    }

    if (finalReport) {
      const savedReport = await Report.create({
        userId,
        sessionId,
        callerNumber,
        summary: finalReport.summary,
        scamType: finalReport.scamType,
        redFlags: finalReport.redFlags,
        psychologicalTactics: finalReport.psychologicalTactics,
        evidenceLog: finalReport.evidenceLog,
        recommendedAction: finalReport.recommendedAction,
        formalComplaintText: finalReport.formalComplaintText,
        peakRiskScore
      });

      if (peakRiskScore >= 70) {
        let commReport = await CommunityReport.findOne({ callerNumber });
        if (commReport) {
          const newTotalScore = (commReport.averageRiskScore * commReport.reportsCount) + peakRiskScore;
          commReport.reportsCount += 1;
          commReport.averageRiskScore = newTotalScore / commReport.reportsCount;
          commReport.lastReportedAt = new Date();
          await commReport.save();
        } else {
          await CommunityReport.create({
            callerNumber,
            reportsCount: 1,
            averageRiskScore: peakRiskScore
          });
        }
      }

      return savedReport;
    }
  } catch (error: any) {
    logger.error('Error in handleSessionEnd', { error: error.message });
  }
};
