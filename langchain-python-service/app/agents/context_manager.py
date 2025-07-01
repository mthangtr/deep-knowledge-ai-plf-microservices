from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from loguru import logger
import uuid
from datetime import datetime
from enum import Enum

class ContextNeedType(Enum):
    """Mô tả loại context cần thiết cho một yêu cầu."""
    NONE = "NONE"
    RECENT_ONLY = "RECENT_ONLY"
    SMART_RETRIEVAL = "SMART_RETRIEVAL"
    FULL_CONTEXT = "FULL_CONTEXT"

class Message(BaseModel):
    id: str
    role: str  # 'user', 'assistant', 'system'
    content: str
    timestamp: datetime
    session_id: str
    user_id: str

class ContextPackage(BaseModel):
    recent: List[Message] = []
    summary: Optional[str] = None
    relevant: List[Message] = []
    historical: List[Message] = []
    context_type: ContextNeedType
    total_tokens_estimate: int = 0

class SessionSummary(BaseModel):
    session_id: str
    summary: str
    topics_discussed: List[str]
    message_count: int
    last_updated: datetime

class ContextManager:
    """Quản lý context cho chat sessions với strategy tiết kiệm tokens"""
    
    def __init__(self):
        # In-memory storage (trong thực tế sẽ dùng database)
        self.messages: Dict[str, List[Message]] = {}  # session_id -> messages
        self.session_summaries: Dict[str, SessionSummary] = {}  # session_id -> summary
        self.user_sessions: Dict[str, List[str]] = {}  # user_id -> session_ids
        
        logger.info("Context Manager initialized")
    
    async def get_context_for_message(
        self,
        session_id: str,
        user_id: str,
        message: str
    ) -> ContextPackage:
        """Lấy context phù hợp cho message dựa trên router analysis"""
        
        raise NotImplementedError("This in-memory ContextManager is deprecated and should not be used.")
    
    def add_message(
        self,
        session_id: str,
        user_id: str,
        role: str,
        content: str
    ) -> Message:
        """Thêm message mới vào session"""
        
        message = Message(
            id=str(uuid.uuid4()),
            role=role,
            content=content,
            timestamp=datetime.now(),
            session_id=session_id,
            user_id=user_id
        )
        
        # Initialize session if not exists
        if session_id not in self.messages:
            self.messages[session_id] = []
            
        # Add to user sessions tracking
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = []
        if session_id not in self.user_sessions[user_id]:
            self.user_sessions[user_id].append(session_id)
        
        self.messages[session_id].append(message)
        
        # Auto-compress if session gets too long
        if len(self.messages[session_id]) > 100:
            self._compress_session(session_id)
        
        logger.info(f"Added message to session {session_id}: {role}")
        return message
    
    def _get_recent_messages(self, session_id: str, limit: int = 10) -> List[Message]:
        """Lấy messages gần đây nhất"""
        if session_id not in self.messages:
            return []
        
        return self.messages[session_id][-limit:]
    
    def _get_session_summary(self, session_id: str) -> Optional[SessionSummary]:
        """Lấy summary của session"""
        return self.session_summaries.get(session_id)
    
    def _vector_search_simulation(
        self, 
        session_id: str, 
        user_id: str, 
        keywords: List[str]
    ) -> List[Message]:
        """Simulation của vector search (trong thực tế sẽ dùng vector DB)"""
        
        if session_id not in self.messages:
            return []
        
        # Simple keyword matching simulation
        relevant = []
        for message in self.messages[session_id]:
            content_lower = message.content.lower()
            if any(keyword.lower() in content_lower for keyword in keywords):
                relevant.append(message)
        
        # Return max 5 most relevant
        return relevant[-5:]
    
    def _compress_session(self, session_id: str):
        """Nén session khi quá dài"""
        if session_id not in self.messages:
            return
        
        messages = self.messages[session_id]
        if len(messages) <= 50:
            return
        
        # Keep recent 30 messages
        recent_messages = messages[-30:]
        
        # Create summary from older messages (simulation)
        older_messages = messages[:-30]
        summary_content = self._create_summary_simulation(older_messages)
        
        # Update session summary
        self.session_summaries[session_id] = SessionSummary(
            session_id=session_id,
            summary=summary_content,
            topics_discussed=[],  # Would extract from messages
            message_count=len(older_messages),
            last_updated=datetime.now()
        )
        
        # Keep only recent messages
        self.messages[session_id] = recent_messages
        
        logger.info(f"Compressed session {session_id}: kept {len(recent_messages)} recent messages")
    
    def _create_summary_simulation(self, messages: List[Message]) -> str:
        """Simulation tạo summary (trong thực tế sẽ dùng LLM)"""
        if not messages:
            return ""
        
        topics = set()
        for msg in messages:
            words = msg.content.split()
            topics.update([w for w in words if len(w) > 4])  # Simple topic extraction
        
        return f"Cuộc hội thoại bao gồm {len(messages)} tin nhắn về các chủ đề: {', '.join(list(topics)[:10])}"
    
    def _estimate_tokens(self, context_package: ContextPackage) -> int:
        """Ước tính số tokens cần sử dụng"""
        total = 0
        
        # Recent messages: ~4 chars = 1 token
        for msg in context_package.recent:
            total += len(msg.content) // 4
        
        # Summary
        if context_package.summary:
            total += len(context_package.summary) // 4
        
        # Relevant messages
        for msg in context_package.relevant:
            total += len(msg.content) // 4
        
        # Historical messages  
        for msg in context_package.historical:
            total += len(msg.content) // 4
        
        return total
    
    def get_session_stats(self, session_id: str) -> Dict[str, Any]:
        """Lấy thống kê session"""
        if session_id not in self.messages:
            return {"exists": False}
        
        messages = self.messages[session_id]
        summary = self.session_summaries.get(session_id)
        
        return {
            "exists": True,
            "message_count": len(messages),
            "has_summary": summary is not None,
            "summary_message_count": summary.message_count if summary else 0,
            "last_message_time": messages[-1].timestamp if messages else None,
            "estimated_tokens": sum(len(msg.content) // 4 for msg in messages)
        } 