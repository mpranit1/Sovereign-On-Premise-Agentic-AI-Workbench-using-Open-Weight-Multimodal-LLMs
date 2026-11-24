from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import datetime

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "viewer"

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    is_active: bool
    created_at: Optional[datetime.datetime] = None

# --- Model Schemas ---
class ModelRegisterRequest(BaseModel):
    name: str
    provider: str  # ollama, vllm, llamacpp, mock
    model_identifier: str
    local_path: Optional[str] = None
    capabilities: List[str] = Field(default_factory=lambda: ["text"])
    context_window: int = 4096
    parameters: Optional[Dict[str, Any]] = None

class ModelResponse(BaseModel):
    id: str
    name: str
    provider: str
    model_identifier: str
    local_path: Optional[str] = None
    status: str
    capabilities: List[str]
    context_window: int
    parameters: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime.datetime] = None

# --- Chat Schemas ---
class ChatMessage(BaseModel):
    role: str
    content: str
    attachments: Optional[List[Dict[str, Any]]] = None

class ChatRequest(BaseModel):
    model_id: str
    messages: List[ChatMessage]
    conversation_id: Optional[str] = None
    options: Optional[Dict[str, Any]] = None  # temp, top_p, max_tokens, stop

class ConversationCreate(BaseModel):
    title: str = "New Conversation"
    model_id: Optional[str] = None

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    model_id: Optional[str] = None

# --- Agent Schemas ---
class AgentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    avatar: Optional[str] = "bot"
    system_prompt: str
    model_id: str
    fallback_model_id: Optional[str] = None
    max_steps: int = 10
    timeout_seconds: int = 120
    requires_approval: bool = False
    configuration: Optional[Dict[str, Any]] = None

class AgentRunRequest(BaseModel):
    input_text: str

class ApprovalDecisionRequest(BaseModel):
    decision: str  # approve, reject
    feedback: Optional[str] = None

# --- Knowledge Base & Document Schemas ---
class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    embedding_model: str = "local-default-embed"
    chunk_size: int = 512
    chunk_overlap: int = 64

class KBSearchRequest(BaseModel):
    query: str
    limit: int = 5
    threshold: float = 0.6

class DocumentCompareRequest(BaseModel):
    document_ids: List[str]
    focus_areas: Optional[List[str]] = None

# --- Workflow Schemas ---
class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    definition: Dict[str, Any]  # nodes, edges

class WorkflowRunRequest(BaseModel):
    input_payload: Optional[Dict[str, Any]] = None

# --- Tool Schemas ---
class ToolTestRequest(BaseModel):
    parameters: Dict[str, Any]
