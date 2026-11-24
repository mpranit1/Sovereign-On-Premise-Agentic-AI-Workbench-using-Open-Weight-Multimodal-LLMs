import json
import hashlib
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.entities import Conversation, Message, Attachment, ModelRecord, User
from app.schemas.all_schemas import ChatRequest, ConversationCreate, ConversationUpdate
from app.ai.gateway.manager import model_gateway
from app.api.v1.auth import get_current_user
from app.core.config import settings

router = APIRouter(tags=["AI Playground"])

@router.get("/conversations")
async def list_conversations(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
    )
    return res.scalars().all()

@router.post("/conversations")
async def create_conversation(req: ConversationCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = Conversation(
        user_id=current_user.id,
        title=req.title,
        model_id=req.model_id
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv

@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(
        select(Conversation)
        .where((Conversation.id == conversation_id) & (Conversation.user_id == current_user.id))
    )
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Fetch messages
    msg_res = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    messages = msg_res.scalars().all()
    
    return {
        "id": conv.id,
        "title": conv.title,
        "model_id": conv.model_id,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "metadata": m.metadata_,
                "created_at": m.created_at
            }
            for m in messages
        ]
    }

@router.patch("/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: str, 
    req: ConversationUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = await db.execute(
        select(Conversation)
        .where((Conversation.id == conversation_id) & (Conversation.user_id == current_user.id))
    )
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if req.title is not None:
        conv.title = req.title
    if req.model_id is not None:
        conv.model_id = req.model_id
    await db.commit()
    return conv

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = await db.execute(
        select(Conversation)
        .where((Conversation.id == conversation_id) & (Conversation.user_id == current_user.id))
    )
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    await db.delete(conv)
    await db.commit()
    return {"message": "Conversation deleted."}

@router.post("/conversations/{conversation_id}/attachments")
async def upload_attachment(
    conversation_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds max size {settings.MAX_FILE_SIZE_MB}MB")
    
    checksum = hashlib.sha256(content).hexdigest()
    saved_filename = f"{checksum[:12]}_{file.filename}"
    file_path = settings.UPLOADS_DIR / saved_filename
    
    with open(file_path, "wb") as f:
        f.write(content)

    att = Attachment(
        user_id=current_user.id,
        conversation_id=conversation_id,
        file_name=file.filename or "file",
        file_path=str(file_path),
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        checksum=checksum
    )
    db.add(att)
    await db.commit()
    await db.refresh(att)
    return {
        "id": att.id,
        "file_name": att.file_name,
        "mime_type": att.mime_type,
        "size_bytes": att.size_bytes
    }

@router.post("/chat")
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Lookup model provider
    m_res = await db.execute(select(ModelRecord).where(ModelRecord.id == req.model_id))
    model = m_res.scalar_one_or_none()
    provider_name = model.provider if model else "mock"
    model_identifier = model.model_identifier if model else req.model_id

    # Format messages
    msgs = [{"role": m.role, "content": m.content, "attachments": m.attachments or []} for m in req.messages]
    
    # Save user message if conversation_id provided
    if req.conversation_id and req.messages:
        last_user = req.messages[-1]
        if last_user.role == "user":
            db.add(Message(
                conversation_id=req.conversation_id,
                role="user",
                content=last_user.content
            ))

    res = await model_gateway.chat(provider_name, model_identifier, msgs, req.options)
    
    # Save assistant message
    if req.conversation_id:
        db.add(Message(
            conversation_id=req.conversation_id,
            role="assistant",
            content=res.get("content", ""),
            metadata_=res
        ))
        await db.commit()

    return res

@router.post("/chat/stream")
async def chat_stream(req: ChatRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    m_res = await db.execute(select(ModelRecord).where(ModelRecord.id == req.model_id))
    model = m_res.scalar_one_or_none()
    provider_name = model.provider if model else "mock"
    model_identifier = model.model_identifier if model else req.model_id

    msgs = [{"role": m.role, "content": m.content, "attachments": m.attachments or []} for m in req.messages]

    if req.conversation_id and req.messages:
        last_user = req.messages[-1]
        if last_user.role == "user":
            db.add(Message(
                conversation_id=req.conversation_id,
                role="user",
                content=last_user.content
            ))
            await db.commit()

    async def sse_generator():
        collected = []
        try:
            async for token in model_gateway.stream_chat(provider_name, model_identifier, msgs, req.options):
                collected.append(token)
                data = json.dumps({"token": token, "done": False})
                yield f"data: {data}\n\n"
            
            yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")
