import apiClient from './apiClient';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface ProjectFilters {
  search?: string;
  status?: string;
  source_lang?: string;
  target_lang?: string;
  sort_by?: 'created_at' | 'name' | 'status';
  sort_order?: 'asc' | 'desc';
  skip?: number;
  limit?: number;
}

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
export async function getProjects(filters?: ProjectFilters): Promise<Project[]> {
  const params: any = {
    skip: filters?.skip || 0,
    limit: filters?.limit || 100,
    sort_by: filters?.sort_by || 'created_at',
    sort_order: filters?.sort_order || 'desc',
  };
  if (filters?.search) params.search = filters.search;
  if (filters?.status) params.status = filters.status;
  if (filters?.source_lang) params.source_lang = filters.source_lang;
  if (filters?.target_lang) params.target_lang = filters.target_lang;
  const response = await apiClient.get<PaginatedResponse<Project>>('/api/projects/', { params });
  return response.data.items;
}

export async function getProjectsPaginated(filters?: ProjectFilters): Promise<PaginatedResponse<Project>> {
  const params: any = {
    skip: filters?.skip || 0,
    limit: filters?.limit || 20,
    sort_by: filters?.sort_by || 'created_at',
    sort_order: filters?.sort_order || 'desc',
  };
  if (filters?.search) params.search = filters.search;
  if (filters?.status) params.status = filters.status;
  if (filters?.source_lang) params.source_lang = filters.source_lang;
  if (filters?.target_lang) params.target_lang = filters.target_lang;
  const response = await apiClient.get<PaginatedResponse<Project>>('/api/projects/', { params });
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
// ==================== ТЕРМИНОЛОГИЯ ====================
export interface TermEntry {
  id: number;
  source_text: string;
  target_text: string;
  project_id: number | null;
  occurrences: number;
  created_at: string;
  updated_at: string;
}

export async function getProjectTerms(
  projectId: number,
  search?: string,
): Promise<TermEntry[]> {
  const params: any = {};
  if (search) params.search = search;
  const response = await apiClient.get<TermEntry[]>(
    `/api/projects/${projectId}/terms`,
    { params },
  );
  return response.data;
}