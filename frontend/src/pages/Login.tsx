import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Login: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/user/projects';
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    full_name: '',
    is_translator: false,
    is_editor: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    username: '',
    password: '',
    roles: '',
    general: '',
  });

  const validateForm = () => {
    const newErrors = {
      email: '',
      username: '',
      password: '',
      roles: '',
      general: '',
    };

    if (!formData.email) {
      newErrors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Некорректный формат email';
    }

    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен быть не менее 6 символов';
    }

    if (!isLogin) {
      if (!formData.username) {
        newErrors.username = 'Имя пользователя обязательно';
      } else if (formData.username.length < 3) {
        newErrors.username = 'Имя пользователя должно быть не менее 3 символов';
      }

      if (!formData.is_translator && !formData.is_editor) {
        newErrors.roles = 'Выберите хотя бы одну роль';
      }
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setErrors((prev) => ({ ...prev, general: '' }));

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          full_name: formData.full_name || undefined,
          is_translator: formData.is_translator,
          is_editor: formData.is_editor,
        });
      }
      navigate(from, { replace: true });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Произошла ошибка';

      if (errorMessage.includes('уже заняты')) {
        setErrors((prev) => ({
          ...prev,
          general: 'Пользователь с таким email или username уже существует',
        }));
      } else if (errorMessage.includes('email или пароль')) {
        setErrors((prev) => ({
          ...prev,
          general: 'Неверный email или пароль',
        }));
      } else if (errorMessage.includes('деактивирован')) {
        setErrors((prev) => ({
          ...prev,
          general: 'Аккаунт деактивирован',
        }));
      } else if (errorMessage.includes('заблокирован')) {
        setErrors((prev) => ({
          ...prev,
          general: 'Ваш аккаунт заблокирован. Обратитесь к администратору.',
        }));
      } else {
        setErrors((prev) => ({ ...prev, general: errorMessage }));
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setErrors({
      email: '',
      username: '',
      password: '',
      roles: '',
      general: '',
    });
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Translator Cabinet</h2>

        <div className="auth-tabs">
          <button
            className={`tab-btn ${isLogin ? 'active' : ''}`}
            onClick={() => switchMode()}
          >
            Вход
          </button>
          <button
            className={`tab-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => switchMode()}
          >
            Регистрация
          </button>
        </div>

        {errors.general && (
          <div className="error-message general-error">{errors.general}</div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              className={`form-input ${errors.email ? 'error' : ''}`}
            />
            {errors.email && (
              <span className="field-error">{errors.email}</span>
            )}
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <input
                  type="text"
                  name="username"
                  placeholder="Имя пользователя"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className={`form-input ${errors.username ? 'error' : ''}`}
                />
                {errors.username && (
                  <span className="field-error">{errors.username}</span>
                )}
              </div>

              <div className="form-group">
                <input
                  type="text"
                  name="full_name"
                  placeholder="Полное имя (не обязательно)"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <input
              type="password"
              name="password"
              placeholder="Пароль"
              value={formData.password}
              onChange={handleChange}
              required
              className={`form-input ${errors.password ? 'error' : ''}`}
            />
            {errors.password && (
              <span className="field-error">{errors.password}</span>
            )}
          </div>

          {!isLogin && (
            <div className="roles-section">
              <label className="roles-label">Роли:</label>
              <div className="roles-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_translator"
                    checked={formData.is_translator}
                    onChange={handleChange}
                  />
                  Переводчик
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_editor"
                    checked={formData.is_editor}
                    onChange={handleChange}
                  />
                  Редактор
                </label>
              </div>
              {errors.roles && (
                <span className="field-error">{errors.roles}</span>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary login-btn"
            disabled={loading}
          >
            {loading
              ? 'Загрузка...'
              : isLogin
              ? 'Войти'
              : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
          <button type="button" className="link-btn" onClick={switchMode}>
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;