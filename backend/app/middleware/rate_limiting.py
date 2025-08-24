import time
from typing import Dict, Optional
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response
import redis.asyncio as redis
import json
from app.core.config import settings

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.redis_client = None
        
        # Rate limit rules: (requests_per_minute, window_seconds)
        self.rules = {
            '/api/auth/login': (5, 60),      # 5 login attempts per minute
            '/api/auth/register': (3, 300),  # 3 registrations per 5 minutes
            '/api/chat/': (120, 60),         # 120 messages per minute
            '/api/documents/': (60, 60),     # 60 document operations per minute
            'default': (100, 60),            # 100 requests per minute default
        }
    
    async def get_redis(self):
        if not self.redis_client:
            self.redis_client = redis.from_url(settings.REDIS_URL)
        return self.redis_client

    async def get_rate_limit_key(self, request: Request) -> str:
        """Generate rate limit key based on IP and endpoint"""
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        return f"rate_limit:{client_ip}:{path}"

    async def get_rate_limit_rule(self, path: str) -> tuple:
        """Get rate limit rule for specific path"""
        for rule_path, (limit, window) in self.rules.items():
            if path.startswith(rule_path):
                return limit, window
        return self.rules['default']

    async def is_rate_limited(self, key: str, limit: int, window: int) -> tuple:
        """Check if request is rate limited"""
        try:
            redis_client = await self.get_redis()
            current_time = int(time.time())
            window_start = current_time - window
            
            # Use sliding window log
            pipe = redis_client.pipeline()
            
            # Remove old entries
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current requests
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            
            # Set expiration
            pipe.expire(key, window)
            
            results = await pipe.execute()
            current_requests = results[1]
            
            return current_requests >= limit, current_requests
            
        except Exception as e:
            # If Redis is down, allow request but log error
            print(f"Rate limiting error: {e}")
            return False, 0

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip rate limiting for health checks
        if request.url.path in ['/health', '/health/detailed']:
            return await call_next(request)
        
        # Get rate limit rule
        limit, window = await self.get_rate_limit_rule(request.url.path)
        
        # Check rate limit
        key = await self.get_rate_limit_key(request)
        is_limited, current_count = await self.is_rate_limited(key, limit, window)
        
        if is_limited:
            return Response(
                content=json.dumps({
                    "detail": "Rate limit exceeded. Please try again later.",
                    "limit": limit,
                    "window": window,
                    "current": current_count
                }),
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={
                    "Content-Type": "application/json",
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": str(max(0, limit - current_count)),
                    "X-RateLimit-Reset": str(int(time.time()) + window)
                }
            )
        
        # Add rate limit headers to response
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, limit - current_count - 1))
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + window)
        
        return response