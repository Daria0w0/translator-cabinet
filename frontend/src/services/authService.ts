import apiClient from './apiClient';
import { User } from '../contexts/AuthContext';

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

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const response = await apiClient.post<User>('/api/auth/login', { email, password });
    return response.data;
  },

  async register(userData: RegisterData): Promise<User> {
    const response = await apiClient.post<User>('/api/auth/register', userData);
    return response.data;
  },

  async refresh(): Promise<void> {
    await apiClient.post('/api/auth/refresh');
  },

  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout');
  },

  async logoutAll(): Promise<void> {
    await apiClient.post('/api/auth/logout-all');
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get<User>('/api/auth/me');
    return response.data;
  },

  async checkAuth(): Promise<{ authenticated: boolean; user: User }> {
    const response = await apiClient.get('/api/auth/check');
    return response.data;
  },
};