import asyncio
import asyncpg
import os
import time
import re
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from loguru import logger
from pydantic import Field

from app.agents.context_manager import Message, ContextPackage, SessionSummary, ContextNeedType
from app.agents.content_compressor import ContentCompressor
from app.agents.context_quality_analyzer import ContextQualityAnalyzer, ContextMetrics, QualityScore
from app.agents.performance_monitor import PerformanceMonitor
from app.services.cache_manager import cache_manager
from app.models.llm_config import LLMConfig
from langchain_core.messages import HumanMessage

class DatabaseContextManager:
    """PostgreSQL-based context manager with smart single context optimization"""
    
    def __init__(self):
        self.content_compressor = ContentCompressor()
        self.quality_analyzer = ContextQualityAnalyzer()
        self.performance_monitor = PerformanceMonitor()
        self.db_pool: Optional[asyncpg.Pool] = None
        self.recent_messages_limit = 20
        self.standalone_patterns = [
            r"^(xin )?chào", r"bạn là ai", r"hello", r"hi there",
            r"kể.*chuyện cười", r"bắt đầu lại", r"làm mới cuộc trò chuyện"
        ]
        logger.info("Database Context Manager initialized.")

    async def init_db(self):
        """Initialize PostgreSQL connection pool and start monitoring"""
        try:
            database_url = os.getenv("DATABASE_URL")
            if not database_url: raise ValueError("DATABASE_URL is required")
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)
            
            self.db_pool = await asyncpg.create_pool(database_url, min_size=5, max_size=20)
            await self.performance_monitor.start_monitoring()
            logger.info("PostgreSQL connection pool created and monitoring started.")
        except Exception as e:
            logger.error(f"Failed to create DB pool: {e}")
            raise

    async def close(self):
        """Close database connections and stop monitoring"""
        if self.db_pool: await self.db_pool.close()
        await self.performance_monitor.stop_monitoring()

    async def get_or_create_session(self, user_id: str, topic_id: Optional[str] = None, node_id: Optional[str] = None, title: Optional[str] = None) -> str:
        if not self.db_pool: raise RuntimeError("DB pool not initialized.")
        async with self.db_pool.acquire() as conn:
            # Logic to find or create session remains the same, assuming it's correct
            # This logic was not the source of the errors.
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
                query_base += " AND topic_id IS NULL AND node_id IS NULL"

            query_base += " ORDER BY last_activity DESC LIMIT 1"
            session = await conn.fetchrow(query_base, *params)
            
            if session:
                return str(session['id'])

            result = await conn.fetchrow(
                "INSERT INTO chat_sessions (user_id, topic_id, node_id, title) VALUES ($1, $2, $3, $4) RETURNING id",
                user_id, topic_id, node_id, title or "New Chat"
            )
            return str(result['id'])

    async def get_context_for_message(self, session_id: str, user_id: str, message: str) -> Tuple[ContextPackage, ContextMetrics]:
        if not self.db_pool: raise RuntimeError("DB pool not initialized.")
        context_start_time = time.time()

        for pattern in self.standalone_patterns:
            if re.search(pattern, message.lower()):
                logger.info("Standalone message detected. Skipping context retrieval.")
                return self._build_minimal_context_with_metrics(context_start_time)

        try:
            async with self.db_pool.acquire() as conn:
                tasks = [
                    self._get_recent_messages_db(session_id, conn, self.recent_messages_limit),
                    self._get_session_summary_db(session_id, conn),
                    self._get_structural_context_data(session_id, conn),
                    conn.fetchrow("SELECT user_knowledge_state FROM chat_sessions WHERE id = $1", session_id)
                ]
                recent_messages_db, summary, structural_context_data, session_data = await asyncio.gather(*tasks)

            context_package = ContextPackage(
                recent=self._convert_to_messages(recent_messages_db),
                summary=summary,
                structural_context=structural_context_data.get("text"),
                topic_title=structural_context_data.get("topic_title"),
                node_title=structural_context_data.get("node_title"),
                user_knowledge_state=dict(session_data['user_knowledge_state']) if session_data else {},
                context_type=ContextNeedType.FULL_CONTEXT
            )
            context_package.total_tokens_estimate = self._estimate_tokens(context_package)
            
            processing_time = time.time() - context_start_time
            quality_metrics = await self.quality_analyzer.analyze_context_quality(context_package, message, processing_time, session_id)
            return context_package, quality_metrics
        except Exception as e:
            logger.error(f"Error getting context: {e}")
            return self._build_minimal_context_with_metrics(context_start_time, is_error=True)

    async def add_message(self, session_id: str, user_id: str, role: str, content: str, model_used: Optional[str] = None, tokens_used: int = 0, knowledge_state_to_update: Optional[Dict[str, Any]] = None) -> str:
        if not self.db_pool: raise RuntimeError("DB pool not initialized.")
        try:
            async with self.db_pool.acquire() as conn:
                async with conn.transaction():
                    # Simplified INSERT RETURNING id
                    message_id = await conn.fetchval("""
                        INSERT INTO learning_chats (session_id, user_id, message, is_ai_response, model_used, tokens_used, context_type)
                        SELECT $1, $2, $3, $4, $5, $6, 'recent'
                        RETURNING id
                    """, session_id, user_id, content, role == "assistant", model_used, tokens_used)
                    
                    if knowledge_state_to_update:
                        current_state_raw = await conn.fetchval("SELECT user_knowledge_state FROM chat_sessions WHERE id = $1 FOR UPDATE", session_id)
                        current_state = dict(current_state_raw or {})
                        current_state.update(knowledge_state_to_update)
                        await conn.execute("UPDATE chat_sessions SET user_knowledge_state = $2 WHERE id = $1", session_id, json.dumps(current_state))
                
                await self._smart_compression_check(session_id, conn)
                return str(message_id)
        except Exception as e:
            logger.error(f"Error adding message: {e}")
            raise

    async def _get_recent_messages_db(self, session_id: str, conn: asyncpg.Connection, limit: int) -> List[Dict]:
        rows = await conn.fetch("SELECT * FROM learning_chats WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2", session_id, limit)
        return list(reversed([dict(row) for row in rows]))

    async def _get_session_summary_db(self, session_id: str, conn: asyncpg.Connection) -> Optional[str]:
        return await conn.fetchval("SELECT compressed_summary FROM chat_sessions WHERE id = $1", session_id)

    async def _get_structural_context_data(self, session_id: str, conn: asyncpg.Connection) -> Dict[str, Optional[str]]:
        cache_key = f"structural_context:{session_id}"
        cached = await cache_manager.get_json(cache_key)
        if cached: return cached
        
        row = await conn.fetchrow("""
            SELECT lt.title as topic_title, tn.title as node_title
            FROM chat_sessions cs
            LEFT JOIN learning_topics lt ON cs.topic_id = lt.id
            LEFT JOIN tree_nodes tn ON cs.node_id = tn.id
            WHERE cs.id = $1
        """, session_id)
        
        data = {"text": f"Topic: {row['topic_title']}, Node: {row['node_title']}" if row else None,
                "topic_title": row['topic_title'] if row else None,
                "node_title": row['node_title'] if row else None}
        await cache_manager.set_json(cache_key, data, ttl=3600)
        return data

    async def _smart_compression_check(self, session_id: str, conn: asyncpg.Connection):
        try:
            if await conn.fetchval("SELECT check_session_compression_need($1)", session_id):
                logger.info(f"Session {session_id} needs compression. Triggering background task.")
                asyncio.create_task(self._compress_session_smart(session_id))
        except Exception as e:
            logger.error(f"Compression check failed for session {session_id}: {e}")

    async def _compress_session_smart(self, session_id: str):
        """
        Summarizes older messages in a session and stores the summary.
        This acts as the long-term memory creation process.
        """
        if not self.db_pool:
            logger.warning("DB pool not available for session compression.")
            return
        
        try:
            async with self.db_pool.acquire() as conn:
                # 1. Fetch older messages (all except the most recent 20)
                older_messages = await conn.fetch("""
                    SELECT message, is_ai_response, created_at
                    FROM learning_chats
                    WHERE session_id = $1 AND id NOT IN (
                        SELECT id FROM learning_chats
                        WHERE session_id = $1
                        ORDER BY created_at DESC
                        LIMIT $2
                    )
                    ORDER BY created_at ASC
                """, session_id, self.recent_messages_limit)

                if not older_messages:
                    logger.info(f"No old messages to compress for session {session_id}.")
                    return

                # 2. Prepare content for summarization
                conversation_text = "\n".join(
                    [f"{'Assistant' if r['is_ai_response'] else 'User'}: {r['message']}" for r in older_messages]
                )

                # 3. Call LLM to summarize
                summarization_prompt = f"""
                Hãy tóm tắt cuộc hội thoại sau đây một cách súc tích dưới 400 từ.
                Mục tiêu là tạo ra một "ký ức dài hạn" để AI có thể sử dụng trong tương lai.
                Hãy tập trung vào:
                - Các quyết định chính đã được đưa ra.
                - Các khái niệm cốt lõi đã được giải thích.
                - Sở thích hoặc các yêu cầu đặc biệt của người dùng đã được đề cập.
                - Các vấn đề chưa được giải quyết.

                Nội dung cuộc hội thoại:
                ---
                {conversation_text}
                ---
                Bản tóm tắt (dưới 400 từ):
                """
                
                llm = LLMConfig.get_llm(model_name="google/gemini-2.0-flash-lite-001", temperature=0.2)
                response = await llm.ainvoke([HumanMessage(content=summarization_prompt)])
                summary = response.content

                # 4. Store the summary
                await conn.execute("""
                    UPDATE chat_sessions
                    SET compressed_summary = $1, summary_updated_at = NOW()
                    WHERE id = $2
                """, summary, session_id)

                logger.info(f"Successfully compressed and summarized {len(older_messages)} messages for session {session_id}.")

        except Exception as e:
            logger.error(f"Error during smart session compression for {session_id}: {e}")
            
    def _convert_to_messages(self, rows: List[Dict]) -> List[Message]:
        return [Message(id=str(r.get('id')), role="assistant" if r.get('is_ai_response') else "user", content=r.get('message', ''),
                        timestamp=r.get('created_at', datetime.now()), session_id=str(r.get('session_id')), user_id=str(r.get('user_id'))) for r in rows]

    def _estimate_tokens(self, context_package: ContextPackage) -> int:
        total = sum(len(msg.content) // 4 for msg in context_package.recent)
        if context_package.summary: total += len(context_package.summary) // 4
        return total
        
    def _build_minimal_context_with_metrics(self, start_time: float, is_error: bool = False) -> Tuple[ContextPackage, ContextMetrics]:
        context_package = ContextPackage(recent=[], context_type=ContextNeedType.NONE)
        quality = QualityScore.EXCELLENT if not is_error else QualityScore.POOR
        score = 1.0 if not is_error else 0.3
        
        quality_metrics = ContextMetrics(
            relevance_score=score, completeness_score=score, efficiency_score=1.0, coherence_score=1.0,
            freshness_score=1.0, overall_quality=score, quality_level=quality,
            processing_time=time.time() - start_time, token_usage=0, compression_ratio=0.0,
            context_type=ContextNeedType.NONE, message_count=0, session_length=0, timestamp=datetime.now()
        )
        return context_package, quality_metrics

    # Methods for performance monitoring delegation
    async def record_performance_metrics(self, response_time: float, model_used: str, context_metrics: ContextMetrics, error: bool = False):
        await self.performance_monitor.record_request(response_time, model_used, context_metrics, error)

    def get_quality_trends(self, hours_back: int = 24) -> Dict[str, Any]:
        return self.quality_analyzer.get_quality_trends(hours_back)

    def get_performance_summary(self, hours_back: int = 24) -> Dict[str, Any]:
        return self.performance_monitor.get_performance_summary(hours_back)

    async def get_optimization_report(self) -> Dict[str, Any]:
        report = await self.performance_monitor.generate_optimization_report()
        # simplified serialization
        return json.loads(json.dumps(report, default=str))

    async def get_session_stats(self, session_id: str) -> Dict[str, Any]:
        if not self.db_pool: return {"exists": False, "error": "DB pool not initialized"}
        try:
            async with self.db_pool.acquire() as conn:
                stats = await conn.fetchrow("SELECT * FROM get_session_stats($1)", session_id)
                return dict(stats) if stats else {"exists": False, "reason": "No stats found"}
        except Exception as e:
            logger.error(f"Error getting session stats: {e}")
            return {"exists": False, "error": str(e)} 