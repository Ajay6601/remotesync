from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os
import aiofiles

from app.core.database import get_db
from app.models.user import User
from app.api.auth import get_current_active_user

router = APIRouter()

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: str
    is_active: bool
    is_verified: bool
    avatar_url: Optional[str]
    created_at: datetime
    last_active: Optional[datetime]
    is_online: bool
    mutual_connections: Optional[int] = 0

    class Config:
        from_attributes = True

    @classmethod
    def from_user(cls, user: User, mutual_connections: int = 0):
        """Convert SQLAlchemy User model to Pydantic UserResponse"""
        # Check if user is online (last active within 5 minutes)
        is_online = False
        if user.last_active:
            time_diff = datetime.now(timezone.utc) - user.last_active
            is_online = time_diff.total_seconds() < 300  # 5 minutes
        
        return cls(
            id=str(user.id),
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            is_active=user.is_active,
            is_verified=user.is_verified,
            avatar_url=user.avatar_url,
            created_at=user.created_at,
            last_active=user.last_active,
            is_online=is_online,
            mutual_connections=mutual_connections
        )

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None

class UserSearch(BaseModel):
    query: str

class AvatarUploadResponse(BaseModel):
    success: bool
    avatar_url: str
    message: str

class UserStatsResponse(BaseModel):
    total_connections: int
    pending_requests: int
    workspaces_count: int
    documents_count: int
    tasks_count: int

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's information"""
    return UserResponse.from_user(current_user)

@router.get("/me/stats", response_model=UserStatsResponse)
async def get_user_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's statistics"""
    # This would require additional queries to count connections, workspaces, etc.
    # Placeholder implementation
    return UserStatsResponse(
        total_connections=0,
        pending_requests=0,
        workspaces_count=0,
        documents_count=0,
        tasks_count=0
    )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user by ID"""
    try:
        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
        
        # Calculate mutual connections (placeholder - implement based on your connection model)
        mutual_connections = 0
        
        return UserResponse.from_user(user, mutual_connections)
        
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid user ID format"
        )

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update current user's profile"""
    update_data = user_update.model_dump(exclude_unset=True)
    
    if not update_data:
        return UserResponse.from_user(current_user)
    
    # Add timestamp for update
    update_data['updated_at'] = datetime.now(timezone.utc)
    
    # Check if username is already taken (if updating username)
    if 'username' in update_data and update_data['username'] != current_user.username:
        existing_user = await db.execute(
            select(User).where(
                (User.username == update_data['username']) & 
                (User.id != current_user.id)
            )
        )
        if existing_user.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail="Username already taken"
            )
    
    try:
        await db.execute(
            update(User)
            .where(User.id == current_user.id)
            .values(**update_data)
        )
        await db.commit()
        await db.refresh(current_user)
        
        return UserResponse.from_user(current_user)
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Failed to update user: {str(e)}"
        )

@router.get("/search", response_model=List[UserResponse])
async def search_users(
    q: str = Query(..., min_length=2, max_length=50, description="Search query"),
    limit: int = Query(20, ge=1, le=50, description="Number of results to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search users by username, full name, or email"""
    try:
        # Build search query
        search_pattern = f"%{q.strip()}%"
        
        result = await db.execute(
            select(User).where(
                (User.id != current_user.id) &
                (User.is_active == True) &
                (
                    User.username.ilike(search_pattern) |
                    User.full_name.ilike(search_pattern) |
                    User.email.ilike(search_pattern)
                )
            )
            .order_by(
                # Prioritize exact username matches
                User.username.ilike(q.strip()).desc(),
                User.full_name.ilike(search_pattern).desc(),
                User.created_at.desc()
            )
            .limit(limit)
        )
        
        users = result.scalars().all()
        
        # Convert to response models with mutual connections
        user_responses = []
        for user in users:
            # TODO: Calculate actual mutual connections based on your connection model
            mutual_connections = 0
            user_responses.append(UserResponse.from_user(user, mutual_connections))
        
        return user_responses
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )

@router.post("/upload-avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload user avatar"""
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (JPEG, PNG, GIF, WebP)"
        )
    
    # Validate file size (5MB limit)
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="File size too large. Maximum size is 5MB."
        )
    
    try:
        # Generate unique filename
        file_extension = os.path.splitext(file.filename or "")[1].lower()
        if file_extension not in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Use JPEG, PNG, GIF, or WebP."
            )
        
        unique_filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}{file_extension}"
        
        # Create avatars directory
        avatar_dir = "uploads/avatars"
        os.makedirs(avatar_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(avatar_dir, unique_filename)
        
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Generate avatar URL
        avatar_url = f"/uploads/avatars/{unique_filename}"
        
        # Update user's avatar in database
        await db.execute(
            update(User)
            .where(User.id == current_user.id)
            .values(
                avatar_url=avatar_url,
                updated_at=datetime.now(timezone.utc)
            )
        )
        await db.commit()
        
        return AvatarUploadResponse(
            success=True,
            avatar_url=avatar_url,
            message="Avatar uploaded successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload avatar: {str(e)}"
        )

@router.post("/update-activity")
async def update_user_activity(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update user's last activity timestamp"""
    try:
        await db.execute(
            update(User)
            .where(User.id == current_user.id)
            .values(last_active=datetime.now(timezone.utc))
        )
        await db.commit()
        
        return {"message": "Activity updated successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update activity: {str(e)}"
        )

@router.get("/online", response_model=List[UserResponse])
async def get_online_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get list of currently online users"""
    try:
        # Users active within last 5 minutes are considered online
        five_minutes_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
        
        result = await db.execute(
            select(User).where(
                (User.id != current_user.id) &
                (User.is_active == True) &
                (User.last_active >= five_minutes_ago)
            )
            .order_by(User.last_active.desc())
            .limit(50)
        )
        
        users = result.scalars().all()
        return [UserResponse.from_user(user) for user in users]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get online users: {str(e)}"
        )

@router.delete("/me")
async def delete_current_user(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Soft delete current user account"""
    try:
        await db.execute(
            update(User)
            .where(User.id == current_user.id)
            .values(
                is_active=False,
                deleted_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
        )
        await db.commit()
        
        return {"message": "Account deactivated successfully"}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to deactivate account: {str(e)}"
        )
