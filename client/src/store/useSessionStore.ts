import { create } from 'zustand';

interface SessionState {
  callerNumber: string;
  setCallerNumber: (number: string) => void;
  sessionActive: boolean;
  setSessionActive: (active: boolean) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  callerNumber: '',
  setCallerNumber: (number) => set({ callerNumber: number }),
  sessionActive: false,
  setSessionActive: (active) => set({ sessionActive: active }),
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),
}));
