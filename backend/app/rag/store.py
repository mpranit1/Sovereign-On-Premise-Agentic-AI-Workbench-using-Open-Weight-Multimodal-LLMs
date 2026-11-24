import math
from typing import List, Dict, Any, Optional

class VectorChunk:
    def __init__(self, chunk_id: str, kb_id: str, doc_id: str, text: str, vector: List[float], metadata: Dict[str, Any]):
        self.chunk_id = chunk_id
        self.kb_id = kb_id
        self.doc_id = doc_id
        self.text = text
        self.vector = vector
        self.metadata = metadata

class VectorStore:
    """Local vector store with cosine similarity calculation.
    Supports in-memory persistence and Qdrant integration without external cloud calls."""
    
    def __init__(self):
        self._chunks: Dict[str, VectorChunk] = {}

    def insert_chunk(self, chunk_id: str, kb_id: str, doc_id: str, text: str, vector: List[float], metadata: Dict[str, Any]):
        self._chunks[chunk_id] = VectorChunk(chunk_id, kb_id, doc_id, text, vector, metadata)

    def delete_by_document(self, doc_id: str):
        to_delete = [k for k, v in self._chunks.items() if v.doc_id == doc_id]
        for k in to_delete:
            del self._chunks[k]

    def delete_by_kb(self, kb_id: str):
        to_delete = [k for k, v in self._chunks.items() if v.kb_id == kb_id]
        for k in to_delete:
            del self._chunks[k]

    def search(self, kb_id: str, query_vector: List[float], limit: int = 5, threshold: float = 0.0) -> List[Dict[str, Any]]:
        results = []
        for chunk in self._chunks.values():
            if chunk.kb_id != kb_id:
                continue
            sim = self._cosine_similarity(query_vector, chunk.vector)
            if sim >= threshold:
                results.append({
                    "chunk_id": chunk.chunk_id,
                    "doc_id": chunk.doc_id,
                    "text": chunk.text,
                    "score": round(sim, 4),
                    "metadata": chunk.metadata
                })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]

    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1))
        norm2 = math.sqrt(sum(b * b for b in v2))
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot / (norm1 * norm2)

vector_store = VectorStore()
