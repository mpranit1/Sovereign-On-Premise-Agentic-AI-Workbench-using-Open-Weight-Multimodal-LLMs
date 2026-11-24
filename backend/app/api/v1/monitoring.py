from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.entities import AuditLog
from app.monitoring.metrics import monitoring_service

router = APIRouter(tags=["Monitoring & System Health"])

@router.get("/monitoring/system")
async def get_system_metrics():
    return monitoring_service.get_system_hardware_metrics()

@router.get("/monitoring/dashboard")
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    return await monitoring_service.get_dashboard_summary(db)

@router.get("/monitoring/activity")
async def get_audit_activity(limit: int = 50, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit))
    return res.scalars().all()

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Sovereign AI Workbench",
        "air_gapped_mode": True,
        "database": "online",
        "model_gateway": "online"
    }
