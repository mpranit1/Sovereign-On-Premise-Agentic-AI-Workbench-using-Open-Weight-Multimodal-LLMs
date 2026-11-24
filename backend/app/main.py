import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from app.core.config import settings
from app.core.security import get_password_hash
from app.database.session import engine, Base, AsyncSessionLocal
from app.models.entities import User, ModelRecord, Agent, Workflow, KnowledgeBase, Tool
from app.agents.orchestrator import STARTER_AGENTS
from app.tools.registry import tool_registry

# Import Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.models import router as models_router
from app.api.v1.chat import router as chat_router
from app.api.v1.agents import router as agents_router
from app.api.v1.knowledge_bases import router as kb_router
from app.api.v1.documents import router as doc_router
from app.api.v1.tools import router as tools_router
from app.api.v1.workflows import router as workflows_router
from app.api.v1.monitoring import router as monitoring_router

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Super Admin
        admin_res = await db.execute(select(User).where(User.username == "admin"))
        admin_user = admin_res.scalar_one_or_none()
        if not admin_user:
            admin_user = User(
                username="admin",
                email="admin@sovereign.local",
                password_hash=get_password_hash("Admin@123456"),
                role="super_admin",
                is_active=True
            )
            db.add(admin_user)
            await db.commit()
            await db.refresh(admin_user)

        # 2. Registered Models
        models_res = await db.execute(select(ModelRecord))
        existing_models = models_res.scalars().all()
        if not existing_models:
            seed_models = [
                ModelRecord(
                    id="sovereign-deepseek-r1-q4",
                    name="DeepSeek R1 (Quantized Q4)",
                    provider="mock",
                    model_identifier="deepseek-r1:8b",
                    capabilities=["text", "tools"],
                    context_window=8192,
                    status="available"
                ),
                ModelRecord(
                    id="sovereign-llama3.2-vision",
                    name="Llama 3.2 11B Vision",
                    provider="mock",
                    model_identifier="llama3.2-vision:11b",
                    capabilities=["text", "vision"],
                    context_window=8192,
                    status="available"
                ),
                ModelRecord(
                    id="sovereign-qwen2.5-coder",
                    name="Qwen 2.5 Coder 7B",
                    provider="mock",
                    model_identifier="qwen2.5-coder:7b",
                    capabilities=["text", "tools"],
                    context_window=16384,
                    status="available"
                ),
                ModelRecord(
                    id="ollama-local-default",
                    name="Ollama Local Daemon",
                    provider="ollama",
                    model_identifier="llama3.2:latest",
                    capabilities=["text", "tools"],
                    context_window=4096,
                    status="available"
                )
            ]
            for m in seed_models:
                db.add(m)
            await db.commit()

        # 3. Starter Agents
        agents_res = await db.execute(select(Agent))
        if not agents_res.scalars().all():
            for sa in STARTER_AGENTS:
                agent = Agent(
                    id=sa["id"],
                    name=sa["name"],
                    description=sa["description"],
                    avatar=sa["avatar"],
                    system_prompt=sa["system_prompt"],
                    model_id=sa["model_id"],
                    max_steps=sa["max_steps"],
                    timeout_seconds=sa["timeout_seconds"],
                    requires_approval=sa["requires_approval"],
                    owner_id=admin_user.id,
                    configuration=sa["configuration"]
                )
                db.add(agent)
            await db.commit()

        # 4. Starter Workflow
        wf_res = await db.execute(select(Workflow))
        if not wf_res.scalars().all():
            sample_wf = Workflow(
                id="starter-research-workflow",
                name="Automated Research & Synthesis Pipeline",
                description="End-to-end multi-agent pipeline: Query -> Document RAG Retrieval -> Analyst Evaluation -> Human Review -> Export",
                definition={
                    "nodes": [
                        {"id": "node-1", "type": "startNode", "position": {"x": 100, "y": 150}, "data": {"label": "Topic Input"}},
                        {"id": "node-2", "type": "ragNode", "position": {"x": 350, "y": 150}, "data": {"label": "RAG Document Retrieval"}},
                        {"id": "node-3", "type": "agentNode", "position": {"x": 600, "y": 150}, "data": {"label": "Data Analyst Agent"}},
                        {"id": "node-4", "type": "approvalNode", "position": {"x": 850, "y": 150}, "data": {"label": "Human Authorization Gate"}},
                        {"id": "node-5", "type": "outputNode", "position": {"x": 1100, "y": 150}, "data": {"label": "Final Intelligence Report"}}
                    ],
                    "edges": [
                        {"id": "e1-2", "source": "node-1", "target": "node-2"},
                        {"id": "e2-3", "source": "node-2", "target": "node-3"},
                        {"id": "e3-4", "source": "node-3", "target": "node-4"},
                        {"id": "e4-5", "source": "node-4", "target": "node-5"}
                    ]
                },
                created_by=admin_user.id
            )
            db.add(sample_wf)
            await db.commit()

        # 5. Starter Knowledge Base
        kb_res = await db.execute(select(KnowledgeBase))
        if not kb_res.scalars().all():
            sample_kb = KnowledgeBase(
                id="default-enterprise-kb",
                name="Enterprise Policy & Compliance Knowledge Base",
                description="Private organizational repository for security policies, operational manuals, and compliance documentation.",
                owner_id=admin_user.id
            )
            db.add(sample_kb)
            await db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="On-Premise Agentic AI Workbench using Open-Weight Multimodal LLMs",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers directly with prefix
app.include_router(auth_router, prefix="/api/v1")
app.include_router(models_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(agents_router, prefix="/api/v1")
app.include_router(kb_router, prefix="/api/v1")
app.include_router(doc_router, prefix="/api/v1")
app.include_router(tools_router, prefix="/api/v1")
app.include_router(workflows_router, prefix="/api/v1")
app.include_router(monitoring_router, prefix="/api/v1")
app.include_router(monitoring_router)  # root /health endpoint

# Mount static storage
app.mount("/storage", StaticFiles(directory=str(settings.STORAGE_DIR)), name="storage")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
