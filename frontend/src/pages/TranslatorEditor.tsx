import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProject,
  getProjectFiles,
  getFileContent,
  getFileSegments,
  segmentFile,
  updateSegment,
  ProjectFile,
  Segment,
  TermEntry,
  getProjectTerms,
} from '../services/api';
import { deepLTranslate, getDeepLStatus } from '../services/deeplService';
import { useMeta } from '../hooks/useMeta';
import './styles/TranslatorEditor.css';

interface SegmentUpdateRequest {
  translated_text: string;
  status: string;
  add_to_termbase?: boolean;
}

interface DeepLBannerProps {
  available: boolean | null;
  provider: 'deepl' | 'nllb' | null;
  translating: boolean;
  onTranslate: () => void;
  segmentText: string | null;
}

function DeepLBanner({ available, provider, translating, onTranslate, segmentText }: DeepLBannerProps) {
  if (available === null) return null;

  return (
    <div className="deepl-banner" aria-live="polite">
      {available ? (
        <div className="deepl-available">
          <span className="deepl-badge deepl">Yandex</span>
          <span className="deepl-hint">
            {segmentText
              ? 'Переведите выбранный сегмент через Yandex'
              : 'Выберите сегмент для перевода через Yandex'}
          </span>
          <button
            className="btn-deepl"
            onClick={onTranslate}
            disabled={!segmentText || translating}
            aria-busy={translating}
          >
            {translating ? 'Перевод...' : '⚡ Перевести через Yandex'}
          </button>
          {provider === 'nllb' && (
            <span className="deepl-fallback-note">
              ℹ️ Yandex недоступен — использован внутренний переводчик
            </span>
          )}
          {provider === 'deepl' && (
            <span className="deepl-success-note">✓ Переведено через Yandex</span>
          )}
        </div>
      ) : (
        <div className="deepl-unavailable">
          <span className="deepl-badge nllb">NLLB</span>
          <span className="deepl-hint">Yandex Translate не настроен — используется встроенный переводчик</span>
        </div>
      )}
    </div>
  );
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
    percentage: 0,
  });

  const [deeplAvailable, setDeeplAvailable] = useState<boolean | null>(null);
  const [deeplTranslating, setDeeplTranslating] = useState(false);
  const [lastProvider, setLastProvider] = useState<'deepl' | 'nllb' | null>(null);
  const [termSuggestion, setTermSuggestion] = useState<TermEntry | null>(null);
  const [terms, setTerms] = useState<TermEntry[]>([]);

  useMeta({
    title: project ? `Редактор — ${project.name}` : 'Редактор перевода',
    description: 'Редактор сегментов перевода.',
    noIndex: true,
  });

  useEffect(() => {
    getDeepLStatus().then((s) => setDeeplAvailable(s.available));
  }, []);

  useEffect(() => {
    if (projectId) loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setIsLoading(true);
      const [projectData, projectFiles] = await Promise.all([
        getProject(Number(projectId)),
        getProjectFiles(Number(projectId)),
      ]);
      setProject(projectData);
      setFiles(projectFiles);
      try {
        const termsData = await getProjectTerms(Number(projectId));
        setTerms(termsData);
      } catch {

      }
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
      const existingSegments = await getFileSegments(Number(projectId), file.id);
      if (existingSegments.length > 0) {
        setSegments(existingSegments);
        computeProgress(existingSegments);
        return;
      }

      const content = await getFileContent(Number(projectId), file.id);
      if (content.type === 'text') {
        setIsSegmenting(true);
        const newSegments = await segmentFile(Number(projectId), file.id, content.content);
        setSegments(newSegments);
        computeProgress(newSegments);
      } else {
        setSegments([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
    } finally {
      setIsFileLoading(false);
      setIsSegmenting(false);
    }
  };

  const computeProgress = useCallback((segmentsList: Segment[]) => {
    const total = segmentsList.length;
    const translated = segmentsList.filter(
      (s) => s.translated_text && s.translated_text.trim() !== '',
    ).length;
    const edited = segmentsList.filter(
      (s) => s.status === 'translated' || s.status === 'edited',
    ).length;
    const percentage = total > 0 ? Math.round((translated / total) * 100) : 0;
    setProgress({ total, translated, edited, percentage });
  }, []);

  const handleFileSelect = async (file: ProjectFile) => {
    setCurrentFile(file);
    setSegments([]);
    setSelectedSegmentId(null);
    setEditingSegmentId(null);
    setLastProvider(null);
    await loadFileContent(file);
  };

  const handleSegmentClick = (segment: Segment) => {
    setSelectedSegmentId(segment.id);
    setLastProvider(null);
    const match = terms.find(
      (t) => segment.original_text.toLowerCase().includes(t.source_text.toLowerCase())
    );
    setTermSuggestion(match ?? null);
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
    const segment = segments.find((s) => s.id === editingSegmentId);
    if (!segment) return;
    setShowSaveDialog(true);
  };

  const handleSave = async (addToTermbase: boolean = false) => {
    if (!editingSegmentId) return;
    const segment = segments.find((s) => s.id === editingSegmentId);
    if (!segment) return;
    try {
      const isChanged = editedText !== (segment.translated_text || '');
      const status = isChanged ? 'edited' : 'translated';
      const updateRequest: SegmentUpdateRequest = {
        translated_text: editedText,
        status,
        add_to_termbase: addToTermbase,
      };
      const updatedSegment = await updateSegment(segment.id, updateRequest);
      const newSegments = segments.map((s) => (s.id === segment.id ? updatedSegment : s));
      setSegments(newSegments);
      computeProgress(newSegments);
      setEditingSegmentId(null);
      setEditedText('');
      setShowSaveDialog(false);
    } catch (error) {
      console.error('Ошибка сохранения сегмента:', error);
    }
  };

  // ── Yandex translation of selected segment ─────────────────────────────
  const handleDeepLTranslate = async () => {
    if (!selectedSegmentId || !project) return;
    const segment = segments.find((s) => s.id === selectedSegmentId);
    if (!segment) return;

    setDeeplTranslating(true);
    setLastProvider(null);

    try {
      const result = await deepLTranslate(
        segment.original_text,
        project.source_lang,
        project.target_lang,
      );

      setLastProvider(result.provider === 'error' ? null : result.provider);

      if (result.provider !== 'error') {
        startEditing({ ...segment, translated_text: result.translation });
        setEditedText(result.translation);
      }
    } finally {
      setDeeplTranslating(false);
    }
  };

  const exportTranslation = () => {
    if (!segments.length || !currentFile) return;
    const sortedSegments = [...segments].sort((a, b) => a.segment_index - b.segment_index);
    const translationText = sortedSegments.map((s) => s.translated_text || '').join('\n\n');
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

  const selectedSegment = segments.find((s) => s.id === selectedSegmentId) ?? null;

  if (isLoading) {
    return (
      <div className="translator-loading" aria-busy="true">
        <div className="loading-spinner" aria-hidden="true" />
        <p>Загрузка проекта...</p>
      </div>
    );
  }

  return (
    <div className="translator-editor">
      {/* Заголовок */}
      <header className="translator-header">
        <div className="header-left">
          <button onClick={() => navigate('/user/projects')} className="btn-back">
            ← Назад к проектам
          </button>
          <div className="project-info">
            <h1>{project?.name || 'Проект'}</h1>
            <span className="project-meta" aria-label="Языковая пара">
              {project?.source_lang} → {project?.target_lang}
            </span>
            {segments.length > 0 && (
              <div className="progress-bar" role="progressbar" aria-valuenow={progress.percentage} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-fill" style={{ width: `${progress.percentage}%` }} />
                <span className="progress-text">
                  {progress.translated} из {progress.total} предложений переведено •{' '}
                  {progress.edited} отредактировано
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
      </header>

      {/* DeepL панель */}
      <DeepLBanner
        available={deeplAvailable}
        provider={lastProvider}
        translating={deeplTranslating}
        onTranslate={handleDeepLTranslate}
        segmentText={selectedSegment?.original_text ?? null}
      />

      {/* Подсказка из памяти переводов */}
      {termSuggestion && (
        <div className="term-suggestion">
          <span className="term-suggestion-label">💡 Память переводов:</span>
          <span className="term-suggestion-source">"{termSuggestion.source_text}"</span>
          <span className="term-suggestion-arrow">→</span>
          <span className="term-suggestion-target">"{termSuggestion.target_text}"</span>
          <span className="term-suggestion-count">{termSuggestion.occurrences}×</span>
          <button
            className="term-suggestion-use"
            onClick={() => {
              const seg = segments.find((s) => s.id === selectedSegmentId);
              if (seg) {
                startEditing(seg);
                setEditedText(termSuggestion.target_text);
              }
            }}
          >
            Использовать
          </button>
        </div>
      )}

      {/* Выбор файлов */}
      {files.length > 0 && (
        <nav className="file-selection" aria-label="Файлы проекта">
          <h2 className="sr-only">Файлы проекта</h2>
          <div className="file-tabs">
            {files.map((file) => (
              <button
                key={file.id}
                className={`file-tab ${currentFile?.id === file.id ? 'active' : ''}`}
                onClick={() => handleFileSelect(file)}
                disabled={isFileLoading || isSegmenting}
                aria-pressed={currentFile?.id === file.id}
              >
                {file.original_name}
                {isFileLoading && currentFile?.id === file.id && ' (загрузка...)'}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Статус операций */}
      {isSegmenting && (
        <div className="operation-status" role="status" aria-live="polite">
          <span>Сегментация текста...</span>
        </div>
      )}

      {/* Основной редактор */}
      <div className="translator-main">
        {/* Оригинал */}
        <section className="original-panel" aria-labelledby="original-panel-title">
          <div className="panel-header">
            <h2 id="original-panel-title">Оригинал</h2>
            {segments.length > 0 && (
              <span className="segment-count">{segments.length} предложений</span>
            )}
          </div>

          <div className="segments-container">
            {isFileLoading ? (
              <p className="loading-message" role="status">Загрузка файла...</p>
            ) : isSegmenting ? (
              <p className="loading-message" role="status">Сегментация текста...</p>
            ) : segments.length === 0 ? (
              <p className="empty-message">Нет сегментов для отображения</p>
            ) : (
              segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className={`segment-item ${segment.id === selectedSegmentId ? 'selected' : ''}`}
                  onClick={() => handleSegmentClick(segment)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={segment.id === selectedSegmentId}
                  onKeyDown={(e) => e.key === 'Enter' && handleSegmentClick(segment)}
                >
                  <div className="segment-header">
                    <span className="segment-index">#{index + 1}</span>
                    <span className={`segment-status ${segment.status}`}>
                      {segment.status === 'auto_translated'
                        ? 'нейронка'
                        : segment.status === 'edited'
                        ? 'правка'
                        : 'новый'}
                    </span>
                  </div>
                  <div className="segment-content original-text">{segment.original_text}</div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Перевод */}
        <section className="translation-panel" aria-labelledby="translation-panel-title">
          <div className="panel-header">
            <h2 id="translation-panel-title">Перевод</h2>
            {segments.length > 0 && (
              <span className="translated-count">
                {progress.translated} / {progress.total}
              </span>
            )}
          </div>

          <div className="segments-container">
            {isFileLoading ? (
              <p className="loading-message" role="status">Загрузка файла...</p>
            ) : segments.length === 0 ? (
              <p className="empty-message">Загрузите файл для перевода</p>
            ) : (
              segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className={`segment-item ${segment.id === selectedSegmentId ? 'selected' : ''} ${
                    segment.status === 'edited' ? 'edited' : ''
                  }`}
                  onClick={() => handleSegmentClick(segment)}
                  onDoubleClick={() => startEditing(segment)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Сегмент ${index + 1}: двойной клик для редактирования`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSegmentClick(segment);
                    if (e.key === 'F2') startEditing(segment);
                  }}
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
                            aria-label="Сохранить"
                          >
                            ✓
                          </button>
                          <button
                            className="btn-small btn-cancel"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditing();
                            }}
                            aria-label="Отмена"
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
                          aria-label="Редактировать сегмент"
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
                          aria-label="Редактор перевода"
                        />
                      </div>
                    ) : (
                      <div
                        className={`translation-text ${
                          segment.status === 'edited' ? 'edited-text' : ''
                        }`}
                      >
                        {segment.translated_text || (
                          <span className="empty-translation">Нет перевода</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Диалог сохранения */}
      {showSaveDialog && (
        <div className="save-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="save-dialog-title">
          <div className="save-dialog">
            <h2 id="save-dialog-title">Сохранить изменения?</h2>
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
              <button className="btn-primary" onClick={() => handleSave(false)}>
                Просто сохранить
              </button>
              <button className="btn-termbase" onClick={() => handleSave(true)}>
                Сохранить и добавить в терминологическую базу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}