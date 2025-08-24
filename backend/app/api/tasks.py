
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.user import User
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.workspace import workspace_members
from app.api.auth import get_current_active_user
from app.websocket.manager import websocket_manager

router = APIRouter()


from sqlalchemy.orm import aliased
User2 = aliased(User)

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    workspace_id: str
    created_by: str
    creator_name: str
    assigned_to: Optional[str]
    assignee_name: Optional[str]
    due_date: Optional[datetime]
    tags: Optional[List[str]]
    created_at: datetime
    updated_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True

@router.post("/{workspace_id}/tasks", response_model=TaskResponse)
async def create_task(
    workspace_id: str,
    task_data: TaskCreate,
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
    
    # Create task
    new_task = Task(
        title=task_data.title,
        description=task_data.description,
        status=task_data.status,
        priority=task_data.priority,
        workspace_id=workspace_id,
        created_by=current_user.id,
        assigned_to=task_data.assigned_to,
        due_date=task_data.due_date,
        tags=task_data.tags
    )
    
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    
    # Get assignee name if assigned
    assignee_name = None
    if task_data.assigned_to:
        assignee_result = await db.execute(
            select(User.username).where(User.id == task_data.assigned_to)
        )
        assignee_name = assignee_result.scalar_one_or_none()
    
    # Broadcast task creation
    await websocket_manager.broadcast_to_workspace(
        workspace_id,
        {
            "type": "task_created",
            "task_id": str(new_task.id),
            "title": new_task.title,
            "status": new_task.status.value,
            "priority": new_task.priority.value,
            "created_by": str(current_user.id),
            "creator_name": current_user.username,
            "assigned_to": task_data.assigned_to,
            "assignee_name": assignee_name,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    return TaskResponse(
        id=str(new_task.id),
        title=new_task.title,
        description=new_task.description,
        status=new_task.status,
        priority=new_task.priority,
        workspace_id=str(new_task.workspace_id),
        created_by=str(new_task.created_by),
        creator_name=current_user.username,
        assigned_to=str(new_task.assigned_to) if new_task.assigned_to else None,
        assignee_name=assignee_name,
        due_date=new_task.due_date,
        tags=new_task.tags,
        created_at=new_task.created_at,
        updated_at=new_task.updated_at,
        completed_at=new_task.completed_at
    )

@router.get("/{workspace_id}/tasks", response_model=List[TaskResponse])
async def get_workspace_tasks(
    workspace_id: str,
    status: Optional[TaskStatus] = None,
    assigned_to: Optional[str] = None,
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
    
    # Build query
    query = (
        select(
            Task,
            User.username.label("creator_name"),
            User2.username.label("assignee_name")
        )
        .join(User, Task.created_by == User.id)
        .outerjoin(User2, Task.assigned_to == User2.id)
        .where(Task.workspace_id == workspace_id)
    )
    
    # Apply filters
    if status:
        query = query.where(Task.status == status)
    if assigned_to:
        query = query.where(Task.assigned_to == assigned_to)
    
    query = query.order_by(Task.created_at.desc())
    
    result = await db.execute(query)
    tasks_data = result.all()
    
    task_responses = []
    for task, creator_name, assignee_name in tasks_data:
        task_responses.append(
            TaskResponse(
                id=str(task.id),
                title=task.title,
                description=task.description,
                status=task.status,
                priority=task.priority,
                workspace_id=str(task.workspace_id),
                created_by=str(task.created_by),
                creator_name=creator_name,
                assigned_to=str(task.assigned_to) if task.assigned_to else None,
                assignee_name=assignee_name,
                due_date=task.due_date,
                tags=task.tags,
                created_at=task.created_at,
                updated_at=task.updated_at,
                completed_at=task.completed_at
            )
        )
    
    return task_responses

@router.put("/{workspace_id}/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    workspace_id: str,
    task_id: str,
    task_update: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get task and verify access
    result = await db.execute(
        select(Task, User.username, User2.username)
        .join(User, Task.created_by == User.id)
        .outerjoin(User2, Task.assigned_to == User2.id)
        .join(workspace_members, Task.workspace_id == workspace_members.c.workspace_id)
        .where(
            (Task.id == task_id) &
            (Task.workspace_id == workspace_id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    task_data = result.first()
    
    if not task_data:
        raise HTTPException(
            status_code=404,
            detail="Task not found or access denied"
        )
    
    task, creator_name, old_assignee_name = task_data
    
    # Update task
    update_data = task_update.model_dump(exclude_unset=True)
    if update_data:
        if task_update.status == TaskStatus.DONE and task.status != TaskStatus.DONE:
            update_data['completed_at'] = datetime.utcnow()
        elif task_update.status != TaskStatus.DONE:
            update_data['completed_at'] = None
        
        update_data['updated_at'] = datetime.utcnow()
        await db.execute(
            update(Task)
            .where(Task.id == task_id)
            .values(**update_data)
        )
        await db.commit()
        await db.refresh(task)
    
    # Get new assignee name if changed
    assignee_name = old_assignee_name
    if task_update.assigned_to:
        assignee_result = await db.execute(
            select(User.username).where(User.id == task_update.assigned_to)
        )
        assignee_name = assignee_result.scalar_one_or_none()
    
    # Broadcast task update
    await websocket_manager.broadcast_to_workspace(
        workspace_id,
        {
            "type": "task_updated",
            "task_id": task_id,
            "updates": update_data,
            "updated_by": str(current_user.id),
            "updater_name": current_user.username,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    return TaskResponse(
        id=str(task.id),
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        workspace_id=str(task.workspace_id),
        created_by=str(task.created_by),
        creator_name=creator_name,
        assigned_to=str(task.assigned_to) if task.assigned_to else None,
        assignee_name=assignee_name,
        due_date=task.due_date,
        tags=task.tags,
        created_at=task.created_at,
        updated_at=task.updated_at,
        completed_at=task.completed_at
    )

@router.delete("/{workspace_id}/tasks/{task_id}")
async def delete_task(
    workspace_id: str,
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get task and verify access
    result = await db.execute(
        select(Task)
        .join(workspace_members, Task.workspace_id == workspace_members.c.workspace_id)
        .where(
            (Task.id == task_id) &
            (Task.workspace_id == workspace_id) &
            (workspace_members.c.user_id == current_user.id)
        )
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found or access denied"
        )
    
    # Delete task
    await db.execute(delete(Task).where(Task.id == task_id))
    await db.commit()
    
    # Broadcast task deletion
    await websocket_manager.broadcast_to_workspace(
        workspace_id,
        {
            "type": "task_deleted",
            "task_id": task_id,
            "deleted_by": str(current_user.id),
            "deleter_name": current_user.username,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    return {"message": "Task deleted successfully"}