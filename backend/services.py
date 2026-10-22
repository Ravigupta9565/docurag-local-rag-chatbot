import os
import time
import csv
import json
import pickle
from datetime import datetime
from pypdf import PdfReader
from groq import Groq

from backend.config import DATA_DIR, INDEX_DIR, EVAL_FILE, load_settings
from backend.logger import logger
import ingest
import rag
import eval as eval_module

# Groq Client Initialization (Secure via environment variable)
groq_api_key = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=groq_api_key) if groq_api_key else None

def get_ollama_status():
    """Check Groq API availability instead of local Ollama."""
    if client and groq_api_key:
        return {
            "status": "connected",
            "models": ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"]
        }
    return {
        "status": "offline",
        "error": "GROQ_API_KEY is not configured in environment variables.",
        "models": []
    }

def get_documents_info():
    """List all PDFs in data/ with page count, file size, text status, chunk count."""
    os.makedirs(DATA_DIR, exist_ok=True)
    files = []
    
    chunks_per_file = {}
    if rag.has_index():
        try:
            _, chunks = rag.load_index()
            for c in chunks:
                src = c.get("source", "")
                chunks_per_file[src] = chunks_per_file.get(src, 0) + 1
        except Exception as e:
            logger.warning(f"Error loading chunks for doc stats: {e}")

    for fname in sorted(os.listdir(DATA_DIR)):
        if fname.lower().endswith(".pdf"):
            full_path = os.path.join(DATA_DIR, fname)
            size_bytes = os.path.getsize(full_path)
            mtime = datetime.fromtimestamp(os.path.getmtime(full_path)).strftime("%Y-%m-%d %H:%M")
            
            page_count = 0
            has_text = True
            scanned_warning = False
            total_extracted_chars = 0
            
            try:
                reader = PdfReader(full_path)
                page_count = len(reader.pages)
                for page in reader.pages:
                    txt = page.extract_text() or ""
                    total_extracted_chars += len(txt.strip())
                if total_extracted_chars == 0 and page_count > 0:
                    has_text = False
                    scanned_warning = True
            except Exception as e:
                logger.error(f"Error reading PDF {fname}: {e}")
                scanned_warning = True

            files.append({
                "name": fname,
                "size_bytes": size_bytes,
                "size_formatted": format_file_size(size_bytes),
                "page_count": page_count,
                "has_text": has_text,
                "scanned_warning": scanned_warning,
                "chunk_count": chunks_per_file.get(fname, 0),
                "last_modified": mtime
            })
    return files

def format_file_size(num_bytes: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB']:
        if num_bytes < 1024.0:
            return f"{num_bytes:.1f} {unit}" if unit != 'B' else f"{num_bytes} B"
        num_bytes /= 1024.0
    return f"{num_bytes:.1f} TB"

def rebuild_index_service():
    """Rebuilds the FAISS index and measures time."""
    logger.info("Starting index rebuild...")
    start_time = time.time()
    try:
        chunk_count = ingest.build_index(data_dir=DATA_DIR, index_dir=INDEX_DIR)
        elapsed = round(time.time() - start_time, 2)
        logger.info(f"Indexing completed: {chunk_count} chunks in {elapsed}s")
        return {
            "success": True,
            "chunks": chunk_count,
            "elapsed_seconds": elapsed,
            "message": f"Successfully indexed {chunk_count} chunks across documents."
        }
    except ValueError as ve:
        logger.warning(f"Indexing validation error: {ve}")
        raise ve
    except Exception as e:
        logger.error(f"Indexing failed: {e}", exc_info=True)
        raise RuntimeError(f"Index generation failed: {str(e)}")

def delete_document_service(filename: str):
    """Deletes a PDF file and rebuilds or clears index."""
    safe_name = os.path.basename(filename)
    target = os.path.join(DATA_DIR, safe_name)
    if not os.path.exists(target):
        raise FileNotFoundError(f"File '{safe_name}' does not exist in data directory.")
    
    os.remove(target)
    logger.info(f"Deleted file {safe_name}")
    
    remaining = [f for f in os.listdir(DATA_DIR) if f.lower().endswith(".pdf")]
    if remaining:
        return rebuild_index_service()
    else:
        for f in ["faiss.index", "chunks.pkl"]:
            p = os.path.join(INDEX_DIR, f)
            if os.path.exists(p):
                os.remove(p)
        logger.info("All documents deleted, index cleared.")
        return {
            "success": True,
            "chunks": 0,
            "elapsed_seconds": 0.0,
            "message": "Document deleted. No documents left; index was cleared."
        }

def retrieve_custom(question: str, k: int = None, min_score: float = None):
    """Retrieve with custom k and min_score threshold, falling back to live settings."""
    if not rag.has_index():
        return []
    settings = load_settings()
    k_val = k if k is not None else settings.get("top_k", 6)
    score_cutoff = min_score if min_score is not None else settings.get("min_score", 0.15)
    
    index, chunks = rag.load_index()
    if not chunks:
        return []
    k_val = min(k_val, len(chunks))
    q = ingest.get_model().encode([question], normalize_embeddings=True).astype("float32")
    scores, ids = index.search(q, k_val)
    results = []
    for score, i in zip(scores[0], ids[0]):
        if i == -1 or score < score_cutoff:
            continue
        d = dict(chunks[i])
        d["score"] = float(score)
        results.append(d)
    return results

def answer_custom_sync(question: str, k: int = None, min_score: float = None, model: str = None):
    """Sync answer generation using Groq Cloud API with model mapping."""
    if not rag.has_index():
        return "No documents are indexed yet. Please upload a PDF first.", []
    
    if not client:
        return "GROQ_API_KEY is missing in backend environment variables.", []

    settings = load_settings()
    k_val = k if k is not None else settings.get("top_k", 6)
    score_cutoff = min_score if min_score is not None else settings.get("min_score", 0.15)
    
    raw_model = model or settings.get("llm_model", "llama-3.3-70b-versatile")
    # Force universal versatile model to avoid 404 model not found errors
    llm_model = "llama-3.3-70b-versatile"

    docs = retrieve_custom(question, k=k_val, min_score=score_cutoff)
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
    
    try:
        completion = client.chat.completions.create(
            model=llm_model,
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant that answers questions based on documents."},
                {"role": "user", "content": prompt}
            ],
            temperature=0,
            max_tokens=1024,
        )
        return completion.choices[0].message.content, docs
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        raise RuntimeError(f"Error contacting Groq API with model '{llm_model}': {e}")

