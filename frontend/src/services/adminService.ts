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

export interface PaginatedUsersResponse {
  items: AdminUser[];
  total: number;
  skip: number;
  limit: number;
}

export interface PaginatedProjectsResponse {
  items: AdminProject[];
  total: number;
  skip: number;
  limit: number;
}

export const adminService = {
  async getUsers(params?: {
    search?: string;
    role?: string;
    is_blocked?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<AdminUser[]> {
    const response = await apiClient.get<AdminUser[] | PaginatedUsersResponse>(
      '/api/admin/users',
      { params },
    );
    const data = response.data;
    if (Array.isArray(data)) return data;
    return data.items;
  },

  async getUsersPaginated(params?: {
    search?: string;
    role?: string;
    is_blocked?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<PaginatedUsersResponse> {
    const response = await apiClient.get<AdminUser[] | PaginatedUsersResponse>(
      '/api/admin/users',
      { params },
    );
    const data = response.data;
    if (Array.isArray(data)) {
      return { items: data, total: data.length, skip: 0, limit: data.length };
    }
    return data;
  },

  async updateUser(
    userId: number,
    data: { role?: string; is_blocked?: boolean; is_active?: boolean },
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
    skip?: number;
    limit?: number;
  }): Promise<AdminProject[]> {
    const response = await apiClient.get('/api/admin/projects', { params });
    return response.data;
  },

  async deleteProject(projectId: number): Promise<void> {
    await apiClient.delete(`/api/admin/projects/${projectId}`);
  },
};