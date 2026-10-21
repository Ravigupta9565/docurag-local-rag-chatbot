import os
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List
from ingest import build_index, DATA_DIR
from rag import answer

app = FastAPI(title="DocuRAG API Backend")

class QuestionRequest(BaseModel):
    question: str

@app.get("/")
def home():
    return {"status": "DocuRAG API is live!"}

@app.post("/api/chat")
def chat_endpoint(payload: QuestionRequest):
    try:
        ans, sources = answer(payload.question)
        return {"answer": ans, "sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        for f in files:
            file_path = os.path.join(DATA_DIR, f.filename)
            with open(file_path, "wb") as buffer:
                buffer.write(await f.read())
        
        chunks = build_index()
        return {"message": "Files processed and indexed", "chunks": chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)