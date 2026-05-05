import os
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline
import torch
from threading import Lock

MODEL_PATH = os.path.join(os.path.dirname(__file__), "finetune", "nllb_finetuned")

class Translator:
    _instance = None
    _lock = Lock()
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Translator, cls).__new__(cls)
        return cls._instance
    
    def __init__(self, device=None):
        if not hasattr(self, 'initialized'):
            self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
            self.model = None
            self.tokenizer = None
            self.pipe = None
            self.model_lock = Lock()
            self.initialized = True
    
    def _ensure_loaded(self):
        """Загружаем модель при первом использовании"""
        if self.model is None:
            with self.model_lock:
                if self.model is None:
                    print(f"Loading model from {MODEL_PATH}")
                    try:
                        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, use_fast=False)
                        self.model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_PATH)
                        self.model = self.model.to(self.device)
                        self.pipe = pipeline(
                            "text2text-generation",
                            model=self.model,
                            tokenizer=self.tokenizer,
                            device=0 if self.device == "cuda" and torch.cuda.is_available() else -1,
                            torch_dtype=torch.float32 if self.device == "cpu" else torch.float16,
                            batch_size=8,
                            max_length=512
                        )
                        print("Model loaded successfully")
                    except Exception as e:
                        print(f"Error loading model: {e}")
                        raise

    def _get_forced_bos_token_id(self, tgt_lang: str):
        try:
            return self.tokenizer.convert_tokens_to_ids(tgt_lang)
        except Exception:
            return None

    def translate(self, text, src_lang, tgt_lang):
        self._ensure_loaded()
        try:
            with self.model_lock:
                self.tokenizer.src_lang = src_lang
                forced_bos_token_id = self._get_forced_bos_token_id(tgt_lang)
                result = self.pipe(
                    text,
                    max_length=512,
                    truncation=True,
                    forced_bos_token_id=forced_bos_token_id,
                )
                if isinstance(result, list) and len(result) > 0:
                    item = result[0]
                    if isinstance(item, dict):
                        return item.get('generated_text') or item.get('translation_text') or str(item)
                    return str(item)
                return str(result)
        except Exception as e:
            print(f"Translation error: {e}")
            return f"[Translation error: {e}]"

    def translate_batch(self, texts, src_lang, tgt_lang):
        self._ensure_loaded()
        try:
            with self.model_lock:
                self.tokenizer.src_lang = src_lang
                forced_bos_token_id = self._get_forced_bos_token_id(tgt_lang)
                results = self.pipe(
                    texts,
                    max_length=512,
                    truncation=True,
                    forced_bos_token_id=forced_bos_token_id,
                    batch_size=min(len(texts), 8),
                )
                translations = []
                for r in results:
                    if isinstance(r, dict):
                        translations.append(r.get('generated_text') or r.get('translation_text') or str(r))
                    else:
                        translations.append(str(r))
                return translations
        except Exception as e:
            print(f"Batch translation error: {e}")
            return [f"[Translation error: {e}]"] * len(texts)

translator = Translator()