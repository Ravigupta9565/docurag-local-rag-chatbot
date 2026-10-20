import os
import streamlit as st
from ingest import build_index, DATA_DIR
from rag import answer

st.set_page_config(page_title="Chat with your PDFs", page_icon="📚")
st.title("📚 Chat with your PDFs")

# ---------- Sidebar: upload and index ----------
with st.sidebar:
    st.header("Documents")
    uploaded = st.file_uploader("Upload PDFs", type="pdf", accept_multiple_files=True)

    if st.button("Process documents", disabled=not uploaded):
        os.makedirs(DATA_DIR, exist_ok=True)
        for f in uploaded:
            with open(os.path.join(DATA_DIR, f.name), "wb") as out:
                out.write(f.getbuffer())
        with st.spinner("Reading and indexing..."):
            try:
                n = build_index()
                st.success(f"Done. {n} chunks indexed.")
            except ValueError as e:
                st.error(str(e))

    st.caption("Files in library:")
    if os.path.isdir(DATA_DIR):
        for name in sorted(os.listdir(DATA_DIR)):
            if name.lower().endswith(".pdf"):
                st.write(f"• {name}")

    if st.button("Clear chat"):
        st.session_state.history = []
        st.rerun()

# ---------- Chat ----------
if "history" not in st.session_state:
    st.session_state.history = []

for role, msg in st.session_state.history:
    with st.chat_message(role):
        st.markdown(msg)

question = st.chat_input("Ask a question about your documents")
if question:
    st.session_state.history.append(("user", question))
    with st.chat_message("user"):
        st.markdown(question)

    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            ans, sources = answer(question)
        st.markdown(ans)
        if sources:
            with st.expander("Sources"):
                for s in sources:
                    score = s.get("score")
                    label = f"**{s['source']}**, page {s['page']}"
                    if score is not None:
                        label += f" (score {score:.2f})"
                    st.markdown(label)
                    st.caption(s["text"][:300] + "...")
    st.session_state.history.append(("assistant", ans))