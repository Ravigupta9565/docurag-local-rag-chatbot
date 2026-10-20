import os, pickle
import faiss
import ollama
from ingest import get_model, INDEX_DIR

LLM_MODEL = "llama3.2:3b"
MIN_SCORE = 0.15   # default similarity threshold 0.15
DEFAULT_K = 6      # default k=6

def has_index():
    return (os.path.exists(os.path.join(INDEX_DIR, "faiss.index"))
            and os.path.exists(os.path.join(INDEX_DIR, "chunks.pkl")))

def load_index():
    index = faiss.read_index(os.path.join(INDEX_DIR, "faiss.index"))
    with open(os.path.join(INDEX_DIR, "chunks.pkl"), "rb") as f:
        chunks = pickle.load(f)
    return index, chunks

def retrieve(question, k=6, min_score=None):
    if min_score is None:
        min_score = MIN_SCORE
    if not has_index():
        return []
    index, chunks = load_index()
    if not chunks:
        return []
    k = min(k, len(chunks))
    q = get_model().encode([question], normalize_embeddings=True).astype("float32")
    scores, ids = index.search(q, k)
    results = []
    for score, i in zip(scores[0], ids[0]):
        if i == -1 or score < min_score:
            continue
        d = dict(chunks[i])
        d["score"] = float(score)
        results.append(d)
    return results

def answer(question, k=6, min_score=None):
    if min_score is None:
        min_score = MIN_SCORE
    if not has_index():
        return "No documents are indexed yet. Please upload a PDF first.", []

    docs = retrieve(question, k=k, min_score=min_score)
    if not docs:
        return "I couldn't find relevant information in the uploaded documents.", []

    context = "\n\n".join(d["text"] for d in docs)
    prompt = (
        "Answer the question using ONLY the context below. "
        "If the answer is not in the context, say you don't know. "
        "Be concise. Do not mention page numbers or file names; "
        "sources are shown separately.\n\n"
        f"Context:\n{context}\n\nQuestion: {question}\nAnswer:"
    )
    resp = ollama.chat(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        options={"temperature": 0},
    )
    return resp["message"]["content"], docs

if __name__ == "__main__":
    q = input("Ask: ")
    ans, sources = answer(q)
    print("\n", ans)
    print("\nSources:", [(s["source"], s["page"], round(s["score"], 2)) for s in sources])