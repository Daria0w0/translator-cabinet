import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import ProtectedRoute from '../components/ProtectedRoute';

const renderProtected = (
  authState: { user: any; isAuthenticated: boolean; loading: boolean },
  requiredRole?: string,
) => {
  mockUseAuth.mockReturnValue(authState);
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Страница входа</div>} />
        <Route path="/blocked" element={<div>Заблокирован</div>} />
        <Route path="/projects" element={<div>Проекты</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute requiredRole={requiredRole}>
              <div>Защищённый контент</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
};

describe('ProtectedRoute — защита маршрутов', () => {
  it('показывает спиннер пока идёт загрузка', () => {
    renderProtected({ user: null, isAuthenticated: false, loading: true });
    expect(screen.getByText(/загрузка/i)).toBeInTheDocument();
  });

  it('перенаправляет на /login если пользователь не авторизован', () => {
    renderProtected({ user: null, isAuthenticated: false, loading: false });
    expect(screen.getByText('Страница входа')).toBeInTheDocument();
    expect(screen.queryByText('Защищённый контент')).not.toBeInTheDocument();
  });

  it('отображает дочерний контент для авторизованного пользователя', () => {
    renderProtected({
      user: { id: 1, role: 'user', is_blocked: false },
      isAuthenticated: true,
      loading: false,
    });
    expect(screen.getByText('Защищённый контент')).toBeInTheDocument();
  });

  it('перенаправляет заблокированного пользователя на /blocked', () => {
    renderProtected({
      user: { id: 2, role: 'user', is_blocked: true },
      isAuthenticated: true,
      loading: false,
    });
    expect(screen.getByText('Заблокирован')).toBeInTheDocument();
    expect(screen.queryByText('Защищённый контент')).not.toBeInTheDocument();
  });

  it('разрешает admin доступ к маршруту с requiredRole=admin', () => {
    renderProtected(
      { user: { id: 3, role: 'admin', is_blocked: false }, isAuthenticated: true, loading: false },
      'admin',
    );
    expect(screen.getByText('Защищённый контент')).toBeInTheDocument();
  });

  it('перенаправляет обычного пользователя с маршрута требующего admin', () => {
    renderProtected(
      { user: { id: 4, role: 'user', is_blocked: false }, isAuthenticated: true, loading: false },
      'admin',
    );
    expect(screen.queryByText('Защищённый контент')).not.toBeInTheDocument();
    expect(screen.getByText('Проекты')).toBeInTheDocument();
  });
});