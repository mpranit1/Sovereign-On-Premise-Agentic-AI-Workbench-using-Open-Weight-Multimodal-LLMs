from typing import List, Dict, Any, AsyncGenerator, Optional
from app.ai.gateway.base import ModelProvider
from app.ai.providers.ollama_provider import OllamaProvider
from app.ai.providers.vllm_provider import VLLMProvider
from app.ai.providers.llamacpp_provider import LlamaCppProvider
from app.ai.providers.mock_provider import MockLocalProvider

class ModelGateway:
    """Unified Gateway managing inference across all configured on-premise model providers."""
    
    def __init__(self):
        self.providers: Dict[str, ModelProvider] = {
            "ollama": OllamaProvider(),
            "vllm": VLLMProvider(),
            "llamacpp": LlamaCppProvider(),
            "mock": MockLocalProvider()
        }

    def get_provider(self, provider_name: str) -> ModelProvider:
        return self.providers.get(provider_name.lower(), self.providers["mock"])

    async def list_available_models(self) -> List[Dict[str, Any]]:
        all_models = []
        for name, provider in self.providers.items():
            try:
                models = await provider.list_models()
                for m in models:
                    m["provider"] = name
                    all_models.append(m)
            except Exception:
                continue
        return all_models

    async def health_check(self, provider_name: str, model_id: Optional[str] = None) -> bool:
        provider = self.get_provider(provider_name)
        return await provider.health_check(model_id)

    async def chat(self, provider_name: str, model_id: str, messages: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        provider = self.get_provider(provider_name)
        # Attempt primary provider; if offline or fails, seamlessly fall back to mock
        try:
            return await provider.chat(model_id, messages, options)
        except Exception as e:
            if provider_name != "mock":
                mock = self.get_provider("mock")
                return await mock.chat(model_id, messages, options)
            raise e

    async def stream_chat(self, provider_name: str, model_id: str, messages: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
        provider = self.get_provider(provider_name)
        try:
            # Check health first
            is_alive = await provider.health_check()
            if not is_alive and provider_name != "mock":
                provider = self.get_provider("mock")
            async for token in provider.stream_chat(model_id, messages, options):
                yield token
        except Exception:
            mock = self.get_provider("mock")
            async for token in mock.stream_chat(model_id, messages, options):
                yield token

    async def unload(self, provider_name: str, model_id: str) -> bool:
        provider = self.get_provider(provider_name)
        return await provider.unload(model_id)

model_gateway = ModelGateway()
