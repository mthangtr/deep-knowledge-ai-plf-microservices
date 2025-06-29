import asyncio
import asyncpg
import os
from typing import Dict, List, Optional, Any
from datetime import datetime
from loguru import logger
import openai
from openai import AsyncOpenAI

from app.agents.router_agent import RouterAgent, ContextNeed, ContextNeedType
from app.agents.context_manager import Message, ContextPackage, SessionSummary

class DatabaseContextManager:
    """PostgreSQL-based context manager với vector search - giống ChatGPT/Gemini"""
    
    def __init__(self):
        self.router_agent = RouterAgent()
        self.db_pool: Optional[asyncpg.Pool] = None
        self.openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        logger.info("Database Context Manager initialized")
    
    async def init_db(self):
        """Initialize PostgreSQL connection pool"""
        try:
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                raise ValueError("DATABASE_URL environment variable is required")
            
            # Convert DATABASE_URL format if needed
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)
            
            self.db_pool = await asyncpg.create_pool(
                database_url,
                min_size=5,
                max_size=20,
                command_timeout=60
            )
            logger.info("PostgreSQL connection pool created")
        except Exception as e:
            logger.error(f"Failed to create DB pool: {e}")
            raise
    
    async def close(self):
        """Close database connections"""
        if self.db_pool:
            await self.db_pool.close()
    
    async def get_or_create_session(
        self,
        user_id: str,
        topic_id: Optional[str] = None,
        node_id: Optional[str] = None,
        title: Optional[str] = None
    ) -> str:
        """Get existing session or create new one"""
        async with self.db_pool.acquire() as conn:
            # Try to find active session
            session = await conn.fetchrow("""
                SELECT id FROM chat_sessions
                WHERE user_id = $1 
                AND ($2::UUID IS NULL OR topic_id = $2)
                AND ($3::UUID IS NULL OR node_id = $3)
                AND is_active = true
                ORDER BY last_activity DESC
                LIMIT 1
            """, user_id, topic_id, node_id)
            
            if session:
                return str(session['id'])
            
            # Create new session
            result = await conn.fetchrow("""
                INSERT INTO chat_sessions (user_id, topic_id, node_id, title)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            """, user_id, topic_id, node_id, title or "New Chat Session")
            
            return str(result['id'])
    
    async def get_context_for_message(
        self,
        session_id: str,
        user_id: str,
        message: str
    ) -> ContextPackage:
        """Get smart context based on router decision"""
        try:
            # Get recent messages from DB
            recent_messages = await self._get_recent_messages_db(session_id, 10)
            
            # Convert to dict for router
            recent_dict = [
                {
                    "role": "user" if not msg['is_ai_response'] else "assistant",
                    "content": msg['message'],
                    "timestamp": msg['created_at'].isoformat()
                }
                for msg in recent_messages
            ]
            
            # Router decides context need
            context_need = await self.router_agent.analyze_context_need(
                message, recent_dict
            )
            
            logger.info(f"Router decision: {context_need.type} - {context_need.reason}")
            
            # Build context package
            context_package = ContextPackage(
                recent=self._convert_to_messages(recent_messages),
                context_type=context_need.type
            )
            
            if context_need.type == ContextNeedType.SMART_RETRIEVAL:
                # Real vector search
                relevant_messages = await self._vector_search_db(
                    user_id, message, context_need.keywords
                )
                context_package.relevant = self._convert_to_messages(relevant_messages)
                
            elif context_need.type == ContextNeedType.FULL_CONTEXT:
                # Get session summary
                summary = await self._get_session_summary_db(session_id)
                if summary:
                    context_package.summary = summary
                
                # Get more historical messages
                historical = await self._get_recent_messages_db(session_id, 50)
                context_package.historical = self._convert_to_messages(historical)
            
            # Estimate tokens
            context_package.total_tokens_estimate = self._estimate_tokens(context_package)
            
            return context_package
            
        except Exception as e:
            logger.error(f"Error getting context: {e}")
            # Fallback to recent only
            recent = await self._get_recent_messages_db(session_id, 5)
            return ContextPackage(
                recent=self._convert_to_messages(recent),
                context_type=ContextNeedType.RECENT_ONLY
            )
    
    async def add_message(
        self,
        session_id: str,
        user_id: str,
        role: str,
        content: str,
        model_used: Optional[str] = None,
        tokens_used: int = 0
    ) -> str:
        """Add message to database with embedding"""
        try:
            # Generate embedding
            embedding = await self._generate_embedding(content)
            
            async with self.db_pool.acquire() as conn:
                # Add message
                result = await conn.fetchrow("""
                    INSERT INTO learning_chats 
                    (session_id, user_id, topic_id, node_id, message, is_ai_response, 
                     embedding, model_used, tokens_used, context_type)
                    SELECT 
                        $1, $2, cs.topic_id, cs.node_id, $3, $4,
                        $5::vector, $6, $7, $8
                    FROM chat_sessions cs
                    WHERE cs.id = $1
                    RETURNING id
                """, session_id, user_id, content, role == "assistant",
                    embedding, model_used, tokens_used, "recent")
                
                # Auto-compress if needed
                await self._check_and_compress_session(session_id)
                
                return str(result['id'])
                
        except Exception as e:
            logger.error(f"Error adding message: {e}")
            raise
    
    async def _get_recent_messages_db(self, session_id: str, limit: int = 10) -> List[Dict]:
        """Get recent messages from database"""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, message, is_ai_response, created_at, tokens_used
                FROM learning_chats
                WHERE session_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            """, session_id, limit)
            
            # Return in chronological order
            return list(reversed([dict(row) for row in rows]))
    
    async def _get_session_summary_db(self, session_id: str) -> Optional[str]:
        """Get session summary from database"""
        async with self.db_pool.acquire() as conn:
            result = await conn.fetchrow("""
                SELECT compressed_summary 
                FROM chat_sessions
                WHERE id = $1
            """, session_id)
            
            return result['compressed_summary'] if result else None
    
    async def _vector_search_db(
        self, 
        user_id: str, 
        query: str,
        keywords: List[str]
    ) -> List[Dict]:
        """Real vector search with PostgreSQL pgvector"""
        try:
            # Generate embedding for query
            query_text = f"{query} {' '.join(keywords)}"
            query_embedding = await self._generate_embedding(query_text)
            
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT * FROM search_user_knowledge(
                        $1::vector, $2, NULL, NULL, 0.75, 10
                    )
                """, query_embedding, user_id)
                
                return [dict(row) for row in rows]
                
        except Exception as e:
            logger.error(f"Vector search error: {e}")
            return []
    
    async def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using OpenAI"""
        try:
            response = await self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding generation error: {e}")
            # Return zero vector as fallback
            return [0.0] * 1536
    
    async def _check_and_compress_session(self, session_id: str):
        """Check and compress session if too many messages"""
        async with self.db_pool.acquire() as conn:
            # Get message count
            result = await conn.fetchrow("""
                SELECT COUNT(*) as count
                FROM learning_chats
                WHERE session_id = $1
            """, session_id)
            
            if result['count'] > 100:
                # Call compression function
                await conn.execute("""
                    SELECT compress_chat_session($1)
                """, session_id)
                logger.info(f"Compressed session {session_id}")
    
    def _convert_to_messages(self, rows: List[Dict]) -> List[Message]:
        """Convert database rows to Message objects"""
        messages = []
        for row in rows:
            messages.append(Message(
                id=str(row.get('id', '')),
                role="assistant" if row.get('is_ai_response') else "user",
                content=row.get('message', ''),
                timestamp=row.get('created_at', datetime.now()),
                session_id=str(row.get('session_id', '')),
                user_id=str(row.get('user_id', ''))
            ))
        return messages
    
    def _estimate_tokens(self, context_package: ContextPackage) -> int:
        """Estimate tokens (same as original)"""
        total = 0
        
        for msg in context_package.recent:
            total += len(msg.content) // 4
        
        if context_package.summary:
            total += len(context_package.summary) // 4
        
        for msg in context_package.relevant:
            total += len(msg.content) // 4
        
        for msg in context_package.historical:
            total += len(msg.content) // 4
        
        return total
    
    async def get_session_stats(self, session_id: str) -> Dict[str, Any]:
        """Get session statistics from database"""
        try:
            async with self.db_pool.acquire() as conn:
                # Check if session exists
                session = await conn.fetchrow("""
                    SELECT * FROM chat_sessions WHERE id = $1
                """, session_id)
                
                if not session:
                    return {"exists": False}
                
                # Get detailed stats
                stats = await conn.fetchrow("""
                    SELECT * FROM get_session_stats($1)
                """, session_id)
                
                return {
                    "exists": True,
                    "session_id": session_id,
                    "title": session['title'],
                    "message_count": stats['message_count'],
                    "user_message_count": stats['user_message_count'],
                    "ai_message_count": stats['ai_message_count'],
                    "total_tokens": stats['total_tokens'],
                    "first_message_at": stats['first_message_at'],
                    "last_message_at": stats['last_message_at'],
                    "avg_message_length": stats['avg_message_length'],
                    "is_active": session['is_active'],
                    "has_summary": bool(session['compressed_summary'])
                }
        except Exception as e:
            logger.error(f"Error getting session stats: {e}")
            return {"exists": False, "error": str(e)} 