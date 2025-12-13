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
        # NLLB uses language codes like 'rus_Cyrl', 'eng_Latn', etc.
        return self.pipe(text, src_lang=src_lang, tgt_lang=tgt_lang, max_length=512)[0]['translation_text']

# Singleton instance
translator = Translator()