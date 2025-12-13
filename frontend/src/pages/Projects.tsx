import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, createProject, deleteProject, Project, uploadProjectFile } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { user } = useAuth();
  
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    sourceLang: 'Английский',
    targetLang: 'Русский',
    file: null as File | null,
  });

  const [errors, setErrors] = useState({
    name: '',
    file: '',
    general: ''
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectsData = await getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Ошибка:', error);
      setErrors(prev => ({...prev, general: 'Не удалось загрузить проекты'}));
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProject(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({...prev, [name]: ''}));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNewProject(prev => ({ ...prev, file }));
    if (errors.file) {
      setErrors(prev => ({...prev, file: ''}));
    }
  };

  const handleAddProject = async (e: FormEvent) => {
  e.preventDefault();

  if (!validateForm()) return;

  try {
    console.log('Начало создания проекта...');
    
    const projectToCreate = {
      name: newProject.name.trim(),
      description: newProject.description.trim(),
      sourceLang: newProject.sourceLang,
      targetLang: newProject.targetLang,
      status: 'Новый',
    };

    console.log('Создаем проект в базе...');
    const createdProject = await createProject(projectToCreate);
    console.log('Проект создан, ID:', createdProject.id);
    
    if (newProject.file) {
      console.log('Загружаем файл...', newProject.file.name);
      await uploadProjectFile(createdProject.id, newProject.file);
      console.log('Файл загружен');
    }

    console.log('Перезагружаем список проектов...');
    await loadProjects();
    console.log('Список проектов обновлен');

    setNewProject({
      name: '',
      description: '',
      sourceLang: 'Английский',
      targetLang: 'Русский',
      file: null,
    });
    setAdding(false);
    setErrors({ name: '', file: '', general: '' });
    
    console.log('Проект успешно создан!');
  } catch (error) {
    console.error('Ошибка создания проекта:', error);
    setErrors(prev => ({...prev, general: 'Не удалось создать проект'}));
    }
  };

  const handleCancel = () => {
    setAdding(false);
    setNewProject({
      name: '',
      description: '',
      sourceLang: 'Английский',
      targetLang: 'Русский',
      file: null,
    });
    setErrors({ name: '', file: '', general: '' });
  };

  const handleDeleteProject = async (id: number) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот проект?")) {
      return;
    }
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(project => project.id !== id));
    } catch (error) {
      console.error('Ошибка удаления проекта:', error);
      setErrors(prev => ({...prev, general: 'Не удалось удалить проект'}));
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
      <div className="page-header">
        <div className="header-content">
          <h1>Мои проекты перевода</h1>
          <p>Управляйте вашими проектами и файлами для перевода</p>
        </div>
        {!adding && (
          <button 
            className="btn-primary" 
            onClick={() => setAdding(true)}
          >
            + Создать проект
          </button>
        )}
      </div>

      {errors.general && (
        <div className="error-message">{errors.general}</div>
      )}

      {!user ? (
        <div className="auth-warning">
          <h3>Требуется авторизация</h3>
          <p>Для просмотра и управления проектами необходимо войти в систему</p>
          <Link to="/login" className="btn-primary">
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
                {projects.filter(p => p.status === 'Новый').length}
              </div>
              <div className="stat-label">Новых</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {projects.filter(p => p.status === 'В работе').length}
              </div>
              <div className="stat-label">В работе</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {projects.filter(p => p.status === 'Завершен').length}
              </div>
              <div className="stat-label">Завершено</div>
            </div>
          </div>

          <div className="projects-grid">
            {projects.map(project => (
              <div key={project.id} className="project-card">
                <div className="project-header">
                  <div className="project-title">
                    <h2>{project.name}</h2>
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
                    <span className="source-lang">{project.sourceLang}</span>
                    <span className="arrow">→</span>
                    <span className="target-lang">{project.targetLang}</span>
                  </div>
                  <div className="file-info">
                    <span className="file-count">
                      {project.fileCount || 0} файл{project.fileCount !== 1 ? 'а' : ''}
                    </span>
                    {project.fileCount > 0 && (
                      <span className="file-ready">Файл загружен</span>
                    )}
                  </div>
                  <div className="project-id">ID: {project.id}</div>
                </div>

                <div className="project-actions">
                  <Link
                    to={`/projects/${project.id}/translate`}
                    className="btn-primary"
                    title="Открыть редактор перевода"
                  >
                    Редактировать
                  </Link>
                  <button
                    className="btn-danger"
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
                <form className="add-project-form" onSubmit={handleAddProject}>
                  <div className="modal-header">
                    <h2>Создать новый проект</h2>
                    <button type="button" className="close-btn" onClick={handleCancel}>×</button>
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
                    {errors.name && <span className="field-error">{errors.name}</span>}
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
                    {errors.file && <span className="field-error">{errors.file}</span>}
                    {newProject.file && (
                      <div className="file-info-selected">
                        Выбран файл: <strong>{newProject.file.name}</strong>
                        <br />
                        <small>Размер: {(newProject.file.size / 1024 / 1024).toFixed(2)} MB</small>
                      </div>
                    )}
                    <div className="file-hint">
                      Поддерживаемые форматы: .docx, .doc, .pdf, .txt, .rtf, .xlsx
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="sourceLang">Исходный язык *</label>
                      <select 
                        id="sourceLang"
                        name="sourceLang" 
                        value={newProject.sourceLang} 
                        onChange={handleChange}
                        required
                      >
                        <option value="Английский">Английский</option>
                        <option value="Русский">Русский</option>
                        <option value="Французский">Французский</option>
                        <option value="Немецкий">Немецкий</option>
                        <option value="Испанский">Испанский</option>
                        <option value="Китайский">Китайский</option>
                        <option value="Японский">Японский</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="targetLang">Язык перевода *</label>
                      <select 
                        id="targetLang"
                        name="targetLang" 
                        value={newProject.targetLang} 
                        onChange={handleChange}
                        required
                      >
                        <option value="Английский">Английский</option>
                        <option value="Русский">Русский</option>
                        <option value="Французский">Французский</option>
                        <option value="Немецкий">Немецкий</option>
                        <option value="Испанский">Испанский</option>
                        <option value="Китайский">Китайский</option>
                        <option value="Японский">Японский</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      Создать проект
                    </button>
                    <button type="button" className="btn-secondary" onClick={handleCancel}>
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
              <p>Создайте свой первый проект перевода, загрузив файл для работы</p>
              <button 
                className="btn-primary" 
                onClick={() => setAdding(true)}
              >
                + Создать первый проект
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}