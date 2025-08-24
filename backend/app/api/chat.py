from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

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

@router.get("/{channel_id}/messages", response_model=List[MessageResponse])
async def get_channel_messages(
    channel_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify user has access to channel - CORRECT SYNTAX
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
            reactions=message.reactions,
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
    # Verify user has access to channel - CORRECT SYNTAX
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

@router.delete("/messages/{message_id}")
async def delete_message(
   message_id: str,
   db: AsyncSession = Depends(get_db),
   current_user: User = Depends(get_current_active_user)
):
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
   
   await db.execute(
       update(Message)
       .where(Message.id == message_id)
       .values(is_deleted=True, updated_at=datetime.utcnow())
   )
   await db.commit()
   
   return {"message": "Message deleted successfully"}

@router.post("/messages/{message_id}/reactions")
async def add_reaction(
   message_id: str,
   reaction: ReactionAdd,
   db: AsyncSession = Depends(get_db),
   current_user: User = Depends(get_current_active_user)
):
   result = await db.execute(select(Message).where(Message.id == message_id))
   message = result.scalar_one_or_none()
   
   if not message:
       raise HTTPException(status_code=404, detail="Message not found")
   
   reactions = message.reactions or {}
   emoji = reaction.emoji
   
   if emoji not in reactions:
       reactions[emoji] = []
   
   user_id = str(current_user.id)
   if user_id not in reactions[emoji]:
       reactions[emoji].append(user_id)
   
   await db.execute(
       update(Message)
       .where(Message.id == message_id)
       .values(reactions=reactions)
   )
   await db.commit()
   
   return {"message": "Reaction added successfully", "reactions": reactions}

@router.post("/{channel_id}/upload")
async def upload_file(
   channel_id: str,
   file: UploadFile = File(...),
   db: AsyncSession = Depends(get_db),
   current_user: User = Depends(get_current_active_user)
):
   # Verify user has access to channel - FIXED JOIN
   channel_result = await db.execute(
       select(Channel)
       .select_from(
           Channel.join(workspace_members, Channel.workspace_id == workspace_members.c.workspace_id)
       )
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
   
   # Simulate file upload
   file_id = str(uuid.uuid4())
   file_url = f"https://remotesync-files.s3.amazonaws.com/{file_id}/{file.filename}"
   
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

