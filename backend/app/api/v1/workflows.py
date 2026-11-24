from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.entities import Workflow, WorkflowRun, User
from app.schemas.all_schemas import WorkflowCreate, WorkflowRunRequest
from app.workflows.engine import workflow_engine
from app.api.v1.auth import get_current_user, require_role
from app.monitoring.metrics import monitoring_service

router = APIRouter(prefix="/workflows", tags=["Multi-Agent Workflow Builder"])

@router.get("")
async def list_workflows(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Workflow))
    return res.scalars().all()

@router.post("")
async def create_workflow(
    req: WorkflowCreate, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(require_role("developer"))
):
    # Validate graph structure
    validation = workflow_engine.validate_graph(req.definition)
    if not validation.get("valid", False):
        raise HTTPException(status_code=400, detail=validation.get("error", "Invalid graph structure."))

    workflow = Workflow(
        name=req.name,
        description=req.description,
        definition=req.definition,
        created_by=current_user.id
    )
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)
    await monitoring_service.log_audit(db, current_user.id, "workflow_created", "workflow", workflow.id)
    return workflow

@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = res.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

@router.put("/{workflow_id}")
async def update_workflow(
    workflow_id: str,
    req: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("developer"))
):
    res = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = res.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    validation = workflow_engine.validate_graph(req.definition)
    if not validation.get("valid", False):
        raise HTTPException(status_code=400, detail=validation.get("error", "Invalid graph structure."))

    workflow.name = req.name
    workflow.description = req.description
    workflow.definition = req.definition
    workflow.version += 1
    await db.commit()
    return workflow

@router.post("/{workflow_id}/run")
async def run_workflow(
    workflow_id: str,
    req: WorkflowRunRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    run = await workflow_engine.execute_workflow(db, workflow_id, current_user.id, req.input_payload)
    await monitoring_service.log_audit(db, current_user.id, "workflow_run", "workflow", workflow_id)
    return {
        "run_id": run.id,
        "status": run.status,
        "execution_data": run.execution_data,
        "finished_at": run.finished_at
    }

@router.get("/{workflow_id}/runs")
async def list_workflow_runs(workflow_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(WorkflowRun).where(WorkflowRun.workflow_id == workflow_id).order_by(WorkflowRun.started_at.desc()))
    return res.scalars().all()
