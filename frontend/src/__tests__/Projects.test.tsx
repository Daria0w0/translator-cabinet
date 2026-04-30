import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockGetProjects = vi.fn();
const mockCreateProject = vi.fn();
const mockDeleteProject = vi.fn();
const mockUploadProjectFile = vi.fn();

vi.mock('../services/api', () => ({
  getProjects: (...args: any[]) => mockGetProjects(...args),
  createProject: (...args: any[]) => mockCreateProject(...args),
  deleteProject: (...args: any[]) => mockDeleteProject(...args),
  uploadProjectFile: (...args: any[]) => mockUploadProjectFile(...args),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'user', username: 'testuser' },
    isAdmin: false,
  }),
}));

vi.mock('../hooks/useMeta', () => ({ useMeta: vi.fn() }));

import Projects from '../pages/Projects';

const mockProjects = [
  { id: 1, name: 'Project Alpha', description: 'Test', source_lang: 'eng_Latn', target_lang: 'rus_Cyrl', status: 'Новый', fileCount: 2, owner_id: 1 },
  { id: 2, name: 'Project Beta', description: '', source_lang: 'rus_Cyrl', target_lang: 'eng_Latn', status: 'В работе', fileCount: 0, owner_id: 1 },
];

const renderProjects = () =>
  render(
    <MemoryRouter>
      <Projects />
    </MemoryRouter>,
  );

describe('Projects — отображение списка', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProjects.mockResolvedValue(mockProjects);
  });

  it('показывает список загруженных проектов', async () => {
    renderProjects();
    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });
  });

  it('отображает количество проектов в статистике', async () => {
    renderProjects();
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
  });

  it('показывает пустое состояние если проектов нет', async () => {
    mockGetProjects.mockResolvedValue([]);
    renderProjects();
    await waitFor(() =>
      expect(screen.getByText(/проектов перевода пока нет/i)).toBeInTheDocument(),
    );
  });

  it('показывает статус проекта', async () => {
    renderProjects();
    await waitFor(() => expect(screen.getByText('Новый')).toBeInTheDocument());
  });
});

describe('Projects — создание проекта', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: 3, name: 'New Project', fileCount: 0, status: 'Новый', source_lang: 'eng_Latn', target_lang: 'rus_Cyrl', description: '', owner_id: 1 });
    mockUploadProjectFile.mockResolvedValue({});
  });

  it('открывает форму создания по кнопке', async () => {
    renderProjects();
    await waitFor(() => screen.getByText(/создать проект/i));
    await userEvent.click(screen.getByRole('button', { name: /\+ создать проект/i }));
    expect(screen.getByRole('heading', { name: /создать новый проект/i })).toBeInTheDocument();
  });

  it('показывает ошибку если название пустое', async () => {
    renderProjects();
    await waitFor(() => screen.getByText(/создать проект/i));
    await userEvent.click(screen.getByRole('button', { name: /\+ создать проект/i }));

    const form = document.querySelector('form.modal-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await waitFor(() =>
      expect(screen.getByText(/название проекта обязательно/i)).toBeInTheDocument(),
    );
  });

  it('закрывает форму при нажатии "Отменить"', async () => {
    renderProjects();
    await waitFor(() => screen.getByText(/создать проект/i));
    await userEvent.click(screen.getByRole('button', { name: /\+ создать проект/i }));
    await userEvent.click(screen.getByRole('button', { name: /отменить/i }));
    expect(screen.queryByRole('heading', { name: /создать новый проект/i })).not.toBeInTheDocument();
  });
});

describe('Projects — удаление проекта', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProjects.mockResolvedValue(mockProjects);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('вызывает deleteProject при подтверждении', async () => {
    mockDeleteProject.mockResolvedValueOnce(undefined);
    renderProjects();
    await waitFor(() => screen.getByText('Project Alpha'));
    const deleteButtons = screen.getAllByRole('button', { name: /удалить/i });
    await userEvent.click(deleteButtons[0]);
    expect(mockDeleteProject).toHaveBeenCalledWith(1);
  });

  it('не удаляет если пользователь отменил confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderProjects();
    await waitFor(() => screen.getByText('Project Alpha'));
    const deleteButtons = screen.getAllByRole('button', { name: /удалить/i });
    await userEvent.click(deleteButtons[0]);
    expect(mockDeleteProject).not.toHaveBeenCalled();
  });
});