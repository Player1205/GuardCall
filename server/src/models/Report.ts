import mongoose, { Document, Model } from 'mongoose';

export interface IEvidenceLog {
  time: string;
  event: string;
}

export interface IReport extends Document {
  userId: string;
  sessionId: string;
  callerNumber: string;
  summary: string;
  scamType: string;
  redFlags: string[];
  psychologicalTactics: string[];
  evidenceLog: IEvidenceLog[];
  recommendedAction?: string;
  formalComplaintText?: string;
  peakRiskScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new mongoose.Schema<IReport>({
  userId: { type: String, required: true },
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

const Report: Model<IReport> = mongoose.model<IReport>('Report', reportSchema);
export default Report;
