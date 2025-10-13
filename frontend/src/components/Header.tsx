import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';


export default function Header() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path ? 'nav-link active' : 'nav-link';

  const handleLinkClick = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="logo">
        <Link to="/" onClick={handleLinkClick}>translator-cabinet</Link>
      </div>

      <nav className={`nav ${menuOpen ? 'open' : ''}`}>
        <ul className="nav-list">
          <li>
            <Link to="/user" className={isActive('/user')} onClick={handleLinkClick}>
              Профиль
            </Link>
          </li>
          <li>
            <Link to="/user/projects" className={isActive('/user/projects')} onClick={handleLinkClick}>
              Мои проекты
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}