import api from './axios';

export const askDoubtSolver = async (prompt) => {
  const response = await api.post('/academic-chat/ask', { prompt });
  return response.data;
}; 