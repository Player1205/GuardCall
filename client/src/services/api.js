import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const checkCommunityDB = async (number) => {
  try {
    const { data } = await api.get(`/community/check/${number}`);
    return data;
  } catch (error) {
    console.error('Error checking community DB', error);
    return { flagged: false, reportsCount: 0 };
  }
};

export default api;
