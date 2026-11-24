import json
from typing import List, Dict, Any, AsyncGenerator, Optional
import httpx
from app.ai.gateway.base import ModelProvider
from app.core.config import settings

class VLLMProvider(ModelProvider):
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or settings.VLLM_BASE_URL).rstrip("/")

    async def health_check(self, model_id: Optional[str] = None) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/models")
                return res.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> List[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/models")
                if res.status_code == 200:
                    data = res.json()
                    return [{"id": m.get("id"), "name": m.get("id")} for m in data.get("data", [])]
        except Exception:
            pass
        return []

    async def get_model_info(self, model_id: str) -> Dict[str, Any]:
        return {"model_id": model_id, "capabilities": ["text", "tools"], "context_window": 8192}

    async def chat(self, model_id: str, messages: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        options = options or {}
        payload = {
            "model": model_id,
            "messages": messages,
            "temperature": options.get("temperature", 0.7),
            "top_p": options.get("top_p", 0.9),
            "max_tokens": options.get("max_tokens", 2048),
            "stream": False
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(f"{self.base_url}/chat/completions", json=payload)
            res.raise_for_status()
            data = res.json()
            choice = data["choices"][0]
            return {"role": "assistant", "content": choice["message"]["content"]}

    async def stream_chat(self, model_id: str, messages: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
        options = options or {}
        payload = {
            "model": model_id,
            "messages": messages,
            "temperature": options.get("temperature", 0.7),
            "max_tokens": options.get("max_tokens", 2048),
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
