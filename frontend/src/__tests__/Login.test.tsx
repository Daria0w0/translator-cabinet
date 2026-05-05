import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockLogin = vi.fn();
const mockRegister = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
    user: null,
  }),
}));

vi.mock('../hooks/useMeta', () => ({ useMeta: vi.fn() }));

import Login from '../pages/Login';

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

// ─── Форма ВХОДА ─────────────────────────────────────────────

describe('Login — форма входа', () => {
  beforeEach(() => vi.clearAllMocks());

  it('отображает поля email, пароль и кнопку Войти', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Пароль')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument();
  });

  it('переключение на Регистрация показывает поле username', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('tab', { name: /регистрация/i }));
    expect(screen.getByPlaceholderText('Имя пользователя')).toBeInTheDocument();
  });

  it('показывает ошибку если email пустой', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /^войти$/i }));
    expect(screen.getByText(/email обязателен/i)).toBeInTheDocument();
  });

  it('показывает ошибку при некорректном email', async () => {
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText('Email'), 'not-an-email');
    await userEvent.type(screen.getByPlaceholderText('Пароль'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /^войти$/i }));
    expect(screen.getByText(/некорректный формат email/i)).toBeInTheDocument();
  });

  it('показывает ошибку при пароле короче 6 символов', async () => {
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText('Email'), 'user@test.com');
    await userEvent.type(screen.getByPlaceholderText('Пароль'), '123');
    await userEvent.click(screen.getByRole('button', { name: /^войти$/i }));
    expect(screen.getByText(/не менее 6 символов/i)).toBeInTheDocument();
  });

  it('вызывает login() с правильными данными при корректной форме', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText('Email'), 'user@test.com');
    await userEvent.type(screen.getByPlaceholderText('Пароль'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /^войти$/i }));
    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'password123'),
    );
  });

  it('показывает сообщение о заблокированном аккаунте', async () => {
    mockLogin.mockRejectedValueOnce({
      response: {
        data: { detail: 'Ваш аккаунт заблокирован. Обратитесь к администратору.' },
      },
    });
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText('Email'), 'blocked@test.com');
    await userEvent.type(screen.getByPlaceholderText('Пароль'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /^войти$/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/заблокирован/i),
    );
  });

  it('показывает сообщение при неверном пароле', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { data: { detail: 'Неверный email или пароль' } },
    });
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText('Email'), 'user@test.com');
    await userEvent.type(screen.getByPlaceholderText('Пароль'), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /^войти$/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/неверный email или пароль/i),
    );
  });

  it('кнопка disabled пока идёт загрузка', async () => {
    // mockLogin никогда не резолвится — имитируем долгий запрос
    mockLogin.mockImplementation(() => new Promise(() => {}));
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText('Email'), 'user@test.com');
    await userEvent.type(screen.getByPlaceholderText('Пароль'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /^войти$/i }));
    expect(screen.getByRole('button', { name: /загрузка/i })).toBeDisabled();
  });
});

// ─── Форма РЕГИСТРАЦИИ ────────────────────────────────────────

describe('Login — форма регистрации', () => {
  beforeEach(() => vi.clearAllMocks());

  it('показывает ошибку если роль не выбрана', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('tab', { name: /регистрация/i }));
    await userEvent.type(screen.getByPlaceholderText('Email'), 'new@test.com');
    await userEvent.type(screen.getByPlaceholderText('Имя пользователя'), 'newuser');
    await userEvent.type(screen.getByPlaceholderText('Пароль'), 'password123');
    // Не выбираем роль
    await userEvent.click(screen.getByRole('button', { name: /зарегистрироваться/i }));
    expect(screen.getByText(/выберите хотя бы одну роль/i)).toBeInTheDocument();
  });

  it('вызывает register() с is_translator=true при выборе роли', async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    renderLogin();
    await userEvent.click(screen.getByRole('tab', { name: /регистрация/i }));
    await userEvent.type(screen.getByPlaceholderText('Email'), 'new@test.com');
    await userEvent.type(screen.getByPlaceholderText('Имя пользователя'), 'newuser');
    await userEvent.type(screen.getByPlaceholderText('Пароль'), 'password123');
    await userEvent.click(screen.getByLabelText(/переводчик/i));
    await userEvent.click(screen.getByRole('button', { name: /зарегистрироваться/i }));
    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@test.com', is_translator: true }),
      ),
    );
  });

  it('показывает ошибку если username короче 3 символов', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('tab', { name: /регистрация/i }));
    await userEvent.type(screen.getByPlaceholderText('Email'), 'new@test.com');
    await userEvent.type(screen.getByPlaceholderText('Имя пользователя'), 'ab');  // слишком короткий
    await userEvent.type(screen.getByPlaceholderText('Пароль'), 'password123');
    await userEvent.click(screen.getByLabelText(/переводчик/i));
    await userEvent.click(screen.getByRole('button', { name: /зарегистрироваться/i }));
    expect(screen.getByText(/не менее 3 символов/i)).toBeInTheDocument();
  });

  it('показывает ошибку о занятом username', async () => {
    mockRegister.mockRejectedValueOnce({
      response: { data: { detail: 'Email или username уже заняты' } },
    });
    renderLogin();
    await userEvent.click(screen.getByRole('tab', { name: /регистрация/i }));
    await userEvent.type(screen.getByPlaceholderText('Email'), 'existing@test.com');
    await userEvent.type(screen.getByPlaceholderText('Имя пользователя'), 'existing');
    await userEvent.type(screen.getByPlaceholderText('Пароль'), 'password123');
    await userEvent.click(screen.getByLabelText(/переводчик/i));
    await userEvent.click(screen.getByRole('button', { name: /зарегистрироваться/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/уже существует/i),
    );
  });
});
