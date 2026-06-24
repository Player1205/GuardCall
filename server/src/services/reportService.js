import Report from '../models/Report.js';
import CallSession from '../models/CallSession.js';
import CommunityReport from '../models/CommunityReport.js';

export const handleSessionEnd = async (sessionData, finalReport) => {
  try {
    const { sessionId, userId, callerNumber, peakRiskScore } = sessionData;

    // Update Session
    await CallSession.updateOne(
      { sessionId }, 
      { endTime: new Date(), peakRiskScore }
    );

    if (peakRiskScore < 40) {
      // Safe call, scrub session data (in a real app we might delete the session entirely or keep it blank)
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

      // If extremely high risk, optionally auto-add to community DB
      if (peakRiskScore >= 70) {
        let commReport = await CommunityReport.findOne({ callerNumber });
        if (commReport) {
          const newTotalScore = (commReport.averageRiskScore * commReport.reportsCount) + peakRiskScore;
          commReport.reportsCount += 1;
          commReport.averageRiskScore = newTotalScore / commReport.reportsCount;
          commReport.lastReportedAt = Date.now();
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
  } catch (error) {
    console.error('Error in handleSessionEnd:', error.message);
  }
};
