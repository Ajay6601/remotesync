from typing import List, Dict, Any
import asyncio
from datetime import datetime
import redis.asyncio as redis
from app.core.config import settings
from app.websocket.manager import websocket_manager

class NotificationService:
    def __init__(self):
        self.redis = None

    async def get_redis(self):
        if not self.redis:
            self.redis = redis.from_url(settings.REDIS_URL)
        return self.redis

    async def send_notification(
        self, 
        user_ids: List[str], 
        notification_type: str,
        title: str,
        message: str,
        data: Dict[str, Any] = None
    ):
        """Send notification to multiple users"""
        
        notification = {
            "type": "notification",
            "notification_type": notification_type,
            "title": title,
            "message": message,
            "data": data or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send via WebSocket to online users
        for user_id in user_ids:
            await websocket_manager.send_to_user(user_id, notification)
        
        # Store in Redis for offline users
        redis_client = await self.get_redis()
        for user_id in user_ids:
            await redis_client.lpush(
                f"notifications:{user_id}",
                json.dumps(notification)
            )
            # Keep only last 100 notifications
            await redis_client.ltrim(f"notifications:{user_id}", 0, 99)

    async def get_user_notifications(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get notifications for a user"""
        redis_client = await self.get_redis()
        
        notifications = await redis_client.lrange(
            f"notifications:{user_id}", 
            0, 
            limit - 1
        )
        
        return [json.loads(notif) for notif in notifications]

    async def mark_notification_read(self, user_id: str, notification_id: str):
        """Mark a notification as read"""
        # Implementation depends on how you want to track read status
        redis_client = await self.get_redis()
        await redis_client.sadd(f"read_notifications:{user_id}", notification_id)

notification_service = NotificationService()