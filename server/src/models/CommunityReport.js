import mongoose from 'mongoose';

const communityReportSchema = new mongoose.Schema({
  callerNumber: { type: String, required: true, index: true },
  reportsCount: { type: Number, default: 1 },
  averageRiskScore: { type: Number, required: true },
  lastReportedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const CommunityReport = mongoose.model('CommunityReport', communityReportSchema);
export default CommunityReport;
