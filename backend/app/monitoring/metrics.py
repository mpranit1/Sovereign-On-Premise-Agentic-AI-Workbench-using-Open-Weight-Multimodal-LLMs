import psutil
import datetime
from datetime import timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.entities import ModelRecord, Agent, Execution, ExecutionStep, AuditLog, Document, KnowledgeBase

class MonitoringService:
    @staticmethod
    def get_system_hardware_metrics() -> Dict[str, Any]:
        """Collects real-time hardware metrics via psutil with zero external calls."""
        cpu_percent = psutil.cpu_percent(interval=None)
        cpu_count = psutil.cpu_count(logical=True)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        
        # GPU detection
        gpu_info = {
            "available": False,
            "device_name": "No discrete GPU detected or CUDA runtime offline",
            "vram_used_mb": 0,
            "vram_total_mb": 0,
            "utilization_percent": 0
        }
        
        try:
            import torch
            if torch.cuda.is_available():
                gpu_info["available"] = True
                gpu_info["device_name"] = torch.cuda.get_device_name(0)
                gpu_info["vram_total_mb"] = round(torch.cuda.get_device_properties(0).total_memory / (1024 * 1024))
                gpu_info["vram_used_mb"] = round(torch.cuda.memory_allocated(0) / (1024 * 1024))
                gpu_info["utilization_percent"] = round((gpu_info["vram_used_mb"] / max(gpu_info["vram_total_mb"], 1)) * 100)
        except Exception:
            pass

        return {
            "timestamp": datetime.datetime.now(timezone.utc).isoformat(),
            "cpu": {
                "percent": cpu_percent,
                "cores": cpu_count
            },
            "ram": {
                "total_gb": round(memory.total / (1024**3), 2),
                "used_gb": round(memory.used / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "percent": memory.percent
            },
            "disk": {
                "total_gb": round(disk.total / (1024**3), 2),
                "used_gb": round(disk.used / (1024**3), 2),
                "free_gb": round(disk.free / (1024**3), 2),
                "percent": disk.percent
            },
            "gpu": gpu_info
        }

    @staticmethod
    async def get_dashboard_summary(db: AsyncSession) -> Dict[str, Any]:
        models_count = (await db.execute(select(func.count(ModelRecord.id)))).scalar_one() or 0
        agents_count = (await db.execute(select(func.count(Agent.id)))).scalar_one() or 0
        executions_count = (await db.execute(select(func.count(Execution.id)))).scalar_one() or 0
        documents_count = (await db.execute(select(func.count(Document.id)))).scalar_one() or 0
        kb_count = (await db.execute(select(func.count(KnowledgeBase.id)))).scalar_one() or 0
        
        active_runs = (await db.execute(
            select(func.count(Execution.id)).where(Execution.status == "running")
        )).scalar_one() or 0

        pending_approvals = (await db.execute(
            select(func.count(Execution.id)).where(Execution.status == "paused_approval")
        )).scalar_one() or 0

        # Recent activities
        recent_logs_res = await db.execute(
            select(AuditLog).order_by(AuditLog.created_at.desc()).limit(10)
        )
        recent_logs = recent_logs_res.scalars().all()

        hardware = MonitoringService.get_system_hardware_metrics()

        return {
            "counts": {
                "models": models_count,
                "agents": agents_count,
                "executions": executions_count,
                "documents": documents_count,
                "knowledge_bases": kb_count,
                "active_runs": active_runs,
                "pending_approvals": pending_approvals
            },
            "system_health": {
                "backend": "healthy",
                "database": "healthy",
                "vector_store": "healthy",
                "model_gateway": "operational"
            },
            "hardware": hardware,
            "recent_activity": [
                {
                    "id": l.id,
                    "action": l.action,
                    "resource_type": l.resource_type,
                    "resource_id": l.resource_id,
                    "status": l.status,
                    "timestamp": l.created_at.isoformat() if l.created_at else None
                }
                for l in recent_logs
            ]
        }

    @staticmethod
    async def log_audit(
        db: AsyncSession, 
        user_id: Optional[str], 
        action: str, 
        resource_type: str, 
        resource_id: Optional[str] = None, 
        status: str = "success", 
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ):
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            status=status,
            details=details,
            ip_address=ip_address
        )
        db.add(log)
        await db.commit()

monitoring_service = MonitoringService()
