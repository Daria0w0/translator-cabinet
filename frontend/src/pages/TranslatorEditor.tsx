import React, { useState, useEffect, useRef, JSX } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProject, getProjectFiles, getFileContent, ProjectFile } from '../services/api';

interface TranslationMemory {
  id: number;
  original: string;
  translated: string;
  context: string;
}

interface FileContent {
  content: string;
  type: string;
  file_path?: string;
}

export default function TranslatorEditor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [project, setProject] = useState<any>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [currentFile, setCurrentFile] = useState<ProjectFile | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [selectedWord, setSelectedWord] = useState<{word: string; position: number} | null>(null);
  const [correction, setCorrection] = useState('');
  const [translationMemory, setTranslationMemory] = useState<TranslationMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFileLoading, setIsFileLoading] = useState(false);
  
  const originalTextRef = useRef<HTMLDivElement>(null);
  const translatedTextRef = useRef<HTMLDivElement>(null);

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
      setFileContent(content);
      
      if (content.type === 'text') {
        setOriginalText(content.content);
        generateDemoTranslation(content.content);
      }
      
    } catch (error) {
      console.error('Ошибка загрузки содержимого файла:', error);
    } finally {
      setIsFileLoading(false);
    }
  };

  const generateDemoTranslation = (text: string) => {
    const demoTranslation = text.split('\n').map(line => 
      `[ПЕРЕВОД] ${line}`
    ).join('\n');
    setTranslatedText(demoTranslation);
  };

  const handleFileSelect = async (file: ProjectFile) => {
    setCurrentFile(file);
    await loadFileContent(file);
  };

  const handleWordClick = (word: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedWord({
      word,
      position: rect.left
    });
    setCorrection('');
  };

  const handleSaveCorrection = () => {
    if (!selectedWord || !correction.trim()) return;

    const newMemory: TranslationMemory = {
      id: Date.now(),
      original: selectedWord.word,
      translated: correction,
      context: `Файл: ${currentFile?.original_name}`
    };

    setTranslationMemory(prev => [newMemory, ...prev]);
    setSelectedWord(null);
    setCorrection('');
  };

  const handleSaveTranslation = async () => {
    try {
      console.log('Перевод сохранен:', translatedText);
      alert('Перевод сохранен!');
    } catch (error) {
      console.error('Ошибка сохранения перевода:', error);
    }
  };

  const handleExportTranslation = () => {
    const blob = new Blob([translatedText], { type: 'text/plain', endings: 'native' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated_${currentFile?.original_name || 'file'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderClickableText = (text: string, isOriginal: boolean = false) => {
    return text.split(' ').map((word, index) => (
      <span
        key={index}
        className={`word ${isOriginal ? 'original-word' : 'translated-word'} ${selectedWord?.word === word ? 'selected' : ''}`}
        onClick={(e) => isOriginal && handleWordClick(word, e)}
        title={isOriginal ? "Нажмите для исправления перевода" : ""}
      >
        {word}
      </span>
    )).reduce((acc: JSX.Element[], word, index) => {
      if (index > 0) {
        acc.push(<span key={`space-${index}`}> </span>);
      }
      acc.push(word);
      return acc;
    }, []);
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
      <div className="translator-header">
        <div className="header-left">
          <button 
            onClick={() => navigate('/user/projects')} 
            className="btn-back"
          >
            Назад к проектам
          </button>
          <div className="project-info">
            <h1>{project?.name || 'Проект'}</h1>
            <span className="project-meta">
              {project?.sourceLang} → {project?.targetLang}
            </span>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={handleSaveTranslation}
            disabled={!translatedText}
            className="btn-primary"
          >
            Сохранить
          </button>
          <button 
            onClick={handleExportTranslation}
            disabled={!translatedText}
            className="btn-secondary"
          >
            Экспорт
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="file-selection">
          <h3>Файлы проекта:</h3>
          <div className="file-tabs">
            {files.map(file => (
              <button
                key={file.id}
                className={`file-tab ${currentFile?.id === file.id ? 'active' : ''}`}
                onClick={() => handleFileSelect(file)}
                disabled={isFileLoading}
              >
                {file.original_name}
                {isFileLoading && currentFile?.id === file.id && ' Загрузка...'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="translator-main">
        <div className="original-panel">
          <div className="panel-header">
            <h3>Оригинал</h3>
            <div className="text-stats">
              {currentFile && (
                <>
                  <span>{currentFile.original_name}</span>
                  <span>{(currentFile.file_size / 1024).toFixed(1)} КБ</span>
                </>
              )}
            </div>
          </div>
          
          <div 
            ref={originalTextRef}
            className="text-content original-text"
          >
            {isFileLoading ? (
              <div className="loading-file">Загрузка файла...</div>
            ) : fileContent ? (
              fileContent.type === 'text' ? (
                renderClickableText(originalText, true)
              ) : (
                <div className="unsupported-format">
                  <h4>Формат файла не поддерживается для прямого редактирования</h4>
                  <p>Файл: {currentFile?.original_name}</p>
                  <p>Используйте экспорт/импорт для этого формата</p>
                </div>
              )
            ) : (
              <div className="no-file">Выберите файл для работы</div>
            )}
          </div>
        </div>

        <div className="translation-panel">
          <div className="panel-header">
            <h3>Перевод</h3>
            <div className="text-stats">
              {originalText.length > 0 && (
                <span>{originalText.split(' ').length} слов</span>
              )}
            </div>
          </div>
          
          <div 
            ref={translatedTextRef}
            className="text-content translated-text"
          >
            {isFileLoading ? (
              <div className="loading-file">Загрузка перевода...</div>
            ) : translatedText ? (
              <textarea
                value={translatedText}
                onChange={(e) => setTranslatedText(e.target.value)}
                className="translation-textarea"
                placeholder="Автоматический перевод появится здесь..."
                rows={20}
              />
            ) : (
              <div className="no-translation">
                <p>Перевод будет сгенерирован автоматически после загрузки файла</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedWord && (
        <div 
          className="correction-popup"
          style={{ left: selectedWord.position }}
        >
          <div className="popup-header">
            <h4>Исправление перевода</h4>
            <button 
              onClick={() => setSelectedWord(null)}
              className="btn-close"
            >
              ×
            </button>
          </div>
          <div className="popup-content">
            <div className="original-word-display">
              <strong>Слово для исправления:</strong> 
              <span className="word-highlight">"{selectedWord.word}"</span>
            </div>
            <div className="correction-input">
              <label>Правильный перевод:</label>
              <input
                type="text"
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                placeholder="Введите правильный перевод..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCorrection();
                  if (e.key === 'Escape') setSelectedWord(null);
                }}
              />
            </div>
            <div className="popup-actions">
              <button 
                onClick={() => setSelectedWord(null)}
                className="btn-secondary"
              >
                Отмена
              </button>
              <button 
                onClick={handleSaveCorrection}
                disabled={!correction.trim()}
                className="btn-primary"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="memory-panel">
        <div className="memory-header">
          <h3>Память переводов</h3>
          <span className="memory-count">{translationMemory.length} записей</span>
        </div>
        <div className="memory-content">
          {translationMemory.length === 0 ? (
            <div className="empty-memory">
              <p>Ваши исправления переводов будут сохранены здесь</p>
              <small>Нажимайте на слова в оригинальном тексте, чтобы добавить исправления</small>
            </div>
          ) : (
            translationMemory.slice(0, 10).map((item) => (
              <div key={item.id} className="memory-item">
                <div className="memory-original">"{item.original}"</div>
                <div className="memory-arrow">→</div>
                <div className="memory-translated">"{item.translated}"</div>
                <div className="memory-context">{item.context}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}