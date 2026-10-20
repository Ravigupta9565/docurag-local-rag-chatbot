import os
import json

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
INDEX_DIR = os.path.join(BASE_DIR, "index")
LOG_FILE = os.path.join(BASE_DIR, "rag_backend.log")
EVAL_FILE = os.path.join(BASE_DIR, "eval_results.csv")
SETTINGS_FILE = os.path.join(BASE_DIR, "settings.json")

# Default RAG settings matching updated rag.py
DEFAULT_SETTINGS = {
    "top_k": 6,
    "min_score": 0.15,
    "llm_model": "llama3.2:3b",
    "embedding_model": "all-MiniLM-L6-v2"
}

def load_settings():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                merged = dict(DEFAULT_SETTINGS)
                merged.update(saved)
                return merged
        except Exception:
            pass
    return dict(DEFAULT_SETTINGS)

def save_settings(new_settings: dict):
    current = load_settings()
    current.update(new_settings)
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2)
    return current
