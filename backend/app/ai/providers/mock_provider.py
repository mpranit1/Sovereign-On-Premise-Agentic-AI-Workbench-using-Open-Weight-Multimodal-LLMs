import asyncio
import re
from typing import List, Dict, Any, AsyncGenerator, Optional
from app.ai.gateway.base import ModelProvider

class MockLocalProvider(ModelProvider):
    """Offline embedded model provider that runs locally without external servers.
    Guarantees that test environments, air-gapped systems, and quick verification runs work seamlessly."""
    
    async def health_check(self, model_id: Optional[str] = None) -> bool:
        return True

    async def list_models(self) -> List[Dict[str, Any]]:
        return [
            {"id": "sovereign-deepseek-r1-q4", "name": "DeepSeek R1 (Quantized Q4_K_M)", "capabilities": ["text", "tools"], "context_window": 8192},
            {"id": "sovereign-llama3.2-vision", "name": "Llama 3.2 11B Vision", "capabilities": ["text", "vision"], "context_window": 8192},
            {"id": "sovereign-qwen2.5-coder", "name": "Qwen 2.5 Coder 7B", "capabilities": ["text", "tools"], "context_window": 16384}
        ]

    async def get_model_info(self, model_id: str) -> Dict[str, Any]:
        capabilities = ["text"]
        if "vision" in model_id.lower():
            capabilities.append("vision")
        if "coder" in model_id.lower() or "deepseek" in model_id.lower() or "tools" in model_id.lower():
            capabilities.append("tools")
        return {
            "model_id": model_id,
            "capabilities": capabilities,
            "context_window": 8192,
            "quantization": "Q4_K_M",
            "provider": "mock"
        }

    def _generate_response(self, model_id: str, messages: List[Dict[str, Any]]) -> str:
        last_msg = messages[-1] if messages else {"content": ""}
        content = last_msg.get("content", "").strip()
        
        # Check if multimodal attachment is present
        attachments = last_msg.get("attachments", [])
        if attachments:
            att_names = ", ".join([a.get("name", "attachment") for a in attachments])
            return (
                f"### Sovereign Multimodal Analysis ({model_id})\n\n"
                f"I have inspected the uploaded file(s): **{att_names}**.\n\n"
                f"- **Format**: Processed safely inside on-premise memory buffer.\n"
                f"- **Summary**: Visual/Document contents have been parsed into feature representations.\n"
                f"- **Inference**: Based on your prompt *'{content}'*, the visual elements confirm expected layout structure, high-contrast features, and verified data integrity."
            )
        
        # Check if prompt is asking about math/code/RAG/analysis
        if any(w in content.lower() for w in ["calculate", "math", "+", "*", "sum"]):
            numbers = re.findall(r'\d+(?:\.\d+)?', content)
            return (
                f"### Analysis & Calculation\n\n"
                f"Using verified local numeric reasoning for: `{content}`.\n"
                f"Detected parameters: {numbers}.\n"
                f"Result: The computed value satisfies required constraints with zero data leakage."
            )
        elif any(w in content.lower() for w in ["rag", "document", "knowledge", "citation", "search"]):
            return (
                f"### Grounded Retrieval Response\n\n"
                f"Based on the indexed document chunks retrieved from the local vector store:\n\n"
                f"> 'The Sovereign AI Workbench enforces on-premise execution, strict RBAC, and local model gateway isolation.'\n\n"
                f"**Source Reference**: [Document: internal_policy.pdf, Page 1, Section 2.4]\n\n"
                f"No external requests were made during this retrieval."
            )
        else:
            return (
                f"### Sovereign Local Response\n\n"
                f"Processed locally on model `{model_id}` within your sovereign infrastructure.\n\n"
                f"Regarding your query: **{content}**\n\n"
                f"1. **Execution**: Computed on local compute hardware.\n"
                f"2. **Privacy**: Prompts, tokens, and outputs remain strictly inside your environment.\n"
                f"3. **Readiness**: All registered tools, knowledge bases, and multi-agent workflows are accessible."
            )

    async def chat(self, model_id: str, messages: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        await asyncio.sleep(0.05)
        text = self._generate_response(model_id, messages)
        return {
            "role": "assistant",
            "content": text,
            "eval_count": len(text.split()),
            "total_duration": 50000000
        }

    async def stream_chat(self, model_id: str, messages: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
        text = self._generate_response(model_id, messages)
        words = text.split(" ")
        for word in words:
            await asyncio.sleep(0.02)
            yield word + " "

    async def unload(self, model_id: str) -> bool:
        return True
