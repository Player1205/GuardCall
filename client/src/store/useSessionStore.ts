import { create } from 'zustand';

export interface RiskData {
  risk: number;
  signal: string;
  phase?: 'intro' | 'allegation' | 'intimidation' | 'demand';
  coaching: string;
  peakRiskScore: number;
}

export interface ReportResult {
  safe?: boolean;
  report?: {
    callerNumber: string;
    peakRiskScore: number;
    scamType: string;
    summary: string;
    redFlags: string[];
    formalComplaintText: string;
    createdAt?: number | string | Date;
  };
}

interface SessionState {
  callerNumber: string;
  setCallerNumber: (number: string) => void;
  sessionActive: boolean;
  setSessionActive: (active: boolean) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  transcript: string;
  setTranscript: (text: string) => void;
  riskData: RiskData;
  setRiskData: (data: RiskData) => void;
  reportResult: ReportResult | null;
  setReportResult: (result: ReportResult | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  callerNumber: '',
  setCallerNumber: (number) => set({ callerNumber: number }),
  sessionActive: false,
  setSessionActive: (active) => set({ sessionActive: active }),
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),
  transcript: '',
  setTranscript: (text) => set({ transcript: text }),
  riskData: { risk: 0, signal: '', phase: 'intro', coaching: '', peakRiskScore: 0 },
  setRiskData: (data) => set({ riskData: data }),
  reportResult: null,
  setReportResult: (result) => set({ reportResult: result }),
}));
