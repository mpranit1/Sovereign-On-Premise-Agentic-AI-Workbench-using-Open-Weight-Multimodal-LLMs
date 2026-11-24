import uuid
from typing import List, Dict, Any
from app.ai.embeddings.local_embedder import local_embedder
from app.rag.store import vector_store

class RAGService:
    @staticmethod
    def chunk_text(text: str, chunk_size: int = 512, chunk_overlap: int = 64) -> List[str]:
        words = text.split()
        if not words:
            return []
        
        chunks = []
        step = max(1, chunk_size - chunk_overlap)
        for i in range(0, len(words), step):
            chunk = " ".join(words[i : i + chunk_size])
            if chunk.strip():
                chunks.append(chunk.strip())
        return chunks

    @classmethod
    def index_extracted_document(
        cls, 
        kb_id: str, 
        doc_id: str, 
        file_name: str, 
        sections: List[Dict[str, Any]], 
        chunk_size: int = 512, 
        chunk_overlap: int = 64
    ) -> int:
        total_chunks = 0
        for sec in sections:
            text = sec.get("text", "")
            page = sec.get("page", 1)
            sec_title = sec.get("section", "General")
            
            chunks = cls.chunk_text(text, chunk_size, chunk_overlap)
            for c_idx, chunk in enumerate(chunks):
                chunk_id = str(uuid.uuid4())
                vector = local_embedder.embed_text(chunk)
                metadata = {
                    "file_name": file_name,
                    "page": page,
                    "section": sec_title,
                    "chunk_index": c_idx
                }
                vector_store.insert_chunk(chunk_id, kb_id, doc_id, chunk, vector, metadata)
                total_chunks += 1
        return total_chunks

    @staticmethod
    def search_knowledge_base(kb_id: str, query: str, limit: int = 5, threshold: float = 0.0) -> List[Dict[str, Any]]:
        query_vec = local_embedder.embed_text(query)
        raw_results = vector_store.search(kb_id, query_vec, limit=limit, threshold=threshold)
        
        grounded_results = []
        for r in raw_results:
            meta = r["metadata"]
            citation = f"[{meta.get('file_name', 'Doc')}, Page {meta.get('page', 1)}, Section: {meta.get('section', 'Main')}]"
            grounded_results.append({
                "chunk_id": r["chunk_id"],
                "doc_id": r["doc_id"],
                "content": r["text"],
                "score": r["score"],
                "citation": citation,
                "metadata": meta
            })
        return grounded_results

rag_service = RAGService()
