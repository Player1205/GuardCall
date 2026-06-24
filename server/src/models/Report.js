import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true },
  callerNumber: { type: String, required: true },
  summary: { type: String, required: true },
  scamType: { type: String, required: true },
  redFlags: [{ type: String }],
  psychologicalTactics: [{ type: String }],
  evidenceLog: [{
    time: { type: String },
    event: { type: String }
  }],
  recommendedAction: { type: String },
  formalComplaintText: { type: String },
  peakRiskScore: { type: Number, required: true },
}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);
export default Report;
