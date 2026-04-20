import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { withCredentials: true },
  },
}));

import apiClient from '../services/apiClient';
import { authService } from '../services/authService';
import { adminService } from '../services/adminService';
import { getProjects, createProject, deleteProject, getProjectFiles } from '../services/api';

// ─── authService ──────────────────────────────────────────────

describe('authService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('login вызывает POST /api/auth/login и возвращает user', async () => {
    const mockUser = {
      id: 1, email: 'u@test.com', username: 'user', role: 'user',
      is_translator: true, is_editor: false, is_active: true, is_blocked: false,
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockUser });

    const result = await authService.login('u@test.com', 'pass123');

    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith(
      '/api/auth/login',
      { email: 'u@test.com', password: 'pass123' },
    );
    expect(result.id).toBe(1);
  });

  it('logout вызывает POST /api/auth/logout', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });
    await authService.logout();
    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith('/api/auth/logout');
  });

  it('getProfile вызывает GET /api/auth/me', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        id: 1, email: 'u@test.com', username: 'user', role: 'user',
        is_translator: true, is_editor: false, is_active: true, is_blocked: false,
      },
    });
    await authService.getProfile();
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith('/api/auth/me');
  });

  it('register вызывает POST /api/auth/register', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 2 } });
    await authService.register({
      email: 'new@test.com', username: 'newuser', password: 'pass123',
      is_translator: true, is_editor: false,
    });
    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({ email: 'new@test.com' }),
    );
  });

  it('checkAuth возвращает {authenticated, user}', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { authenticated: true, user: { id: 1 } },
    });
    const result = await authService.checkAuth();
    expect(result.authenticated).toBe(true);
  });
});

// ─── adminService ─────────────────────────────────────────────

describe('adminService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getUsers возвращает массив из paginated response', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { items: [{ id: 1, username: 'user1' }], total: 1, skip: 0, limit: 20 },
    });
    const users = await adminService.getUsers();
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe(1);
  });

  it('getUsers обрабатывает ответ-массив (без пагинации)', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: [{ id: 1 }, { id: 2 }],
    });
    const users = await adminService.getUsers();
    expect(users).toHaveLength(2);
  });

  it('getUsersPaginated возвращает объект с total и items', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { items: [], total: 0, skip: 0, limit: 20 },
    });
    const result = await adminService.getUsersPaginated();
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('items');
  });

  it('updateUser вызывает PUT /api/admin/users/:id', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { id: 1, is_blocked: true } });
    await adminService.updateUser(1, { is_blocked: true });
    expect(vi.mocked(apiClient.put)).toHaveBeenCalledWith(
      '/api/admin/users/1',
      { is_blocked: true },
    );
  });

  it('deleteUser вызывает DELETE /api/admin/users/:id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({});
    await adminService.deleteUser(42);
    expect(vi.mocked(apiClient.delete)).toHaveBeenCalledWith('/api/admin/users/42');
  });

  it('deleteProject вызывает DELETE /api/admin/projects/:id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({});
    await adminService.deleteProject(10);
    expect(vi.mocked(apiClient.delete)).toHaveBeenCalledWith('/api/admin/projects/10');
  });
});

// ─── apiClient ────────────────────────────────────────────────

describe('apiClient', () => {
  it('экспортирует axios instance с нужными методами', () => {
    expect(typeof apiClient.get).toBe('function');
    expect(typeof apiClient.post).toBe('function');
    expect(apiClient.defaults.withCredentials).toBe(true);
  });
});

// ─── api.ts — проекты ─────────────────────────────────────────

describe('api.ts — проекты', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getProjects вызывает GET /api/projects/ и возвращает items', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        items: [{ id: 1, name: 'Project', fileCount: 0 }],
        total: 1, skip: 0, limit: 100,
      },
    });
    const projects = await getProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('Project');
  });

  it('createProject вызывает POST /api/projects/', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { id: 2, name: 'New Project', fileCount: 0 },
    });
    const result = await createProject({
      name: 'New Project', description: '', source_lang: 'en',
      target_lang: 'ru', status: 'Новый',
    });
    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith(
      '/api/projects/',
      expect.objectContaining({ name: 'New Project' }),
    );
    expect(result.id).toBe(2);
  });

  it('deleteProject вызывает DELETE /api/projects/:id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({});
    await deleteProject(5);
    expect(vi.mocked(apiClient.delete)).toHaveBeenCalledWith('/api/projects/5');
  });

  it('getProjectFiles вызывает GET /api/projects/:id/files', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    await getProjectFiles(3);
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith('/api/projects/3/files');
  });
});