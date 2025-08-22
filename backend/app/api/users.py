from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from typing import List, Optional
import uuid

from app.core.database import get_db
from app.models.user import User
from app.api.auth import get_current_active_user, UserResponse

router = APIRouter()

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None

class UserSearch(BaseModel):
    query: str

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse.model_validate(user)

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    update_data = user_update.model_dump(exclude_unset=True)
    
    if update_data:
        await db.execute(
            update(User)
            .where(User.id == current_user.id)
            .values(**update_data)
        )
        await db.commit()
        await db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)

@router.post("/search", response_model=List[UserResponse])
async def search_users(
    search_data: UserSearch,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(User).where(
            (User.username.ilike(f"%{search_data.query}%")) |
            (User.full_name.ilike(f"%{search_data.query}%")) |
            (User.email.ilike(f"%{search_data.query}%"))
        ).limit(10)
    )
    users = result.scalars().all()
    
    return [UserResponse.model_validate(user) for user in users]

@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="File must be an image"
        )
    
    # In production, upload to S3 and get URL
    # For now, return a placeholder
    avatar_url = f"https://api.dicebear.com/7.x/initials/svg?seed={current_user.username}"
    
    # Update user avatar
    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(avatar_url=avatar_url)
    )
    await db.commit()
    
    return {"avatar_url": avatar_url}