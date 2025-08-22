from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

from app.core.database import get_db
from app.models.user import User
from app.models.message import Message, MessageType
from app.models.channel import Channel
from app.api.auth import get_current_active_user
from app.websocket.manager import websocket_manager

router = APIRouter()

class MessageCreate(BaseModel):
    content: str
    encrypted_content: Optional[str] = None
    message_type: MessageType = MessageType.TEXT
    parent_message_id: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    content: str
    encrypted_content: Optional[str]
    message_type: MessageType
    channel_id: str
    user_id: str
    user_name: str
    user_avatar: Optional[str]
    parent_message_id: Optional[str]
    is_edited: bool
    attachments: Optional[dict]
    reactions: Optional[dict]
    created_at: datetime
    updated_at: Optional[datetime]
    reply_count: int = 0

    class Config:
        from_attributes = True

class MessageUpdate(BaseModel):
    content: str
    encrypted_content: Optional[str] = None

class ReactionAdd(BaseModel):
    emoji: str

@router.get("/{channel_id}/messages", response_model=List[MessageResponse])
async def get_channel_messages(
    channel_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify user has access to channel
    channel_result = await db.execute(
        select(Channel)
        .join(workspace_members)
        .where(
            (Channel.id == channel_id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    channel = channel_result.scalar_one_or_none()
    
    if not channel:
        raise HTTPException(
            status_code=403,
            detail="Access denied to this channel"
        )
    
    # Build query
    query = (
        select(Message, User.username, User.avatar_url)
        .join(User, Message.user_id == User.id)
        .where(
            (Message.channel_id == channel_id) &
            (~Message.is_deleted)
        )
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    
    if before:
        query = query.where(Message.id < before)
    
    result = await db.execute(query)
    messages_data = result.all()
    
    # Get reply counts for each message
    message_responses = []
    for message, username, avatar_url in messages_data:
        # Count replies
        reply_count_result = await db.execute(
            select(func.count(Message.id))
            .where(Message.parent_message_id == message.id)
        )
        reply_count = reply_count_result.scalar() or 0
        
        message_response = MessageResponse(
            id=str(message.id),
            content=message.content,
            encrypted_content=message.encrypted_content,
            message_type=message.message_type,
            channel_id=str(message.channel_id),
            user_id=str(message.user_id),
            user_name=username,
            user_avatar=avatar_url,
            parent_message_id=str(message.parent_message_id) if message.parent_message_id else None,
            is_edited=message.is_edited,
            attachments=message.attachments,
            reactions=message.reactions,
            created_at=message.created_at,
            updated_at=message.updated_at,
            reply_count=reply_count
        )
        message_responses.append(message_response)
    
    return list(reversed(message_responses))  # Return in chronological order

@router.post("/{channel_id}/messages", response_model=MessageResponse)
async def send_message(
    channel_id: str,
    message_data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify user has access to channel
    channel_result = await db.execute(
        select(Channel)
        .join(workspace_members)
        .where(
            (Channel.id == channel_id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    channel = channel_result.scalar_one_or_none()
    
    if not channel:
        raise HTTPException(
            status_code=403,
            detail="Access denied to this channel"
        )
    
    # Create message
    new_message = Message(
        content=message_data.content,
        encrypted_content=message_data.encrypted_content,
        message_type=message_data.message_type,
        channel_id=channel_id,
        user_id=current_user.id,
        parent_message_id=message_data.parent_message_id
    )
    
    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)
    
    # Broadcast via WebSocket
    await websocket_manager.broadcast_to_workspace(
        str(channel.workspace_id),
        {
            "type": "chat_message",
            "id": str(new_message.id),
            "channel_id": channel_id,
            "user_id": str(current_user.id),
            "user_name": current_user.username,
            "user_avatar": current_user.avatar_url,
            "content": message_data.content,
            "encrypted_content": message_data.encrypted_content,
            "message_type": message_data.message_type.value,
            "parent_message_id": message_data.parent_message_id,
            "timestamp": new_message.created_at.isoformat()
        }
    )
    
    return MessageResponse(
        id=str(new_message.id),
        content=new_message.content,
        encrypted_content=new_message.encrypted_content,
        message_type=new_message.message_type,
        channel_id=str(new_message.channel_id),
        user_id=str(new_message.user_id),
        user_name=current_user.username,
        user_avatar=current_user.avatar_url,
        parent_message_id=str(new_message.parent_message_id) if new_message.parent_message_id else None,
        is_edited=new_message.is_edited,
        attachments=new_message.attachments,
        reactions=new_message.reactions,
        created_at=new_message.created_at,
        updated_at=new_message.updated_at
    )

@router.put("/messages/{message_id}", response_model=MessageResponse)
async def update_message(
    message_id: str,
    message_update: MessageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get message and verify ownership
    result = await db.execute(
        select(Message).where(
            (Message.id == message_id) &
            (Message.user_id == current_user.id) &
            (~Message.is_deleted)
        )
    )
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(
            status_code=404,
            detail="Message not found or access denied"
        )
    
    # Update message
    await db.execute(
        update(Message)
        .where(Message.id == message_id)
        .values(
            content=message_update.content,
            encrypted_content=message_update.encrypted_content,
            is_edited=True,
            updated_at=datetime.utcnow()
        )
    )
    await db.commit()
    
    # Broadcast update via WebSocket
    channel_result = await db.execute(select(Channel).where(Channel.id == message.channel_id))
    channel = channel_result.scalar_one()
    
    await websocket_manager.broadcast_to_workspace(
        str(channel.workspace_id),
        {
            "type": "message_updated",
            "message_id": message_id,
            "content": message_update.content,
            "encrypted_content": message_update.encrypted_content,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    return MessageResponse(
        id=str(message.id),
        content=message_update.content,
        encrypted_content=message_update.encrypted_content,
        message_type=message.message_type,
        channel_id=str(message.channel_id),
        user_id=str(message.user_id),
        user_name=current_user.username,
        user_avatar=current_user.avatar_url,
        parent_message_id=str(message.parent_message_id) if message.parent_message_id else None,
        is_edited=True,
        attachments=message.attachments,
        reactions=message.reactions,
        created_at=message.created_at,
        updated_at=datetime.utcnow()
    )

@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get message and verify ownership
    result = await db.execute(
        select(Message).where(
            (Message.id == message_id) &
            (Message.user_id == current_user.id)
        )
    )
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(
            status_code=404,
            detail="Message not found or access denied"
        )
    
    # Soft delete
    await db.execute(
        update(Message)
        .where(Message.id == message_id)
        .values(is_deleted=True, updated_at=datetime.utcnow())
    )
    await db.commit()
    
    # Broadcast deletion via WebSocket
    channel_result = await db.execute(select(Channel).where(Channel.id == message.channel_id))
    channel = channel_result.scalar_one()
    
    await websocket_manager.broadcast_to_workspace(
        str(channel.workspace_id),
        {
            "type": "message_deleted",
            "message_id": message_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    return {"message": "Message deleted successfully"}

@router.post("/messages/{message_id}/reactions")
async def add_reaction(
    message_id: str,
    reaction: ReactionAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get message
    result = await db.execute(select(Message).where(Message.id == message_id))
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Update reactions
    reactions = message.reactions or {}
    emoji = reaction.emoji
    
    if emoji not in reactions:
        reactions[emoji] = []
    
    user_id = str(current_user.id)
    if user_id not in reactions[emoji]:
        reactions[emoji].append(user_id)
    
    # Update message
    await db.execute(
        update(Message)
        .where(Message.id == message_id)
        .values(reactions=reactions)
    )
    await db.commit()
    
    # Broadcast reaction via WebSocket
    channel_result = await db.execute(select(Channel).where(Channel.id == message.channel_id))
    channel = channel_result.scalar_one()
    
    await websocket_manager.broadcast_to_workspace(
        str(channel.workspace_id),
        {
            "type": "reaction_added",
            "message_id": message_id,
            "emoji": emoji,
            "user_id": user_id,
            "reactions": reactions,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    return {"message": "Reaction added successfully", "reactions": reactions}

@router.post("/{channel_id}/upload")
async def upload_file(
    channel_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify user has access to channel
    channel_result = await db.execute(
        select(Channel)
        .join(workspace_members)
        .where(
            (Channel.id == channel_id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    channel = channel_result.scalar_one_or_none()
    
    if not channel:
        raise HTTPException(
            status_code=403,
            detail="Access denied to this channel"
        )
    
    # In production, upload to S3
    # For now, simulate file upload
    file_id = str(uuid.uuid4())
    file_url = f"https://remotesync-files.s3.amazonaws.com/{file_id}/{file.filename}"
    
    # Create message with file attachment
    attachment_data = {
        "file_id": file_id,
        "filename": file.filename,
        "size": file.size,
        "content_type": file.content_type,
        "url": file_url
    }
    
    new_message = Message(
        content=f"Shared a file: {file.filename}",
        message_type=MessageType.FILE,
        channel_id=channel_id,
        user_id=current_user.id,
        attachments=attachment_data
    )
    
    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)
    
    return {"message": "File uploaded successfully", "attachment": attachment_data}
