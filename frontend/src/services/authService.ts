import axios from 'axios';
import { User } from '../contexts/AuthContext';
import { message } from 'antd';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.detail || 'Произошла ошибка';
    message.error(errorMessage);
    return Promise.reject(error);
  }
);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  is_translator: boolean;
  is_editor: boolean;
}

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/login', { email, password });
    return response.data;
  },

  async register(userData: RegisterData) {
    const response = await api.post('/register', userData);
    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get('/me');
    return response.data;
  },
};