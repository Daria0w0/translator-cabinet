import React from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../hooks/useMeta';

export default function NotFound() {
  useMeta({
    title: '404 — Страница не найдена',
    description: 'Запрошенная страница не существует.',
    noIndex: true,
  });

  return (
    <main className="page notfound-page" aria-labelledby="not-found-title">
      <h1 id="not-found-title">404 — Страница не найдена</h1>
      <p>Извините, такой страницы не существует.</p>
      <Link to="/" className="btn-primary">
        Вернуться на главную
      </Link>
    </main>
  );
}