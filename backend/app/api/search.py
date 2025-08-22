from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, Dict, List, Any

from app.core.database import get_db
from app.models.user import User
from app.api.auth import get_current_active_user
from app.services.search_service import search_service

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    workspace_id: Optional[str] = None
    content_type: Optional[str] = None  # "messages", "documents", "tasks", "all"
    limit: Optional[int] = 20

@router.post("/")
async def search_content(
    search_request: SearchRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Search across all content types"""
    
    if len(search_request.query.strip()) < 2:
        raise HTTPException(
            status_code=400,
            detail="Search query must be at least 2 characters long"
        )
    
    query = search_request.query.strip()
    workspace_id = search_request.workspace_id
    content_type = search_request.content_type or "all"
    limit = min(search_request.limit or 20, 50)  # Max 50 results
    
    if content_type == "messages":
        results = {
            "messages": await search_service.search_messages(
                db, str(current_user.id), query, workspace_id, limit
            )
        }
    elif content_type == "documents":
        results = {
            "documents": await search_service.search_documents(
                db, str(current_user.id), query, workspace_id, limit
            )
        }
    elif content_type == "tasks":
        results = {
            "tasks": await search_service.search_tasks(
                db, str(current_user.id), query, workspace_id, limit
            )
        }
    else:  # "all"
        results = await search_service.global_search(
            db, str(current_user.id), query, workspace_id, limit // 3
        )
    
    return {
        "query": query,
        "results": results,
        "total_results": sum(len(v) for v in results.values())
    }