from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, or_, and_, func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.user import User
from app.models.connection import UserConnection, ConnectionStatus
from app.api.auth import get_current_active_user

router = APIRouter()

class ConnectionRequest(BaseModel):
    receiver_id: str
    message: Optional[str] = None

class ConnectionResponse(BaseModel):
    id: str
    requester_id: str
    receiver_id: str
    requester_name: str
    receiver_name: str
    requester_avatar: Optional[str]
    receiver_avatar: Optional[str]
    status: str
    message: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class UserSearchResponse(BaseModel):
    id: str
    username: str
    full_name: str
    email: str
    avatar_url: Optional[str]
    is_online: bool
    connection_status: Optional[str]  # pending, accepted, none
    mutual_connections: int

    class Config:
        from_attributes = True

@router.get("/search")
async def search_users(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search for users to connect with"""
    
    # Search users by username, full name, or email
    search_query = select(User).where(
        and_(
            User.id != current_user.id,  # Exclude current user
            User.is_active == True,
            or_(
                User.username.ilike(f"%{q}%"),
                User.full_name.ilike(f"%{q}%"),
                User.email.ilike(f"%{q}%")
            )
        )
    ).limit(limit)
    
    result = await db.execute(search_query)
    users = result.scalars().all()
    
    # Get connection status for each user
    user_responses = []
    for user in users:
        # Check connection status
        connection_result = await db.execute(
            select(UserConnection.status).where(
                or_(
                    and_(
                        UserConnection.requester_id == current_user.id,
                        UserConnection.receiver_id == user.id
                    ),
                    and_(
                        UserConnection.requester_id == user.id,
                        UserConnection.receiver_id == current_user.id
                    )
                )
            )
        )
        connection_status = connection_result.scalar_one_or_none()
        
        # Count mutual connections (users connected to both)
        mutual_count_result = await db.execute(
            select(func.count()).select_from(
                select(UserConnection.receiver_id).where(
                    and_(
                        UserConnection.requester_id == current_user.id,
                        UserConnection.status == ConnectionStatus.ACCEPTED
                    )
                ).union(
                    select(UserConnection.requester_id).where(
                        and_(
                            UserConnection.receiver_id == current_user.id,
                            UserConnection.status == ConnectionStatus.ACCEPTED
                        )
                    )
                ).intersect(
                    select(UserConnection.receiver_id).where(
                        and_(
                            UserConnection.requester_id == user.id,
                            UserConnection.status == ConnectionStatus.ACCEPTED
                        )
                    ).union(
                        select(UserConnection.requester_id).where(
                            and_(
                                UserConnection.receiver_id == user.id,
                                UserConnection.status == ConnectionStatus.ACCEPTED
                            )
                        )
                    )
                )
            )
        )
        mutual_count = mutual_count_result.scalar() or 0
        
        # Check if user is online (last activity within 5 minutes)
        is_online = user.last_active and (datetime.utcnow() - user.last_active).seconds < 300
        
        user_responses.append(
            UserSearchResponse(
                id=str(user.id),
                username=user.username,
                full_name=user.full_name,
                email=user.email,
                avatar_url=user.avatar_url,
                is_online=is_online,
                connection_status=connection_status.value if connection_status else None,
                mutual_connections=mutual_count
            )
        )
    
    return user_responses

@router.post("/request")
async def send_connection_request(
    connection_request: ConnectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send connection request to another user"""
    
    # Check if receiver exists
    receiver_result = await db.execute(
        select(User).where(User.id == connection_request.receiver_id)
    )
    receiver = receiver_result.scalar_one_or_none()
    
    if not receiver:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    if receiver.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot send connection request to yourself"
        )
    
    # Check if connection already exists
    existing_connection = await db.execute(
        select(UserConnection).where(
            or_(
                and_(
                    UserConnection.requester_id == current_user.id,
                    UserConnection.receiver_id == receiver.id
                ),
                and_(
                    UserConnection.requester_id == receiver.id,
                    UserConnection.receiver_id == current_user.id
                )
            )
        )
    )
    
    if existing_connection.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Connection already exists or request already sent"
        )
    
    # Create connection request
    new_connection = UserConnection(
        requester_id=current_user.id,
        receiver_id=receiver.id,
        message=connection_request.message,
        status=ConnectionStatus.PENDING
    )
    
    db.add(new_connection)
    await db.commit()
    await db.refresh(new_connection)
    
    return {
        "message": f"Connection request sent to {receiver.full_name}",
        "connection_id": str(new_connection.id)
    }

