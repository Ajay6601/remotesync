from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
import secrets
import string

from app.core.database import get_db
from app.models.user import User
from app.models.workspace import Workspace, workspace_members
from app.models.channel import Channel, ChannelType
from app.api.auth import get_current_active_user, UserResponse

router = APIRouter()

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_private: bool = True

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_private: Optional[bool] = None

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    is_private: bool
    invite_code: Optional[str]
    owner_id: str
    member_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChannelCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: ChannelType = ChannelType.TEXT
    is_private: bool = False

class ChannelResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    type: ChannelType
    is_private: bool
    workspace_id: str
    created_by: str
    created_at: datetime
    
    class Config:
        from_attributes = True

def generate_invite_code() -> str:
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10))

@router.post("/", response_model=WorkspaceResponse)
async def create_workspace(
    workspace_data: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    invite_code = generate_invite_code() if not workspace_data.is_private else None
    
    new_workspace = Workspace(
        name=workspace_data.name,
        description=workspace_data.description,
        is_private=workspace_data.is_private,
        owner_id=current_user.id,
        invite_code=invite_code
    )
    
    db.add(new_workspace)
    await db.commit()
    await db.refresh(new_workspace)
    
    # Add owner as member
    await db.execute(
        workspace_members.insert().values(
            workspace_id=new_workspace.id,
            user_id=current_user.id,
            role="owner"
        )
    )
    
    # Create default general channel
    general_channel = Channel(
        name="general",
        description="General discussion",
        type=ChannelType.TEXT,
        workspace_id=new_workspace.id,
        created_by=current_user.id
    )
    
    db.add(general_channel)
    await db.commit()
    
    return WorkspaceResponse(
        id=str(new_workspace.id),
        name=new_workspace.name,
        description=new_workspace.description,
        is_private=new_workspace.is_private,
        invite_code=new_workspace.invite_code,
        owner_id=str(new_workspace.owner_id),
        member_count=1,
        created_at=new_workspace.created_at
    )

@router.get("/", response_model=List[WorkspaceResponse])
async def get_user_workspaces(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    # Get workspaces where user is a member
    result = await db.execute(
        select(Workspace)
        .join(workspace_members)
        .where(workspace_members.c.user_id == current_user.id)
    )
    workspaces = result.scalars().all()
    
    # Get member counts for each workspace
    workspace_responses = []
    for workspace in workspaces:
        member_count_result = await db.execute(
            select(func.count(workspace_members.c.user_id))
            .where(workspace_members.c.workspace_id == workspace.id)
        )
        member_count = member_count_result.scalar()
        
        workspace_responses.append(
            WorkspaceResponse(
                id=str(workspace.id),
                name=workspace.name,
                description=workspace.description,
                is_private=workspace.is_private,
                invite_code=workspace.invite_code,
                owner_id=str(workspace.owner_id),
                member_count=member_count,
                created_at=workspace.created_at
            )
        )
    
    return workspace_responses

@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is member of workspace
    result = await db.execute(
        select(Workspace)
        .join(workspace_members)
        .where(
            (workspace_members.c.workspace_id == workspace_id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(
            status_code=404,
            detail="Workspace not found or access denied"
        )
    
    # Get member count
    member_count_result = await db.execute(
        select(func.count(workspace_members.c.user_id))
        .where(workspace_members.c.workspace_id == workspace_id)
    )
    member_count = member_count_result.scalar()
    
    return WorkspaceResponse(
        id=str(workspace.id),
        name=workspace.name,
        description=workspace.description,
        is_private=workspace.is_private,
        invite_code=workspace.invite_code,
        owner_id=str(workspace.owner_id),
        member_count=member_count,
        created_at=workspace.created_at
    )

@router.post("/{workspace_id}/channels", response_model=ChannelResponse)
async def create_channel(
    workspace_id: str,
    channel_data: ChannelCreate,
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
    
    new_channel = Channel(
        name=channel_data.name,
        description=channel_data.description,
        type=channel_data.type,
        is_private=channel_data.is_private,
        workspace_id=workspace_id,
        created_by=current_user.id
    )
    
    db.add(new_channel)
    await db.commit()
    await db.refresh(new_channel)
    
    return ChannelResponse(
        id=str(new_channel.id),
        name=new_channel.name,
        description=new_channel.description,
        type=new_channel.type,
        is_private=new_channel.is_private,
        workspace_id=str(new_channel.workspace_id),
        created_by=str(new_channel.created_by),
        created_at=new_channel.created_at
    )

@router.get("/{workspace_id}/channels", response_model=List[ChannelResponse])
async def get_workspace_channels(
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
    
    # Get channels (excluding private channels user doesn't have access to)
    result = await db.execute(
        select(Channel)
        .where(
            (Channel.workspace_id == workspace_id) &
            (~Channel.is_archived)
        )
        .order_by(Channel.created_at)
    )
    channels = result.scalars().all()
    
    return [ChannelResponse(
        id=str(channel.id),
        name=channel.name,
        description=channel.description,
        type=channel.type,
        is_private=channel.is_private,
        workspace_id=str(channel.workspace_id),
        created_by=str(channel.created_by),
        created_at=channel.created_at
    ) for channel in channels]
