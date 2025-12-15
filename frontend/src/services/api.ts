export interface Project {
  id: number;
  name: string;
  description: string;
  source_lang: string;
  target_lang: string;
  fileName?: string;
  status: string;
  owner_id?: number;
  fileCount: number;
}

export interface ProjectFile {
  id: number;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface FileContent {
  content: string;
  type: string;
  file_path?: string;
}

export interface Segment {
  id: number;
  project_file_id: number;
  segment_index: number;
  original_text: string;
  translated_text?: string | null;
  status: string;
  translator_id?: number;
  editor_id?: number;
  created_at: string;
  updated_at: string;
}

const API_URL = 'http://localhost:8000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

function getAuthHeadersMultipart(): HeadersInit {
  const token = localStorage.getItem('access_token');
  return {
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

// ==================== ПРОЕКТЫ ====================
export async function getProjects(): Promise<Project[]> {
  const response = await fetch(`${API_URL}/api/projects/`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Требуется авторизация');
    }
    throw new Error('Ошибка при загрузке проектов');
  }
  return response.json();
}

export async function createProject(project: Omit<Project, 'id' | 'fileCount' | 'owner_id'>): Promise<Project> {
  const response = await fetch(`${API_URL}/api/projects/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(project),
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Требуется авторизация');
    }
    throw new Error('Ошибка при создании проекта');
  }
  return response.json();
}

export async function getProject(id: number): Promise<Project> {
  const response = await fetch(`${API_URL}/api/projects/${id}`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Требуется авторизация');
    }
    throw new Error('Ошибка при загрузке проекта');
  }
  return response.json();
}

export async function deleteProject(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/projects/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Требуется авторизация');
    }
    throw new Error("Ошибка при удалении проекта");
  }
}

// ==================== ФАЙЛЫ ====================
export async function uploadProjectFile(projectId: number, file: File): Promise<ProjectFile> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_URL}/api/projects/${projectId}/upload-file`, {
    method: 'POST',
    headers: getAuthHeadersMultipart(),
    body: formData,
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Требуется авторизация');
    }
    throw new Error('Ошибка при загрузке файла');
  }
  return response.json();
}

export async function getProjectFiles(projectId: number): Promise<ProjectFile[]> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/files`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Требуется авторизация');
    }
    throw new Error('Ошибка при загрузке файлов проекта');
  }
  return response.json();
}

export async function deleteProjectFile(projectId: number, fileId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/files/${fileId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Требуется авторизация');
    }
    throw new Error("Ошибка при удалении файла");
  }
}

export async function getFileContent(projectId: number, fileId: number): Promise<FileContent> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/files/${fileId}/content`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Требуется авторизация');
    }
    throw new Error('Ошибка при загрузке содержимого файла');
  }
  return response.json();
}

// ==================== СЕГМЕНТЫ ====================
export async function getFileSegments(projectId: number, fileId: number): Promise<Segment[]> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/files/${fileId}/segments`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error('Ошибка при загрузке сегментов');
  }
  return response.json();
}

export async function segmentFile(projectId: number, fileId: number, text: string, method: string = 'hybrid'): Promise<Segment[]> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/files/${fileId}/segmentize`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text, method })
  });
  if (!response.ok) {
    throw new Error('Ошибка сегментации файла');
  }
  return response.json();
}

export async function updateSegment(segmentId: number, segment: any): Promise<Segment> {
  const response = await fetch(`${API_URL}/api/segments/${segmentId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(segment),
  });
  if (!response.ok) {
    throw new Error('Ошибка при обновлении сегмента');
  }
  return response.json();
}

export async function createSegment(segment: Omit<Segment, 'id' | 'created_at' | 'updated_at'>): Promise<Segment> {
  const response = await fetch(`${API_URL}/api/segments/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(segment),
  });

  if (!response.ok) {
    throw new Error('Ошибка при создании сегмента');
  }
  return response.json();
}

// ==================== ПЕРЕВОД ====================
export async function translateText(text: string, source_lang: string, target_lang: string): Promise<string> {
  const response = await fetch(`${API_URL}/api/translation/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      source_lang,
      target_lang
    })
  });
  
  if (!response.ok) {
    throw new Error('Ошибка при переводе');
  }
  const data = await response.json();
  return data.translation;
}

export async function batchTranslateTexts(texts: string[], source_lang: string, target_lang: string): Promise<string[]> {
  const response = await fetch(`${API_URL}/api/translation/batch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      texts,
      source_lang,
      target_lang
    })
  });
  if (!response.ok) {
    throw new Error('Ошибка пакетного перевода');
  }
  const data = await response.json();
  return data.translations || [];
}