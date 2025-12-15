import re
from typing import List, Dict

class SimpleSentenceSegmenter:
    def __init__(self):
        self.sentence_endings = r'[.!?]+'
    
    def segment(self, text: str, language: str = "en") -> List[Dict]:
        if not text or not text.strip():
            return []
        
        text = re.sub(r'\s+', ' ', text.strip())
        sentences = re.split(self.sentence_endings, text)
        
        result = []
        for i, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if sentence:
                start_pos = text.find(sentence) + len(sentence)
                if start_pos < len(text):
                    ending = text[start_pos]
                    if ending in '.!?':
                        sentence += ending
                
                result.append({
                    "text": sentence,
                    "index": i,
                    "type": "sentence"
                })
        
        if not result:
            result.append({
                "text": text,
                "index": 0,
                "type": "sentence"
            })
        
        return result

SentenceSegmenter = SimpleSentenceSegmenter