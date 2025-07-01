import asyncio
import asyncpg
import os
import time
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from loguru import logger
import openai
from openai import AsyncOpenAI

from app.agents.context_manager import Message, ContextPackage, SessionSummary, ContextNeedType
from app.agents.content_compressor import ContentCompressor, ContentType
from app.agents.context_quality_analyzer import ContextQualityAnalyzer, ContextMetrics
from app.agents.performance_monitor import PerformanceMonitor

class DatabaseContextManager:
    """PostgreSQL-based context manager with smart single context optimization"""
    
    def __init__(self):
        self.content_compressor = ContentCompressor()
        self.quality_analyzer = ContextQualityAnalyzer()
        self.performance_monitor = PerformanceMonitor()
        self.db_pool: Optional[asyncpg.Pool] = None
        self.openai_client = None
        # Smart context configuration
        self.max_context_tokens = 2000
        self.recent_messages_limit = 20
        # Progressive loading thresholds (simplified)
        self.progressive_thresholds = {
            'standard': 1200,
            'full': 2000
        }
        logger.info("Database Context Manager initialized with a simplified, more robust context strategy.")
    
    async def init_db(self):
        """Initialize PostgreSQL connection pool and start monitoring"""
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
                command_timeout=60,
                statement_cache_size=0  # Disable prepared statements for pgbouncer compatibility
            )
            
            # Start performance monitoring
            await self.performance_monitor.start_monitoring()
            
            logger.info("PostgreSQL connection pool created and performance monitoring started")
        except Exception as e:
            logger.error(f"Failed to create DB pool: {e}")
            raise
    
    async def close(self):
        """Close database connections and stop monitoring"""
        if self.db_pool:
            await self.db_pool.close()
        
        # Stop performance monitoring
        await self.performance_monitor.stop_monitoring()
    
    async def get_or_create_session(
        self,
        user_id: str,
        topic_id: Optional[str] = None,
        node_id: Optional[str] = None,
        title: Optional[str] = None
    ) -> str:
        """Get existing session or create new one - FIXED: Proper topic/node isolation"""
        if not self.db_pool:
            raise RuntimeError("Database pool not initialized. Call init_db() first.")
            
        async with self.db_pool.acquire() as conn:
            # FIXED: Strict matching for topic_id and node_id to prevent context bleed
            if topic_id and node_id:
                # Node-level session: Both topic_id and node_id must match exactly
                session = await conn.fetchrow("""
                    SELECT id FROM chat_sessions
                    WHERE user_id = $1 
                    AND topic_id = $2
                    AND node_id = $3
                    AND is_active = true
                    ORDER BY last_activity DESC
                    LIMIT 1
                """, user_id, topic_id, node_id)
            elif topic_id and not node_id:
                # Topic-level session: topic_id must match, node_id must be NULL
                session = await conn.fetchrow("""
                    SELECT id FROM chat_sessions
                    WHERE user_id = $1 
                    AND topic_id = $2
                    AND node_id IS NULL
                    AND is_active = true
                    ORDER BY last_activity DESC
                    LIMIT 1
                """, user_id, topic_id)
            else:
                # General session: both must be NULL
                session = await conn.fetchrow("""
                    SELECT id FROM chat_sessions
                    WHERE user_id = $1 
                    AND topic_id IS NULL
                    AND node_id IS NULL
                    AND is_active = true
                    ORDER BY last_activity DESC
                    LIMIT 1
                """, user_id)
            
            if session:
                logger.info(f"Found existing session: {session['id']} for topic:{topic_id}, node:{node_id}")
                return str(session['id'])
            
            # Create new session with proper isolation
            result = await conn.fetchrow("""
                INSERT INTO chat_sessions (user_id, topic_id, node_id, title)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            """, user_id, topic_id, node_id, title or f"Chat - {topic_id or 'General'}")
            
            logger.info(f"Created new session: {result['id']} for topic:{topic_id}, node:{node_id}")
            return str(result['id'])
    
    async def get_context_for_message(
        self,
        session_id: str,
        user_id: str,
        message: str
    ) -> Tuple[ContextPackage, ContextMetrics]:
        """Get smart context with a simplified, more robust strategy."""
        context_start_time = time.time()
        
        try:
            # SIMPLIFIED LOGIC: Always fetch a good amount of context.
            # No more router agent, which can be unreliable.
            
            # 1. Get a solid base of recent messages and any existing summary.
            recent_messages_task = self._get_recent_messages_db(session_id, self.recent_messages_limit)
            summary_task = self._get_session_summary_db(session_id)
            
            recent_messages_db, summary = await asyncio.gather(recent_messages_task, summary_task)

            # 2. Build the context package directly.
            converted_messages = self._convert_to_messages(recent_messages_db)
            
            context_package = ContextPackage(
                recent=converted_messages,
                summary=summary,
                relevant=[],
                historical=[],
                context_type=ContextNeedType.FULL_CONTEXT
            )

            # Estimate tokens
            context_package.total_tokens_estimate = self._estimate_tokens(context_package)
            
            logger.info(f"Built full context directly for session {session_id}. "
                        f"Found {len(context_package.recent)} recent messages "
                        f"and summary: {bool(context_package.summary)}. "
                        f"Estimated tokens: {context_package.total_tokens_estimate}")

            # Calculate context processing time
            context_processing_time = time.time() - context_start_time
            
            # 3. Analyze context quality (this is still useful).
            quality_metrics = await self.quality_analyzer.analyze_context_quality(
                context_package=context_package,
                user_message=message,
                processing_time=context_processing_time,
                session_id=session_id
            )
            
            logger.info(f"Context quality: {quality_metrics.quality_level.value} "
                       f"({quality_metrics.overall_quality:.2f}) - "
                       f"Tokens: {quality_metrics.token_usage}")
            
            return context_package, quality_metrics
            
        except Exception as e:
            logger.error(f"Error getting context: {e}")
            # Fallback to minimal context on error
            context_package = await self._build_minimal_context(session_id)
            
            # Create default quality metrics for error case
            from app.agents.context_quality_analyzer import QualityScore
            quality_metrics = ContextMetrics(
                relevance_score=0.3,
                completeness_score=0.3,
                efficiency_score=0.5,
                coherence_score=0.5,
                freshness_score=0.5,
                overall_quality=0.4,
                quality_level=QualityScore.POOR,
                processing_time=time.time() - context_start_time,
                token_usage=context_package.total_tokens_estimate,
                compression_ratio=0.5,
                context_type=context_package.context_type,
                message_count=0,
                session_length=0,
                timestamp=datetime.now()
            )
            
            return context_package, quality_metrics
    
    async def _build_minimal_context(self, session_id: str) -> ContextPackage:
        """Build minimal context - no history needed"""
        return ContextPackage(
            recent=[],
            context_type=ContextNeedType.NONE,
            total_tokens_estimate=0
        )
    
    async def _build_standard_context(
        self, 
        session_id: str, 
        recent_messages: List[Dict]
    ) -> ContextPackage:
        """Build standard context with recent messages only"""
        
        # Convert messages
        messages = self._convert_to_messages(recent_messages)
        
        # Create package
        context_package = ContextPackage(
            recent=messages,
            context_type=ContextNeedType.RECENT_ONLY
        )
        
        # Apply budget (use 'standard' threshold)
        if self._estimate_tokens(context_package) > self.progressive_thresholds['standard']:
            context_package = await self._optimize_recent_context(context_package)
        
        context_package.total_tokens_estimate = self._estimate_tokens(context_package)
        logger.info(f"Standard context built: {len(messages)} messages, "
                   f"{context_package.total_tokens_estimate} tokens")
        
        return context_package
    
    async def _build_extended_context(
        self, 
        session_id: str,
        recent_messages: List[Dict]
    ) -> ContextPackage:
        """Build extended context with more history"""
        
        # Get more messages if needed
        if len(recent_messages) < 15:
            recent_messages = await self._get_recent_messages_db(session_id, 15)
        
        messages = self._convert_to_messages(recent_messages)
        
        context_package = ContextPackage(
            recent=messages,
            context_type=ContextNeedType.RECENT_ONLY
        )
        
        # Apply extended budget
        if self._estimate_tokens(context_package) > self.progressive_thresholds['standard']:
            context_package = await self._apply_token_budget(context_package)
        
        context_package.total_tokens_estimate = self._estimate_tokens(context_package)
        logger.info(f"Extended context built: {len(messages)} messages, "
                   f"{context_package.total_tokens_estimate} tokens")
        
        return context_package
    
    async def _build_retrieval_context(
        self,
        session_id: str,
        user_id: str,
        message: str,
        keywords: List[str],
        recent_messages: List[Dict],
        deep_search: bool = True
    ) -> ContextPackage:
        """Build context with smart retrieval"""
        
        # Start with recent messages
        recent = self._convert_to_messages(recent_messages[:5])  # Less recent for retrieval
        
        context_package = ContextPackage(
            recent=recent,
            context_type=ContextNeedType.SMART_RETRIEVAL
        )
        
        # Only search if we have sufficient history
        if len(recent_messages) > 3:
            # Search depth based on confidence
            search_limit = 12 if deep_search else 6
            
            relevant_messages = await self._keyword_search_db(
                user_id, message, keywords, session_id
            )
            
            # Limit results based on search depth
            relevant_messages = relevant_messages[:search_limit]
            context_package.relevant = self._convert_to_messages(relevant_messages)
            
            logger.info(f"Retrieved {len(relevant_messages)} relevant messages "
                       f"(deep_search={deep_search})")
        
        # Apply token budget
        target_tokens = self.progressive_thresholds['full']
        if self._estimate_tokens(context_package) > target_tokens:
            context_package = await self._optimize_retrieval_context(context_package, target_tokens)
        
        context_package.total_tokens_estimate = self._estimate_tokens(context_package)
        return context_package
    
    async def _build_full_context(
        self,
        session_id: str,
        recent_messages: List[Dict]
    ) -> ContextPackage:
        """Build full context with everything available"""
        
        # Get session summary
        summary = await self._get_session_summary_db(session_id)
        
        # Get historical messages (limited)
        historical = await self._get_recent_messages_db(session_id, 40)
        
        context_package = ContextPackage(
            recent=self._convert_to_messages(recent_messages),
            summary=summary,
            historical=self._convert_to_messages(historical),
            context_type=ContextNeedType.FULL_CONTEXT
        )
        
        # Apply full budget strictly
        if self._estimate_tokens(context_package) > self.progressive_thresholds['full']:
            context_package = await self._apply_token_budget(context_package)
        
        context_package.total_tokens_estimate = self._estimate_tokens(context_package)
        logger.info(f"Full context built: {context_package.total_tokens_estimate} tokens")
        
        return context_package
    
    async def _optimize_retrieval_context(
        self, 
        context_package: ContextPackage,
        target_tokens: int
    ) -> ContextPackage:
        """Optimize retrieval context to fit token budget"""
        
        # Calculate current usage
        recent_tokens = sum(len(msg.content) // 4 for msg in context_package.recent)
        relevant_tokens = sum(len(msg.content) // 4 for msg in context_package.relevant)
        
        if recent_tokens + relevant_tokens <= target_tokens:
            return context_package
        
        # Allocate budget: 40% recent, 60% relevant for retrieval
        recent_budget = int(target_tokens * 0.4)
        relevant_budget = int(target_tokens * 0.6)
        
        # Optimize recent
        if recent_tokens > recent_budget:
            optimized_recent = []
            current = 0
            for msg in reversed(context_package.recent):
                msg_tokens = len(msg.content) // 4
                if current + msg_tokens <= recent_budget:
                    optimized_recent.insert(0, msg)
                    current += msg_tokens
            context_package.recent = optimized_recent
        
        # Optimize relevant (keep most relevant)
        if relevant_tokens > relevant_budget:
            optimized_relevant = []
            current = 0
            for msg in context_package.relevant:
                msg_tokens = len(msg.content) // 4
                if current + msg_tokens <= relevant_budget:
                    optimized_relevant.append(msg)
                    current += msg_tokens
                elif current < relevant_budget * 0.8:
                    # Compress last message to fit
                    remaining = relevant_budget - current
                    compressed = await self._compress_message_content(msg.content, remaining)
                    compressed_msg = Message(
                        id=msg.id, role=msg.role, content=compressed,
                        timestamp=msg.timestamp, session_id=msg.session_id,
                        user_id=msg.user_id
                    )
                    optimized_relevant.append(compressed_msg)
                    break
            context_package.relevant = optimized_relevant
        
        return context_package
    
    async def add_message(
        self,
        session_id: str,
        user_id: str,
        role: str,
        content: str,
        model_used: Optional[str] = None,
        tokens_used: int = 0
    ) -> str:
        """Add message to database with smart context management (no dual context)"""
        try:
            # Generate embedding (disabled for cost efficiency)
            embedding = await self._generate_embedding(content)
            
            if not self.db_pool:
                raise RuntimeError("Database pool not initialized. Call init_db() first.")
                
            async with self.db_pool.acquire() as conn:
                # Convert embedding list to PostgreSQL vector format
                embedding_str = f"[{','.join(map(str, embedding))}]" if embedding else None
                
                # SIMPLIFIED: Add message without dual context complexity
                result = await conn.fetchrow("""
                    INSERT INTO learning_chats 
                    (session_id, user_id, topic_id, node_id, message, is_ai_response, 
                     embedding, model_used, tokens_used, context_type)
                    SELECT 
                        $1, $2, cs.topic_id, cs.node_id, $3, $4,
                        $5::vector, $6, $7, 'recent'
                    FROM chat_sessions cs
                    WHERE cs.id = $1
                    RETURNING id
                """, session_id, user_id, content, role == "assistant",
                    embedding_str, model_used, tokens_used)
                
                # Update session activity
                await conn.execute("""
                    UPDATE chat_sessions 
                    SET last_activity = NOW(), 
                        message_count = message_count + 1
                    WHERE id = $1
                """, session_id)
                
                # Smart compression check based on token usage, not message count
                await self._smart_compression_check(session_id)
                
                return str(result['id'])
                
        except Exception as e:
            logger.error(f"Error adding message: {e}")
            raise
    
    async def _smart_compression_check(self, session_id: str):
        """Smart compression based on actual token usage instead of message count"""
        if not self.db_pool:
            return
        
        try:
            async with self.db_pool.acquire() as conn:
                # Check total token usage and content size
                result = await conn.fetchrow("""
                    SELECT 
                        COUNT(*) as message_count,
                        SUM(LENGTH(message)) as total_chars,
                        SUM(COALESCE(tokens_used, 0)) as total_tokens,
                        MIN(created_at) as first_message,
                        MAX(created_at) as last_message
                    FROM learning_chats
                    WHERE session_id = $1
                """, session_id)
                
                if not result:
                    return
                
                # Estimate total context tokens (chars / 4 is rough token estimation)
                estimated_context_tokens = result['total_chars'] // 4
                
                # Compress if context exceeds reasonable limits
                should_compress = (
                    estimated_context_tokens > self.max_context_tokens * 3 or  # 3x our normal budget
                    result['message_count'] > 80  # Hard limit on message count
                )
                
                if should_compress:
                    await self._compress_session_smart(session_id)
                    logger.info(f"Smart compressed session {session_id} - "
                              f"messages: {result['message_count']}, "
                              f"estimated_tokens: {estimated_context_tokens}")
                
        except Exception as e:
            logger.error(f"Error in smart compression check: {e}")
    
    async def _compress_session_smart(self, session_id: str):
        """Smart session compression - keep recent, summarize old"""
        if not self.db_pool:
            return
            
        try:
            async with self.db_pool.acquire() as conn:
                # Keep recent 20 messages, compress older ones
                await conn.execute("""
                    UPDATE learning_chats 
                    SET context_type = 'compressed'
                    WHERE session_id = $1 
                    AND id NOT IN (
                        SELECT id FROM learning_chats 
                        WHERE session_id = $1 
                        ORDER BY created_at DESC 
                        LIMIT 20
                    )
                """, session_id)
                
                # Generate session summary from older messages
                older_messages = await conn.fetch("""
                    SELECT message, is_ai_response, created_at
                    FROM learning_chats
                    WHERE session_id = $1 AND context_type = 'compressed'
                    ORDER BY created_at ASC
                """, session_id)
                
                if older_messages:
                    summary = await self._generate_session_summary(older_messages)
                    
                    # Update session with summary
                    await conn.execute("""
                        UPDATE chat_sessions 
                        SET compressed_summary = $2,
                            summary_updated_at = NOW()
                        WHERE id = $1
                    """, session_id, summary)
                    
                logger.info(f"Session {session_id} compressed: {len(older_messages)} messages summarized")
                
        except Exception as e:
            logger.error(f"Error in smart session compression: {e}")
    
    async def _generate_session_summary(self, messages: List[Dict]) -> str:
        """Generate a concise summary from conversation messages"""
        try:
            if not messages:
                return ""
            
            # Simple rule-based summarization for now
            # TODO: Use LLM for better summarization if needed
            
            topics = set()
            key_exchanges = []
            
            for msg in messages:
                content = msg['message']
                
                # Extract potential topics (words longer than 5 chars)
                words = content.split()
                for word in words:
                    if len(word) > 5 and word.isalpha():
                        topics.add(word.lower())
                
                # Keep shorter messages that might be key points
                if not msg['is_ai_response'] and len(content) < 200:
                    key_exchanges.append(content)
            
            # Build summary
            summary_parts = []
            
            if topics:
                topic_list = list(topics)[:8]  # Max 8 topics
                summary_parts.append(f"Chủ đề thảo luận: {', '.join(topic_list)}")
            
            if key_exchanges:
                summary_parts.append(f"Các câu hỏi chính: {'; '.join(key_exchanges[:3])}")
            
            summary_parts.append(f"Tổng cộng {len(messages)} tin nhắn")
            
            return ". ".join(summary_parts)
            
        except Exception as e:
            logger.error(f"Error generating session summary: {e}")
            return f"Cuộc hội thoại với {len(messages)} tin nhắn"
    
    async def _get_recent_messages_db(self, session_id: str, limit: int = 10) -> List[Dict]:
        """Get recent messages from database"""
        if not self.db_pool:
            return []
            
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
        if not self.db_pool:
            return None
            
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
        """Keyword-based search instead of vector search"""
        try:
            if not self.db_pool:
                return []
                
            # Use simple keyword search instead of vector search
            async with self.db_pool.acquire() as conn:
                # Simple text search fallback
                search_terms = [query] + keywords
                search_query = ' | '.join(search_terms)  # OR search
                
                rows = await conn.fetch("""
                    SELECT id, message, is_ai_response, created_at, tokens_used
                    FROM learning_chats
                    WHERE user_id = $1 
                    AND to_tsvector('english', message) @@ plainto_tsquery('english', $2)
                    ORDER BY created_at DESC
                    LIMIT 10
                """, user_id, search_query)
                
                return [dict(row) for row in rows]
                
        except Exception as e:
            logger.error(f"Keyword search error: {e}")
            return []
    
    async def _keyword_search_db(
        self, 
        user_id: str, 
        query: str,
        keywords: List[str],
        session_id: str
    ) -> List[Dict]:
        """Enhanced keyword search with session context"""
        try:
            if not self.db_pool:
                return []
                
            async with self.db_pool.acquire() as conn:
                # Build search query from keywords
                search_terms = [query] + keywords
                search_query = ' | '.join(search_terms)  # OR search
                
                # Search in user's history with session priority
                rows = await conn.fetch("""
                    SELECT id, message, is_ai_response, created_at, tokens_used,
                           CASE WHEN session_id = $3 THEN 2.0 ELSE 1.0 END as relevance_boost
                    FROM learning_chats
                    WHERE user_id = $1 
                    AND to_tsvector('english', message) @@ plainto_tsquery('english', $2)
                    ORDER BY relevance_boost DESC, created_at DESC
                    LIMIT 8
                """, user_id, search_query, session_id)
                
                return [dict(row) for row in rows]
                
        except Exception as e:
            logger.error(f"Enhanced keyword search error: {e}")
            return []
    
    async def _optimize_recent_context(self, context_package: ContextPackage) -> ContextPackage:
        """Optimize recent context by compressing if over token budget"""
        try:
            recent_tokens = sum(len(msg.content) // 4 for msg in context_package.recent)
            
            # If within budget, return as-is
            if recent_tokens <= self.max_context_tokens // 2:  # Use half budget for recent
                return context_package
            
            # Compress by keeping fewer messages with priority to recent
            optimized_recent = []
            remaining_budget = self.max_context_tokens // 2
            
            # Process from most recent backwards
            for msg in reversed(context_package.recent):
                msg_tokens = len(msg.content) // 4
                if remaining_budget >= msg_tokens:
                    optimized_recent.insert(0, msg)  # Insert at beginning to maintain order
                    remaining_budget -= msg_tokens
                elif len(optimized_recent) < 2:  # Always keep at least 2 messages
                    # Compress this message to fit
                    compressed_content = await self._compress_message_content(msg.content, remaining_budget)
                    compressed_msg = Message(
                        id=msg.id,
                        role=msg.role,
                        content=compressed_content,
                        timestamp=msg.timestamp,
                        session_id=msg.session_id,
                        user_id=msg.user_id
                    )
                    optimized_recent.insert(0, compressed_msg)
                    break
            
            context_package.recent = optimized_recent
            logger.info(f"Optimized recent context: {len(optimized_recent)} messages, ~{sum(len(msg.content) // 4 for msg in optimized_recent)} tokens")
            return context_package
            
        except Exception as e:
            logger.error(f"Error optimizing recent context: {e}")
            return context_package
    
    async def _apply_token_budget(self, context_package: ContextPackage) -> ContextPackage:
        """Apply strict token budget management across all context types"""
        try:
            total_tokens = self._estimate_tokens(context_package)
            
            if total_tokens <= self.max_context_tokens:
                return context_package
            
            logger.info(f"Applying token budget: {total_tokens} -> {self.max_context_tokens}")
            
            # Priority allocation: recent (50%) > relevant (30%) > summary (10%) > historical (10%)
            recent_budget = int(self.max_context_tokens * 0.5)
            relevant_budget = int(self.max_context_tokens * 0.3)
            summary_budget = int(self.max_context_tokens * 0.1)
            historical_budget = int(self.max_context_tokens * 0.1)
            
            # Optimize recent messages
            optimized_recent = []
            remaining_recent_budget = recent_budget
            for msg in reversed(context_package.recent):
                msg_tokens = len(msg.content) // 4
                if remaining_recent_budget >= msg_tokens:
                    optimized_recent.insert(0, msg)
                    remaining_recent_budget -= msg_tokens
                else:
                    break
            context_package.recent = optimized_recent
            
            # Optimize relevant messages
            optimized_relevant = []
            remaining_relevant_budget = relevant_budget
            for msg in context_package.relevant:
                msg_tokens = len(msg.content) // 4
                if remaining_relevant_budget >= msg_tokens:
                    optimized_relevant.append(msg)
                    remaining_relevant_budget -= msg_tokens
                else:
                    break
            context_package.relevant = optimized_relevant
            
            # Compress summary if too long
            if context_package.summary:
                summary_tokens = len(context_package.summary) // 4
                if summary_tokens > summary_budget:
                    # Truncate summary to fit budget
                    max_chars = summary_budget * 4
                    context_package.summary = context_package.summary[:max_chars] + "..."
            
            # Optimize historical messages
            optimized_historical = []
            remaining_historical_budget = historical_budget
            for msg in reversed(context_package.historical):  # Keep most recent historical
                msg_tokens = len(msg.content) // 4
                if remaining_historical_budget >= msg_tokens:
                    optimized_historical.insert(0, msg)
                    remaining_historical_budget -= msg_tokens
                else:
                    break
            context_package.historical = optimized_historical
            
            final_tokens = self._estimate_tokens(context_package)
            logger.info(f"Token budget applied: {final_tokens} tokens (target: {self.max_context_tokens})")
            
            return context_package
            
        except Exception as e:
            logger.error(f"Error applying token budget: {e}")
            return context_package
    
    async def _compress_message_content(self, content: str, max_tokens: int) -> str:
        """Content-aware compression using ContentCompressor"""
        try:
            # Use ContentCompressor for intelligent compression
            compressed, metadata = self.content_compressor.compress_content(content, max_tokens)
            
            logger.debug(f"Compressed message: {metadata['content_type']} - "
                        f"ratio: {metadata['compression_ratio']:.2%}")
            
            return compressed
            
        except Exception as e:
            logger.error(f"Error compressing content: {e}")
            # Fallback to simple truncation
            max_chars = max_tokens * 4
            if len(content) <= max_chars:
                return content
            return content[:max_chars-3] + "..."
    
    async def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding - disabled for now to avoid API costs"""
        try:
            # Temporarily disable embeddings to avoid OpenAI API costs
            # TODO: Implement OpenRouter embeddings if needed
            logger.info("Embedding generation disabled - using zero vector")
            return [0.0] * 1536
        except Exception as e:
            logger.error(f"Embedding generation error: {e}")
            # Return zero vector as fallback
            return [0.0] * 1536
    

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
        if not self.db_pool:
            return {"exists": False, "error": "Database pool not initialized"}
            
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
    
    # NEW: Performance monitoring methods
    
    async def record_performance_metrics(
        self,
        response_time: float,
        model_used: str,
        context_metrics: ContextMetrics,
        error: bool = False
    ):
        """Record performance metrics for monitoring"""
        await self.performance_monitor.record_request(
            response_time=response_time,
            model_used=model_used,
            context_metrics=context_metrics,
            error=error
        )
    
    def get_quality_trends(self, hours_back: int = 24) -> Dict[str, Any]:
        """Get context quality trends"""
        return self.quality_analyzer.get_quality_trends(hours_back)
    
    def get_performance_summary(self, hours_back: int = 24) -> Dict[str, Any]:
        """Get performance monitoring summary"""
        return self.performance_monitor.get_performance_summary(hours_back)
    
    async def get_optimization_report(self) -> Dict[str, Any]:
        """Get comprehensive optimization report"""
        try:
            # Get optimization report from performance monitor
            report = await self.performance_monitor.generate_optimization_report()
            
            # Get quality trends
            quality_trends = self.quality_analyzer.get_quality_trends(24)
            
            return {
                "optimization_report": {
                    "timestamp": report.timestamp.isoformat(),
                    "overall_score": report.overall_score,
                    "critical_issues": report.critical_issues,
                    "improvement_opportunities": report.improvement_opportunities,
                    "optimizations": {
                        "token": report.token_optimization,
                        "performance": report.performance_optimization,
                        "quality": report.quality_optimization
                    },
                    "estimated_improvements": {
                        "cost_savings": f"{report.estimated_cost_savings:.1f}%",
                        "performance_gain": f"{report.estimated_performance_gain:.1f}%",
                        "quality_improvement": f"{report.estimated_quality_improvement:.1f}%"
                    }
                },
                "quality_trends": quality_trends,
                "recommendations": [
                    "Enable aggressive compression if token usage is high",
                    "Switch to lighter models for simple queries",
                    "Optimize context building for better relevance scores",
                    "Consider caching for frequently accessed contexts"
                ]
            }
        except Exception as e:
            logger.error(f"Error generating optimization report: {e}")
            return {"error": "Failed to generate optimization report", "details": str(e)} 