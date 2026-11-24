from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.tools.registry import tool_registry
from app.schemas.all_schemas import ToolTestRequest
from app.api.v1.auth import get_current_user, require_role
from app.models.entities import User

router = APIRouter(prefix="/tools", tags=["Tool Registry"])

@router.get("")
async def list_tools():
    return tool_registry.list_tools()

@router.post("/{tool_id}/test")
async def test_tool(
    tool_id: str, 
    req: ToolTestRequest, 
    current_user: User = Depends(require_role("developer"))
):
    result = await tool_registry.execute_tool(tool_id, req.parameters)
    return result
