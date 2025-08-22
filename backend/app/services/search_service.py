from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, text
from sqlalchemy.orm import selectinload

from app.models.message import Message
from app.models.document import Document
from app.models.task import Task
from app.models.user import User
from app.models.workspace import workspace_members

class SearchService:
    async def search_messages(
        self,
        db: AsyncSession,
        user_id: str,
        query: str,
        workspace_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Search messages across workspaces"""
        
        search_query = select(Message, User.username, User.avatar_url).join(
            User, Message.user_id == User.id
        )
        
        if workspace_id:
            # Search within specific workspace
            search_query = search_query.join(
                Channel, Message.channel_id == Channel.id
            ).where(Channel.workspace_id == workspace_id)
        else:
            # Search across all accessible workspaces
            search_query = search_query.join(
                Channel, Message.channel_id == Channel.id
            ).join(
                workspace_members,
                Channel.workspace_id == workspace_members.c.workspace_id
            ).where(workspace_members.c.user_id == user_id)
        
        # Add text search
        search_query = search_query.where(
            or_(
                Message.content.ilike(f"%{query}%"),
                func.to_tsvector('english', Message.content).match(query)
            )
        ).where(
            ~Message.is_deleted
        ).order_by(
            Message.created_at.desc()
        ).limit(limit)
        
        result = await db.execute(search_query)
        messages = result.all()
        
        return [
            {
                "type": "message",
                "id": str(message.id),
                "content": message.content,
                "user_name": username,
                "user_avatar": avatar_url,
                "channel_id": str(message.channel_id),
                "created_at": message.created_at.isoformat()
            }
            for message, username, avatar_url in messages
        ]

    async def search_documents(
        self,
        db: AsyncSession,
        user_id: str,
        query: str,
        workspace_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Search documents across workspaces"""
        
        search_query = select(Document, User.username).join(
            User, Document.created_by == User.id
        ).join(
            workspace_members,
            Document.workspace_id == workspace_members.c.workspace_id
        ).where(
            workspace_members.c.user_id == user_id
        )
        
        if workspace_id:
            search_query = search_query.where(Document.workspace_id == workspace_id)
        
        search_query = search_query.where(
            or_(
                Document.title.ilike(f"%{query}%"),
                Document.content.ilike(f"%{query}%"),
                func.to_tsvector('english', Document.title + ' ' + Document.content).match(query)
            )
        ).where(
            ~Document.is_archived
        ).order_by(
            Document.updated_at.desc().nulls_last(),
            Document.created_at.desc()
        ).limit(limit)
        
        result = await db.execute(search_query)
        documents = result.all()
        
        return [
            {
                "type": "document",
                "id": str(document.id),
                "title": document.title,
                "content_preview": document.content[:200] + "..." if len(document.content) > 200 else document.content,
                "creator_name": creator_name,
                "workspace_id": str(document.workspace_id),
                "updated_at": (document.updated_at or document.created_at).isoformat()
            }
            for document, creator_name in documents
        ]

    async def search_tasks(
        self,
        db: AsyncSession,
        user_id: str,
        query: str,
        workspace_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Search tasks across workspaces"""
        
        search_query = select(Task, User.username).join(
            User, Task.created_by == User.id
        ).join(
            workspace_members,
            Task.workspace_id == workspace_members.c.workspace_id
        ).where(
            workspace_members.c.user_id == user_id
        )
        
        if workspace_id:
            search_query = search_query.where(Task.workspace_id == workspace_id)
        
        search_query = search_query.where(
            or_(
                Task.title.ilike(f"%{query}%"),
                Task.description.ilike(f"%{query}%")
            )
        ).order_by(
            Task.updated_at.desc().nulls_last(),
            Task.created_at.desc()
        ).limit(limit)
        
        result = await db.execute(search_query)
        tasks = result.all()
        
        return [
            {
                "type": "task",
                "id": str(task.id),
                "title": task.title,
                "description": task.description,
                "status": task.status.value,
                "priority": task.priority.value,
                "creator_name": creator_name,
                "workspace_id": str(task.workspace_id),
                "updated_at": (task.updated_at or task.created_at).isoformat()
            }
            for task, creator_name in tasks
        ]

    async def global_search(
        self,
        db: AsyncSession,
        user_id: str,
        query: str,
        workspace_id: Optional[str] = None,
        limit_per_type: int = 20
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Search across all content types"""
        
        results = await asyncio.gather(
            self.search_messages(db, user_id, query, workspace_id, limit_per_type),
            self.search_documents(db, user_id, query, workspace_id, limit_per_type),
            self.search_tasks(db, user_id, query, workspace_id, limit_per_type)
        )
        
        return {
            "messages": results[0],
            "documents": results[1], 
            "tasks": results[2]
        }

search_service = SearchService()