from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    content = Column(Text)  # Current document content
    encrypted_content = Column(Text)  # E2E encrypted content
    
    # Document metadata
    version = Column(Integer, default=1)
    is_public = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    
    # Foreign keys
    workspace_id = Column(UUID(as_uuid=True), ForeignKey('workspaces.id'), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Document settings
    settings = Column(JSONB)  # Editor settings, permissions, etc.
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    workspace = relationship("Workspace")
    creator = relationship("User")

class DocumentOperation(Base):
    """Store document operations for operational transform and conflict resolution"""
    __tablename__ = "document_operations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Document reference
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Operation details
    operation_type = Column(String(50), nullable=False)  # insert, delete, retain, format
    position = Column(Integer, nullable=False)
    content = Column(Text)
    length = Column(Integer)
    
    # Version control
    document_version = Column(Integer, nullable=False)
    operation_index = Column(Integer, nullable=False)
    
    # Operational transform data
    transform_data = Column(JSONB)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    document = relationship("Document")
    user = relationship("User")