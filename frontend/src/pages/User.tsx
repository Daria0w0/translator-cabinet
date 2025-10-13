import React from 'react';
import { Link } from 'react-router-dom';


export default function User() {
  return (
    <div className="page user-page">
      <h1>Профиль пользователя</h1>

      <div className="user-info">
        <div className="avatar" aria-label="Аватар пользователя">
          <span role="img" aria-label="User">😺</span>
        </div>

        <div className="user-description">
          <p><strong>Имя:</strong> Дарья Ситникова</p>
          <p><strong>О себе:</strong> Переводчик с опытом работы 0 лет. Специализируюсь на переводе с кошачьего.</p>
        </div>
      </div>

      <Link to="/user/projects" className="btn-link">
        Мои проекты
      </Link>
    </div>
  );
}