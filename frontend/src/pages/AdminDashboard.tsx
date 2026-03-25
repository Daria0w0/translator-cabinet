import React, { useState, useEffect } from 'react';
import { adminService, AdminUser } from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './styles/AdminDashboard.css';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    loadUsers();
  }, [user, navigate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId: number, block: boolean) => {
    try {
      await adminService.updateUser(userId, { is_blocked: block });
      await loadUsers();
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Удалить пользователя? Все его проекты будут удалены.')) return;
    try {
      await adminService.deleteUser(userId);
      await loadUsers();
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  const handleViewUserProjects = (userId: number) => {
    navigate(`/admin/users/${userId}/projects`);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === '' || user.role === roleFilter;
    const matchesStatus = statusFilter === '' || 
      (statusFilter === 'blocked' && user.is_blocked) ||
      (statusFilter === 'active' && !user.is_blocked);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return <div className="loading">Загрузка пользователей...</div>;
  }

  return (
    <div className="projects-page">
      <div className="projects-header">
        <div className="header-content">
          <h1>Панель администратора</h1>
          <p>Управление пользователями и их проектами</p>
        </div>
      </div>

      <div className="projects-stats">
        <div className="stat-card">
          <div className="stat-number">{users.length}</div>
          <div className="stat-label">Всего пользователей</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{users.filter(u => !u.is_blocked).length}</div>
          <div className="stat-label">Активных</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{users.filter(u => u.is_blocked).length}</div>
          <div className="stat-label">Заблокировано</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{users.reduce((acc, u) => acc + u.project_count, 0)}</div>
          <div className="stat-label">Всего проектов</div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="filters-card">
        <div className="filters-row">
          <input
            type="text"
            placeholder="Поиск по имени или email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Все роли</option>
            <option value="user">Пользователи</option>
            <option value="admin">Администраторы</option>
          </select>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Все статусы</option>
            <option value="active">Активные</option>
            <option value="blocked">Заблокированные</option>
          </select>
        </div>
        <div className="filters-info">
          Найдено: {filteredUsers.length} из {users.length}
        </div>
      </div>

      {/* Таблица пользователей */}
      <div className="table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Имя пользователя</th>
              <th>Email</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Проектов</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id} className={u.is_blocked ? 'blocked-row' : ''}>
                <td>{u.id}</td>
                <td>
                  <div className="user-name">{u.username}</div>
                  {u.full_name && <div className="user-fullname">{u.full_name}</div>}
                </td>
                <td>{u.email}</td>
                <td>
                  <span className={`role-badge ${u.role}`}>
                    {u.role === 'admin' ? 'Администратор' : 'Пользователь'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${u.is_blocked ? 'blocked' : 'active'}`}>
                    {u.is_blocked ? 'Заблокирован' : 'Активен'}
                  </span>
                </td>
                <td>{u.project_count}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleViewUserProjects(u.id)}
                      className="btn btn-primary btn-small"
                    >
                      Проекты
                    </button>
                    <button
                      onClick={() => handleBlockUser(u.id, !u.is_blocked)}
                      className={`btn btn-small ${u.is_blocked ? 'btn-secondary' : 'btn-warning'}`}
                      disabled={u.id === user?.id}
                    >
                      {u.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="btn btn-danger btn-small"
                      disabled={u.id === user?.id}
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}