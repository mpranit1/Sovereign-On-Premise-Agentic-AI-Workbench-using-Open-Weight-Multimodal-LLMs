import hashlib
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.entities import KnowledgeBase, Document, User
from app.schemas.all_schemas import KnowledgeBaseCreate, KBSearchRequest
from app.document_processing.extractors import DocumentExtractor
from app.rag.retrieval import rag_service
from app.rag.store import vector_store
from app.api.v1.auth import get_current_user, require_role
from app.core.config import settings
from app.monitoring.metrics import monitoring_service

router = APIRouter(tags=["Knowledge Base & RAG"])

@router.get("/knowledge-bases")
async def list_knowledge_bases(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(KnowledgeBase))
    return res.scalars().all()

@router.post("/knowledge-bases")
async def create_knowledge_base(
    req: KnowledgeBaseCreate, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(require_role("analyst"))
):
    kb = KnowledgeBase(
        name=req.name,
        description=req.description,
        embedding_model=req.embedding_model,
        chunk_size=req.chunk_size,
        chunk_overlap=req.chunk_overlap,
        owner_id=current_user.id
    )
    db.add(kb)
    await db.commit()
    await db.refresh(kb)
    await monitoring_service.log_audit(db, current_user.id, "kb_created", "knowledge_base", kb.id)
    return kb

@router.get("/knowledge-bases/{kb_id}")
async def get_knowledge_base(kb_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
    kb = res.scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    docs_res = await db.execute(select(Document).where(Document.knowledge_base_id == kb_id))
    docs = docs_res.scalars().all()
    
    return {
        "id": kb.id,
        "name": kb.name,
        "description": kb.description,
        "chunk_size": kb.chunk_size,
        "chunk_overlap": kb.chunk_overlap,
        "document_count": len(docs),
        "documents": [
            {
                "id": d.id,
                "file_name": d.file_name,
                "size_bytes": d.size_bytes,
                "chunk_count": d.chunk_count,
                "status": d.status,
                "created_at": d.created_at
            }
            for d in docs
        ]
    }

@router.post("/knowledge-bases/{kb_id}/documents")
async def upload_document_to_kb(
    kb_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("analyst"))
):
    res = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
    kb = res.scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    content = await file.read()
    checksum = hashlib.sha256(content).hexdigest()
    saved_filename = f"{checksum[:10]}_{file.filename}"
    file_path = settings.DOCUMENTS_DIR / saved_filename
    
    with open(file_path, "wb") as f:
        f.write(content)

    doc = Document(
        knowledge_base_id=kb.id,
        file_name=file.filename or "document",
        file_path=str(file_path),
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        checksum=checksum,
        status="parsing"
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Ingestion pipeline: extract -> chunk -> embed -> index
    extracted_sections = DocumentExtractor.extract(str(file_path), doc.mime_type)
    total_chunks = rag_service.index_extracted_document(
        kb_id=kb.id,
        doc_id=doc.id,
        file_name=doc.file_name,
        sections=extracted_sections,
        chunk_size=kb.chunk_size,
        chunk_overlap=kb.chunk_overlap
    )

    doc.chunk_count = total_chunks
    doc.status = "indexed"
    await db.commit()
    await monitoring_service.log_audit(db, current_user.id, "document_indexed", "document", doc.id)

    return {
        "id": doc.id,
        "file_name": doc.file_name,
        "status": doc.status,
        "chunks_indexed": doc.chunk_count
    }

@router.post("/knowledge-bases/{kb_id}/search")
async def search_knowledge_base(
    kb_id: str,
    req: KBSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
    kb = res.scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    results = rag_service.search_knowledge_base(kb_id, req.query, limit=req.limit, threshold=req.threshold)
    return {"query": req.query, "count": len(results), "results": results}

@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(require_role("analyst"))
):
    res = await db.execute(select(Document).where(Document.id == doc_id))
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Purge vectors
    vector_store.delete_by_document(doc_id)
    await db.delete(doc)
    await db.commit()
    return {"message": "Document and associated vectors purged."}
