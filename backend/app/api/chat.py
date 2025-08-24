from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
import os
import aiofiles

from app.core.database import get_db
from app.models.user import User
from app.models.message import Message, MessageType
from app.models.channel import Channel
from app.models.workspace import workspace_members
from app.api.auth import get_current_active_user

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

class FileUploadResponse(BaseModel):
    success: bool
    message: str
    attachment: dict
    message_id: str

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
        .join(workspace_members, Channel.workspace_id == workspace_members.c.workspace_id)
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
    
    # Get messages
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
    
    message_responses = []
    for message, username, avatar_url in messages_data:
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
            reactions=message.reactions or {},
            created_at=message.created_at,
            updated_at=message.updated_at,
            reply_count=0
        )
        message_responses.append(message_response)
    
    return list(reversed(message_responses))

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
        .join(workspace_members, Channel.workspace_id == workspace_members.c.workspace_id)
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
    
    # Broadcast message via WebSocket
    try:
        from app.websocket.manager import websocket_manager
        await websocket_manager.broadcast_to_workspace(
            str(channel.workspace_id),
            {
                "type": "chat_message",
                "id": str(new_message.id),
                "channel_id": channel_id,
                "user_id": str(current_user.id),
                "user_name": current_user.username,
                "user_avatar": current_user.avatar_url,
                "content": new_message.content,
                "message_type": str(new_message.message_type.value) if hasattr(new_message.message_type, 'value') else str(new_message.message_type),
                "attachments": new_message.attachments,
                "timestamp": new_message.created_at.isoformat()
            }
        )
    except Exception as e:
        print(f"Failed to broadcast message: {e}")

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
        reactions=new_message.reactions or {},
        created_at=new_message.created_at,
        updated_at=new_message.updated_at
    )

