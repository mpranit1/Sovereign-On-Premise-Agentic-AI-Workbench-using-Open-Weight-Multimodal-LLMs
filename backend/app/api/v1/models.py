from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.entities import ModelRecord, User
from app.schemas.all_schemas import ModelRegisterRequest, ModelResponse
from app.ai.gateway.manager import model_gateway
from app.api.v1.auth import get_current_user, require_role
from app.monitoring.metrics import monitoring_service

router = APIRouter(prefix="/models", tags=["Model Hub"])

@router.get("", response_model=List[ModelResponse])
async def list_models(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ModelRecord))
    return res.scalars().all()

@router.get("/discover/available")
async def discover_runtime_models():
    """Discover models natively hosted in local Ollama/vLLM/llama.cpp runtime instances."""
    return await model_gateway.list_available_models()

@router.post("", response_model=ModelResponse)
async def register_model(
    req: ModelRegisterRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("developer"))
):
    model = ModelRecord(
        name=req.name,
        provider=req.provider,
        model_identifier=req.model_identifier,
        local_path=req.local_path,
        capabilities=req.capabilities,
        context_window=req.context_window,
        parameters=req.parameters,
        status="available"
    )
    db.add(model)
    await db.commit()
    await db.refresh(model)
    await monitoring_service.log_audit(db, current_user.id, "model_registered", "model", model.id)
    return model

@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(model_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ModelRecord).where(ModelRecord.id == model_id))
    model = res.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model

@router.get("/{model_id}/health")
async def check_model_health(model_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ModelRecord).where(ModelRecord.id == model_id))
    model = res.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    is_alive = await model_gateway.health_check(model.provider, model.model_identifier)
    model.status = "available" if is_alive else "stopped"
    await db.commit()
    return {"model_id": model_id, "provider": model.provider, "is_alive": is_alive, "status": model.status}

@router.post("/{model_id}/stop")
async def stop_model(
    model_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("developer"))
):
    res = await db.execute(select(ModelRecord).where(ModelRecord.id == model_id))
    model = res.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    await model_gateway.unload(model.provider, model.model_identifier)
    model.status = "stopped"
    await db.commit()
    return {"message": f"Model {model.name} stopped/unloaded from memory."}

@router.delete("/{model_id}")
async def delete_model(
    model_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    res = await db.execute(select(ModelRecord).where(ModelRecord.id == model_id))
    model = res.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    await db.delete(model)
    await db.commit()
    return {"message": "Model unregistered successfully."}
