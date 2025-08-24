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
from app.models.invitation import WorkspaceInvite, InviteStatus
from datetime import timedelta

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

@router.get("/{workspace_id}/members")
async def get_workspace_members(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify user is member
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
    
    # Get all workspace members
    result = await db.execute(
        select(User, workspace_members.c.role, workspace_members.c.joined_at)
        .join(workspace_members, User.id == workspace_members.c.user_id)
        .where(workspace_members.c.workspace_id == workspace_id)
        .order_by(workspace_members.c.joined_at)
    )
    members_data = result.all()
    
    members = []
    for user_obj, role, joined_at in members_data:
        members.append({
            "id": str(user_obj.id),
            "email": user_obj.email,
            "username": user_obj.username,
            "full_name": user_obj.full_name,
            "avatar_url": user_obj.avatar_url,
            "role": role,
            "joined_at": joined_at.isoformat(),
            "last_active": user_obj.last_active.isoformat() if user_obj.last_active else None,
            "is_online": user_obj.last_active and (datetime.utcnow() - user_obj.last_active).seconds < 300
        })
    
    return members

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

class InviteUserRequest(BaseModel):
    email: str
    role: str = "member"  # member, admin

class InviteLinkRequest(BaseModel):
    expires_in_days: int = 7
    max_uses: Optional[int] = None

class InviteResponse(BaseModel):
    id: str
    workspace_id: str
    invited_email: str
    invited_by: str
    role: str
    status: str  # pending, accepted, expired
    invite_code: str
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/{workspace_id}/invite", response_model=InviteResponse)
async def invite_user_to_workspace(
    workspace_id: str,
    invite_request: InviteUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify user can invite (owner or admin)
    result = await db.execute(
        select(workspace_members.c.role)
        .where(
            (workspace_members.c.workspace_id == workspace_id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    user_role = result.scalar_one_or_none()
    
    if not user_role or user_role not in ['owner', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Only workspace owners and admins can invite users"
        )
    
    # Check if user already exists and is already a member
    user_result = await db.execute(
        select(User).where(User.email == invite_request.email)
    )
    existing_user = user_result.scalar_one_or_none()
    
    if existing_user:
        # Check if already a member
        member_result = await db.execute(
            select(workspace_members.c.role)
            .where(
                (workspace_members.c.workspace_id == workspace_id) &
                (workspace_members.c.user_id == existing_user.id)
            )
        )
        if member_result.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail="User is already a member of this workspace"
            )
    
    # Create invitation
    invite_code = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(20))
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    new_invite = WorkspaceInvite(
        workspace_id=workspace_id,
        invited_email=invite_request.email,
        invited_by=current_user.id,
        role=invite_request.role,
        invite_code=invite_code,
        expires_at=expires_at
    )
    
    db.add(new_invite)
    await db.commit()
    await db.refresh(new_invite)
    
    # If user exists, add them immediately
    if existing_user:
        await db.execute(
            workspace_members.insert().values(
                workspace_id=workspace_id,
                user_id=existing_user.id,
                role=invite_request.role
            )
        )
        await db.commit()
        
        # Update invite status
        await db.execute(
            update(WorkspaceInvite)
            .where(WorkspaceInvite.id == new_invite.id)
            .values(status=InviteStatus.ACCEPTED)
        )
        await db.commit()
    
    return InviteResponse(
        id=str(new_invite.id),
        workspace_id=str(new_invite.workspace_id),
        invited_email=new_invite.invited_email,
        invited_by=str(new_invite.invited_by),
        role=new_invite.role,
        status=new_invite.status.value,
        invite_code=new_invite.invite_code,
        expires_at=new_invite.expires_at,
        created_at=new_invite.created_at
    )

@router.post("/{workspace_id}/invite-link")
async def create_invite_link(
    workspace_id: str,
    link_request: InviteLinkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify permissions
    result = await db.execute(
        select(workspace_members.c.role)
        .where(
            (workspace_members.c.workspace_id == workspace_id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    user_role = result.scalar_one_or_none()
    
    if not user_role or user_role not in ['owner', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Only workspace owners and admins can create invite links"
        )
    
    # Generate invite link
    invite_code = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
    expires_at = datetime.utcnow() + timedelta(days=link_request.expires_in_days)
    
    # Update workspace with new invite code
    await db.execute(
        update(Workspace)
        .where(Workspace.id == workspace_id)
        .values(invite_code=invite_code)
    )
    await db.commit()
    
    invite_url = f"http://localhost:3000/join/{invite_code}"
    
    return {
        "invite_code": invite_code,
        "invite_url": invite_url,
        "expires_at": expires_at.isoformat(),
        "max_uses": link_request.max_uses
    }

@router.get("/{workspace_id}/invites")
async def get_workspace_invites(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify permissions
    result = await db.execute(
        select(workspace_members.c.role)
        .where(
            (workspace_members.c.workspace_id == workspace_id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    user_role = result.scalar_one_or_none()
    
    if not user_role or user_role not in ['owner', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Only workspace owners and admins can view invites"
        )
    
    # Get pending invites
    result = await db.execute(
        select(WorkspaceInvite, User.username)
        .join(User, WorkspaceInvite.invited_by == User.id)
        .where(
            (WorkspaceInvite.workspace_id == workspace_id) &
            (WorkspaceInvite.status == InviteStatus.PENDING)
        )
        .order_by(WorkspaceInvite.created_at.desc())
    )
    invites_data = result.all()
    
    invites = []
    for invite, inviter_name in invites_data:
        invites.append({
            "id": str(invite.id),
            "invited_email": invite.invited_email,
            "invited_by": inviter_name,
            "role": invite.role,
            "status": invite.status.value,
            "expires_at": invite.expires_at.isoformat(),
            "created_at": invite.created_at.isoformat()
        })
    
    return invites

@router.post("/join/{invite_code}")
async def join_workspace_by_code(
    invite_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Find workspace by invite code
    result = await db.execute(
        select(Workspace).where(Workspace.invite_code == invite_code)
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(
            status_code=404,
            detail="Invalid invite code"
        )
    
    # Check if user is already a member
    member_result = await db.execute(
        select(workspace_members.c.role)
        .where(
            (workspace_members.c.workspace_id == workspace.id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    if member_result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="You are already a member of this workspace"
        )
    
    # Add user to workspace
    await db.execute(
        workspace_members.insert().values(
            workspace_id=workspace.id,
            user_id=current_user.id,
            role="member"
        )
    )
    await db.commit()
    
    return {
        "message": "Successfully joined workspace",
        "workspace": {
            "id": str(workspace.id),
            "name": workspace.name,
            "description": workspace.description
        }
    }

@router.get("/{workspace_id}/members")
async def get_workspace_members(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify user is member
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
    
    # Get all workspace members
    result = await db.execute(
        select(User, workspace_members.c.role, workspace_members.c.joined_at)
        .join(workspace_members, User.id == workspace_members.c.user_id)
        .where(workspace_members.c.workspace_id == workspace_id)
        .order_by(workspace_members.c.joined_at)
    )
    members_data = result.all()
    
    members = []
    for user, role, joined_at in members_data:
        members.append({
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "role": role,
            "joined_at": joined_at.isoformat(),
            "last_active": user.last_active.isoformat() if user.last_active else None,
            "is_online": user.last_active and (datetime.utcnow() - user.last_active).seconds < 300  # 5 minutes
        })
    
    return members