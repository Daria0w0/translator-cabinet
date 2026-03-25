import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getInitials = () => {
    if (user?.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    return user?.username?.substring(0, 2).toUpperCase() || 'U';
  };

  return (
    <header className="header">
      <div className="logo">
        <Link to="/">Translator Cabinet</Link>
      </div>

      <nav className="nav-menu">
        {user ? (
          <>
            <Link to="/user/projects" className="nav-link">
              Проекты
            </Link>
            
            {user.role === 'admin' && (
              <Link to="/admin" className="nav-link admin-link">
                Админ панель
              </Link>
            )}
            
            <div className="user-menu">
              <button 
                className="user-menu-btn"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span className="user-avatar">{getInitials()}</span>
                <span className="user-name">{user.username}</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              
              {showDropdown && (
                <div className="user-dropdown">
                  <Link to="/user" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                    Профиль
                  </Link>
                  <Link to="/user/projects" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                    Мои проекты
                  </Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                      Админ панель
                    </Link>
                  )}
                  <div className="dropdown-divider"></div>
                  <button onClick={handleLogout} className="dropdown-item logout-item">
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" className="nav-link">
              Войти
            </Link>
            <Link to="/login" className="btn-register">
              Регистрация
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}