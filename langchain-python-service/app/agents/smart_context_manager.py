"""
Smart Context Manager
Simple but effective context management for AI conversations
"""

import asyncio
import asyncpg
import os
import time
import re
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from loguru import logger
from pydantic import BaseModel

from app.agents.context_manager import Message, ContextNeedType
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
        
        # Simple patterns for standalone detection
        self.standalone_patterns = [
            r"^(xin )?chào", r"bạn là ai", r"hello", r"hi there",
            r"kể.*chuyện cười", r"bắt đầu lại", r"làm mới cuộc trò chuyện"
        ]
        
        logger.info("Smart Context Manager initialized")

    async def init_db(self):
        """Initialize PostgreSQL connection pool"""
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
        """Close database connections"""
        if self.db_pool:
            await self.db_pool.close()

    async def get_or_create_session(self, user_id: str, 
                                  session_id: Optional[str] = None,
                                  topic_id: Optional[str] = None, 
                                  node_id: Optional[str] = None, 
                                  title: Optional[str] = None) -> str:
        """
        Get existing session or create a new one, ensuring topic isolation.
        - If session_id is provided, verify it matches the user and topic.
        - If not, find the latest session for the user/topic combo.
        - If none found, create a new session.
        """
        if not self.db_pool:
            raise RuntimeError("DB pool not initialized")
        
        async with self.db_pool.acquire() as conn:
            # First, try to find an exact match if session_id is provided
            if session_id:
                session = await conn.fetchrow(
                    "SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2 AND topic_id = $3",
                    session_id, user_id, topic_id
                )
                if session:
                    return str(session['id'])

            # If no exact match, find the latest active session for the specific topic/node
            query_base = "SELECT id FROM chat_sessions WHERE user_id = $1 AND is_active = true"
            params = [user_id]
            
            if topic_id:
                query_base += " AND topic_id = $2"
                params.append(topic_id)
                if node_id:
                    query_base += " AND node_id = $3"
                    params.append(node_id)
                else:
                    query_base += " AND node_id IS NULL"
            else:
                # General chat without a specific topic
                query_base += " AND topic_id IS NULL"

            query_base += " ORDER BY last_activity DESC LIMIT 1"
            session = await conn.fetchrow(query_base, *params)
            
            if session:
                return str(session['id'])

            # If still no session found, create a new one
            logger.info(f"No active session for topic {topic_id}. Creating new session for user {user_id}...")
            result = await conn.fetchrow(
                "INSERT INTO chat_sessions (user_id, topic_id, node_id, title) VALUES ($1, $2, $3, $4) RETURNING id",
                user_id, topic_id, node_id, title or "New Chat"
            )
            return str(result['id'])

    async def get_smart_context(self, session_id: str, user_id: str, message: str) -> SmartContextPackage:
        """Get smart context for conversation"""
        start_time = time.time()
        
        # 🐛 DEBUG: Context building start
        logger.debug(f"🔍 [CONTEXT] Building context for session: {session_id[:8]}... user: {user_id[:8]}...")
        logger.debug(f"🔍 [CONTEXT] Message length: {len(message)} chars, preview: {message[:50]}...")
        
        # Check if message is standalone
        if self._is_standalone_message(message):
            logger.info("🎯 [CONTEXT] Standalone message detected - minimal context")
            logger.debug(f"🎯 [CONTEXT] Matched standalone pattern in: {message[:30]}...")
            return SmartContextPackage(
                estimated_tokens=0,
                is_relevant=True,
                relevance_score=1.0
            )
        if not self.db_pool:
            raise RuntimeError("DB pool not initialized")
            
        try:
            async with self.db_pool.acquire() as conn:
                # Get recent messages and session info in parallel
                logger.debug(f"🔍 [CONTEXT] Fetching data from DB for session {session_id[:8]}...")
                recent_task = self._get_recent_messages(session_id, conn)
                session_task = self._get_session_info(session_id, conn)
                recent_messages, session_info = await asyncio.gather(recent_task, session_task)
                
                logger.debug(f"🔍 [CONTEXT] Found {len(recent_messages)} recent messages")
                logger.debug(f"🔍 [CONTEXT] Topic context: {session_info.get('topic_context', 'None')}")
                
                # Build context package
                relevance_score = self._calculate_relevance(message, session_info.get('topic_context'))
                estimated_tokens = self._estimate_tokens(recent_messages, session_info.get('summary'))
                
                logger.debug(f"🔍 [CONTEXT] Relevance score: {relevance_score:.3f}")
                logger.debug(f"🔍 [CONTEXT] Estimated tokens: {estimated_tokens}")
                
                context = SmartContextPackage(
                    recent_messages=self._convert_to_messages(recent_messages),
                    session_summary=session_info.get('summary'),
                    topic_context=session_info.get('topic_context'),
                    user_knowledge_state=session_info.get('user_knowledge_state', {}),
                    estimated_tokens=estimated_tokens,
                    is_relevant=True,
                    relevance_score=relevance_score
                )
                
                # Simple token optimization
                if context.estimated_tokens > self.max_context_tokens:
                    logger.debug(f"⚡ [CONTEXT] Optimizing - tokens exceed limit ({context.estimated_tokens} > {self.max_context_tokens})")
                    original_messages = len(context.recent_messages)
                    context = self._optimize_context(context)
                    logger.debug(f"⚡ [CONTEXT] Optimized: {original_messages} -> {len(context.recent_messages)} messages")
                
                processing_time = time.time() - start_time
                logger.info(f"✅ [CONTEXT] Built in {processing_time:.3f}s - {context.estimated_tokens} tokens, relevance: {context.relevance_score:.3f}")
                
                return context
                
        except Exception as e:
            logger.error(f"Error getting context: {e}")
            return SmartContextPackage(estimated_tokens=0, is_relevant=False)

    async def add_message(self, session_id: str, user_id: str, topic_id: str, 
                         node_id: Optional[str], role: str, content: str, 
                         model_used: Optional[str] = None) -> str:
        """Add message to session"""
        if not self.db_pool:
            raise RuntimeError("DB pool not initialized")
            
        try:
            async with self.db_pool.acquire() as conn:
                message_id = await conn.fetchval("""
                    INSERT INTO learning_chats (session_id, user_id, topic_id, node_id, message, is_ai_response, model_used)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id
                """, session_id, user_id, topic_id, node_id, content, role == "assistant", model_used)
                
                # Update session activity
                await conn.execute(
                    "UPDATE chat_sessions SET last_activity = NOW() WHERE id = $1", 
                    session_id
                )
                
                return str(message_id)
                
        except Exception as e:
            logger.error(f"Error adding message: {e}")
            raise

    def _is_standalone_message(self, message: str) -> bool:
        """Check if message is standalone and doesn't need context"""
        message_lower = message.lower()
        return any(re.search(pattern, message_lower) for pattern in self.standalone_patterns)

    async def _get_recent_messages(self, session_id: str, conn: asyncpg.Connection) -> List[Dict]:
        """Get recent messages from database"""
        rows = await conn.fetch("""
            SELECT * FROM learning_chats 
            WHERE session_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2
        """, session_id, self.recent_messages_limit)
        return list(reversed([dict(row) for row in rows]))

    async def _get_session_info(self, session_id: str, conn: asyncpg.Connection) -> Dict:
        """Get session information including topic context"""
        cache_key = f"session_info:{session_id}"
        cached = await cache_manager.get_json(cache_key)
        if cached:
            return cached
            
        row = await conn.fetchrow("""
            SELECT cs.compressed_summary as summary,
                   cs.user_knowledge_state,
                   lt.title as topic_title, 
                   tn.title as node_title
            FROM chat_sessions cs
            LEFT JOIN learning_topics lt ON cs.topic_id = lt.id
            LEFT JOIN tree_nodes tn ON cs.node_id = tn.id
            WHERE cs.id = $1
        """, session_id)
        
        if not row:
            return {}
            
        info = {
            'summary': row['summary'],
            'user_knowledge_state': dict(row['user_knowledge_state'] or {}),
            'topic_context': f"Topic: {row['topic_title']}, Node: {row['node_title']}" if row['topic_title'] else None
        }
        
        await cache_manager.set_json(cache_key, info, ttl=3600)
        return info

    def _convert_to_messages(self, rows: List[Dict]) -> List[Message]:
        """Convert database rows to Message objects"""
        return [
            Message(
                id=str(r.get('id')),
                role="assistant" if r.get('is_ai_response') else "user",
                content=r.get('message', ''),
                timestamp=r.get('created_at', datetime.now()),
                session_id=str(r.get('session_id')),
                user_id=str(r.get('user_id'))
            )
            for r in rows
        ]

    def _estimate_tokens(self, messages: List[Dict], summary: Optional[str]) -> int:
        """Simple token estimation (4 chars = 1 token)"""
        total = sum(len(msg.get('message', '')) for msg in messages) // 4
        if summary:
            total += len(summary) // 4
        return total

    def _calculate_relevance(self, message: str, topic_context: Optional[str]) -> float:
        """Calculate message relevance to topic context"""
        if not topic_context or not message:
            return 1.0
            
        # Simple keyword matching
        message_words = set(re.findall(r'\b\w{4,}\b', message.lower()))
        context_words = set(re.findall(r'\b\w{4,}\b', topic_context.lower()))
        
        if not message_words or not context_words:
            return 0.5
            
        intersection = len(message_words.intersection(context_words))
        union = len(message_words.union(context_words))
        
        return intersection / union if union > 0 else 0.0

    def _optimize_context(self, context: SmartContextPackage) -> SmartContextPackage:
        """Simple context optimization by truncating messages"""
        if not context.recent_messages:
            return context
            
        # Keep most recent messages that fit in token budget
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