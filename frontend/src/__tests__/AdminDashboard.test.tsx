import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockGetUsersPaginated = vi.fn();
const mockUpdateUser = vi.fn();
const mockDeleteUser = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../services/adminService', () => ({
  adminService: {
    getUsersPaginated: (...args: any[]) => mockGetUsersPaginated(...args),
    updateUser: (...args: any[]) => mockUpdateUser(...args),
    deleteUser: (...args: any[]) => mockDeleteUser(...args),
    getProjects: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'admin', username: 'admin' },
  }),
}));

vi.mock('../hooks/useMeta', () => ({ useMeta: vi.fn() }));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

import AdminDashboard from '../pages/AdminDashboard';

const defaultPaginatedResponse = {
  items: [
    {
      id: 2,
      email: 'user@test.com',
      username: 'regularuser',
      full_name: null,
      is_translator: true,
      is_editor: false,
      role: 'user',
      is_active: true,
      is_blocked: false,
      project_count: 3,
    },
  ],
  total: 1,
  skip: 0,
  limit: 20,
};

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>,
  );

describe('AdminDashboard — загрузка и отображение', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUsersPaginated.mockResolvedValue(defaultPaginatedResponse);
  });

  it('отображает заголовок панели', async () => {
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /панель администратора/i })).toBeInTheDocument(),
    );
  });

  it('показывает список пользователей после загрузки', async () => {
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText('regularuser')).toBeInTheDocument(),
    );
  });

  it('отображает счётчик "Всего пользователей"', async () => {
    renderDashboard();
    await waitFor(() => {
      const label = screen.getByText('Всего пользователей');
      const card = label.closest('.stat-card') as HTMLElement;
      expect(within(card).getByText('1')).toBeInTheDocument();
    });
  });

  it('показывает статус "Активен" для активного пользователя', async () => {
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText('Активен')).toBeInTheDocument(),
    );
  });

  it('отображает количество проектов пользователя в строке таблицы', async () => {
    renderDashboard();
    await waitFor(() => screen.getByText('regularuser'));
    const row = screen.getByText('regularuser').closest('tr') as HTMLElement;
    expect(within(row).getByText('3')).toBeInTheDocument();
  });

  it('отображает «Всего проектов» в карточке статистики', async () => {
    renderDashboard();
    await waitFor(() => {
      const label = screen.getByText('Всего проектов');
      const card = label.closest('.stat-card') as HTMLElement;
      expect(within(card).getByText('3')).toBeInTheDocument();
    });
  });

  it('показывает ошибку при сбое загрузки', async () => {
    mockGetUsersPaginated.mockRejectedValueOnce({
      response: { data: { detail: 'Server Error' } },
    });
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    );
  });

  it('кнопка "Заблокировать" заблокирована для самого себя (admin id=1)', async () => {
    mockGetUsersPaginated.mockResolvedValueOnce({
      ...defaultPaginatedResponse,
      items: [{ ...defaultPaginatedResponse.items[0], id: 1 }],
    });
    renderDashboard();
    await waitFor(() => screen.getByText('regularuser'));
    const blockBtn = screen.getByRole('button', { name: /заблокировать regularuser/i });
    expect(blockBtn).toBeDisabled();
  });
});

describe('AdminDashboard — блокировка пользователя', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUsersPaginated.mockResolvedValue(defaultPaginatedResponse);
  });

  it('вызывает updateUser при клике "Заблокировать"', async () => {
    mockUpdateUser.mockResolvedValueOnce({ ...defaultPaginatedResponse.items[0], is_blocked: true });
    renderDashboard();
    await waitFor(() => screen.getByText('regularuser'));

    await userEvent.click(screen.getByRole('button', { name: /заблокировать regularuser/i }));
    expect(mockUpdateUser).toHaveBeenCalledWith(2, { is_blocked: true });
  });
});

describe('AdminDashboard — удаление пользователя', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUsersPaginated.mockResolvedValue(defaultPaginatedResponse);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('вызывает deleteUser при подтверждении удаления', async () => {
    mockDeleteUser.mockResolvedValueOnce(undefined);
    renderDashboard();
    await waitFor(() => screen.getByText('regularuser'));

    await userEvent.click(screen.getByRole('button', { name: /удалить пользователя regularuser/i }));
    expect(mockDeleteUser).toHaveBeenCalledWith(2);
  });
});

describe('AdminDashboard — навигация к проектам пользователя', () => {
  it('вызывает navigate при клике "Проекты"', async () => {
    mockGetUsersPaginated.mockResolvedValue(defaultPaginatedResponse);
    renderDashboard();
    await waitFor(() => screen.getByText('regularuser'));
    await userEvent.click(screen.getByRole('button', { name: /проекты/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/users/2/projects');
  });
});