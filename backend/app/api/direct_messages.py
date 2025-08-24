from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, or_, and_, func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

from app.core.database import get_db
from app.models.user import User
from app.models.direct_message import DirectMessage, DMMessageType
from app.models.connection import UserConnection, ConnectionStatus
from app.api.auth import get_current_active_user

router = APIRouter()

class DMCreate(BaseModel):
    receiver_id: str
    content: str
    encrypted_content: Optional[str] = None
    message_type: DMMessageType = DMMessageType.TEXT

class DMResponse(BaseModel):
    id: str
    content: str
    encrypted_content: Optional[str]
    message_type: DMMessageType
    sender_id: str
    receiver_id: str
    sender_name: str
    sender_avatar: Optional[str]
    is_edited: bool
    is_read: bool
    attachments: Optional[dict]
    reactions: Optional[dict]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    friend_id: str
    friend_name: str
    friend_username: str
    friend_avatar: Optional[str]
    is_online: bool
    last_message: Optional[str]
    last_message_at: Optional[datetime]
    unread_count: int

@router.get("/conversations")
async def get_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get list of direct message conversations"""
    
    # Get all friends (accepted connections)
    friends_result = await db.execute(
        select(UserConnection, User.username, User.full_name, User.avatar_url, User.last_active)
        .where(
            and_(
                or_(
                    UserConnection.requester_id == current_user.id,
                    UserConnection.receiver_id == current_user.id
                ),
                UserConnection.status == ConnectionStatus.ACCEPTED
            )
        )
        .outerjoin(
            User,
            or_(
                and_(
                    UserConnection.requester_id == current_user.id,
                    User.id == UserConnection.receiver_id
                ),
                and_(
                    UserConnection.receiver_id == current_user.id,
                    User.id == UserConnection.requester_id
                )
            )
        )
        .order_by(User.username)
    )
    friends_data = friends_result.all()
    
    conversations = []
    for connection, username, full_name, avatar_url, last_active in friends_data:
        friend_id = connection.receiver_id if connection.requester_id == current_user.id else connection.requester_id
        
        # Get last message
        last_message_result = await db.execute(
            select(DirectMessage.content, DirectMessage.created_at)
            .where(
                or_(
                    and_(
                        DirectMessage.sender_id == current_user.id,
                        DirectMessage.receiver_id == friend_id
                    ),
                    and_(
                        DirectMessage.sender_id == friend_id,
                        DirectMessage.receiver_id == current_user.id
                    )
                )
            )
            .where(~DirectMessage.is_deleted)
            .order_by(DirectMessage.created_at.desc())
            .limit(1)
        )
        last_message_data = last_message_result.first()
        
        # Count unread messages
        unread_count_result = await db.execute(
            select(func.count())
            .select_from(DirectMessage)
            .where(
                and_(
                    DirectMessage.sender_id == friend_id,
                    DirectMessage.receiver_id == current_user.id,
                    DirectMessage.is_read == False,
                    ~DirectMessage.is_deleted
                )
            )
        )
        unread_count = unread_count_result.scalar() or 0
        
        # Check if online
        is_online = last_active and (datetime.utcnow() - last_active).seconds < 300
        
        conversations.append(
            ConversationResponse(
                friend_id=str(friend_id),
                friend_name=full_name,
                friend_username=username,
                friend_avatar=avatar_url,
                is_online=is_online,
                last_message=last_message_data[0] if last_message_data else None,
                last_message_at=last_message_data[1] if last_message_data else None,
                unread_count=unread_count
            )
        )
    
    return conversations

@router.get("/{friend_id}/messages")
async def get_direct_messages(
    friend_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get direct messages with a friend"""
    
    # Verify friendship
    connection_result = await db.execute(
        select(UserConnection).where(
            and_(
                or_(
                    and_(
                        UserConnection.requester_id == current_user.id,
                        UserConnection.receiver_id == friend_id
                    ),
                    and_(
                        UserConnection.requester_id == friend_id,
                        UserConnection.receiver_id == current_user.id
                    )
                ),
                UserConnection.status == ConnectionStatus.ACCEPTED
            )
        )
    )
    
    if not connection_result.scalar_one_or_none():
        raise HTTPException(
            status_code=403,
            detail="You are not connected with this user"
        )
    
    # Get messages
    query = (
        select(DirectMessage, User.username, User.avatar_url)
        .join(User, DirectMessage.sender_id == User.id)
        .where(
            or_(
                and_(
                    DirectMessage.sender_id == current_user.id,
                    DirectMessage.receiver_id == friend_id
                ),
                and_(
                    DirectMessage.sender_id == friend_id,
                    DirectMessage.receiver_id == current_user.id
                )
            )
        )
        .where(~DirectMessage.is_deleted)
        .order_by(DirectMessage.created_at.desc())
        .limit(limit)
    )
    
    if before:
        query = query.where(DirectMessage.id < before)
    
    result = await db.execute(query)
    messages_data = result.all()
    
    # Mark messages as read
    await db.execute(
        update(DirectMessage)
        .where(
            and_(
                DirectMessage.sender_id == friend_id,
                DirectMessage.receiver_id == current_user.id,
                DirectMessage.is_read == False
            )
        )
        .values(is_read=True, read_at=datetime.utcnow())
    )
    await db.commit()
    
    messages = []
    for message, sender_name, sender_avatar in messages_data:
        messages.append(
            DMResponse(
                id=str(message.id),
                content=message.content,
                encrypted_content=message.encrypted_content,
                message_type=message.message_type,
                sender_id=str(message.sender_id),
                receiver_id=str(message.receiver_id),
                sender_name=sender_name,
                sender_avatar=sender_avatar,
                is_edited=message.is_edited,
                is_read=message.is_read,
                attachments=message.attachments,
                reactions=message.reactions,
                created_at=message.created_at,
                updated_at=message.updated_at
            )
        )
    
    return list(reversed(messages))

@router.post("/{friend_id}/send")
async def send_direct_message(
    friend_id: str,
    message_data: DMCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send direct message to a friend"""
    
    # Verify friendship
    connection_result = await db.execute(
        select(UserConnection).where(
            and_(
                or_(
                    and_(
                        UserConnection.requester_id == current_user.id,
                        UserConnection.receiver_id == friend_id
                    ),
                    and_(
                        UserConnection.requester_id == friend_id,
                        UserConnection.receiver_id == current_user.id
                    )
                ),
                UserConnection.status == ConnectionStatus.ACCEPTED
            )
        )
    )
    
    if not connection_result.scalar_one_or_none():
        raise HTTPException(
            status_code=403,
            detail="You are not connected with this user"
        )
    
    # Create direct message
    new_message = DirectMessage(
        content=message_data.content,
        encrypted_content=message_data.encrypted_content,
        message_type=message_data.message_type,
        sender_id=current_user.id,
        receiver_id=friend_id
    )
    
    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)
    
    return DMResponse(
        id=str(new_message.id),
        content=new_message.content,
        encrypted_content=new_message.encrypted_content,
        message_type=new_message.message_type,
        sender_id=str(new_message.sender_id),
        receiver_id=str(new_message.receiver_id),
        sender_name=current_user.username,
        sender_avatar=current_user.avatar_url,
        is_edited=new_message.is_edited,
        is_read=new_message.is_read,
        attachments=new_message.attachments,
        reactions=new_message.reactions,
        created_at=new_message.created_at,
        updated_at=new_message.updated_at
    )
