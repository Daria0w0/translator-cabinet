import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function User() {
  const { user } = useAuth();

  const getRoleDescription = () => {
    if (user?.is_translator && user?.is_editor) {
      return "Переводчик и редактор";
    } else if (user?.is_translator) {
      return "Переводчик";
    } else if (user?.is_editor) {
      return "Редактор";
    } else {
      return "Пользователь";
    }
  };

  const getInitials = () => {
    if (user?.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return user?.username?.substring(0, 2).toUpperCase() || 'US';
  };

  return (
    <div className="page user-page">
      <div className="user-profile-card">
        <div className="profile-header">
          <div className="avatar-circle">
            <span className="avatar-initials">{getInitials()}</span>
          </div>
          <div className="profile-main">
            <h2>{user?.full_name || user?.username}</h2>
            <p className="user-email">{user?.email}</p>
            <div className="role-badges">
              {user?.is_translator && (
                <span className="role-badge translator">Переводчик</span>
              )}
              {user?.is_editor && (
                <span className="role-badge editor">Редактор</span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-details">
          <div className="detail-item">
            <span className="detail-label">Имя пользователя</span>
            <span className="detail-value">{user?.username}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Статус</span>
            <span className="status-active">Активен</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Роль</span>
            <span className="detail-value">{getRoleDescription()}</span>
          </div>
        </div>

        <div className="profile-actions">
          <Link to="/user/projects" className="btn-primary">
            Мои проекты
          </Link>
          <button className="btn-secondary">
            Настройки
          </button>
        </div>
      </div>
    </div>
  );
}