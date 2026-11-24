import json
from typing import List, Dict, Any, AsyncGenerator, Optional
import httpx
from app.ai.gateway.base import ModelProvider
from app.core.config import settings

class LlamaCppProvider(ModelProvider):
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or settings.LLAMACPP_BASE_URL).rstrip("/")

    async def health_check(self, model_id: Optional[str] = None) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/health")
                return res.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> List[Dict[str, Any]]:
        return [{"id": "llamacpp-current", "name": "Active llama.cpp Model"}]

    async def get_model_info(self, model_id: str) -> Dict[str, Any]:
        return {"model_id": model_id, "capabilities": ["text"], "context_window": 4096}

    async def chat(self, model_id: str, messages: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        options = options or {}
        payload = {
            "messages": messages,
            "temperature": options.get("temperature", 0.7),
            "n_predict": options.get("max_tokens", 2048),
            "stream": False
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(f"{self.base_url}/chat/completions", json=payload)
            res.raise_for_status()
            data = res.json()
            return {"role": "assistant", "content": data["choices"][0]["message"]["content"]}

    async def stream_chat(self, model_id: str, messages: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
        options = options or {}
        payload = {
            "messages": messages,
            "temperature": options.get("temperature", 0.7),
            "n_predict": options.get("max_tokens", 2048),
            "stream": True
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", f"{self.base_url}/chat/completions", json=payload) as response:
                async for chunk in response.aiter_lines():
                    if chunk.startswith("data: "):
                        data_str = chunk[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            item = json.loads(data_str)
                            delta = item["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except Exception:
                            continue

    async def unload(self, model_id: str) -> bool:
        return True
