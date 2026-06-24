import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

export default api;
