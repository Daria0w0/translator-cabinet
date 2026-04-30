import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockLogout = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import Header from '../components/Header';

const renderHeader = () =>
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );

describe('Header — неавторизованный пользователь', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, logout: mockLogout });
  });

  it('отображает ссылку "Войти"', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: /войти/i })).toBeInTheDocument();
  });

  it('отображает ссылку "Регистрация"', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: /регистрация/i })).toBeInTheDocument();
  });

  it('не показывает меню пользователя', () => {
    renderHeader();
    expect(screen.queryByText(/проекты/i)).not.toBeInTheDocument();
  });
});

describe('Header — обычный пользователь', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        username: 'testuser',
        full_name: '',
        role: 'user',
        is_blocked: false,
      },
      logout: mockLogout,
    });
  });

  it('показывает ссылку "Проекты"', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: /проекты/i })).toBeInTheDocument();
  });

  it('не показывает "Админ панель" для обычного пользователя', () => {
    renderHeader();
    expect(screen.queryByText(/админ панель/i)).not.toBeInTheDocument();
  });

  it('показывает инициалы пользователя', () => {
    renderHeader();
    expect(screen.getByText('TE')).toBeInTheDocument();
  });

  it('открывает дропдаун по клику на аватар', async () => {
    renderHeader();
    const menuBtn = screen.getByRole('button');
    await userEvent.click(menuBtn);
    expect(screen.getByRole('link', { name: /профиль/i })).toBeInTheDocument();
  });

  it('вызывает logout при клике "Выйти"', async () => {
    mockLogout.mockResolvedValueOnce(undefined);
    renderHeader();
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByText(/выйти/i));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

describe('Header — администратор', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 99,
        username: 'admin',
        full_name: 'Admin User',
        role: 'admin',
        is_blocked: false,
      },
      logout: mockLogout,
    });
  });

  it('показывает "Админ панель" для admin', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: /админ панель/i })).toBeInTheDocument();
  });

  it('использует инициалы из full_name если он задан', () => {
    renderHeader();
    expect(screen.getByText('AU')).toBeInTheDocument();
  });
});