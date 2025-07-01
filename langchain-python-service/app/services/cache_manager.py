import redis.asyncio as redis
import os
import json
from typing import Optional, Any
from loguru import logger

class CacheManager:
    """A centralized cache manager using Redis."""
    
    def __init__(self):
        self._redis_pool = None
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

    async def connect(self):
        """Initializes the Redis connection pool."""
        if self._redis_pool:
            return
        try:
            self._redis_pool = redis.from_url(self.redis_url, encoding="utf-8", decode_responses=True)
            # Check connection
            await self._redis_pool.ping()
            logger.info(f"Successfully connected to Redis at {self.redis_url}")
        except Exception as e:
            self._redis_pool = None
            logger.error(f"Failed to connect to Redis: {e}. Caching will be disabled.")

    async def close(self):
        """Closes the Redis connection pool."""
        if self._redis_pool:
            await self._redis_pool.close()
            logger.info("Redis connection pool closed.")

    async def get_json(self, key: str) -> Optional[Any]:
        """Gets a JSON-serializable object from the cache."""
        if not self._redis_pool:
            return None
        try:
            cached_data = await self._redis_pool.get(key)
            if cached_data:
                logger.debug(f"Cache HIT for key: {key}")
                return json.loads(cached_data)
            logger.debug(f"Cache MISS for key: {key}")
            return None
        except Exception as e:
            logger.warning(f"Failed to get key '{key}' from cache: {e}")
            return None

    async def set_json(self, key: str, data: Any, ttl: int = 3600):
        """Sets a JSON-serializable object in the cache with a TTL."""
        if not self._redis_pool:
            return
        try:
            await self._redis_pool.setex(
                key,
                ttl,
                json.dumps(data)
            )
            logger.debug(f"Cached data for key: {key} with TTL: {ttl}s")
        except Exception as e:
            logger.warning(f"Failed to set key '{key}' in cache: {e}")

# Single instance to be used across the application
cache_manager = CacheManager() 