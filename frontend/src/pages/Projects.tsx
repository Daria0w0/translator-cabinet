import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, createProject, deleteProject, Project } from '../services/api';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectsData = await getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Не удалось загрузить проекты. Убедитесь, что бэкенд запущен.');
    } finally {
      setLoading(false);
    }
  };

  const [adding, setAdding] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    sourceLang: 'Английский',
    targetLang: 'Русский',
    file: null as File | null,
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProject(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewProject(prev => ({ ...prev, file: e.target.files![0] }));
    }
  };

  const handleAddProject = async (e: FormEvent) => {
    e.preventDefault();

    if (!newProject.name.trim()) {
      alert('Пожалуйста, введите название проекта');
      return;
    }

    try {
      const projectToCreate = {
        name: newProject.name.trim(),
        description: newProject.description.trim(),
        sourceLang: newProject.sourceLang,
        targetLang: newProject.targetLang,
        fileName: newProject.file ? newProject.file.name : undefined,
        status: 'Новый',
      };

      const createdProject = await createProject(projectToCreate);

      setProjects(prev => [...prev, createdProject]);

      setNewProject({
        name: '',
        description: '',
        sourceLang: 'Английский',
        targetLang: 'Русский',
        file: null,
      });
      setAdding(false);

      alert('Проект успешно создан!');
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Не удалось создать проект. Проверьте подключение к бэкенду.');
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
  };

  const handleDeleteProject = async (id: number) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот проект?")) {
      return;
    }
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(project => project.id !== id));
      alert("Проект успешно удалён");
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Не удалось удалить проект. Проверьте подключение к бэкенду.");
    }
  };

  if (loading) {
    return <div className="page projects-page">Загрузка проектов...</div>;
  }

  return (
    <div className="page projects-page">
      <h1>Мои проекты</h1>

      {projects.map(project => (
        <div key={project.id} className="project-card">
          <h2>{project.name} (ID: {project.id})</h2>
          <p><strong>Описание:</strong> {project.description}</p>
          <p><strong>Исходный язык:</strong> {project.sourceLang}</p>
          <p><strong>Язык перевода:</strong> {project.targetLang}</p>
          {project.fileName && <p><strong>Файл:</strong> {project.fileName}</p>}
          <p><strong>Статус:</strong> {project.status}</p>

          <Link
            to={`/projects/edit/${project.id}`}
            className="btn-link"
            style={{ marginTop: '10px', display: 'inline-block', marginRight: '10px' }}
          >
            Редактировать
          </Link>

          <button
            className="btn-link"
            style={{ marginTop: '10px', display: 'inline-block' }}
            onClick={() => handleDeleteProject(project.id)}
          >
            Удалить
          </button>
        </div>
      ))}

      {!adding && (
        <button className="btn-link" style={{ marginTop: '20px' }} onClick={() => setAdding(true)}>
          Добавить проект
        </button>
      )}

      {adding && (
        <form className="project-card add-project-form" onSubmit={handleAddProject} style={{ marginTop: '20px' }}>
          <h2>Новый проект</h2>

          <label>
            Название проекта:
            <input
              type="text"
              name="name"
              value={newProject.name}
              onChange={handleChange}
              required
              className="input-text"
            />
          </label>

          <label>
            Описание:
            <textarea
              name="description"
              value={newProject.description}
              onChange={handleChange}
              rows={3}
              className="input-textarea"
            />
          </label>

          <label>
            Исходный язык:
            <select name="sourceLang" value={newProject.sourceLang} onChange={handleChange} className="input-select">
              <option>Английский</option>
              <option>Русский</option>
            </select>
          </label>

          <label>
            Язык перевода:
            <select name="targetLang" value={newProject.targetLang} onChange={handleChange} className="input-select">
              <option>Английский</option>
              <option>Русский</option>
            </select>
          </label>

          <label>
            Загрузить файл:
            <input type="file" onChange={handleFileChange} />
          </label>

          <div style={{ marginTop: '10px' }}>
            <button type="submit" className="btn-link" style={{ marginRight: '10px' }}>
              Добавить
            </button>
            <button type="button" className="btn-link btn-cancel" onClick={handleCancel}>
              Отменить
            </button>
          </div>
        </form>
      )}
    </div>
  );
}