@router.put("/messages/{message_id}", response_model=MessageResponse)
async def update_message(
    message_id: str,
    message_data: MessageUpdate,
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
            content=message_data.content,
            encrypted_content=message_data.encrypted_content,
            is_edited=True,
            updated_at=datetime.utcnow()
        )
    )
    await db.commit()
    
    # Get updated message with user info
    updated_result = await db.execute(
        select(Message, User.username, User.avatar_url)
        .join(User, Message.user_id == User.id)
        .where(Message.id == message_id)
    )
    updated_message, username, avatar_url = updated_result.first()
    
    return MessageResponse(
        id=str(updated_message.id),
        content=updated_message.content,
        encrypted_content=updated_message.encrypted_content,
        message_type=updated_message.message_type,
        channel_id=str(updated_message.channel_id),
        user_id=str(updated_message.user_id),
        user_name=username,
        user_avatar=avatar_url,
        parent_message_id=str(updated_message.parent_message_id) if updated_message.parent_message_id else None,
        is_edited=updated_message.is_edited,
        attachments=updated_message.attachments,
        reactions=updated_message.reactions or {},
        created_at=updated_message.created_at,
        updated_at=updated_message.updated_at
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
    try:
        from app.websocket.manager import websocket_manager
        channel_result = await db.execute(select(Channel).where(Channel.id == message.channel_id))
        channel = channel_result.scalar_one_or_none()
        
        if channel:
            await websocket_manager.broadcast_to_workspace(
                str(channel.workspace_id),
                {
                    "type": "message_deleted",
                    "message_id": message_id,
                    "channel_id": str(message.channel_id),
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
    except Exception as e:
        print(f"Failed to broadcast message deletion: {e}")
    
    return {"message": "Message deleted successfully"}

@router.post("/messages/{message_id}/reactions")
async def add_reaction(
    message_id: str,
    reaction: ReactionAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get message
    result = await db.execute(
        select(Message).where(
            (Message.id == message_id) &
            (~Message.is_deleted)
        )
    )
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
    else:
        # Remove reaction if already exists (toggle behavior)
        reactions[emoji].remove(user_id)
        if not reactions[emoji]:  # Remove emoji if no users
            del reactions[emoji]
    
    await db.execute(
        update(Message)
        .where(Message.id == message_id)
        .values(reactions=reactions, updated_at=datetime.utcnow())
    )
    await db.commit()
    
    # Broadcast reaction via WebSocket
    try:
        from app.websocket.manager import websocket_manager
        channel_result = await db.execute(select(Channel).where(Channel.id == message.channel_id))
        channel = channel_result.scalar_one_or_none()
        
        if channel:
            await websocket_manager.broadcast_to_workspace(
                str(channel.workspace_id),
                {
                    "type": "reaction_updated",
                    "message_id": message_id,
                    "channel_id": str(message.channel_id),
                    "emoji": emoji,
                    "user_id": str(current_user.id),
                    "reactions": reactions,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
    except Exception as e:
        print(f"Failed to broadcast reaction: {e}")
    
    return {"message": "Reaction updated successfully", "reactions": reactions}

@router.post("/{channel_id}/upload", response_model=FileUploadResponse)
async def upload_file(
    channel_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify user has access to channel
    channel_result = await db.execute(
        select(Channel)
        .join(workspace_members, Channel.workspace_id == workspace_members.c.workspace_id)
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
    
    # Validate file
    if file.size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum size is 10MB."
        )
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_filename = f"{file_id}{file_extension}"
    
    # Create uploads directory if it doesn't exist
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file (in production, upload to S3 or similar)
    file_path = os.path.join(upload_dir, unique_filename)
    
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Create attachment data
    attachment_data = {
        "file_id": file_id,
        "filename": file.filename,
        "original_filename": file.filename,
        "size": file.size,
        "content_type": file.content_type,
        "url": f"/uploads/{unique_filename}",
        "uploaded_at": datetime.utcnow().isoformat()
    }
    
    # Create file message
    new_message = Message(
        content=f"📎 Shared file: {file.filename}",
        message_type=MessageType.FILE,
        channel_id=channel_id,
        user_id=current_user.id,
        attachments=attachment_data
    )
    
    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)
    
    # Broadcast file message via WebSocket
    try:
        from app.websocket.manager import websocket_manager
        await websocket_manager.broadcast_to_workspace(
            str(channel.workspace_id),
            {
                "type": "chat_message",
                "id": str(new_message.id),
                "channel_id": channel_id,
                "user_id": str(current_user.id),
                "user_name": current_user.username,
                "user_avatar": current_user.avatar_url,
                "content": new_message.content,
                "message_type": "file",
                "attachments": attachment_data,
                "timestamp": new_message.created_at.isoformat()
            }
        )
    except Exception as e:
        print(f"Failed to broadcast file message: {e}")
    
    return FileUploadResponse(
        success=True,
        message="File uploaded successfully",
        attachment=attachment_data,
        message_id=str(new_message.id)
    )

@router.put("/messages/{message_id}", response_model=MessageResponse)
async def update_message(
    message_id: str,
    message_data: MessageUpdate,
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
            content=message_data.content,
            encrypted_content=message_data.encrypted_content,
            is_edited=True,
            updated_at=datetime.utcnow()
        )
    )
    await db.commit()
    
    # Get updated message with user info
    updated_result = await db.execute(
        select(Message, User.username, User.avatar_url)
        .join(User, Message.user_id == User.id)
        .where(Message.id == message_id)
    )
    updated_message, username, avatar_url = updated_result.first()
    
    # Broadcast update via WebSocket
    try:
        from app.websocket.manager import websocket_manager
        channel_result = await db.execute(select(Channel).where(Channel.id == updated_message.channel_id))
        channel = channel_result.scalar_one_or_none()
        
        if channel:
            await websocket_manager.broadcast_to_workspace(
                str(channel.workspace_id),
                {
                    "type": "message_updated",
                    "id": str(updated_message.id),
                    "channel_id": str(updated_message.channel_id),
                    "content": updated_message.content,
                    "is_edited": True,
                    "timestamp": updated_message.updated_at.isoformat()
                }
            )
    except Exception as e:
        print(f"Failed to broadcast message update: {e}")
    
    return MessageResponse(
        id=str(updated_message.id),
        content=updated_message.content,
        encrypted_content=updated_message.encrypted_content,
        message_type=updated_message.message_type,
        channel_id=str(updated_message.channel_id),
        user_id=str(updated_message.user_id),
        user_name=username,
        user_avatar=avatar_url,
        parent_message_id=str(updated_message.parent_message_id) if updated_message.parent_message_id else None,
        is_edited=updated_message.is_edited,
        attachments=updated_message.attachments,
        reactions=updated_message.reactions or {},
        created_at=updated_message.created_at,
        updated_at=updated_message.updated_at
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
    try:
        from app.websocket.manager import websocket_manager
        channel_result = await db.execute(select(Channel).where(Channel.id == message.channel_id))
        channel = channel_result.scalar_one_or_none()
        
        if channel:
            await websocket_manager.broadcast_to_workspace(
                str(channel.workspace_id),
                {
                    "type": "message_deleted",
                    "message_id": message_id,
                    "channel_id": str(message.channel_id),
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
    except Exception as e:
        print(f"Failed to broadcast message deletion: {e}")
    
    return {"message": "Message deleted successfully"}

@router.post("/messages/{message_id}/reactions")
async def add_reaction(
    message_id: str,
    reaction: ReactionAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get message
    result = await db.execute(
        select(Message).where(
            (Message.id == message_id) &
            (~Message.is_deleted)
        )
    )
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
    else:
        # Remove reaction if already exists (toggle behavior)
        reactions[emoji].remove(user_id)
        if not reactions[emoji]:  # Remove emoji if no users
            del reactions[emoji]
    
    await db.execute(
        update(Message)
        .where(Message.id == message_id)
        .values(reactions=reactions, updated_at=datetime.utcnow())
    )
    await db.commit()
    
    # Broadcast reaction via WebSocket
    try:
        from app.websocket.manager import websocket_manager
        channel_result = await db.execute(select(Channel).where(Channel.id == message.channel_id))
        channel = channel_result.scalar_one_or_none()
        
        if channel:
            await websocket_manager.broadcast_to_workspace(
                str(channel.workspace_id),
                {
                    "type": "reaction_updated",
                    "message_id": message_id,
                    "channel_id": str(message.channel_id),
                    "emoji": emoji,
                    "user_id": str(current_user.id),
                    "reactions": reactions,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
    except Exception as e:
        print(f"Failed to broadcast reaction: {e}")
    
    return {"message": "Reaction updated successfully", "reactions": reactions}