@router.get("/requests")
async def get_connection_requests(
    type: str = Query("received", enum=["sent", "received"]),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get connection requests (sent or received)"""
    
    if type == "sent":
        # Requests sent by current user
        query = (
            select(UserConnection, User.username, User.full_name, User.avatar_url)
            .join(User, UserConnection.receiver_id == User.id)
            .where(
                and_(
                    UserConnection.requester_id == current_user.id,
                    UserConnection.status == ConnectionStatus.PENDING
                )
            )
        )
    else:
        # Requests received by current user
        query = (
            select(UserConnection, User.username, User.full_name, User.avatar_url)
            .join(User, UserConnection.requester_id == User.id)
            .where(
                and_(
                    UserConnection.receiver_id == current_user.id,
                    UserConnection.status == ConnectionStatus.PENDING
                )
            )
        )
    
    query = query.order_by(UserConnection.created_at.desc())
    result = await db.execute(query)
    requests_data = result.all()
    
    requests = []
    for connection, username, full_name, avatar_url in requests_data:
        requests.append({
            "id": str(connection.id),
            "requester_id": str(connection.requester_id),
            "receiver_id": str(connection.receiver_id),
            "other_user": {
                "id": str(connection.receiver_id if type == "sent" else connection.requester_id),
                "username": username,
                "full_name": full_name,
                "avatar_url": avatar_url
            },
            "message": connection.message,
            "created_at": connection.created_at.isoformat(),
            "type": type
        })
    
    return requests

@router.post("/{connection_id}/accept")
async def accept_connection_request(
    connection_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Accept a connection request"""
    
    # Get connection request
    result = await db.execute(
        select(UserConnection).where(
            and_(
                UserConnection.id == connection_id,
                UserConnection.receiver_id == current_user.id,
                UserConnection.status == ConnectionStatus.PENDING
            )
        )
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(
            status_code=404,
            detail="Connection request not found"
        )
    
    # Update connection status
    await db.execute(
        update(UserConnection)
        .where(UserConnection.id == connection_id)
        .values(
            status=ConnectionStatus.ACCEPTED,
            accepted_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    )
    await db.commit()
    
    return {"message": "Connection request accepted"}

@router.post("/{connection_id}/decline")
async def decline_connection_request(
    connection_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Decline a connection request"""
    
    # Get connection request
    result = await db.execute(
        select(UserConnection).where(
            and_(
                UserConnection.id == connection_id,
                UserConnection.receiver_id == current_user.id,
                UserConnection.status == ConnectionStatus.PENDING
            )
        )
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(
            status_code=404,
            detail="Connection request not found"
        )
    
    # Update connection status
    await db.execute(
        update(UserConnection)
        .where(UserConnection.id == connection_id)
        .values(
            status=ConnectionStatus.DECLINED,
            updated_at=datetime.utcnow()
        )
    )
    await db.commit()
    
    return {"message": "Connection request declined"}

@router.get("/friends")
async def get_friends(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get list of connected friends"""
    
    # Get accepted connections where current user is either requester or receiver
    query = (
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
    )
    
    # Join with the other user (not current user)
    query = query.outerjoin(
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
    ).order_by(User.username)
    
    result = await db.execute(query)
    connections_data = result.all()
    
    friends = []
    for connection, username, full_name, avatar_url, last_active in connections_data:
        # Determine friend's user ID
        friend_id = connection.receiver_id if connection.requester_id == current_user.id else connection.requester_id
        
        # Check if online
        is_online = last_active and (datetime.utcnow() - last_active).seconds < 300
        
        friends.append({
            "id": str(friend_id),
            "username": username,
            "full_name": full_name,
            "avatar_url": avatar_url,
            "is_online": is_online,
            "last_active": last_active.isoformat() if last_active else None,
            "connected_at": connection.accepted_at.isoformat() if connection.accepted_at else None
        })
    
    return friends

@router.delete("/{connection_id}")
async def remove_connection(
    connection_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove/unfriend a connection"""
    
    # Get connection
    result = await db.execute(
        select(UserConnection).where(
            and_(
                UserConnection.id == connection_id,
                or_(
                    UserConnection.requester_id == current_user.id,
                    UserConnection.receiver_id == current_user.id
                )
            )
        )
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(
            status_code=404,
            detail="Connection not found"
        )
    
    # Delete connection
    await db.execute(delete(UserConnection).where(UserConnection.id == connection_id))
    await db.commit()
    
    return {"message": "Connection removed"}
