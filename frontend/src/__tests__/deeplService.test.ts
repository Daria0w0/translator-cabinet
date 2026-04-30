import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { withCredentials: true },
  },
}));

import apiClient from '../services/apiClient';
import {
  getDeepLStatus,
  deepLTranslate,
  deepLTranslateBatch,
} from '../services/deeplService';


describe('deeplService — getDeepLStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('возвращает available=true когда сервис доступен', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { available: true, message: 'Yandex Translate is configured' },
    });
    const result = await getDeepLStatus();
    expect(result.available).toBe(true);
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith('/api/deepl/status');
  });

  it('возвращает available=false при сетевой ошибке (не бросает исключение)', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network Error'));
    const result = await getDeepLStatus();
    expect(result.available).toBe(false);
    expect(result.message).toMatch(/server/i);
  });
});


describe('deeplService — deepLTranslate (штатная работа)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('возвращает перевод через /api/deepl/translate при успехе', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { translation: 'Привет мир', provider: 'deepl' },
    });
    const result = await deepLTranslate('Hello world', 'eng_Latn', 'rus_Cyrl');
    expect(result.translation).toBe('Привет мир');
    expect(result.provider).toBe('deepl');
    expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith(
      '/api/deepl/translate',
      { text: 'Hello world', source_lang: 'eng_Latn', target_lang: 'rus_Cyrl' },
    );
  });
});


describe('deeplService — deepLTranslate (fallback на NLLB)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('при 503 от DeepL переключается на /api/translation/translate', async () => {
    vi.mocked(apiClient.post)
      .mockRejectedValueOnce({ response: { status: 503, data: { detail: 'Unavailable' } } })
      .mockResolvedValueOnce({ data: { translation: 'Привет (NLLB)' } });

    const result = await deepLTranslate('Hello', 'eng_Latn', 'rus_Cyrl');
    expect(result.translation).toBe('Привет (NLLB)');
    expect(result.provider).toBe('nllb');
    expect(vi.mocked(apiClient.post)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(apiClient.post)).toHaveBeenNthCalledWith(
      2,
      '/api/translation/translate',
      expect.objectContaining({ text: 'Hello' }),
    );
  });

  it('при 400 от DeepL также переключается на NLLB', async () => {
    vi.mocked(apiClient.post)
      .mockRejectedValueOnce({ response: { status: 400, data: {} } })
      .mockResolvedValueOnce({ data: { translation: 'NLLB result' } });

    const result = await deepLTranslate('Test', 'eng_Latn', 'rus_Cyrl');
    expect(result.provider).toBe('nllb');
  });

  it('при отказе обоих сервисов возвращает provider=error', async () => {
    vi.mocked(apiClient.post)
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockRejectedValueOnce(new Error('NLLB also down'));

    const result = await deepLTranslate('Hi', 'eng_Latn', 'rus_Cyrl');
    expect(result.provider).toBe('error');
    expect(result.error).toMatch(/unavailable/i);
  });

  it('при неизвестной ошибке DeepL (не 503/400) возвращает provider=error без fallback', async () => {
    vi.mocked(apiClient.post)
      .mockRejectedValueOnce({ response: { status: 500, data: { detail: 'Internal' } } });

    const result = await deepLTranslate('Test', 'eng_Latn', 'rus_Cyrl');
    expect(result.provider).toBe('error');
    // NLLB НЕ вызывался
    expect(vi.mocked(apiClient.post)).toHaveBeenCalledTimes(1);
  });
});

// ── deepLTranslateBatch ───────────────────────────────────────

describe('deeplService — deepLTranslateBatch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('возвращает пустой массив для пустого ввода без запроса', async () => {
    const result = await deepLTranslateBatch([], 'eng_Latn', 'rus_Cyrl');
    expect(result.translations).toEqual([]);
    expect(vi.mocked(apiClient.post)).not.toHaveBeenCalled();
  });

  it('успешный batch перевод через DeepL', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { translations: ['Привет', 'Мир'], provider: 'deepl' },
    });
    const result = await deepLTranslateBatch(['Hello', 'World'], 'eng_Latn', 'rus_Cyrl');
    expect(result.translations).toHaveLength(2);
    expect(result.provider).toBe('deepl');
  });

  it('при 503 переключается на NLLB batch', async () => {
    vi.mocked(apiClient.post)
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValueOnce({ data: { translations: ['result1', 'result2'] } });

    const result = await deepLTranslateBatch(['a', 'b'], 'eng_Latn', 'rus_Cyrl');
    expect(result.provider).toBe('nllb');
    expect(result.translations).toEqual(['result1', 'result2']);
    expect(vi.mocked(apiClient.post)).toHaveBeenNthCalledWith(
      2,
      '/api/translation/batch',
      expect.objectContaining({ texts: ['a', 'b'] }),
    );
  });

  it('при отказе обоих — возвращает provider=error', async () => {
    vi.mocked(apiClient.post)
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockRejectedValueOnce(new Error('NLLB down'));

    const result = await deepLTranslateBatch(['x'], 'eng_Latn', 'rus_Cyrl');
    expect(result.provider).toBe('error');
  });
});