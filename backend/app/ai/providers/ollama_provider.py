import json
from typing import List, Dict, Any, AsyncGenerator, Optional
import httpx
from app.ai.gateway.base import ModelProvider
from app.core.config import settings

class OllamaProvider(ModelProvider):
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")

    async def health_check(self, model_id: Optional[str] = None) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> List[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = []
                    for m in data.get("models", []):
                        models.append({
                            "id": m.get("name"),
                            "name": m.get("name"),
                            "size": m.get("size", 0),
                            "modified_at": m.get("modified_at"),
                            "details": m.get("details", {})
                        })
                    return models
                return []
        except Exception:
            return []

    async def get_model_info(self, model_id: str) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(f"{self.base_url}/api/show", json={"name": model_id})
                if res.status_code == 200:
                    data = res.json()
                    details = data.get("details", {})
                    # Detect capabilities
                    modelfile = data.get("modelfile", "").lower()
                    capabilities = ["text"]
                    family = details.get("family", "").lower()
                    if "vision" in modelfile or "llava" in model_id.lower() or "minicpm" in model_id.lower() or "vision" in family:
                        capabilities.append("vision")
                    if "tools" in modelfile or "function" in modelfile or "llama3" in model_id.lower() or "qwen2" in model_id.lower() or "mistral" in model_id.lower():
                        capabilities.append("tools")
                    return {
                        "model_id": model_id,
                        "capabilities": capabilities,
                        "context_window": 4096,
                        "details": details,
                        "template": data.get("template")
                    }
        except Exception:
            pass
        return {"model_id": model_id, "capabilities": ["text"], "context_window": 4096}

    async def chat(self, model_id: str, messages: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        options = options or {}
        payload = {
            "model": model_id,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": options.get("temperature", 0.7),
                "top_p": options.get("top_p", 0.9),
                "num_predict": options.get("max_tokens", 2048)
            }
        }
        if "stop" in options:
            payload["options"]["stop"] = options["stop"]

        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(f"{self.base_url}/api/chat", json=payload)
            res.raise_for_status()
            data = res.json()
            message = data.get("message", {})
            return {
                "role": message.get("role", "assistant"),
                "content": message.get("content", ""),
                "total_duration": data.get("total_duration"),
                "eval_count": data.get("eval_count"),
                "eval_duration": data.get("eval_duration")
            }

    async def stream_chat(self, model_id: str, messages: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
        options = options or {}
        payload = {
            "model": model_id,
            "messages": messages,
            "stream": True,
            "options": {
                "temperature": options.get("temperature", 0.7),
                "top_p": options.get("top_p", 0.9),
                "num_predict": options.get("max_tokens", 2048)
            }
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                async for chunk in response.aiter_lines():
                    if chunk:
                        try:
                            data = json.loads(chunk)
                            content = data.get("message", {}).get("content", "")
                            if content:
                                yield content
                        except Exception:
                            continue

    async def unload(self, model_id: str) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(f"{self.base_url}/api/generate", json={"model": model_id, "keep_alive": 0})
                return res.status_code == 200
        except Exception:
            return False
