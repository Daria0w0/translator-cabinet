import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1 className="hero-title">
          Добро пожаловать в <span className="gradient-text">Кабинет Переводчика</span>
        </h1>
        <p className="hero-description">
          Веб-платформа для работы с переводами. Управляйте проектами, 
          работайте с памятью переводов и редактируйте тексты в одном месте.
        </p>
        {!user && (
          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary">
              Войти в систему
            </Link>
            <Link to="/register" className="btn btn-secondary">
              Зарегистрироваться
            </Link>
          </div>
        )}
      </div>

      <div className="features-section">
        <h2 className="section-title">Основные возможности</h2>
        <div className="features-row">
          <div className="feature-box">
            <h3>Управление проектами</h3>
            <p>
              Создавайте и организуйте проекты перевода. Управляйте файлами 
              и отслеживайте статусы выполнения.
            </p>
          </div>

          <div className="feature-box">
            <h3>Редактор перевода</h3>
            <p>
              Удобный редактор для работы с переводами. Автоматический перевод 
              и удобные инструменты для редактирования текстов.
            </p>
          </div>

          <div className="feature-box">
            <h3>Память переводов</h3>
            <p>
              Используйте накопленные переводы для ускорения работы. 
              Система предлагает подходящие варианты из базы данных.
            </p>
          </div>
        </div>
      </div>

      <div className="cta-section">
        <h3 className="cta-title">
          {user ? 'Продолжить работу' : 'Начать работу'}
        </h3>
        <p className="cta-description">
          {user 
            ? 'Вы авторизованы в системе. Перейдите к проектам для продолжения работы.'
            : 'Для доступа к возможностям платформы войдите в систему или зарегистрируйтесь.'
          }
        </p>
        <div className="cta-buttons">
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
        </div>
      </div>
    </div>
  );
}