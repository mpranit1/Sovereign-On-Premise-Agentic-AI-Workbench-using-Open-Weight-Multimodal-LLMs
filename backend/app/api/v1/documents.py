from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.entities import Document
from app.schemas.all_schemas import DocumentCompareRequest
from app.document_processing.extractors import DocumentExtractor
from app.ai.gateway.manager import model_gateway

router = APIRouter(prefix="/documents", tags=["Document Intelligence"])

@router.get("")
async def list_all_documents(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Document))
    return res.scalars().all()

@router.get("/{doc_id}/extract")
async def extract_document_content(doc_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Document).where(Document.id == doc_id))
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    sections = DocumentExtractor.extract(doc.file_path, doc.mime_type)
    return {
        "doc_id": doc.id,
        "file_name": doc.file_name,
        "section_count": len(sections),
        "sections": sections
    }

@router.post("/{doc_id}/summarize")
async def summarize_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Document).where(Document.id == doc_id))
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    sections = DocumentExtractor.extract(doc.file_path, doc.mime_type)
    sample_text = "\n\n".join([s.get("text", "") for s in sections[:3]])
    
    prompt = f"Summarize the following document excerpt thoroughly and highlight key entities:\n\n{sample_text[:2000]}"
    ai_res = await model_gateway.chat("mock", "sovereign-deepseek-r1-q4", [{"role": "user", "content": prompt}])
    
    return {
        "doc_id": doc.id,
        "file_name": doc.file_name,
        "summary": ai_res.get("content", "Summary generated.")
    }

@router.post("/compare")
async def compare_documents(req: DocumentCompareRequest, db: AsyncSession = Depends(get_db)):
    if len(req.document_ids) < 2:
        raise HTTPException(status_code=400, detail="Please select at least 2 documents to compare.")
    
    docs_res = await db.execute(select(Document).where(Document.id.in_(req.document_ids)))
    docs = docs_res.scalars().all()
    
    if len(docs) < 2:
        raise HTTPException(status_code=404, detail="One or more documents could not be found.")

    doc_texts = []
    for d in docs:
        sections = DocumentExtractor.extract(d.file_path, d.mime_type)
        combined = "\n".join([s.get("text", "") for s in sections])
        doc_texts.append({"name": d.file_name, "text": combined})

    comparison = DocumentExtractor.compare_documents(doc_texts)
    return comparison
