import mongoose from 'mongoose';

const callSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true, unique: true },
  callerNumber: { type: String, required: true },
  transcript: { type: String, default: '' },
  peakRiskScore: { type: Number, default: 0 },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
}, { timestamps: true });

const CallSession = mongoose.model('CallSession', callSessionSchema);
export default CallSession;
