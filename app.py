import os
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from ingest import build_index, DATA_DIR
from rag import answer

app = FastAPI(title="DocuRAG API Backend")

# CORS middleware add karein taaki Vercel frontend se requests allow ho sakein
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production mein specific Vercel URL bhi de sakte hain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionRequest(BaseModel):
    question: str

@app.get("/")
def home():
    return {"status": "DocuRAG API is live!"}

@app.get("/api/health")
def health_check():
    # Ollama status ya index status check karne ke liye
    index_exists = os.path.exists(os.path.join(DATA_DIR, "faiss.index"))
    return {
        "status": "healthy",
        "ollama": "Connected" if os.environ.get("OLLAMA_HOST") else "Local/Default",
        "index_ready": index_exists
    }

@app.post("/api/chat")
def chat_endpoint(payload: QuestionRequest):
    try:
        ans, sources = answer(payload.question)
        return {"answer": ans, "sources": sources}
    except Exception as e:
        return {"answer": f"Error processing query: {str(e)}", "sources": []}

@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        saved_files = []
        for f in files:
            file_path = os.path.join(DATA_DIR, f.filename)
            with open(file_path, "wb") as buffer:
                buffer.write(await f.read())
            saved_files.append(f.filename)
        
        chunks = build_index()
        return {"success": True, "message": "Files processed and indexed", "chunks": chunks, "files": saved_files}
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)