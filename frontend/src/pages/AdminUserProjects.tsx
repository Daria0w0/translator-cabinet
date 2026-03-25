import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService, AdminProject } from '../services/adminService';
import './styles/AdminUserProjects.css';

export default function AdminUserProjects() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (userId) {
      loadUserProjects();
      loadUserName();
    }
  }, [userId]);

  const loadUserProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await adminService.getProjects({ user_id: Number(userId) });
      setProjects(projectsData);
    } catch (error) {
      console.error('Ошибка загрузки проектов:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserName = async () => {
    try {
      const users = await adminService.getUsers();
      const user = users.find(u => u.id === Number(userId));
      if (user) {
        setUserName(user.username);
      }
    } catch (error) {
      console.error('Ошибка загрузки имени пользователя:', error);
    }
  };

  const handleDeleteProject = async (projectId: number, projectName: string) => {
    if (!window.confirm(`Удалить проект "${projectName}"?`)) {
      return;
    }
    try {
      await adminService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (error) {
      console.error('Ошибка удаления проекта:', error);
    }
  };

  const handleBack = () => {
    navigate('/admin');
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchTerm === '' || 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === '' || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const uniqueStatuses = [...new Set(projects.map(p => p.status))];

  if (loading) {
    return <div className="loading">Загрузка проектов...</div>;
  }

  return (
    <div className="projects-page">
      <div className="projects-header">
        <div className="header-content">
          <button onClick={handleBack} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
            ← Назад
          </button>
          <h1>Проекты пользователя {userName}</h1>
          <p>Всего проектов: {projects.length}</p>
        </div>
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              flex: 1,
              padding: '0.5rem',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              fontSize: '0.9rem'
            }}
          />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ 
              padding: '0.5rem',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              fontSize: '0.9rem',
              minWidth: '150px'
            }}
          >
            <option value="">Все статусы</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <h3>Проекты не найдены</h3>
          <p>У пользователя нет проектов или они не соответствуют фильтрам</p>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map(project => (
            <div key={project.id} className="project-card">
              <div className="project-card-header">
                <h3>{project.name}</h3>
                <span className={`project-status`} style={{ 
                  backgroundColor: 
                    project.status === 'Новый' ? '#7c3aed' :
                    project.status === 'В работе' ? '#d97706' :
                    project.status === 'Завершен' ? '#059669' : '#64748b'
                }}>
                  {project.status}
                </span>
              </div>
              
              {project.description && (
                <p className="project-description">{project.description}</p>
              )}
              
              <div className="language-pair">
                <span className="source-lang">{project.source_lang}</span>
                <span className="arrow">→</span>
                <span className="target-lang">{project.target_lang}</span>
              </div>
              
              <div className="project-meta">
                <span className="file-count">{project.fileCount} файлов</span>
                <span>{project.created_at ? new Date(project.created_at).toLocaleDateString('ru-RU') : ''}</span>
              </div>

              <div className="project-actions">
                <button
                  onClick={() => handleDeleteProject(project.id, project.name)}
                  className="btn btn-danger"
                >
                  Удалить проект
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}