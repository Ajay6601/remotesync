from typing import Dict, List, Set
from fastapi import WebSocket
import json
import asyncio
import redis.asyncio as redis
from datetime import datetime
import uuid

from app.core.config import settings
from app.services.encryption import EncryptionService

class ConnectionManager:
    def __init__(self):
        # workspace_id -> list of websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # websocket -> user_id mapping
        self.connection_users: Dict[WebSocket, str] = {}
        # user_id -> websocket mapping
        self.user_connections: Dict[str, WebSocket] = {}
        # Redis for cross-instance communication
        self.redis = None
        self.encryption_service = EncryptionService()
        
    async def connect(self, websocket: WebSocket, workspace_id: str, user_id: str = None):
        await websocket.accept()
        
        # Initialize Redis connection if not exists
        if not self.redis:
            self.redis = redis.from_url(settings.REDIS_URL)
        
        # Add to workspace connections
        if workspace_id not in self.active_connections:
            self.active_connections[workspace_id] = []
        
        self.active_connections[workspace_id].append(websocket)
        
        if user_id:
            self.connection_users[websocket] = user_id
            self.user_connections[user_id] = websocket
            
            # Broadcast user presence
            await self.broadcast_to_workspace(workspace_id, {
                "type": "user_presence",
                "user_id": user_id,
                "status": "online",
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Store user presence in Redis
            await self.redis.hset(
                f"presence:{workspace_id}",
                user_id,
                json.dumps({
                    "status": "online",
                    "last_seen": datetime.utcnow().isoformat()
                })
            )

    def disconnect(self, websocket: WebSocket, workspace_id: str):
        if workspace_id in self.active_connections:
            if websocket in self.active_connections[workspace_id]:
                self.active_connections[workspace_id].remove(websocket)
        
        # Handle user presence
        user_id = self.connection_users.get(websocket)
        if user_id:
            del self.connection_users[websocket]
            if user_id in self.user_connections:
                del self.user_connections[user_id]
            
            # Broadcast user offline status
            asyncio.create_task(
                self.broadcast_to_workspace(workspace_id, {
                    "type": "user_presence",
                    "user_id": user_id,
                    "status": "offline",
                    "timestamp": datetime.utcnow().isoformat()
                })
            )

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast_to_workspace(self, workspace_id: str, message: dict):
        if workspace_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[workspace_id]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.append(connection)
            
            # Clean up disconnected connections
            for conn in disconnected:
                self.active_connections[workspace_id].remove(conn)

    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_json(message)
                return True
            except:
                # Remove stale connection
                del self.user_connections[user_id]
        return False

    async def handle_message(self, workspace_id: str, message: dict):
        message_type = message.get("type")
        
        if message_type == "chat_message":
            await self.handle_chat_message(workspace_id, message)
        elif message_type == "typing":
            await self.handle_typing(workspace_id, message)
        elif message_type == "document_operation":
            await self.handle_document_operation(workspace_id, message)
        elif message_type == "webrtc_signal":
            await self.handle_webrtc_signal(workspace_id, message)
        elif message_type == "cursor_position":
            await self.handle_cursor_position(workspace_id, message)

    async def handle_chat_message(self, workspace_id: str, message: dict):
        # Store message in database (implement in chat service)
        # For now, broadcast to all workspace members
        
        chat_message = {
            "type": "chat_message",
            "id": str(uuid.uuid4()),
            "channel_id": message.get("channel_id"),
            "user_id": message.get("user_id"),
            "content": message.get("content"),
            "encrypted_content": message.get("encrypted_content"),  # E2E encrypted
            "timestamp": datetime.utcnow().isoformat(),
            "message_type": message.get("message_type", "text")  # text, file, image, etc.
        }
        
        await self.broadcast_to_workspace(workspace_id, chat_message)
        
        # Store in Redis for message history
        await self.redis.lpush(
            f"chat_history:{message.get('channel_id')}",
            json.dumps(chat_message)
        )
        await self.redis.ltrim(f"chat_history:{message.get('channel_id')}", 0, 1000)

    async def handle_typing(self, workspace_id: str, message: dict):
        typing_message = {
            "type": "typing",
            "channel_id": message.get("channel_id"),
            "user_id": message.get("user_id"),
            "is_typing": message.get("is_typing", True),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.broadcast_to_workspace(workspace_id, typing_message)

    async def handle_document_operation(self, workspace_id: str, message: dict):
        # Handle collaborative document editing
        doc_message = {
            "type": "document_operation",
            "document_id": message.get("document_id"),
            "user_id": message.get("user_id"),
            "operation": message.get("operation"),  # insert, delete, format
            "position": message.get("position"),
            "content": message.get("content"),
            "timestamp": datetime.utcnow().isoformat(),
            "version": message.get("version")  # For operational transform
        }
        
        # Apply operation and broadcast to other users
        await self.broadcast_to_workspace(workspace_id, doc_message)
        
        # Store operation in Redis for conflict resolution
        await self.redis.lpush(
            f"doc_operations:{message.get('document_id')}",
            json.dumps(doc_message)
        )

    async def handle_webrtc_signal(self, workspace_id: str, message: dict):
        # Handle WebRTC signaling for video calls
        target_user = message.get("target_user_id")
        
        if target_user:
            webrtc_message = {
                "type": "webrtc_signal",
                "from_user_id": message.get("user_id"),
                "signal_type": message.get("signal_type"),  # offer, answer, ice-candidate
                "signal_data": message.get("signal_data"),
                "call_id": message.get("call_id"),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await self.send_to_user(target_user, webrtc_message)

    async def handle_cursor_position(self, workspace_id: str, message: dict):
        # Handle real-time cursor positions for document editing
        cursor_message = {
            "type": "cursor_position",
            "document_id": message.get("document_id"),
            "user_id": message.get("user_id"),
            "position": message.get("position"),
            "selection": message.get("selection"),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.broadcast_to_workspace(workspace_id, cursor_message)

    async def get_workspace_presence(self, workspace_id: str) -> List[dict]:
        if not self.redis:
            return []
            
        presence_data = await self.redis.hgetall(f"presence:{workspace_id}")
        presence_list = []
        
        for user_id, data in presence_data.items():
            try:
                user_presence = json.loads(data)
                presence_list.append({
                    "user_id": user_id.decode() if isinstance(user_id, bytes) else user_id,
                    **user_presence
                })
            except json.JSONDecodeError:
                continue
                
        return presence_list

    async def disconnect_all(self):
        """Called during application shutdown"""
        for workspace_connections in self.active_connections.values():
            for connection in workspace_connections:
                try:
                    await connection.close()
                except:
                    pass
        
        if self.redis:
            await self.redis.close()

# Global instance
websocket_manager = ConnectionManager()