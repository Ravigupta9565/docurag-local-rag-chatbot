import os, re, pickle
import faiss
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

DATA_DIR, INDEX_DIR = "data", "index"
_model = None

def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

def load_pdfs(data_dir=DATA_DIR):
    pages = []
    for f in os.listdir(data_dir):
        if f.lower().endswith(".pdf"):
            reader = PdfReader(os.path.join(data_dir, f))
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if text.strip():
                    pages.append({"source": f, "page": i + 1, "text": text})
    return pages

def chunk_text(text, max_words=120, overlap_sentences=1):
    # Sentence-based splitting for normal text
    raw_sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.replace("\n", " ")) if s.strip()]
    sentences = []
    
    # Split long sentences (text with few full stops) into pieces of at most 120 words
    for s in raw_sentences:
        words = s.split()
        if len(words) > max_words:
            step = max(20, max_words - 20)
            for i in range(0, len(words), step):
                piece = " ".join(words[i:i + max_words])
                if piece:
                    sentences.append(piece)
                if i + max_words >= len(words):
                    break
        else:
            sentences.append(s)

    chunks, current, count = [], [], 0
    for s in sentences:
        w = len(s.split())
        if current and count + w > max_words:
            chunks.append(" ".join(current))
            current = current[-overlap_sentences:] if overlap_sentences else []
            count = sum(len(x.split()) for x in current)
            if count + w > max_words and current:
                current = []
                count = 0
        current.append(s)
        count += w
    if current:
        chunks.append(" ".join(current))
    return chunks

def build_index(data_dir=DATA_DIR, index_dir=INDEX_DIR):
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(index_dir, exist_ok=True)

    chunks = []
    for p in load_pdfs(data_dir):
        for c in chunk_text(p["text"]):
            chunks.append({"source": p["source"], "page": p["page"], "text": c})

    if not chunks:
        raise ValueError("No text found in the PDFs. Use text-based PDFs, not scanned images.")

    embeddings = get_model().encode(
        [c["text"] for c in chunks],
        normalize_embeddings=True,
        show_progress_bar=False,
    ).astype("float32")

    index = faiss.IndexFlatIP(embeddings.shape[1])
    index.add(embeddings)

    faiss.write_index(index, os.path.join(index_dir, "faiss.index"))
    with open(os.path.join(index_dir, "chunks.pkl"), "wb") as f:
        pickle.dump(chunks, f)
    return len(chunks)

if __name__ == "__main__":
    n = build_index()
    print(f"Total chunks: {n}\nIndex saved.")