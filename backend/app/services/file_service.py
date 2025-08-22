from typing import Optional, BinaryIO
import os
import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile, HTTPException

class FileService:
    def __init__(self):
        self.upload_dir = Path("uploads")
        self.upload_dir.mkdir(exist_ok=True)
        
        # Max file size: 10MB
        self.max_file_size = 10 * 1024 * 1024
        
        # Allowed file types
        self.allowed_extensions = {
            'images': {'.jpg', '.jpeg', '.png', '.gif', '.webp'},
            'documents': {'.pdf', '.doc', '.docx', '.txt', '.md'},
            'archives': {'.zip', '.rar', '.7z'},
            'audio': {'.mp3', '.wav', '.ogg'},
            'video': {'.mp4', '.avi', '.mkv', '.webm'}
        }

    async def upload_file(self, file: UploadFile, user_id: str, workspace_id: str) -> dict:
        """Upload a file and return file metadata"""
        
        # Validate file size
        if file.size and file.size > self.max_file_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {self.max_file_size // (1024*1024)}MB"
            )
        
        # Validate file extension
        file_ext = Path(file.filename).suffix.lower()
        if not self._is_allowed_extension(file_ext):
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not allowed"
            )
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        filename = f"{file_id}{file_ext}"
        file_path = self.upload_dir / workspace_id / filename
        
        # Create directory if not exists
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Return file metadata
        return {
            "file_id": file_id,
            "filename": file.filename,
            "original_name": file.filename,
            "size": len(content),
            "content_type": file.content_type,
            "url": f"/files/{workspace_id}/{filename}",
            "uploaded_by": user_id,
            "uploaded_at": datetime.utcnow().isoformat()
        }

    def _is_allowed_extension(self, extension: str) -> bool:
        """Check if file extension is allowed"""
        for category, extensions in self.allowed_extensions.items():
            if extension in extensions:
                return True
        return False

    async def delete_file(self, file_path: str) -> bool:
        """Delete a file"""
        try:
            full_path = self.upload_dir / file_path
            if full_path.exists():
                full_path.unlink()
                return True
            return False
        except Exception:
            return False

file_service = FileService()