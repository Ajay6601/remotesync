from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Integer, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.core.database import Base

class MessageType(enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    VIDEO = "video"
    AUDIO = "audio"
    SYSTEM = "system"

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text)
    encrypted_content = Column(Text)  # E2E encrypted content
    message_type = Column(Enum(MessageType), default=MessageType.TEXT)
    
    # Foreign keys
    channel_id = Column(UUID(as_uuid=True), ForeignKey('channels.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    parent_message_id = Column(UUID(as_uuid=True), ForeignKey('messages.id'))  # For threading
    
    # Message properties
    is_edited = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    
    # File attachments
    attachments = Column(JSONB)  # Store file metadata
    
    # Message reactions
    reactions = Column(JSONB)  # Store reactions data
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    channel = relationship("Channel")
    user = relationship("User")
    replies = relationship("Message", remote_side=[id])