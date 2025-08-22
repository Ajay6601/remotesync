from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
import json

from app.core.database import get_db
from app.models.user import User
from app.models.document import Document, DocumentOperation
from app.models.workspace import workspace_members
from app.api.auth import get_current_active_user
from app.websocket.manager import websocket_manager

router = APIRouter()

class DocumentCreate(BaseModel):
    title: str
    content: str = ""
    encrypted_content: Optional[str] = None
    is_public: bool = False

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    encrypted_content: Optional[str] = None
    is_public: Optional[bool] = None

class DocumentResponse(BaseModel):
    id: str
    title: str
    content: str
    encrypted_content: Optional[str]
    version: int
    is_public: bool
    is_archived: bool
    workspace_id: str
    created_by: str
    creator_name: str
    created_at: datetime
    updated_at: Optional[datetime]
    collaborators: List[str] = []

    class Config:
        from_attributes = True

class DocumentOperationCreate(BaseModel):
    operation_type: str  # insert, delete, retain, format
    position: int
    content: Optional[str] = None
    length: Optional[int] = None
    document_version: int

class DocumentOperationResponse(BaseModel):
    id: str
    document_id: str
    user_id: str
    operation_type: str
    position: int
    content: Optional[str]
    length: Optional[int]
    document_version: int
    operation_index: int
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/{workspace_id}/documents", response_model=DocumentResponse)
async def create_document(
    workspace_id: str,
    document_data: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify user is member of workspace
    result = await db.execute(
        select(workspace_members.c.role)
        .where(
            (workspace_members.c.workspace_id == workspace_id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    user_role = result.scalar_one_or_none()
    
    if not user_role:
        raise HTTPException(
            status_code=403,
            detail="Not a member of this workspace"
        )
    
    # Create document
    new_document = Document(
        title=document_data.title,
        content=document_data.content,
        encrypted_content=document_data.encrypted_content,
        is_public=document_data.is_public,
        workspace_id=workspace_id,
        created_by=current_user.id
    )
    
    db.add(new_document)
    await db.commit()
    await db.refresh(new_document)
    
    # Broadcast document creation
    await websocket_manager.broadcast_to_workspace(
        workspace_id,
        {
            "type": "document_created",
            "document_id": str(new_document.id),
            "title": new_document.title,
            "created_by": str(current_user.id),
            "creator_name": current_user.username,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    return DocumentResponse(
        id=str(new_document.id),
        title=new_document.title,
        content=new_document.content,
        encrypted_content=new_document.encrypted_content,
        version=new_document.version,
        is_public=new_document.is_public,
        is_archived=new_document.is_archived,
        workspace_id=str(new_document.workspace_id),
        created_by=str(new_document.created_by),
        creator_name=current_user.username,
        created_at=new_document.created_at,
        updated_at=new_document.updated_at
    )

@router.get("/{workspace_id}/documents", response_model=List[DocumentResponse])
async def get_workspace_documents(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify user is member of workspace
    result = await db.execute(
        select(workspace_members.c.role)
        .where(
            (workspace_members.c.workspace_id == workspace_id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    user_role = result.scalar_one_or_none()
    
    if not user_role:
        raise HTTPException(
            status_code=403,
            detail="Not a member of this workspace"
        )
    
    # Get documents
    result = await db.execute(
        select(Document, User.username)
        .join(User, Document.created_by == User.id)
        .where(
            (Document.workspace_id == workspace_id) &
            (~Document.is_archived)
        )
        .order_by(Document.updated_at.desc().nulls_last(), Document.created_at.desc())
    )
    documents_data = result.all()
    
    document_responses = []
    for document, creator_name in documents_data:
        document_responses.append(
            DocumentResponse(
                id=str(document.id),
                title=document.title,
                content=document.content,
                encrypted_content=document.encrypted_content,
                version=document.version,
                is_public=document.is_public,
                is_archived=document.is_archived,
                workspace_id=str(document.workspace_id),
                created_by=str(document.created_by),
                creator_name=creator_name,
                created_at=document.created_at,
                updated_at=document.updated_at
            )
        )
    
    return document_responses

@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get document and verify access
    result = await db.execute(
        select(Document, User.username)
        .join(User, Document.created_by == User.id)
        .join(workspace_members, Document.workspace_id == workspace_members.c.workspace_id)
        .where(
            (Document.id == document_id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    document_data = result.first()
    
    if not document_data:
        raise HTTPException(
            status_code=404,
            detail="Document not found or access denied"
        )
    
    document, creator_name = document_data
    
    # Get active collaborators (users who have made operations recently)
    collaborators_result = await db.execute(
        select(User.username)
        .join(DocumentOperation, User.id == DocumentOperation.user_id)
        .where(
            (DocumentOperation.document_id == document_id) &
            (DocumentOperation.created_at > datetime.utcnow() - timedelta(hours=1))
        )
        .distinct()
    )
    collaborators = [row[0] for row in collaborators_result.fetchall()]
    
    return DocumentResponse(
        id=str(document.id),
        title=document.title,
        content=document.content,
        encrypted_content=document.encrypted_content,
        version=document.version,
        is_public=document.is_public,
        is_archived=document.is_archived,
        workspace_id=str(document.workspace_id),
        created_by=str(document.created_by),
        creator_name=creator_name,
        created_at=document.created_at,
        updated_at=document.updated_at,
        collaborators=collaborators
    )

@router.post("/documents/{document_id}/operations", response_model=DocumentOperationResponse)
async def apply_document_operation(
    document_id: str,
    operation_data: DocumentOperationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get document and verify access
    result = await db.execute(
        select(Document)
        .join(workspace_members, Document.workspace_id == workspace_members.c.workspace_id)
        .where(
            (Document.id == document_id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found or access denied"
        )
    
    # Get next operation index
    operation_index_result = await db.execute(
        select(func.coalesce(func.max(DocumentOperation.operation_index), -1) + 1)
        .where(DocumentOperation.document_id == document_id)
    )
    operation_index = operation_index_result.scalar()
    
    # Create operation
    new_operation = DocumentOperation(
        document_id=document_id,
        user_id=current_user.id,
        operation_type=operation_data.operation_type,
        position=operation_data.position,
        content=operation_data.content,
        length=operation_data.length,
        document_version=operation_data.document_version,
        operation_index=operation_index
    )
    
    db.add(new_operation)
    
    # Apply operation to document content (simplified - in production use proper OT)
    current_content = document.content or ""
    
    if operation_data.operation_type == "insert":
        new_content = (
            current_content[:operation_data.position] + 
            (operation_data.content or "") + 
            current_content[operation_data.position:]
        )
    elif operation_data.operation_type == "delete":
        end_pos = operation_data.position + (operation_data.length or 0)
        new_content = (
            current_content[:operation_data.position] + 
            current_content[end_pos:]
        )
    else:
        new_content = current_content
    
    # Update document
    await db.execute(
        update(Document)
        .where(Document.id == document_id)
        .values(
            content=new_content,
            version=document.version + 1,
            updated_at=datetime.utcnow()
        )
    )
    
    await db.commit()
    await db.refresh(new_operation)
    
    # Broadcast operation to other collaborators
    await websocket_manager.broadcast_to_workspace(
        str(document.workspace_id),
        {
            "type": "document_operation",
            "document_id": document_id,
            "operation_id": str(new_operation.id),
            "user_id": str(current_user.id),
            "user_name": current_user.username,
            "operation_type": operation_data.operation_type,
            "position": operation_data.position,
            "content": operation_data.content,
            "length": operation_data.length,
            "document_version": operation_data.document_version,
            "operation_index": operation_index,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    return DocumentOperationResponse(
        id=str(new_operation.id),
        document_id=str(new_operation.document_id),
        user_id=str(new_operation.user_id),
        operation_type=new_operation.operation_type,
        position=new_operation.position,
        content=new_operation.content,
        length=new_operation.length,
        document_version=new_operation.document_version,
        operation_index=new_operation.operation_index,
        created_at=new_operation.created_at
    )

@router.get("/documents/{document_id}/operations")
async def get_document_operations(
    document_id: str,
    since_version: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify access to document
    result = await db.execute(
        select(Document)
        .join(workspace_members, Document.workspace_id == workspace_members.c.workspace_id)
        .where(
            (Document.id == document_id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found or access denied"
        )
    
    # Get operations since version
    result = await db.execute(
        select(DocumentOperation, User.username)
        .join(User, DocumentOperation.user_id == User.id)
        .where(
            (DocumentOperation.document_id == document_id) &
            (DocumentOperation.document_version > since_version)
        )
        .order_by(DocumentOperation.operation_index)
    )
    operations_data = result.all()
    
    operations = []
    for operation, username in operations_data:
        operations.append({
            "id": str(operation.id),
            "user_id": str(operation.user_id),
            "user_name": username,
            "operation_type": operation.operation_type,
            "position": operation.position,
            "content": operation.content,
            "length": operation.length,
            "document_version": operation.document_version,
            "operation_index": operation.operation_index,
            "created_at": operation.created_at.isoformat()
        })
    
    return {"operations": operations, "current_version": document.version}

@router.put("/documents/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    document_update: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get document and verify access
    result = await db.execute(
        select(Document, User.username)
        .join(User, Document.created_by == User.id)
        .join(workspace_members, Document.workspace_id == workspace_members.c.workspace_id)
        .where(
            (Document.id == document_id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    document_data = result.first()
    
    if not document_data:
        raise HTTPException(
            status_code=404,
            detail="Document not found or access denied"
        )
    
    document, creator_name = document_data
    
    # Update document
    update_data = document_update.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = datetime.utcnow()
        await db.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(**update_data)
        )
        await db.commit()
        await db.refresh(document)
    
    return DocumentResponse(
        id=str(document.id),
        title=document.title,
        content=document.content,
        encrypted_content=document.encrypted_content,
        version=document.version,
        is_public=document.is_public,
        is_archived=document.is_archived,
        workspace_id=str(document.workspace_id),
        created_by=str(document.created_by),
        creator_name=creator_name,
        created_at=document.created_at,
        updated_at=document.updated_at
    )