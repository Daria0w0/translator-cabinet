import apiClient from './apiClient';

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

// ==================== ПРОЕКТЫ ====================
export async function getProjects(): Promise<Project[]> {
  const response = await apiClient.get<Project[]>('/api/projects/');
  return response.data;
}

export async function createProject(
  project: Omit<Project, 'id' | 'fileCount' | 'owner_id'>
): Promise<Project> {
  const response = await apiClient.post<Project>('/api/projects/', project);
  return response.data;
}

export async function getProject(id: number): Promise<Project> {
  const response = await apiClient.get<Project>(`/api/projects/${id}`);
  return response.data;
}

export async function deleteProject(id: number): Promise<void> {
  await apiClient.delete(`/api/projects/${id}`);
}

// ==================== ФАЙЛЫ ====================
export async function uploadProjectFile(
  projectId: number,
  file: File
): Promise<ProjectFile> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ProjectFile>(
    `/api/projects/${projectId}/upload-file`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return response.data;
}

export async function getProjectFiles(projectId: number): Promise<ProjectFile[]> {
  const response = await apiClient.get<ProjectFile[]>(
    `/api/projects/${projectId}/files`
  );
  return response.data;
}

export async function deleteProjectFile(
  projectId: number,
  fileId: number
): Promise<void> {
  await apiClient.delete(`/api/projects/${projectId}/files/${fileId}`);
}

export async function getFileContent(
  projectId: number,
  fileId: number
): Promise<FileContent> {
  const response = await apiClient.get<FileContent>(
    `/api/projects/${projectId}/files/${fileId}/content`
  );
  return response.data;
}

// ==================== СЕГМЕНТЫ ====================
export async function getFileSegments(
  projectId: number,
  fileId: number
): Promise<Segment[]> {
  try {
    const response = await apiClient.get<Segment[]>(
      `/api/projects/${projectId}/files/${fileId}/segments`
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) return [];
    throw error;
  }
}

export async function segmentFile(
  projectId: number,
  fileId: number,
  text: string,
  method: string = 'hybrid'
): Promise<Segment[]> {
  const response = await apiClient.post<Segment[]>(
    `/api/projects/${projectId}/files/${fileId}/segmentize`,
    { text, method }
  );
  return response.data;
}

export async function updateSegment(
  segmentId: number,
  segment: any
): Promise<Segment> {
  const response = await apiClient.put<Segment>(
    `/api/segments/${segmentId}`,
    segment
  );
  return response.data;
}

export async function createSegment(
  segment: Omit<Segment, 'id' | 'created_at' | 'updated_at'>
): Promise<Segment> {
  const response = await apiClient.post<Segment>('/api/segments/', segment);
  return response.data;
}

// ==================== ПЕРЕВОД ====================
export async function translateText(
  text: string,
  source_lang: string,
  target_lang: string
): Promise<string> {
  const response = await apiClient.post('/api/translation/translate', {
    text,
    source_lang,
    target_lang,
  });
  return response.data.translation;
}

export async function batchTranslateTexts(
  texts: string[],
  source_lang: string,
  target_lang: string
): Promise<string[]> {
  const response = await apiClient.post('/api/translation/batch', {
    texts,
    source_lang,
    target_lang,
  });
  return response.data.translations || [];
}