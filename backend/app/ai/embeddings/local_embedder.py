import hashlib
import math
import re
from typing import List

class LocalEmbedder:
    """Local, deterministic semantic embedding generator for private air-gapped RAG.
    Creates 384-dimensional normalized dense vectors without sending data to any external API."""

    def __init__(self, dim: int = 384):
        self.dim = dim

    def embed_text(self, text: str) -> List[float]:
        # Clean and tokenize
        tokens = re.findall(r'\b\w+\b', text.lower())
        vec = [0.0] * self.dim
        if not tokens:
            return vec

        # Term-hash projection with positional weights
        for idx, token in enumerate(tokens):
            h = int(hashlib.sha256(token.encode('utf-8')).hexdigest(), 16)
            pos_weight = 1.0 + (1.0 / (1.0 + idx))
            for i in range(4):  # distribute across dimensions
                dim_idx = (h + i * 97) % self.dim
                sign = 1.0 if ((h >> (i * 4)) & 1) == 0 else -1.0
                vec[dim_idx] += sign * pos_weight

        # Normalize to unit length for cosine similarity
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_text(t) for t in texts]

local_embedder = LocalEmbedder()
