import os
import sys
import shutil
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, status, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.config import DATA_DIR, INDEX_DIR, load_settings, save_settings, DEFAULT_SETTINGS
from backend.logger import logger
from backend.services import (
    get_ollama_status,
    get_documents_info,
    rebuild_index_service,
    delete_document_service,
    retrieve_custom,
    answer_custom_sync,
    answer_custom_stream,
    get_evaluation_metrics,
    run_evaluation_service
)
import rag

app = FastAPI(
    title="Chat with your PDFs API",
    description="Local, private RAG backend powered by FastAPI, FAISS, and Ollama",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://docurag-local-rag-chatbot.vercel.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Models -----------------
class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Question to ask about the indexed documents")
    stream: bool = Field(True, description="Whether to stream response tokens via SSE")
    top_k: Optional[int] = Field(None, ge=1, le=20, description="Override top_k retrieval count")
    min_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Override similarity score threshold")
    model: Optional[str] = Field(None, description="Override Ollama LLM model")

class SettingsUpdateRequest(BaseModel):
    top_k: Optional[int] = Field(None, ge=1, le=20)
    min_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    llm_model: Optional[str] = None

# ----------------- API Endpoints -----------------

@app.get("/api/health")
async def health_check():
    """System health check: backend, Ollama, and index status."""
    ollama_info = get_ollama_status()
    has_idx = rag.has_index()
    chunk_count = 0
    if has_idx:
        try:
            _, chunks = rag.load_index()
            chunk_count = len(chunks)
        except Exception:
            chunk_count = 0
            has_idx = False

    doc_files = [f for f in os.listdir(DATA_DIR) if f.lower().endswith(".pdf")] if os.path.exists(DATA_DIR) else []

    return {
        "status": "ok",
        "backend": "online",
        "ollama": ollama_info,
        "index": {
            "has_index": has_idx,
            "chunk_count": chunk_count,
            "embedding_model": "all-MiniLM-L6-v2",
            "document_count": len(doc_files)
        }
    }

@app.get("/api/documents")
async def list_documents():
    """List indexed PDFs with page count, file size, and chunk stats."""
    try:
        docs = get_documents_info()
        return {"documents": docs, "count": len(docs)}
    except Exception as e:
        logger.error(f"Error listing documents: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    """Upload one or more PDFs, validate, and save to data/."""
    os.makedirs(DATA_DIR, exist_ok=True)
    uploaded_files = []
    errors = []

    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB per PDF

    for file in files:
        safe_filename = os.path.basename(file.filename or "")
        if not safe_filename.lower().endswith(".pdf"):
            errors.append(f"'{safe_filename}' is not a PDF file. Only .pdf files are supported.")
            continue

        dest_path = os.path.join(DATA_DIR, safe_filename)
        try:
            # Read and validate size
            contents = await file.read()
            if len(contents) == 0:
                errors.append(f"'{safe_filename}' is empty (0 bytes).")
                continue
            if len(contents) > MAX_FILE_SIZE:
                errors.append(f"'{safe_filename}' exceeds the maximum allowed file size of 50MB.")
                continue

            with open(dest_path, "wb") as f_out:
                f_out.write(contents)

            uploaded_files.append(safe_filename)
            logger.info(f"Uploaded file saved: {safe_filename} ({len(contents)} bytes)")
        except Exception as e:
            logger.error(f"Failed to save upload '{safe_filename}': {e}")
            errors.append(f"Failed to save '{safe_filename}': {str(e)}")

    if not uploaded_files and errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))

    return {
        "uploaded": uploaded_files,
        "count": len(uploaded_files),
        "errors": errors,
        "message": f"Successfully uploaded {len(uploaded_files)} file(s). You can now (re)index documents."
    }

@app.post("/api/index")
async def rebuild_index():
    """(Re)build the FAISS index from files in data/."""
    try:
        result = rebuild_index_service()
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build index: {str(e)}")

@app.delete("/api/documents/{name}")
async def delete_document(name: str):
    """Delete a PDF and rebuild index."""
    try:
        result = delete_document_service(name)
        return result
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=str(fnf))
    except ValueError as ve:
        return {
            "success": True,
            "warning": str(ve),
            "message": f"Document '{name}' deleted, but remaining documents produced no text chunks."
        }
    except Exception as e:
        logger.error(f"Error deleting document '{name}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(req: ChatRequest):
    """Chat endpoint supporting SSE streaming and regular JSON."""
    settings = load_settings()
    k = req.top_k or settings.get("top_k", 6)
    min_score = req.min_score if req.min_score is not None else settings.get("min_score", 0.15)
    model = req.model or settings.get("llm_model", "llama3.2:3b")

    logger.info(f"Chat request: '{req.question[:60]}...' [k={k}, min_score={min_score}, model={model}, stream={req.stream}]")

    # Verify Ollama is reachable before proceeding
    ollama_info = get_ollama_status()
    if ollama_info["status"] != "connected":
        raise HTTPException(
            status_code=503,
            detail="Ollama service is not running or unreachable on http://localhost:11434. Please ensure Ollama is started."
        )

    # Verify document index exists
    if not rag.has_index():
        raise HTTPException(
            status_code=400,
            detail="No documents are indexed yet. Please upload a PDF and click 'Process / Build Index' first."
        )

    if req.stream:
        return StreamingResponse(
            answer_custom_stream(req.question, k=k, min_score=min_score, model=model),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    else:
        try:
            answer_text, sources = answer_custom_sync(req.question, k=k, min_score=min_score, model=model)
            return {
                "answer": answer_text,
                "sources": sources
            }
        except Exception as e:
            logger.error(f"Chat sync error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/settings")
async def get_settings():
    """Get current RAG settings and available Ollama models."""
    current = load_settings()
    ollama_info = get_ollama_status()
    return {
        "settings": current,
        "available_models": ollama_info.get("models", []),
        "ollama_status": ollama_info.get("status")
    }

@app.post("/api/settings")
async def update_settings(req: SettingsUpdateRequest):
    """Update settings (top_k, min_score, llm_model). Applies live with no restart."""
    updates = {}
    if req.top_k is not None:
        updates["top_k"] = req.top_k
    if req.min_score is not None:
        updates["min_score"] = req.min_score
    if req.llm_model:
        updates["llm_model"] = req.llm_model

    saved = save_settings(updates)
    logger.info(f"Updated settings: {saved}")
    return {"message": "Settings saved successfully", "settings": saved}

@app.get("/api/eval")
async def get_eval():
    """Return latest evaluation metrics from disk on every request (no caching)."""
    data = get_evaluation_metrics()
    return JSONResponse(
        content=data,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@app.post("/api/eval/run")
async def run_eval():
    """Run evaluation benchmark against current index and return metrics."""
    ollama_info = get_ollama_status()
    if ollama_info["status"] != "connected":
        raise HTTPException(
            status_code=503,
            detail="Ollama service is not running or unreachable on http://localhost:11434. Evaluation requires Ollama."
        )

    if not rag.has_index():
        raise HTTPException(
            status_code=400,
            detail="Cannot run evaluation: no documents are indexed yet."
        )

    try:
        results = run_evaluation_service()
        return JSONResponse(
            content=results,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    except Exception as e:
        logger.error(f"Evaluation benchmark failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