def answer_custom_stream(question: str, k: int = None, min_score: float = None, model: str = None):
    """Server-Sent Events generator for streaming answer via Groq API with model mapping."""
    start_time = time.time()
    
    if not client:
        payload = json.dumps({"type": "error", "message": "GROQ_API_KEY is missing in backend environment variables."})
        yield f"data: {payload}\n\n"
        return

    settings = load_settings()
    k_val = k if k is not None else settings.get("top_k", 6)
    score_cutoff = min_score if min_score is not None else settings.get("min_score", 0.15)
    
    raw_model = model or settings.get("llm_model", "llama-3.3-70b-versatile")
    llm_model = "llama-3.3-70b-versatile"

    if not rag.has_index():
        payload = json.dumps({"type": "error", "message": "No documents are indexed yet. Please upload a PDF first."})
        yield f"data: {payload}\n\n"
        return

    try:
        docs = retrieve_custom(question, k=k_val, min_score=score_cutoff)
    except Exception as e:
        logger.error(f"Retrieval error: {e}")
        payload = json.dumps({"type": "error", "message": f"Retrieval failed: {str(e)}"})
        yield f"data: {payload}\n\n"
        return

    if not docs:
        refusal_msg = "I couldn't find relevant information in the uploaded documents."
        yield f"data: {json.dumps({'type': 'sources', 'sources': []})}\n\n"
        yield f"data: {json.dumps({'type': 'token', 'token': refusal_msg})}\n\n"
        elapsed = round(time.time() - start_time, 2)
        yield f"data: {json.dumps({'type': 'done', 'total_time': elapsed})}\n\n"
        return

    yield f"data: {json.dumps({'type': 'sources', 'sources': docs})}\n\n"

    context = "\n\n".join(d["text"] for d in docs)
    prompt = (
        "Answer the question using ONLY the context below. "
        "If the answer is not in the context, say you don't know. "
        "Be concise. Do not mention page numbers or file names; "
        "sources are shown separately.\n\n"
        f"Context:\n{context}\n\nQuestion: {question}\nAnswer:"
    )

    try:
        response_stream = client.chat.completions.create(
            model=llm_model,
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant that answers questions based on documents."},
                {"role": "user", "content": prompt}
            ],
            temperature=0,
            max_tokens=1024,
            stream=True
        )
        for chunk in response_stream:
            content = chunk.choices[0].delta.content or ""
            if content:
                yield f"data: {json.dumps({'type': 'token', 'token': content})}\n\n"

        elapsed = round(time.time() - start_time, 2)
        yield f"data: {json.dumps({'type': 'done', 'total_time': elapsed})}\n\n"
    except Exception as e:
        logger.error(f"Groq API streaming failure: {e}", exc_info=True)
        err_msg = f"Failed to generate answer from Groq API ({llm_model}): {str(e)}"
        yield f"data: {json.dumps({'type': 'error', 'message': err_msg})}\n\n"

