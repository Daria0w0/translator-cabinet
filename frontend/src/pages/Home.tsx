import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMeta } from '../hooks/useMeta';

const BASE_URL = import.meta.env.VITE_SITE_URL || 'http://localhost:5173';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Translator Cabinet',
  description:
    'Веб-платформа для профессиональной работы с переводами. ' +
    'Управление проектами, сегментация текста, нейронный перевод и DeepL интеграция.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'RUB',
  },
  url: BASE_URL,
  inLanguage: ['ru', 'en'],
  featureList: [
    'Управление проектами перевода',
    'Автоматическая сегментация текста',
    'Нейронный перевод (NLLB)',
    'Интеграция с Yandex Translate',
    'Память переводов',
  ],
};

export default function Home() {
  const { user } = useAuth();

  useMeta({
    title: 'Главная',
    description:
      'Translator Cabinet — веб-платформа для профессиональной работы с переводами. ' +
      'Управляйте проектами, работайте с памятью переводов и редактируйте тексты в одном месте.',
    canonical: `${BASE_URL}/`,
    ogTitle: 'Translator Cabinet — Кабинет Переводчика',
    ogDescription:
      'Управление проектами, сегментация текста, нейронный перевод и Yandex — всё в одном месте.',
    ogType: 'website',
    jsonLd: JSON_LD,
  });

  return (
    <div className="home-page">
      <section className="hero-section" aria-labelledby="hero-title">
        <h1 id="hero-title" className="hero-title">
          Добро пожаловать в{' '}
          <span className="gradient-text">Кабинет Переводчика</span>
        </h1>
        <p className="hero-description">
          Веб-платформа для работы с переводами. Управляйте проектами,
          работайте с памятью переводов и редактируйте тексты в одном месте.
        </p>
        {!user && (
          <nav className="hero-actions" aria-label="Начало работы">
            <Link to="/login" className="btn btn-primary">
              Войти в систему
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Зарегистрироваться
            </Link>
          </nav>
        )}
      </section>

      <section className="features-section" aria-labelledby="features-title">
        <h2 id="features-title" className="section-title">
          Основные возможности
        </h2>
        <div className="features-row">
          <article className="feature-box">
            <h3>Управление проектами</h3>
            <p>
              Создавайте и организуйте проекты перевода. Управляйте файлами
              и отслеживайте статусы выполнения.
            </p>
          </article>

          <article className="feature-box">
            <h3>Редактор перевода</h3>
            <p>
              Удобный редактор для работы с переводами. Автоматический нейронный
              перевод и DeepL — инструменты для любого рабочего процесса.
            </p>
          </article>

          <article className="feature-box">
            <h3>Память переводов</h3>
            <p>
              Используйте накопленные переводы для ускорения работы.
              Система предлагает подходящие варианты из базы данных.
            </p>
          </article>
        </div>
      </section>

      <section className="cta-section" aria-labelledby="cta-title">
        <h2 id="cta-title" className="cta-title">
          {user ? 'Продолжить работу' : 'Начать работу'}
        </h2>
        <p className="cta-description">
          {user
            ? 'Вы авторизованы в системе. Перейдите к проектам для продолжения работы.'
            : 'Для доступа к возможностям платформы войдите в систему или зарегистрируйтесь.'}
        </p>
        <nav className="cta-buttons" aria-label="Действия">
          {user ? (
            <>
              <Link to="/user/projects" className="btn btn-primary">
                Мои проекты
              </Link>
              <Link to="/user" className="btn btn-secondary">
                Профиль
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary">
                Войти
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </section>
    </div>
  );
}