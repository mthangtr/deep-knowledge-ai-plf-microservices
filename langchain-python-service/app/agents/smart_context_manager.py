"""
Smart Context Manager
Simple but effective context management for AI conversations
"""

import asyncio
import asyncpg
import os
import time
import re
from typing import Dict, List, Optional, Any
from datetime import datetime
from loguru import logger
from pydantic import BaseModel

from app.agents.context_manager import Message
from app.services.cache_manager import cache_manager

class SmartContextPackage(BaseModel):
    """Simplified context package with essential information"""
    recent_messages: List[Message] = []
    session_summary: Optional[str] = None
    topic_context: Optional[str] = None
    user_knowledge_state: Dict[str, Any] = {}
    estimated_tokens: int = 0
    is_relevant: bool = True
    relevance_score: float = 1.0

class SmartContextManager:
    """Simplified, efficient context manager focused on conversation intelligence"""

    def __init__(self):
        self.db_pool: Optional[asyncpg.Pool] = None
        self.recent_messages_limit = 15
        self.max_context_tokens = 1500

        self.standalone_patterns = [
            r"^(xin )?chào", r"bạn là ai", r"hello", r"hi there",
            r"kể.*chuyện cười", r"bắt đầu lại", r"làm mới cuộc trò chuyện"
        ]
        
        logger.info("Smart Context Manager initialized")

    async def init_db(self):
        try:
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                raise ValueError("DATABASE_URL is required")
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)
            
            self.db_pool = await asyncpg.create_pool(
                database_url, 
                min_size=5, 
                max_size=20,
                statement_cache_size=0
            )
            logger.info("Smart Context Manager DB connection ready")
        except Exception as e:
            logger.error(f"Failed to create DB pool: {e}")
            raise

    async def close(self):
        if self.db_pool:
            await self.db_pool.close()

    async def get_or_create_session(self, user_id: str, 
                                  session_id: Optional[str] = None,
                                  topic_id: Optional[str] = None, 
                                  node_id: Optional[str] = None) -> str:
        if not self.db_pool:
            raise RuntimeError("DB pool not initialized")
        
        async with self.db_pool.acquire() as conn:
            # If session_id is provided, verify it exists and belongs to the user.
            if session_id:
                existing_id = await conn.fetchval(
                    "SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2",
                    session_id, user_id
                )
                if existing_id:
                    return str(existing_id)

            # Find the latest session for the user/topic/node combination.
            query = """
                SELECT id FROM chat_sessions 
                WHERE user_id = $1 AND topic_id = $2 AND node_id IS NOT DISTINCT FROM $3
                ORDER BY last_activity DESC 
                LIMIT 1
            """
            session_record = await conn.fetchrow(query, user_id, topic_id, node_id)
            
            if session_record:
                return str(session_record['id'])

            # If no session found, create a new one.
            logger.info(f"No session for topic {topic_id}, node {node_id}. Creating new one for user {user_id}...")
            result = await conn.fetchrow(
                "INSERT INTO chat_sessions (user_id, topic_id, node_id) VALUES ($1, $2, $3) RETURNING id",
                user_id, topic_id, node_id
            )
            return str(result['id'])

    async def get_smart_context(self, session_id: str, user_id: str, message: str) -> SmartContextPackage:
        start_time = time.time()
        
        logger.debug(f"🔍 [CONTEXT] Building context for session: {session_id[:8]}... user: {user_id[:8]}...")
        
        if self._is_standalone_message(message):
            logger.info("🎯 [CONTEXT] Standalone message detected - minimal context")
            return SmartContextPackage(relevance_score=1.0)

        if not self.db_pool:
            raise RuntimeError("DB pool not initialized")
            
        try:
            async with self.db_pool.acquire() as conn:
                recent_task = self._get_recent_messages(session_id, conn)
                session_task = self._get_session_info(session_id, conn)
                recent_messages_rows, session_info = await asyncio.gather(recent_task, session_task)
                
                logger.debug(f"🔍 [CONTEXT] Found {len(recent_messages_rows)} recent messages")
                
                relevance_score = self._calculate_relevance(message, session_info.get('topic_context'))
                
                # Pass user_id to correctly construct Message objects
                converted_messages = self._convert_to_messages(recent_messages_rows, user_id)
                
                estimated_tokens = self._estimate_tokens(converted_messages, session_info.get('summary'))
                
                logger.debug(f"🔍 [CONTEXT] Relevance score: {relevance_score:.3f}, Tokens: {estimated_tokens}")
                
                context = SmartContextPackage(
                    recent_messages=converted_messages,
                    session_summary=session_info.get('summary'),
                    topic_context=session_info.get('topic_context'),
                    estimated_tokens=estimated_tokens,
                    relevance_score=relevance_score
                )
                
                if context.estimated_tokens > self.max_context_tokens:
                    logger.debug(f"⚡ [CONTEXT] Optimizing context: {context.estimated_tokens} > {self.max_context_tokens}")
                    context = self._optimize_context(context)
                
                processing_time = time.time() - start_time
                logger.info(f"✅ [CONTEXT] Built in {processing_time:.3f}s - {context.estimated_tokens} tokens, relevance: {context.relevance_score:.3f}")
                
                return context
                
        except Exception as e:
            logger.error(f"Error getting context: {e}")
            return SmartContextPackage(is_relevant=False)

    def _is_standalone_message(self, message: str) -> bool:
        message_lower = message.lower()
        return any(re.search(pattern, message_lower) for pattern in self.standalone_patterns)

    async def _get_recent_messages(self, session_id: str, conn: asyncpg.Connection) -> List[Dict]:
        rows = await conn.fetch("""
            SELECT role, content, created_at, id
            FROM chat_messages 
            WHERE session_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2
        """, session_id, self.recent_messages_limit)
        return list(reversed([dict(row) for row in rows]))

    async def _get_session_info(self, session_id: str, conn: asyncpg.Connection) -> Dict:
        cache_key = f"session_info_v2:{session_id}"
        cached = await cache_manager.get_json(cache_key)
        if cached:
            return cached
            
        row = await conn.fetchrow("""
            SELECT lt.title as topic_title, 
                   tn.title as node_title
            FROM chat_sessions cs
            LEFT JOIN learning_topics lt ON cs.topic_id = lt.id
            LEFT JOIN tree_nodes tn ON cs.node_id = tn.id
            WHERE cs.id = $1
        """, session_id)
        
        if not row:
            return {}
            
        topic_context = None
        if row['topic_title']:
            topic_context = f"Topic: {row['topic_title']}"
            if row['node_title']:
                topic_context += f", Node: {row['node_title']}"
        
        info = {'topic_context': topic_context, 'summary': None}
        
        await cache_manager.set_json(cache_key, info, ttl=3600)
        return info

    def _convert_to_messages(self, rows: List[Dict], user_id: str) -> List[Message]:
        return [
            Message(
                id=str(r['id']),
                role=r['role'],
                content=r['content'],
                timestamp=r['created_at'],
                session_id=str(r.get('session_id')), # session_id is not in the select, but it should be passed
                user_id=user_id # User ID is consistent for the whole session
            )
            for r in rows
        ]

    def _estimate_tokens(self, messages: List[Message], summary: Optional[str]) -> int:
        total = sum(len(msg.content) for msg in messages) // 4
        if summary:
            total += len(summary) // 4
        return total

    def _calculate_relevance(self, message: str, topic_context: Optional[str]) -> float:
        if not topic_context or not message:
            return 1.0
            
        message_words = set(re.findall(r'\b\w{4,}\b', message.lower()))
        context_words = set(re.findall(r'\b\w{4,}\b', topic_context.lower()))
        
        if not message_words or not context_words:
            return 0.5
            
        intersection = len(message_words.intersection(context_words))
        union = len(message_words.union(context_words))
        
        return intersection / union if union > 0 else 0.0

    def _optimize_context(self, context: SmartContextPackage) -> SmartContextPackage:
        if not context.recent_messages:
            return context
            
        optimized_messages = []
        current_tokens = 0
        
        for message in reversed(context.recent_messages):
            message_tokens = len(message.content) // 4
            if current_tokens + message_tokens <= self.max_context_tokens:
                optimized_messages.insert(0, message)
                current_tokens += message_tokens
            else:
                break
                
        context.recent_messages = optimized_messages
        context.estimated_tokens = current_tokens
        
        logger.debug(f"Context optimized to {len(optimized_messages)} messages, {current_tokens} tokens")
        return context 