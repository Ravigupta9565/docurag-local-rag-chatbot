import os
import faiss
import pickle
from groq import Groq
from sentence_transformers import SentenceTransformer

# Groq Client Initialization
groq_api_key = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=groq_api_key) if groq_api_key else None

# Load Embedding Model
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

INDEX_PATH = "index/faiss.index"
CHUNKS_PATH = "index/chunks.pkl"

def load_index():
    if not os.path.exists(INDEX_PATH) or not os.path.exists(CHUNKS_PATH):
        return None, None
    index = faiss.read_index(INDEX_PATH)
    with open(CHUNKS_PATH, "rb") as f:
        chunks = pickle.load(f)
    return index, chunks

def query_rag(question: str, top_k: int = 3):
    index, chunks = load_index()
    if index is None or chunks is None:
        return {
            "answer": "No indexed documents found. Please upload a PDF and rebuild the index first.",
            "sources": []
        }

    # Embed question and search FAISS
    q_embed = embedding_model.encode([question])
    distances, indices = index.search(q_embed, top_k)

    retrieved_chunks = [chunks[i] for i in indices[0] if i < len(chunks)]
    context = "\n\n".join([c["text"] for c in retrieved_chunks])

    if not client:
        return {
            "answer": "GROQ_API_KEY is missing in backend environment variables.",
            "sources": retrieved_chunks
        }

    prompt = f"""Use the provided context to answer the question accurately and concisely. If the answer is not in the context, say "I don't know based on the provided document."

Context:
{context}

Question: {question}
Answer:"""

    try:
        completion = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "system", "content": "You are a helpful AI document assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1024
        )
        answer_text = completion.choices[0].message.content
        return {"answer": answer_text, "sources": retrieved_chunks}
    except Exception as e:
        return {"answer": f"Error calling Groq API: {str(e)}", "sources": retrieved_chunks}