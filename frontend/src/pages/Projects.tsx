import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, createProject, deleteProject, Project } from '../services/api';
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
  });

  const [errors, setErrors] = useState({
    name: '',
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
    const newErrors = { name: '', general: '' };
    
    if (!newProject.name.trim()) {
      newErrors.name = 'Название проекта обязательно';
    } else if (newProject.name.trim().length < 2) {
      newErrors.name = 'Название должно быть не менее 2 символов';
    }

    setErrors(newErrors);
    return !newErrors.name && !newErrors.general;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProject(prev => ({ ...prev, [name]: value }));
    // Очищаем ошибку при изменении поля
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({...prev, [name]: ''}));
    }
  };

  const handleAddProject = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const projectToCreate = {
        name: newProject.name.trim(),
        description: newProject.description.trim(),
        sourceLang: newProject.sourceLang,
        targetLang: newProject.targetLang,
        status: 'Новый',
      };

      const createdProject = await createProject(projectToCreate);
      setProjects(prev => [...prev, createdProject]);

      setNewProject({
        name: '',
        description: '',
        sourceLang: 'Английский',
        targetLang: 'Русский',
      });
      setAdding(false);
      setErrors({ name: '', general: '' });
    } catch (error) {
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
    });
    setErrors({ name: '', general: '' });
  };

  const handleDeleteProject = async (id: number) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот проект?")) {
      return;
    }
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(project => project.id !== id));
    } catch (error) {
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
          <h1>Мои проекты</h1>
          <p>Управляйте вашими проектами перевода</p>
        </div>
        {!adding && (
          <button 
            className="btn-primary" 
            onClick={() => setAdding(true)}
          >
            + Новый проект
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
                {projects.filter(p => p.status === 'Завершен').length}
              </div>
              <div className="stat-label">Завершено</div>
            </div>
          </div>

          <div className="projects-grid">
            {projects.map(project => (
              <div key={project.id} className="project-card">
                <div className="project-header">
                  <h2>{project.name}</h2>
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
                  <div className="project-id">ID: {project.id}</div>
                </div>

                <div className="project-actions">
                  <Link
                    to={`/projects/edit/${project.id}`}
                    className="btn-secondary"
                  >
                    Открыть
                  </Link>
                  <button
                    className="btn-danger"
                    onClick={() => handleDeleteProject(project.id)}
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
                    <label htmlFor="description">Описание</label>
                    <textarea
                      id="description"
                      name="description"
                      value={newProject.description}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Опишите ваш проект..."
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="sourceLang">Исходный язык</label>
                      <select 
                        id="sourceLang"
                        name="sourceLang" 
                        value={newProject.sourceLang} 
                        onChange={handleChange}
                      >
                        <option>Английский</option>
                        <option>Русский</option>
                        <option>Французский</option>
                        <option>Немецкий</option>
                        <option>Испанский</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="targetLang">Язык перевода</label>
                      <select 
                        id="targetLang"
                        name="targetLang" 
                        value={newProject.targetLang} 
                        onChange={handleChange}
                      >
                        <option>Русский</option>
                        <option>Английский</option>
                        <option>Французский</option>
                        <option>Немецкий</option>
                        <option>Испанский</option>
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
              <div className="empty-icon">📁</div>
              <h3>Проектов пока нет</h3>
              <p>Создайте свой первый проект перевода</p>
              <button 
                className="btn-primary" 
                onClick={() => setAdding(true)}
              >
                Создать проект
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}