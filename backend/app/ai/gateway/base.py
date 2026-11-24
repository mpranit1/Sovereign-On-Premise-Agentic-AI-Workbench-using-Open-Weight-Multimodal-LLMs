from abc import ABC, abstractmethod
from typing import List, Dict, Any, AsyncGenerator, Optional

class ModelProvider(ABC):
    """Abstract Base Class for on-premise local model inference runtimes."""
    
    @abstractmethod
    async def list_models(self) -> List[Dict[str, Any]]:
        """List models available in the runtime."""
        pass

    @abstractmethod
    async def get_model_info(self, model_id: str) -> Dict[str, Any]:
        """Fetch model parameters, context window, and detected capabilities."""
        pass

    @abstractmethod
    async def health_check(self, model_id: Optional[str] = None) -> bool:
        """Check if runtime server and/or model endpoint is alive and responsive."""
        pass

    @abstractmethod
    async def chat(self, model_id: str, messages: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute a complete chat completion."""
        pass

    @abstractmethod
    async def stream_chat(self, model_id: str, messages: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
        """Stream chat tokens incrementally."""
        pass

    @abstractmethod
    async def unload(self, model_id: str) -> bool:
        """Unload model from GPU/RAM memory."""
        pass
