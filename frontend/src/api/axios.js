import axios from 'axios';
import { handleError } from '../utils/toast';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

// Attach token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  handleError(error, 'Request failed');
  return Promise.reject(error);
});

// Handle response errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 404) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      handleError(error, 'Session expired. Please login again.');
    } else if (error.response?.status === 403) {
      handleError(error, 'Access denied. You do not have permission for this action.');
    } else if (error.response?.status >= 500) {
      handleError(error, 'Server error. Please try again later.');
    } else if (error.code === 'NETWORK_ERROR') {
      handleError(error, 'Network error. Please check your connection.');
    } else {
      handleError(error);
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const loginUser = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.post('/auth/change-password', { currentPassword, newPassword });
  return response.data;
};

export default api; 
