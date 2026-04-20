import os
import time
import httpx
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

YANDEX_API_KEY = os.getenv("YANDEX_API_KEY", "")
YANDEX_FOLDER_ID = os.getenv("YANDEX_FOLDER_ID", "")
YANDEX_API_URL = "https://translate.api.cloud.yandex.net/translate/v2/translate"

REQUEST_TIMEOUT = float(os.getenv("YANDEX_TIMEOUT", "10"))
MAX_RETRIES = int(os.getenv("YANDEX_MAX_RETRIES", "3"))
RETRY_DELAY = float(os.getenv("YANDEX_RETRY_DELAY", "1.0"))
RATE_LIMIT_DELAY = float(os.getenv("YANDEX_RATE_LIMIT_DELAY", "0.3"))

LANG_MAP: dict = {
    "rus_Cyrl": "ru", "ru": "ru",
    "eng_Latn": "en", "en": "en",
    "deu_Latn": "de", "de": "de",
    "fra_Latn": "fr", "fr": "fr",
    "spa_Latn": "es", "es": "es",
    "ita_Latn": "it", "it": "it",
    "por_Latn": "pt", "pt": "pt",
    "nld_Latn": "nl", "nl": "nl",
    "pol_Latn": "pl", "pl": "pl",
    "zho_Hans": "zh", "zh": "zh",
    "jpn_Jpan": "ja", "ja": "ja",
}

_last_call_time = 0.0


def _normalize_lang(lang: str):
    return LANG_MAP.get(lang) or LANG_MAP.get(lang.lower())


def _rate_limit():
    global _last_call_time
    now = time.monotonic()
    elapsed = now - _last_call_time
    if elapsed < RATE_LIMIT_DELAY:
        time.sleep(RATE_LIMIT_DELAY - elapsed)
    _last_call_time = time.monotonic()


def _call_yandex(texts, source_lang, target_lang):
    src = _normalize_lang(source_lang)
    tgt = _normalize_lang(target_lang)

    if not tgt:
        raise ValueError(f"Unsupported target language: {target_lang}")
    if not YANDEX_API_KEY:
        raise ValueError("YANDEX_API_KEY is not set")
    if not YANDEX_FOLDER_ID:
        raise ValueError("YANDEX_FOLDER_ID is not set")

    _rate_limit()

    payload = {
        "texts": texts,
        "targetLanguageCode": tgt,
        "folderId": YANDEX_FOLDER_ID,
    }
    if src:
        payload["sourceLanguageCode"] = src

    headers = {
        "Authorization": f"Api-Key {YANDEX_API_KEY}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        response = client.post(YANDEX_API_URL, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    return [t.get("text", "") for t in data.get("translations", [])]


def _call_with_retry(texts, source_lang, target_lang):
    last_error = Exception("Unknown error")
    for attempt in range(MAX_RETRIES):
        try:
            return _call_yandex(texts, source_lang, target_lang)
        except httpx.TimeoutException as e:
            last_error = e
            print(f"[Yandex] Timeout attempt {attempt+1}/{MAX_RETRIES}")
        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            if status == 429:
                last_error = e
                time.sleep(RETRY_DELAY * (attempt + 1))
            elif 500 <= status < 600:
                last_error = e
                time.sleep(RETRY_DELAY)
            else:
                raise
        except Exception as e:
            last_error = e
            time.sleep(RETRY_DELAY)
    raise last_error


def translate(text, source_lang, target_lang):
    if not text.strip():
        return text
    results = _call_with_retry([text], source_lang, target_lang)
    return results[0] if results else text


def translate_batch(texts, source_lang, target_lang, chunk_size=20):
    if not texts:
        return []
    results = []
    for i in range(0, len(texts), chunk_size):
        results.extend(_call_with_retry(texts[i:i+chunk_size], source_lang, target_lang))
    return results


def is_available():
    return bool(YANDEX_API_KEY and YANDEX_FOLDER_ID)