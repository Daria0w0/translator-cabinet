import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProject,
  getProjectFiles,
  getFileContent,
  getFileSegments,
  segmentFile,
  updateSegment,
  ProjectFile,
  Segment
} from '../services/api';
import './styles/TranslatorEditor.css';

interface FileContent {
  content: string;
  type: string;
  file_path?: string;
}

interface SegmentUpdateRequest {
  translated_text: string;
  status: string;
  add_to_termbase?: boolean;
}

export default function TranslatorEditor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<any>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [currentFile, setCurrentFile] = useState<ProjectFile | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [progress, setProgress] = useState({
    total: 0,
    translated: 0,
    edited: 0,
    percentage: 0
  });
  
  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setIsLoading(true);
      const [projectData, projectFiles] = await Promise.all([
        getProject(Number(projectId)),
        getProjectFiles(Number(projectId))
      ]);
      
      setProject(projectData);
      setFiles(projectFiles);
      
      if (projectFiles.length > 0) {
        setCurrentFile(projectFiles[0]);
        await loadFileContent(projectFiles[0]);
      }
      
    } catch (error) {
      console.error('Ошибка загрузки проекта:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFileContent = async (file: ProjectFile) => {
    try {
      setIsFileLoading(true);
      const content = await getFileContent(Number(projectId), file.id);

      if (content.type === 'text') {
        await loadSegmentsForFile(file, content.content);
      } else {
        setSegments([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки содержимого файла:', error);
    } finally {
      setIsFileLoading(false);
    }
  };

  const loadSegmentsForFile = async (file: ProjectFile, text: string) => {
    try {
      const existingSegments = await getFileSegments(Number(projectId), file.id);
      
      if (existingSegments.length > 0) {
        setSegments(existingSegments);
        computeProgress(existingSegments);
        return;
      }
      
      setIsSegmenting(true);
      const newSegments = await segmentFile(Number(projectId), file.id, text);
      setSegments(newSegments);
      computeProgress(newSegments);
      
    } catch (error) {
      console.error('Ошибка загрузки сегментов:', error);
    } finally {
      setIsSegmenting(false);
    }
  };

  const computeProgress = useCallback((segmentsList: Segment[]) => {
    const total = segmentsList.length;
    const translated = segmentsList.filter(s => 
      s.translated_text && s.translated_text.trim() !== ''
    ).length;
    const edited = segmentsList.filter(s => 
      s.status === 'translated' || s.status === 'edited'
    ).length;
    const percentage = total > 0 ? Math.round((translated / total) * 100) : 0;
    
    setProgress({ total, translated, edited, percentage });
  }, []);

  const handleFileSelect = async (file: ProjectFile) => {
    setCurrentFile(file);
    setSegments([]);
    setSelectedSegmentId(null);
    setEditingSegmentId(null);
    await loadFileContent(file);
  };

  const handleSegmentClick = (segment: Segment) => {
    setSelectedSegmentId(segment.id);
    
    if (editingSegmentId && editingSegmentId !== segment.id) {
      saveCurrentEdit();
    }
  };

  const startEditing = (segment: Segment) => {
    setEditingSegmentId(segment.id);
    setEditedText(segment.translated_text || '');
    setSelectedSegmentId(segment.id);
  };

  const cancelEditing = () => {
    setEditingSegmentId(null);
    setEditedText('');
    setShowSaveDialog(false);
  };

  const saveCurrentEdit = async () => {
    if (!editingSegmentId) return;
    
    const segment = segments.find(s => s.id === editingSegmentId);
    if (!segment) return;
    
    setShowSaveDialog(true);
  };

  const handleSave = async (addToTermbase: boolean = false) => {
    if (!editingSegmentId) return;
    
    const segment = segments.find(s => s.id === editingSegmentId);
    if (!segment) return;
    
    try {
      const isChanged = editedText !== (segment.translated_text || '');
      const status = isChanged ? 'edited' : 'translated';
      
      const updateRequest: SegmentUpdateRequest = {
        translated_text: editedText,
        status: status,
        add_to_termbase: addToTermbase
      };
      
      const updatedSegment = await updateSegment(segment.id, updateRequest);
      
      setSegments(prev => 
        prev.map(s => 
          s.id === segment.id ? updatedSegment : s
        )
      );
      
      computeProgress(segments.map(s => 
        s.id === segment.id ? updatedSegment : s
      ));
      
      setEditingSegmentId(null);
      setEditedText('');
      setShowSaveDialog(false);
      
    } catch (error) {
      console.error('Ошибка сохранения сегмента:', error);
    }
  };

  const exportTranslation = () => {
    if (!segments.length || !currentFile) return;
    
    const sortedSegments = [...segments].sort((a, b) => a.segment_index - b.segment_index);
    const translationText = sortedSegments
      .map(segment => segment.translated_text || '')
      .join('\n\n');
    
    const blob = new Blob([translationText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated_${currentFile.original_name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="translator-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка проекта...</p>
      </div>
    );
  }

  return (
    <div className="translator-editor">
      {/* Заголовок */}
      <div className="translator-header">
        <div className="header-left">
          <button onClick={() => navigate('/user/projects')} className="btn-back">
            ← Назад к проектам
          </button>
          <div className="project-info">
            <h1>{project?.name || 'Проект'}</h1>
            <span className="project-meta">
              {project?.source_lang} → {project?.target_lang}
            </span>
            {segments.length > 0 && (
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress.percentage}%` }}
                />
                <span className="progress-text">
                  {progress.translated} из {progress.total} предложений переведено • {progress.edited} отредактировано
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={exportTranslation} 
            disabled={segments.length === 0 || progress.translated === 0}
            className="btn-primary"
          >
            Экспорт перевода
          </button>
        </div>
      </div>

      {/* Выбор файлов */}
      {files.length > 0 && (
        <div className="file-selection">
          <h3>Файлы проекта:</h3>
          <div className="file-tabs">
            {files.map(file => (
              <button
                key={file.id}
                className={`file-tab ${currentFile?.id === file.id ? 'active' : ''}`}
                onClick={() => handleFileSelect(file)}
                disabled={isFileLoading || isSegmenting}
              >
                {file.original_name}
                {isFileLoading && currentFile?.id === file.id && ' (загрузка...)'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Статус операций */}
      {isSegmenting && (
        <div className="operation-status">
          <span>Сегментация текста...</span>
        </div>
      )}

      {/* Основной редактор */}
      <div className="translator-main">
        {/* Панель оригинала */}
        <div className="original-panel">
          <div className="panel-header">
            <h3>Оригинал</h3>
            {segments.length > 0 && (
              <span className="segment-count">{segments.length} предложений</span>
            )}
          </div>
          
          <div className="segments-container">
            {isFileLoading ? (
              <div className="loading-message">Загрузка файла...</div>
            ) : isSegmenting ? (
              <div className="loading-message">Сегментация текста...</div>
            ) : segments.length === 0 ? (
              <div className="empty-message">Нет сегментов для отображения</div>
            ) : (
              segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className={`segment-item ${segment.id === selectedSegmentId ? 'selected' : ''}`}
                  onClick={() => handleSegmentClick(segment)}
                >
                  <div className="segment-header">
                    <span className="segment-index">#{index + 1}</span>
                    <span className={`segment-status ${segment.status}`}>
                      {segment.status === 'auto_translated' ? 'нейронка' : 
                       segment.status === 'edited' ? 'правка' : 'новый'}
                    </span>
                  </div>
                  <div className="segment-content original-text">
                    {segment.original_text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Панель перевода */}
        <div className="translation-panel">
          <div className="panel-header">
            <h3>Перевод</h3>
            {segments.length > 0 && (
              <span className="translated-count">
                {progress.translated} / {progress.total}
              </span>
            )}
          </div>
          
          <div className="segments-container">
            {isFileLoading ? (
              <div className="loading-message">Загрузка файла...</div>
            ) : segments.length === 0 ? (
              <div className="empty-message">Загрузите файл для перевода</div>
            ) : (
              segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className={`segment-item ${segment.id === selectedSegmentId ? 'selected' : ''} 
                    ${segment.status === 'edited' ? 'edited' : ''}`}
                  onClick={() => handleSegmentClick(segment)}
                  onDoubleClick={() => startEditing(segment)}
                >
                  <div className="segment-header">
                    <span className="segment-index">#{index + 1}</span>
                    <div className="segment-actions">
                      {editingSegmentId === segment.id ? (
                        <>
                          <button 
                            className="btn-small btn-save"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveCurrentEdit();
                            }}
                          >
                            ✓
                          </button>
                          <button 
                            className="btn-small btn-cancel"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditing();
                            }}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button 
                          className="btn-small btn-edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(segment);
                          }}
                        >
                          ✎
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="segment-content">
                    {editingSegmentId === segment.id ? (
                      <div className="edit-container">
                        <textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          className="edit-textarea"
                          autoFocus
                          rows={3}
                          placeholder="Введите исправленный перевод..."
                        />
                      </div>
                    ) : (
                      <div className={`translation-text ${segment.status === 'edited' ? 'edited-text' : ''}`}>
                        {segment.translated_text || <span className="empty-translation">Нет перевода</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Диалог сохранения */}
      {showSaveDialog && (
        <div className="save-dialog-overlay">
          <div className="save-dialog">
            <h3>Сохранить изменения?</h3>
            <p>Вы изменили перевод. Хотите сохранить исправление?</p>
            <div className="dialog-buttons">
              <button 
                className="btn-secondary"
                onClick={() => {
                  setShowSaveDialog(false);
                  cancelEditing();
                }}
              >
                Отмена
              </button>
              <button 
                className="btn-primary"
                onClick={() => handleSave(false)}
              >
                Просто сохранить
              </button>
              <button 
                className="btn-termbase"
                onClick={() => handleSave(true)}
              >
                Сохранить и добавить в терминологическую базу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}