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
                        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
                        self.model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_PATH)
                        
                        self.model = self.model.to(self.device)
                        
                        self.pipe = pipeline(
                            "translation",
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

    def translate(self, text, src_lang, tgt_lang):
        self._ensure_loaded()
        
        try:
            with self.model_lock:
                result = self.pipe(
                    text,
                    src_lang=src_lang,
                    tgt_lang=tgt_lang,
                    max_length=512,
                    truncation=True
                )
                
                if isinstance(result, list) and len(result) > 0:
                    item = result[0]
                    if isinstance(item, dict) and 'translation_text' in item:
                        return item['translation_text']
                    return str(item)
                return str(result)
                
        except Exception as e:
            print(f"Translation error: {e}")
            return f"[Translation error: {e}]"

    def translate_batch(self, texts, src_lang, tgt_lang):
        self._ensure_loaded()
        
        try:
            with self.model_lock:
                results = self.pipe(
                    texts,
                    src_lang=src_lang,
                    tgt_lang=tgt_lang,
                    max_length=512,
                    truncation=True,
                    batch_size=min(len(texts), 8)
                )
                
                translations = []
                for r in results:
                    if isinstance(r, dict) and 'translation_text' in r:
                        translations.append(r['translation_text'])
                    else:
                        translations.append(str(r))
                return translations
                
        except Exception as e:
            print(f"Batch translation error: {e}")
            return [f"[Translation error: {e}]"] * len(texts)

translator = Translator()