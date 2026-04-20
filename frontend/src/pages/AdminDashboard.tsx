import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminService, AdminUser } from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import debounce from 'lodash/debounce';
import { useMeta } from '../hooks/useMeta';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useMeta({
    title: 'Панель администратора',
    description: 'Управление пользователями и проектами.',
    noIndex: true,
  });

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTerm = searchParams.get('search') || '';
  const roleFilter = searchParams.get('role') || '';
  const statusFilter = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const skip = (page - 1) * limit;

  const [localSearch, setLocalSearch] = useState(searchTerm);

  const debouncedUpdateSearch = useMemo(
    () =>
      debounce((value: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) newParams.set('search', value);
        else newParams.delete('search');
        newParams.set('page', '1');
        setSearchParams(newParams);
      }, 500),
    [searchParams, setSearchParams],
  );

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    debouncedUpdateSearch(value);
  };

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const newParams = new URLSearchParams(searchParams);
      if (value) newParams.set(key, value);
      else newParams.delete(key);
      newParams.set('page', '1');
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('page', String(newPage));
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams],
  );

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminService.getUsersPaginated({
        search: searchTerm || undefined,
        role: roleFilter || undefined,
        is_blocked:
          statusFilter === 'blocked' ? true : statusFilter === 'active' ? false : undefined,
        skip,
        limit,
      });

      setUsers(response.items);
      setTotal(response.total);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Не удалось загрузить пользователей');
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, statusFilter, skip, limit]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleBlockUser = async (userId: number, block: boolean) => {
    try {
      await adminService.updateUser(userId, { is_blocked: block });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_blocked: block } : u)));
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Не удалось изменить статус пользователя');
      await loadUsers();
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Удалить пользователя? Все его проекты будут удалены.')) return;
    try {
      await adminService.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setTotal((prev) => prev - 1);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Не удалось удалить пользователя');
    }
  };

  const handleViewUserProjects = (userId: number) => {
    navigate(`/admin/users/${userId}/projects`);
  };

  const stats = useMemo(() => {
    const activeCount = users.filter((u) => !u.is_blocked).length;
    const blockedCount = users.filter((u) => u.is_blocked).length;
    const totalProjects = users.reduce((acc, u) => acc + (u.project_count || 0), 0);
    return { activeCount, blockedCount, totalProjects };
  }, [users]);

  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/');
  }, [user, navigate]);

  if (loading && users.length === 0) {
    return (
      <div className="admin-dashboard" aria-busy="true" aria-label="Загрузка данных">
        <div className="projects-header">
          <div className="header-content">
            <h1>Панель администратора</h1>
            <p>Управление пользователями и их проектами</p>
          </div>
        </div>
        <div className="skeleton-table" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-row">
              {Array(6).fill(null).map((_, j) => (
                <div key={j} className="skeleton-cell" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="admin-dashboard">
        <div className="projects-header">
          <div className="header-content">
            <h1>Панель администратора</h1>
          </div>
        </div>
        <div className="error-state" role="alert">
          <div className="error-icon" aria-hidden="true">⚠️</div>
          <h2>Ошибка загрузки</h2>
          <p>{error}</p>
          <button onClick={loadUsers} className="btn btn-primary">
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="admin-dashboard" aria-labelledby="admin-title">
      <div className="projects-header">
        <div className="header-content">
          <h1 id="admin-title">Панель администратора</h1>
          <p>Управление пользователями и их проектами</p>
        </div>
      </div>

      {/* Статистика */}
      <section className="projects-stats" aria-label="Статистика пользователей">
        <div className="stat-card">
          <div className="stat-number">{total}</div>
          <div className="stat-label">Всего пользователей</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.activeCount}</div>
          <div className="stat-label">Активных</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.blockedCount}</div>
          <div className="stat-label">Заблокировано</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalProjects}</div>
          <div className="stat-label">Всего проектов</div>
        </div>
      </section>

      {/* Фильтры */}
      <div className="filters-card">
        <div className="filters-row">
          <label htmlFor="admin-search" className="sr-only">
            Поиск пользователей
          </label>
          <input
            id="admin-search"
            type="search"
            placeholder="Поиск по имени или email..."
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="filter-input"
          />
          <label htmlFor="role-filter" className="sr-only">
            Фильтр по роли
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => updateFilter('role', e.target.value)}
            className="filter-select"
          >
            <option value="">Все роли</option>
            <option value="user">Пользователи</option>
            <option value="admin">Администраторы</option>
          </select>
          <label htmlFor="status-filter" className="sr-only">
            Фильтр по статусу
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="filter-select"
          >
            <option value="">Все статусы</option>
            <option value="active">Активные</option>
            <option value="blocked">Заблокированные</option>
          </select>
        </div>
        <div className="filters-info" aria-live="polite">
          {loading ? (
            <span className="loading-indicator">Обновление...</span>
          ) : (
            <span>
              Найдено: {total} пользователей • Страница {page} из {totalPages || 1}
            </span>
          )}
        </div>
      </div>

      {/* Таблица */}
      <div className="table-card">
        {users.length === 0 ? (
          <div className="empty-state-table">
            <p>Пользователи не найдены</p>
          </div>
        ) : (
          <>
            <table className="admin-table">
              <caption className="sr-only">Список пользователей системы</caption>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Имя пользователя</th>
                  <th scope="col">Email</th>
                  <th scope="col">Роль</th>
                  <th scope="col">Статус</th>
                  <th scope="col">Проектов</th>
                  <th scope="col">Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
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
                    <td>{u.project_count || 0}</td>
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
                          aria-label={u.is_blocked ? `Разблокировать ${u.username}` : `Заблокировать ${u.username}`}
                        >
                          {u.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="btn btn-danger btn-small"
                          disabled={u.id === user?.id}
                          aria-label={`Удалить пользователя ${u.username}`}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <nav className="pagination" aria-label="Пагинация">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1 || loading}
                  className="pagination-btn"
                >
                  ← Предыдущая
                </button>
                <span className="pagination-info" aria-current="page">
                  Страница {page} из {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages || loading}
                  className="pagination-btn"
                >
                  Следующая →
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}