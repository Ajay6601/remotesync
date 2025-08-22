from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from contextlib import asynccontextmanager
from datetime import datetime

from app.core.config import settings
from app.core.database import init_db
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.workspaces import router as workspaces_router
from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.tasks import router as tasks_router
from app.websocket.manager import websocket_manager
from app.api.files import router as files_router
from app.api.search import router as search_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    await websocket_manager.disconnect_all()

app = FastAPI(
    title="RemoteSync API",
    description="Unified team collaboration platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(workspaces_router, prefix="/api/workspaces", tags=["workspaces"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
app.include_router(documents_router, prefix="/api/documents", tags=["documents"])
app.include_router(tasks_router, prefix="/api/tasks", tags=["tasks"])
app.include_router(files_router, prefix="/api/files", tags=["files"])
app.include_router(search_router, prefix="/api/search", tags=["search"])

# WebSocket endpoint - FIXED
@app.websocket("/ws/{workspace_id}")
async def websocket_endpoint(websocket: WebSocket, workspace_id: str):
    # Extract user from token in query params or headers
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="No token provided")
        return
    
    # Verify token and get user
    from app.core.security import verify_token
    from app.core.database import AsyncSessionLocal
    from app.models.user import User
    from sqlalchemy import select
    
    user_id = verify_token(token, "access")
    if not user_id:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            await websocket.close(code=1008, reason="User not found")
            return
    
    await websocket_manager.connect(websocket, workspace_id, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            await websocket_manager.handle_message(workspace_id, data)
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, workspace_id)

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    return {"message": "RemoteSync API", "version": "1.0.0"}
