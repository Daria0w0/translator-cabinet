import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page notfound-page">
      <h1>404 - Страница не найдена</h1>
      <p>Извините, такой страницы не существует.</p>
      <Link to="/" className="btn-primary">
        Вернуться на главную
      </Link>
    </div>
  );
}