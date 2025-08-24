from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.core.database import Base

class DMMessageType(enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    VIDEO = "video"
    AUDIO = "audio"
    CALL_START = "call_start"
    CALL_END = "call_end"

class DirectMessage(Base):
    __tablename__ = "direct_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text)
    encrypted_content = Column(Text)
    message_type = Column(Enum(DMMessageType), default=DMMessageType.TEXT)
    
    # Participants
    sender_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    receiver_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Message properties
    is_edited = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    
    # Attachments and reactions
    attachments = Column(JSONB)
    reactions = Column(JSONB)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    read_at = Column(DateTime(timezone=True))
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])