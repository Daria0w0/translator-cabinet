import apiClient from './apiClient';
import { User } from '../contexts/AuthContext';

export interface AdminUser extends User {
  project_count: number;
  created_at?: string;
}

export interface AdminProject {
  id: number;
  name: string;
  description: string;
  source_lang: string;
  target_lang: string;
  status: string;
  owner_id: number;
  owner_name: string;
  fileCount: number;
  created_at?: string;
}

export const adminService = {
  async getUsers(params?: {
    search?: string;
    role?: string;
    is_blocked?: boolean;
  }): Promise<AdminUser[]> {
    const response = await apiClient.get('/api/admin/users', { params });
    return response.data;
  },

  async updateUser(
    userId: number,
    data: { role?: string; is_blocked?: boolean; is_active?: boolean }
  ): Promise<AdminUser> {
    const response = await apiClient.put(`/api/admin/users/${userId}`, data);
    return response.data;
  },

  async deleteUser(userId: number): Promise<void> {
    await apiClient.delete(`/api/admin/users/${userId}`);
  },

  async getProjects(params?: {
    user_id?: number;
    status?: string;
  }): Promise<AdminProject[]> {
    const response = await apiClient.get('/api/admin/projects', { params });
    return response.data;
  },

  async deleteProject(projectId: number): Promise<void> {
    await apiClient.delete(`/api/admin/projects/${projectId}`);
  },
};