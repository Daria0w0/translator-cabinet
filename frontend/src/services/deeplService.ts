import apiClient from './apiClient';

export interface DeepLTranslateResult {
  translation: string;
  provider: 'deepl' | 'nllb' | 'error';
  error?: string;
}

export interface DeepLBatchResult {
  translations: string[];
  provider: 'deepl' | 'nllb' | 'error';
  error?: string;
}

export interface DeepLStatus {
  available: boolean;
  message: string;
}

export async function getDeepLStatus(): Promise<DeepLStatus> {
  try {
    const response = await apiClient.get<DeepLStatus>('/api/deepl/status');
    return response.data;
  } catch {
    return { available: false, message: 'Could not reach server' };
  }
}

export async function deepLTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<DeepLTranslateResult> {
  try {
    const response = await apiClient.post<{ translation: string; provider: string }>(
      '/api/deepl/translate',
      { text, source_lang: sourceLang, target_lang: targetLang },
    );
    return { translation: response.data.translation, provider: 'deepl' };
  } catch (deepLError: any) {
    const status = deepLError?.response?.status;
    const isUnavailable = status === 503 || status === 400 || !status;

    if (!isUnavailable) {
      // Unexpected error — propagate
      return {
        translation: text,
        provider: 'error',
        error: deepLError?.response?.data?.detail ?? String(deepLError),
      };
    }

    console.warn('[DeepL] Unavailable, falling back to NLLB:', deepLError?.response?.data?.detail);
  }

  try {
    const response = await apiClient.post<{ translation: string }>(
      '/api/translation/translate',
      { text, source_lang: sourceLang, target_lang: targetLang },
    );
    return { translation: response.data.translation, provider: 'nllb' };
  } catch (nllbError: any) {
    console.error('[NLLB fallback] Also failed:', nllbError);
    return {
      translation: text,
      provider: 'error',
      error: 'Both DeepL and NLLB are unavailable',
    };
  }
}

export async function deepLTranslateBatch(
  texts: string[],
  sourceLang: string,
  targetLang: string,
): Promise<DeepLBatchResult> {
  if (!texts.length) return { translations: [], provider: 'deepl' };
  try {
    const response = await apiClient.post<{ translations: string[]; provider: string }>(
      '/api/deepl/batch',
      { texts, source_lang: sourceLang, target_lang: targetLang },
    );
    return { translations: response.data.translations, provider: 'deepl' };
  } catch (deepLError: any) {
    const status = deepLError?.response?.status;
    const isUnavailable = status === 503 || !status;

    if (!isUnavailable) {
      return {
        translations: texts,
        provider: 'error',
        error: deepLError?.response?.data?.detail ?? String(deepLError),
      };
    }

    console.warn('[DeepL batch] Unavailable, falling back to NLLB');
  }

  try {
    const response = await apiClient.post<{ translations: string[] }>(
      '/api/translation/batch',
      { texts, source_lang: sourceLang, target_lang: targetLang },
    );
    return { translations: response.data.translations, provider: 'nllb' };
  } catch (nllbError: any) {
    console.error('[NLLB batch fallback] Also failed:', nllbError);
    return {
      translations: texts,
      provider: 'error',
      error: 'Both DeepL and NLLB are unavailable',
    };
  }
}