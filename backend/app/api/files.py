from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
import os

from app.core.database import get_db
from app.models.user import User
from app.api.auth import get_current_active_user
from app.services.file_service import file_service

router = APIRouter()

@router.post("/upload/{workspace_id}")
async def upload_file(
    workspace_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a file to workspace"""
    try:
        file_data = await file_service.upload_file(file, str(current_user.id), workspace_id)
        return {"success": True, "file": file_data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/download/{workspace_id}/{filename}")
async def download_file(
    workspace_id: str,
    filename: str,
    current_user: User = Depends(get_current_active_user)
):
    """Download a file from workspace"""
    file_path = Path("uploads") / workspace_id / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/octet-stream'
    )

@router.delete("/{workspace_id}/{filename}")
async def delete_file(
    workspace_id: str,
    filename: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a file from workspace"""
    file_path = f"{workspace_id}/{filename}"
    success = await file_service.delete_file(file_path)
    
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {"success": True, "message": "File deleted successfully"}