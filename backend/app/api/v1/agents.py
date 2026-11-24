from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.entities import Agent, Execution, ExecutionStep, User
from app.schemas.all_schemas import AgentCreate, AgentRunRequest, ApprovalDecisionRequest
from app.agents.orchestrator import agent_orchestrator
from app.api.v1.auth import get_current_user, require_role
from app.monitoring.metrics import monitoring_service

router = APIRouter(tags=["Agent Studio"])

@router.get("/agents")
async def list_agents(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Agent).where(Agent.is_active == True))
    return res.scalars().all()

@router.post("/agents")
async def create_agent(
    req: AgentCreate, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(require_role("developer"))
):
    agent = Agent(
        name=req.name,
        description=req.description,
        avatar=req.avatar,
        system_prompt=req.system_prompt,
        model_id=req.model_id,
        fallback_model_id=req.fallback_model_id,
        max_steps=req.max_steps,
        timeout_seconds=req.timeout_seconds,
        requires_approval=req.requires_approval,
        owner_id=current_user.id,
        configuration=req.configuration or {"tools": ["calculator"]}
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    await monitoring_service.log_audit(db, current_user.id, "agent_created", "agent", agent.id)
    return agent

@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = res.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.put("/agents/{agent_id}")
async def update_agent(
    agent_id: str, 
    req: AgentCreate, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(require_role("developer"))
):
    res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = res.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent.name = req.name
    agent.description = req.description
    agent.system_prompt = req.system_prompt
    agent.model_id = req.model_id
    agent.max_steps = req.max_steps
    agent.requires_approval = req.requires_approval
    agent.configuration = req.configuration
    await db.commit()
    return agent

@router.delete("/agents/{agent_id}")
async def delete_agent(
    agent_id: str, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(require_role("developer"))
):
    res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = res.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent.is_active = False
    await db.commit()
    return {"message": "Agent deactivated."}

@router.post("/agents/{agent_id}/run")
async def run_agent(
    agent_id: str, 
    req: AgentRunRequest, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = res.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Create execution record
    execution = Execution(
        agent_id=agent.id,
        user_id=current_user.id,
        input_text=req.input_text,
        status="running"
    )
    db.add(execution)
    await db.commit()
    await db.refresh(execution)

    # Run agent execution
    updated = await agent_orchestrator.run_agent_step(db, execution.id, agent, req.input_text)
    await monitoring_service.log_audit(db, current_user.id, "agent_execution", "execution", execution.id)
    return {
        "execution_id": updated.id,
        "status": updated.status,
        "output_text": updated.output_text
    }

@router.get("/executions/{execution_id}")
async def get_execution(execution_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Execution).where(Execution.id == execution_id))
    execution = res.scalar_one_or_none()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    steps_res = await db.execute(
        select(ExecutionStep)
        .where(ExecutionStep.execution_id == execution_id)
        .order_by(ExecutionStep.step_number.asc())
    )
    steps = steps_res.scalars().all()
    
    return {
        "id": execution.id,
        "agent_id": execution.agent_id,
        "status": execution.status,
        "input_text": execution.input_text,
        "output_text": execution.output_text,
        "started_at": execution.started_at,
        "finished_at": execution.finished_at,
        "steps": [
            {
                "id": s.id,
                "step_number": s.step_number,
                "step_type": s.step_type,
                "tool_name": s.tool_name,
                "input_data": s.input_data,
                "output_data": s.output_data,
                "status": s.status,
                "created_at": s.created_at
            }
            for s in steps
        ]
    }

@router.post("/executions/{execution_id}/approve")
async def approve_execution_action(
    execution_id: str, 
    req: ApprovalDecisionRequest, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(require_role("developer"))
):
    updated = await agent_orchestrator.resume_after_approval(db, execution_id, approved=True, feedback=req.feedback)
    await monitoring_service.log_audit(db, current_user.id, "action_approved", "execution", execution_id)
    return {"status": updated.status, "output_text": updated.output_text}

@router.post("/executions/{execution_id}/reject")
async def reject_execution_action(
    execution_id: str, 
    req: ApprovalDecisionRequest, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(require_role("developer"))
):
    updated = await agent_orchestrator.resume_after_approval(db, execution_id, approved=False, feedback=req.feedback)
    await monitoring_service.log_audit(db, current_user.id, "action_rejected", "execution", execution_id)
    return {"status": updated.status, "error_details": updated.error_details}
