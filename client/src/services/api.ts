import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL 
  ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL}/api`)
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface CommunityCheckResult {
  flagged: boolean;
  reportsCount: number;
}

export const checkCommunityDB = async (number: string): Promise<CommunityCheckResult> => {
  try {
    const { data } = await api.get<CommunityCheckResult>(`/community/check/${number}`);
    return data;
  } catch (error) {
    console.error('Error checking community DB', error);
    return { flagged: false, reportsCount: 0 };
  }
};

export const reportToCommunityDB = async (callerNumber: string, riskScore: number): Promise<void> => {
  try {
    await api.post('/community', { callerNumber, riskScore });
  } catch (error) {
    console.error('Error reporting to community DB', error);
  }
};

export default api;
