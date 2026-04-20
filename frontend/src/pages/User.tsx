import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMeta } from '../hooks/useMeta';
import './styles/UserProfile.css';

export default function User() {
  const { user } = useAuth();

  useMeta({
    title: user ? `Профиль — ${user.username}` : 'Профиль',
    description: 'Ваш профиль в Translator Cabinet.',
    noIndex: true,
  });

  const getRoleDescription = () => {
    if (user?.is_translator && user?.is_editor) return 'Переводчик и редактор';
    if (user?.is_translator) return 'Переводчик';
    if (user?.is_editor) return 'Редактор';
    return 'Пользователь';
  };

  const getInitials = () => {
    if (user?.full_name) {
      return user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();
    }
    return user?.username?.substring(0, 2).toUpperCase() || 'US';
  };

  return (
    <main className="page user-page" aria-labelledby="profile-title">
      <div className="user-profile-card">
        <div className="profile-header">
          <div className="avatar-circle" aria-hidden="true">
            <span className="avatar-initials">{getInitials()}</span>
          </div>
          <div className="profile-main">
            <h1 id="profile-title">{user?.full_name || user?.username}</h1>
            <p className="user-email">{user?.email}</p>
            <div className="role-badges" aria-label="Роли пользователя">
              {user?.is_translator && (
                <span className="role-badge translator">Переводчик</span>
              )}
              {user?.is_editor && (
                <span className="role-badge editor">Редактор</span>
              )}
            </div>
          </div>
        </div>

        <dl className="profile-details">
          <div className="detail-item">
            <dt className="detail-label">Имя пользователя</dt>
            <dd className="detail-value">{user?.username}</dd>
          </div>
          <div className="detail-item">
            <dt className="detail-label">Статус</dt>
            <dd className="status-active">Активен</dd>
          </div>
          <div className="detail-item">
            <dt className="detail-label">Роль</dt>
            <dd className="detail-value">{getRoleDescription()}</dd>
          </div>
        </dl>

        <nav className="profile-actions" aria-label="Действия профиля">
          <Link to="/user/projects" className="btn btn-primary">
            Мои проекты
          </Link>
          <button className="btn btn-secondary">Настройки</button>
        </nav>
      </div>
    </main>
  );
}