def get_evaluation_metrics():
    """Parse eval_results.csv fresh from disk and compute metrics."""
    if not os.path.exists(EVAL_FILE):
        return {
            "has_eval": False,
            "last_run": None,
            "metrics": {
                "retrieval_hit_rate": 0.0,
                "answer_accuracy": 0.0,
                "refusal_rate": 0.0,
                "avg_response_time": 0.0,
                "total_tests": 0,
                "in_scope_count": 0,
                "out_of_scope_count": 0
            },
            "rows": []
        }

    rows = []
    in_scope_hits = 0
    in_scope_correct = 0
    in_scope_count = 0
    out_of_scope_correct = 0
    out_of_scope_count = 0
    total_seconds = 0.0

    try:
        last_mtime = os.path.getmtime(EVAL_FILE)
        last_run_str = datetime.fromtimestamp(last_mtime).strftime("%Y-%m-%d %H:%M:%S")

        with open(EVAL_FILE, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                q = row.get("question", "")
                qtype = row.get("type", "")
                rh = row.get("retrieval_hit", "").strip().lower() == "true"
                ok = row.get("correct", "").strip().lower() == "true"
                sec = float(row.get("seconds", 0.0) or 0.0)
                ans = row.get("answer", "")

                total_seconds += sec

                if qtype == "in-scope":
                    in_scope_count += 1
                    if rh:
                        in_scope_hits += 1
                    if ok:
                        in_scope_correct += 1
                elif qtype == "out-of-scope":
                    out_of_scope_count += 1
                    if ok:
                        out_of_scope_correct += 1

                rows.append({
                    "question": q,
                    "type": qtype,
                    "retrieval_hit": rh if qtype == "in-scope" else None,
                    "correct": ok,
                    "seconds": sec,
                    "answer": ans
                })

        total_tests = in_scope_count + out_of_scope_count
        hit_rate = round((in_scope_hits / in_scope_count) * 100, 1) if in_scope_count > 0 else 0.0
        accuracy = round((in_scope_correct / in_scope_count) * 100, 1) if in_scope_count > 0 else 0.0
        refusal_rate = round((out_of_scope_correct / out_of_scope_count) * 100, 1) if out_of_scope_count > 0 else 0.0
        avg_time = round(total_seconds / total_tests, 2) if total_tests > 0 else 0.0

        return {
            "has_eval": True,
            "last_run": last_run_str,
            "metrics": {
                "retrieval_hit_rate": hit_rate,
                "answer_accuracy": accuracy,
                "refusal_rate": refusal_rate,
                "avg_response_time": avg_time,
                "total_tests": total_tests,
                "in_scope_count": in_scope_count,
                "out_of_scope_count": out_of_scope_count
            },
            "rows": rows
        }
    except Exception as e:
        logger.error(f"Error reading eval_results.csv: {e}")
        return {
            "has_eval": False,
            "error": str(e),
            "last_run": None,
            "metrics": {},
            "rows": []
        }

def run_evaluation_service():
    """Runs the evaluation pipeline against current index and saves to eval_results.csv."""
    logger.info("Executing evaluation benchmark...")
    if not rag.has_index():
        raise ValueError("Cannot run evaluation: no documents are indexed.")
    
    settings = load_settings()
    k_val = settings.get("top_k", 6)
    min_score = settings.get("min_score", 0.15)
    model = "llama-3.3-70b-versatile"

    rows = []
    tests = eval_module.TESTS
    out_of_scope = eval_module.OUT_OF_SCOPE
    refusal_phrases = eval_module.REFUSAL_PHRASES

    for t in tests:
        start = time.time()
        retrieved_docs = retrieve_custom(t["q"], k=k_val, min_score=min_score)
        retrieved_text = " ".join(d["text"] for d in retrieved_docs)
        ans, _ = answer_custom_sync(t["q"], k=k_val, min_score=min_score, model=model)
        
        hit = eval_module.contains_any(retrieved_text, t["expect"])
        ok = eval_module.contains_any(ans, t["expect"])
        dur = round(time.time() - start, 1)
        rows.append([t["q"], "in-scope", hit, ok, dur, ans.replace("\n", " ")])

    for q in out_of_scope:
        start = time.time()
        ans, docs = answer_custom_sync(q, k=k_val, min_score=min_score, model=model)
        ok = (not docs) or eval_module.contains_any(ans, refusal_phrases)
        dur = round(time.time() - start, 1)
        rows.append([q, "out-of-scope", "", ok, dur, ans.replace("\n", " ")])

    with open(EVAL_FILE, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["question", "type", "retrieval_hit", "correct", "seconds", "answer"])
        w.writerows(rows)

    logger.info("Evaluation finished and saved to eval_results.csv")
    return get_evaluation_metrics()