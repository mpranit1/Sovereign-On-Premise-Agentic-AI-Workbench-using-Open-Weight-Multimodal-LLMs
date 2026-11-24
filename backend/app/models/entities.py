import uuid
import datetime
from datetime import timezone
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, BigInteger, 
    DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.database.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime.datetime:
    return datetime.datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="viewer")  # super_admin, admin, developer, analyst, viewer
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    agents = relationship("Agent", back_populates="owner", cascade="all, delete-orphan")
    knowledge_bases = relationship("KnowledgeBase", back_populates="owner", cascade="all, delete-orphan")

class UserSession(Base):
    __tablename__ = "sessions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(512), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class ModelRecord(Base):
    __tablename__ = "models"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(128), nullable=False)
    provider = Column(String(64), nullable=False)  # ollama, vllm, llamacpp, mock
    model_identifier = Column(String(255), nullable=False)
    local_path = Column(String(512), nullable=True)
    status = Column(String(32), nullable=False, default="available")  # available, stopped, error, downloading
    capabilities = Column(JSON, nullable=False, default=list)  # ["text", "vision", "tools", "audio"]
    context_window = Column(Integer, nullable=False, default=4096)
    parameters = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False, default="New Conversation")
    model_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(32), nullable=False)  # user, assistant, system, tool
    content = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSON, nullable=True)  # citations, latency, tokens
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    conversation = relationship("Conversation", back_populates="messages")

class Attachment(Base):
    __tablename__ = "attachments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    conversation_id = Column(String(36), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    mime_type = Column(String(128), nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    checksum = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    avatar = Column(String(64), nullable=True, default="bot")
    system_prompt = Column(Text, nullable=False)
    model_id = Column(String(36), nullable=False)
    fallback_model_id = Column(String(36), nullable=True)
    max_steps = Column(Integer, nullable=False, default=10)
    timeout_seconds = Column(Integer, nullable=False, default=120)
    requires_approval = Column(Boolean, nullable=False, default=False)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    configuration = Column(JSON, nullable=True)  # {"tools": ["calculator", ...], "knowledge_bases": [...]}
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    owner = relationship("User", back_populates="agents")
    executions = relationship("Execution", back_populates="agent", cascade="all, delete-orphan")

class Tool(Base):
    __tablename__ = "tools"
    
    id = Column(String(64), primary_key=True)  # calculator, file_reader, etc.
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=False)
    input_schema = Column(JSON, nullable=False)
    output_schema = Column(JSON, nullable=True)
    is_builtin = Column(Boolean, nullable=False, default=True)
    is_enabled = Column(Boolean, nullable=False, default=True)
    requires_approval = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class Execution(Base):
    __tablename__ = "executions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    agent_id = Column(String(36), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    input_text = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default="running")  # running, completed, paused_approval, failed, cancelled
    output_text = Column(Text, nullable=True)
    error_details = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), default=utc_now)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    
    agent = relationship("Agent", back_populates="executions")
    steps = relationship("ExecutionStep", back_populates="execution", cascade="all, delete-orphan", order_by="ExecutionStep.step_number")

class ExecutionStep(Base):
    __tablename__ = "execution_steps"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    execution_id = Column(String(36), ForeignKey("executions.id", ondelete="CASCADE"), nullable=False)
    step_number = Column(Integer, nullable=False)
    step_type = Column(String(32), nullable=False)  # thought, tool_call, tool_result, approval_request, final_answer
    tool_name = Column(String(64), nullable=True)
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    status = Column(String(32), nullable=False, default="completed")  # completed, pending_approval, approved, rejected, failed
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    execution = relationship("Execution", back_populates="steps")

class Workflow(Base):
    __tablename__ = "workflows"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    definition = Column(JSON, nullable=False)  # { nodes: [...], edges: [...] }
    version = Column(Integer, nullable=False, default=1)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    runs = relationship("WorkflowRun", back_populates="workflow", cascade="all, delete-orphan")

class WorkflowRun(Base):
    __tablename__ = "workflow_runs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    workflow_id = Column(String(36), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(32), nullable=False, default="running")  # running, completed, paused_approval, failed, cancelled
    execution_data = Column(JSON, nullable=True)  # live node state and node outputs
    started_at = Column(DateTime(timezone=True), default=utc_now)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    
    workflow = relationship("Workflow", back_populates="runs")

class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    embedding_model = Column(String(128), nullable=False, default="local-default-embed")
    chunk_size = Column(Integer, nullable=False, default=512)
    chunk_overlap = Column(Integer, nullable=False, default=64)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    owner = relationship("User", back_populates="knowledge_bases")
    documents = relationship("Document", back_populates="knowledge_base", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    knowledge_base_id = Column(String(36), ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    mime_type = Column(String(128), nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    checksum = Column(String(64), nullable=False)
    status = Column(String(32), nullable=False, default="uploaded")  # uploaded, parsing, indexing, indexed, error
    chunk_count = Column(Integer, nullable=False, default=0)
    metadata_ = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    knowledge_base = relationship("KnowledgeBase", back_populates="documents")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=True)
    action = Column(String(64), nullable=False)  # auth_login, model_chat, agent_run, tool_exec, doc_upload
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(String(64), nullable=True)
    status = Column(String(32), nullable=False, default="success")
    details = Column(JSON, nullable=True)
    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)

class SystemMetric(Base):
    __tablename__ = "system_metrics"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    metric_name = Column(String(64), nullable=False, index=True)
    value = Column(BigInteger, nullable=False)
    labels = Column(JSON, nullable=True)
    recorded_at = Column(DateTime(timezone=True), default=utc_now, index=True)
