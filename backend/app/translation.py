from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline
import torch

MODEL_NAME = "facebook/nllb-200-distilled-600M"

class Translator:
    def __init__(self, device=None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME).to(self.device)
        self.pipe = pipeline("translation", model=self.model, tokenizer=self.tokenizer, device=0 if self.device == "cuda" else -1)

    def translate(self, text, src_lang, tgt_lang):
        res = self.pipe(text, src_lang=src_lang, tgt_lang=tgt_lang, max_length=2000)
        if isinstance(res, list):
            item = res[0]
            if isinstance(item, dict) and 'translation_text' in item:
                return item['translation_text']
            return str(item)
        elif isinstance(res, dict) and 'translation_text' in res:
            return res['translation_text']
        else:
            return str(res)

    def translate_batch(self, texts, src_lang, tgt_lang):
        res = self.pipe(texts, src_lang=src_lang, tgt_lang=tgt_lang, max_length=2000)
        translations = []
        for r in res:
            if isinstance(r, dict) and 'translation_text' in r:
                translations.append(r['translation_text'])
            else:
                translations.append(str(r))
        return translations

translator = Translator()