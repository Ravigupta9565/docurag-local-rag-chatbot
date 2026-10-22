import os
import faiss
import pickle
from groq import Groq
from sentence_transformers import SentenceTransformer

# Groq Client Initialization (Secure via environment variable)
groq_api_key = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=groq_api_key) if groq_api_key else None

# Load Embedding Model
_embedding_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model

INDEX_PATH = "index/faiss.index"
CHUNKS_PATH = "index/chunks.pkl"

def has_index():
    return os.path.exists(INDEX_PATH) and os.path.exists(CHUNKS_PATH)

def load_index():
    if not has_index():
        return None, None
    index = faiss.read_index(INDEX_PATH)
    with open(CHUNKS_PATH, "rb") as f:
        chunks = pickle.load(f)
    return index, chunks

def retrieve(question: str, top_k: int = 3):
    index, chunks = load_index()
    if index is None or chunks is None:
        return []

    model = get_embedding_model()
    q_embed = model.encode([question])
    distances, indices = index.search(q_embed, min(top_k, len(chunks)))

    retrieved_chunks = []
    for i in indices[0]:
        if i != -1 and i < len(chunks):
            retrieved_chunks.append(chunks[i])
    return retrieved_chunks

def answer(question: str, context_chunks: list):
    if not client:
        return "GROQ_API_KEY is missing in backend environment variables."

    context = "\n\n".join([c.get("text", "") for c in context_chunks])
    
    prompt = f"""Use the provided context to answer the question accurately and concisely. If the answer is not in the context, say "I don't know based on the provided document."

Context:
{context}

Question: {question}
Answer:"""

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # Updated to universal active Groq model
            messages=[
                {"role": "system", "content": "You are a helpful AI document assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1024
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"Error calling Groq API: {str(e)}"

def query_rag(question: str, top_k: int = 3):
    retrieved_chunks = retrieve(question, top_k=top_k)
    if not retrieved_chunks:
        return {
            "answer": "No relevant information found or index missing. Please upload a PDF first.",
            "sources": []
        }
    answer_text = answer(question, retrieved_chunks)
    return {"answer": answer_text, "sources": retrieved_chunks}