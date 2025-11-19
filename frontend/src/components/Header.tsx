import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path ? 'nav-link active' : 'nav-link';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="logo">
        <Link to="/">translator-cabinet</Link>
      </div>

      <nav className="nav">
        <ul className="nav-list">
          {user ? (
            <>
              <li>
                <Link to="/user/projects" className={isActive('/user/projects')}>
                  Мои проекты
                </Link>
              </li>
              <li className="user-menu-container" ref={menuRef}>
                <button 
                  className="user-menu-btn"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <span className="user-avatar">
                    {user.username?.substring(0, 1).toUpperCase()}
                  </span>
                  {user.username}
                  <span className="dropdown-arrow">▼</span>
                </button>
                
                {menuOpen && (
                  <div className="user-dropdown">
                    <Link 
                      to="/user" 
                      className="dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Мой профиль
                    </Link>
                    <Link 
                      to="/user/projects" 
                      className="dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Мои проекты
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button 
                      className="dropdown-item logout-item"
                      onClick={handleLogout}
                    >
                      Выйти
                    </button>
                  </div>
                )}
              </li>
            </>
          ) : (
            <li>
              <Link to="/login" className={isActive('/login')}>
                Войти
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}