export interface Project {
  id: number;
  name: string;
  description: string;
  sourceLang: string;
  targetLang: string;
  fileName?: string;
  status: string;
}

const API_URL = 'http://localhost:8000';

export async function getProjects(): Promise<Project[]> {
  const response = await fetch(`${API_URL}/projects/`);
  if (!response.ok) {
    throw new Error('Ошибка при загрузке проектов');
  }
  return response.json();
}

export async function createProject(project: Omit<Project, 'id'>): Promise<Project> {
  const response = await fetch(`${API_URL}/projects/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(project),
  });
  
  if (!response.ok) {
    throw new Error('Ошибка при создании проекта');
  }
  return response.json();
}

export async function getProject(id: number): Promise<Project> {
  const response = await fetch(`${API_URL}/projects/${id}`);
  if (!response.ok) {
    throw new Error('Ошибка при загрузке проекта');
  }
  return response.json();
}

export async function deleteProject(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/projects/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Ошибка при удалении проекта");
  }
}