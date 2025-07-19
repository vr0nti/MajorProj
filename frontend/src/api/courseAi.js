import api from './axios';

export const getRecommendations = (department, subjects) =>
  api.post('/course-ai/recommend', { department, subjects })
     .then(res => res.data);

export default { getRecommendations };