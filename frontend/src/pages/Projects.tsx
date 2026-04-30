import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getProjects,
  createProject,
  deleteProject,
  Project,
  uploadProjectFile,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useMeta } from '../hooks/useMeta';

const languageCodeMap: Record<string, string> = {
  Английский: 'eng_Latn',
  Русский: 'rus_Cyrl',
  Французский: 'fra_Latn',
  Немецкий: 'deu_Latn',
  Испанский: 'spa_Latn',
  Китайский: 'zho_Hans',
  Японский: 'jpn_Jpan',
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { user, isAdmin } = useAuth();

  useMeta({
    title: isAdmin ? 'Все проекты' : 'Мои проекты',
    description: 'Управление проектами перевода.',
    noIndex: true,
  });

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    source_lang: 'Английский',
    target_lang: 'Русский',
    file: null as File | null,
  });

  const [errors, setErrors] = useState({
    name: '',
    file: '',
    general: '',
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await getProjects();
      const projectsData = Array.isArray(response) ? response : (response as { items: Project[] }).items;
      setProjects(projectsData);
    } catch (error) {
      console.error('Ошибка:', error);
      setErrors((prev) => ({ ...prev, general: 'Не удалось загрузить проекты' }));
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = { name: '', file: '', general: '' };

    if (!newProject.name.trim()) {
      newErrors.name = 'Название проекта обязательно';
    } else if (newProject.name.trim().length < 2) {
      newErrors.name = 'Название должно быть не менее 2 символов';
    }

    if (!newProject.file) {
      newErrors.file = 'Файл обязателен для загрузки';
    }

    setErrors(newErrors);
    return !newErrors.name && !newErrors.file && !newErrors.general;
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewProject((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNewProject((prev) => ({ ...prev, file }));
    if (errors.file) {
      setErrors((prev) => ({ ...prev, file: '' }));
    }
  };

  const handleAddProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const sourceLangCode =
        languageCodeMap[newProject.source_lang] || newProject.source_lang;
      const targetLangCode =
        languageCodeMap[newProject.target_lang] || newProject.target_lang;

      const projectToCreate = {
        name: newProject.name.trim(),
        description: newProject.description.trim(),
        source_lang: sourceLangCode,
        target_lang: targetLangCode,
        status: 'Новый',
      };

      const createdProject = await createProject(projectToCreate);

      if (newProject.file) {
        await uploadProjectFile(createdProject.id, newProject.file);
      }

      await loadProjects();

      setNewProject({
        name: '',
        description: '',
        source_lang: 'Английский',
        target_lang: 'Русский',
        file: null,
      });
      setAdding(false);
      setErrors({ name: '', file: '', general: '' });
    } catch (error) {
      console.error('Ошибка создания проекта:', error);
      setErrors((prev) => ({ ...prev, general: 'Не удалось создать проект' }));
    }
  };

  const handleCancel = () => {
    setAdding(false);
    setNewProject({
      name: '',
      description: '',
      source_lang: 'Английский',
      target_lang: 'Русский',
      file: null,
    });
    setErrors({ name: '', file: '', general: '' });
  };

  const handleDeleteProject = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот проект?')) {
      return;
    }
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((project) => project.id !== id));
    } catch (error) {
      console.error('Ошибка удаления проекта:', error);
      setErrors((prev) => ({ ...prev, general: 'Не удалось удалить проект' }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'новый': return '#7c3aed';
      case 'в работе': return '#d97706';
      case 'завершен': return '#059669';
      default: return '#656d76';
    }
  };

  if (loading) {
    return (
      <div className="page projects-page">
        <div className="loading">Загрузка проектов...</div>
      </div>
    );
  }

  return (
    <div className="page projects-page">
      <div className="projects-header">
        <div className="header-content">
          <h1>{isAdmin ? 'Все проекты перевода' : 'Мои проекты перевода'}</h1>
          <p>
            {isAdmin
              ? 'Просмотр и управление всеми проектами в системе'
              : 'Управляйте вашими проектами и файлами для перевода'}
          </p>
        </div>
        {!adding && (
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            + Создать проект
          </button>
        )}
        {isAdmin && (
          <Link to="/admin" className="btn btn-secondary">
            Панель администратора
          </Link>
        )}
      </div>

      {errors.general && <div className="error-message">{errors.general}</div>}

      {!user ? (
        <div className="auth-warning">
          <h3>Требуется авторизация</h3>
          <p>Для просмотра и управления проектами необходимо войти в систему</p>
          <Link to="/login" className="btn btn-primary">
            Войти в систему
          </Link>
        </div>
      ) : (
        <>
          <div className="projects-stats">
            <div className="stat-card">
              <div className="stat-number">{projects.length}</div>
              <div className="stat-label">Всего проектов</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {projects.filter((p) => p.status === 'Новый').length}
              </div>
              <div className="stat-label">Новых</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {projects.filter((p) => p.status === 'В работе').length}
              </div>
              <div className="stat-label">В работе</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {projects.filter((p) => p.status === 'Завершен').length}
              </div>
              <div className="stat-label">Завершено</div>
            </div>
          </div>

          <div className="projects-grid">
            {projects.map((project) => (
              <div key={project.id} className="project-card">
                <div className="project-card-header">
                  <div className="project-title">
                    <h3>{project.name}</h3>
                    {isAdmin && project.owner_id && project.owner_id !== user.id && (
                      <span className="project-owner-badge">
                        Владелец ID: {project.owner_id}
                      </span>
                    )}
                  </div>
                  <span
                    className="project-status"
                    style={{ backgroundColor: getStatusColor(project.status) }}
                  >
                    {project.status}
                  </span>
                </div>

                {project.description && (
                  <p className="project-description">{project.description}</p>
                )}

                <div className="project-details">
                  <div className="language-pair">
                    <span className="source-lang">
                      {Object.entries(languageCodeMap).find(
                        ([, val]) => val === project.source_lang
                      )?.[0] || project.source_lang}
                    </span>
                    <span className="arrow">→</span>
                    <span className="target-lang">
                      {Object.entries(languageCodeMap).find(
                        ([, val]) => val === project.target_lang
                      )?.[0] || project.target_lang}
                    </span>
                  </div>
                  <div className="project-meta">
                    <span className="file-count">
                      {project.fileCount || 0} файл
                      {project.fileCount !== 1 ? 'а' : ''}
                    </span>
                    <span className="project-id">ID: {project.id}</span>
                  </div>
                </div>

                <div className="project-actions">
                  <Link
                    to={`/projects/${project.id}/translate`}
                    className="btn btn-primary"
                    title="Открыть редактор перевода"
                  >
                    Редактировать
                  </Link>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteProject(project.id)}
                    title="Удалить проект"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>

          {adding && (
            <div className="modal-overlay">
              <div className="modal">
                <form className="modal-form" onSubmit={handleAddProject}>
                  <div className="modal-header">
                    <h2>Создать новый проект</h2>
                    <button type="button" className="close-btn" onClick={handleCancel}>
                      ×
                    </button>
                  </div>

                  <div className="form-group">
                    <label htmlFor="name">Название проекта *</label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={newProject.name}
                      onChange={handleChange}
                      required
                      placeholder="Введите название проекта"
                      className={errors.name ? 'error' : ''}
                    />
                    {errors.name && (
                      <span className="field-error">{errors.name}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="description">Описание проекта</label>
                    <textarea
                      id="description"
                      name="description"
                      value={newProject.description}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Опишите ваш проект перевода..."
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="file">Файл для перевода *</label>
                    <input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      required
                      accept=".docx,.xlsx,.txt,.pdf,.doc,.rtf"
                      className={errors.file ? 'error' : ''}
                    />
                    {errors.file && (
                      <span className="field-error">{errors.file}</span>
                    )}
                    {newProject.file && (
                      <div className="selected-file">
                        Выбран файл: <strong>{newProject.file.name}</strong>
                        <br />
                        <small>
                          Размер:{' '}
                          {(newProject.file.size / 1024 / 1024).toFixed(2)} MB
                        </small>
                      </div>
                    )}
                    <div className="file-hint">
                      Поддерживаемые форматы: .docx, .doc, .pdf, .txt, .rtf, .xlsx
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="source_lang">Исходный язык *</label>
                      <select
                        id="source_lang"
                        name="source_lang"
                        value={newProject.source_lang}
                        onChange={handleChange}
                        required
                      >
                        {Object.keys(languageCodeMap).map((lang) => (
                          <option key={lang} value={lang}>
                            {lang}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="target_lang">Язык перевода *</label>
                      <select
                        id="target_lang"
                        name="target_lang"
                        value={newProject.target_lang}
                        onChange={handleChange}
                        required
                      >
                        {Object.keys(languageCodeMap).map((lang) => (
                          <option key={lang} value={lang}>
                            {lang}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      Создать проект
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCancel}
                    >
                      Отменить
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {projects.length === 0 && !adding && (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>Проектов перевода пока нет</h3>
              <p>
                Создайте свой первый проект перевода, загрузив файл для работы
              </p>
              <button className="btn btn-primary" onClick={() => setAdding(true)}>
                + Создать первый проект
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}