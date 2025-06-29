from typing import Dict, List, Optional, Literal
from enum import Enum
from pydantic import BaseModel
from loguru import logger
import json

from app.models.llm_config import LLMConfig
from langchain_core.messages import HumanMessage, SystemMessage

class ContextNeedType(str, Enum):
    NONE = "NONE"                    # Câu chào, câu hỏi độc lập
    RECENT_ONLY = "RECENT_ONLY"      # Cần ngữ cảnh gần đây
    SMART_RETRIEVAL = "SMART_RETRIEVAL"  # Cần tìm kiếm ngữ cảnh cụ thể
    FULL_CONTEXT = "FULL_CONTEXT"    # Cần toàn bộ ngữ cảnh

class ContextNeed(BaseModel):
    type: ContextNeedType
    reason: str
    keywords: List[str] = []
    time_reference: Optional[str] = None
    confidence: float = 0.0

class RouterAgent:
    """Agent phân tích và quyết định context cần thiết"""
    
    def __init__(self, enable_llm_analysis: bool = True):
        self.model = "deepseek/deepseek-r1-0528:free"  # Use free model for cost efficiency
        self.enable_llm_analysis = enable_llm_analysis
        logger.info(f"Router Agent initialized with model: {self.model}, LLM analysis: {enable_llm_analysis}")
    
    async def analyze_context_need(
        self, 
        message: str, 
        recent_messages: Optional[List[Dict]] = None
    ) -> ContextNeed:
        """Phân tích message để quyết định context cần thiết"""
        
        # Use LLM analysis if enabled, otherwise fallback
        if not self.enable_llm_analysis:
            logger.info("LLM analysis disabled, using fallback")
            return self._fallback_analysis(message, recent_messages)
        
        try:
            llm = LLMConfig.get_llm(
                model_name=self.model,
                temperature=0.1,  # Low temperature for consistent analysis
                max_tokens=300    # Short response for faster processing
            )
            
            # Build context from recent messages
            recent_context = ""
            if recent_messages and len(recent_messages) > 0:
                recent_context = "\n".join([
                    f"{msg.get('role', 'unknown')}: {msg.get('content', '')}"
                    for msg in recent_messages[-3:]  # Last 3 messages for efficiency
                ])
            
            system_prompt = """Bạn là Router Agent phân tích context cho chat AI.

Phân tích tin nhắn và quyết định loại context cần thiết:

1. NONE - Câu chào, câu hỏi hoàn toàn mới
2. RECENT_ONLY - Cần 5-10 tin nhắn gần đây
3. SMART_RETRIEVAL - Cần tìm kiếm lịch sử cụ thể
4. FULL_CONTEXT - Cần toàn bộ cuộc hội thoại

Trả về JSON format:
{
  "type": "CONTEXT_TYPE",
  "reason": "Lý do ngắn gọn",
  "keywords": ["từ", "khóa"],
  "confidence": 0.8
}

Chỉ trả về JSON, không giải thích thêm."""

            user_prompt = f"""
Message: "{message}"

Recent context:
{recent_context if recent_context else "Không có"}

Phân tích:"""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            logger.info(f"Sending router analysis to {self.model}")
            response = await llm.ainvoke(messages)
            
            # Handle response content
            content = response.content
            if isinstance(content, list):
                content = " ".join(str(item) for item in content)
            
            # Parse JSON response
            try:
                # Clean response and extract JSON
                content_str = str(content).strip()
                
                # Handle markdown code blocks
                if "```json" in content_str:
                    json_start = content_str.find("```json") + 7
                    json_end = content_str.find("```", json_start)
                    content_str = content_str[json_start:json_end].strip()
                elif "```" in content_str:
                    json_start = content_str.find("```") + 3
                    json_end = content_str.find("```", json_start)
                    content_str = content_str[json_start:json_end].strip()
                
                # Try to find JSON object
                if "{" in content_str and "}" in content_str:
                    json_start = content_str.find("{")
                    json_end = content_str.rfind("}") + 1
                    content_str = content_str[json_start:json_end]
                
                result = json.loads(content_str)
                
                context_need = ContextNeed(
                    type=ContextNeedType(result.get("type", "RECENT_ONLY")),
                    reason=result.get("reason", ""),
                    keywords=result.get("keywords", []),
                    time_reference=result.get("time_reference"),
                    confidence=result.get("confidence", 0.7)
                )
                
                logger.info(f"Router analysis successful: {context_need.type} (confidence: {context_need.confidence})")
                return context_need
                
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse router response: {e}")
                logger.warning(f"Response content: {content_str[:200]}...")
                # Fallback analysis
                return self._fallback_analysis(message, recent_messages)
                
        except Exception as e:
            logger.error(f"Router agent LLM error: {e}")
            # Fallback to rule-based analysis
            return self._fallback_analysis(message, recent_messages)
    
    def _fallback_analysis(self, message: str, recent_messages: Optional[List[Dict]] = None) -> ContextNeed:
        """Fallback analysis dựa trên keywords khi LLM parsing fails"""
        
        message_lower = message.lower()
        
        # Enhanced pattern matching
        greeting_patterns = ["xin chào", "hello", "hi", "chào bạn", "chào", "halo"]
        new_topic_patterns = ["chuyển chủ đề", "hỏi khác", "topic mới", "bây giờ", "giờ tôi muốn"]
        reference_patterns = ["trước đó", "lúc nãy", "vừa rồi", "phần trước", "tiếp tục", "như bạn nói"]
        history_patterns = ["tuần trước", "hôm qua", "tháng trước", "nhớ không", "lần trước", "đã nói"]
        summary_patterns = ["tóm tắt", "kết luận", "tổng kết", "toàn bộ cuộc hội thoại", "review lại"]
        specific_search_patterns = ["tìm", "nhớ lại", "chủ đề", "về vấn đề", "liên quan đến"]
        
        # Priority-based analysis
        if any(pattern in message_lower for pattern in greeting_patterns):
            if not recent_messages or len(recent_messages) == 0:
                return ContextNeed(
                    type=ContextNeedType.NONE,
                    reason="Lời chào đầu cuộc hội thoại",
                    confidence=0.9
                )
        
        if any(pattern in message_lower for pattern in summary_patterns):
            return ContextNeed(
                type=ContextNeedType.FULL_CONTEXT,
                reason="Yêu cầu tóm tắt toàn bộ",
                confidence=0.9
            )
        
        if any(pattern in message_lower for pattern in new_topic_patterns):
            return ContextNeed(
                type=ContextNeedType.NONE,
                reason="Chuyển chủ đề mới",
                confidence=0.8
            )
        
        if any(pattern in message_lower for pattern in history_patterns):
            return ContextNeed(
                type=ContextNeedType.SMART_RETRIEVAL,
                reason="Tham chiếu lịch sử cụ thể",
                keywords=self._extract_keywords(message),
                confidence=0.8
            )
        
        if any(pattern in message_lower for pattern in specific_search_patterns):
            return ContextNeed(
                type=ContextNeedType.SMART_RETRIEVAL,
                reason="Tìm kiếm thông tin cụ thể",
                keywords=self._extract_keywords(message),
                confidence=0.7
            )
        
        if any(pattern in message_lower for pattern in reference_patterns):
            return ContextNeed(
                type=ContextNeedType.RECENT_ONLY,
                reason="Tham chiếu tin nhắn gần đây",
                confidence=0.8
            )
        
        # Default based on conversation state
        if recent_messages and len(recent_messages) > 0:
            return ContextNeed(
                type=ContextNeedType.RECENT_ONLY,
                reason="Tiếp tục cuộc hội thoại",
                confidence=0.6
            )
        
        return ContextNeed(
            type=ContextNeedType.NONE,
            reason="Bắt đầu cuộc hội thoại mới",
            confidence=0.7
        )
    
    def _extract_keywords(self, message: str) -> List[str]:
        """Extract meaningful keywords từ message"""
        import re
        
        # Remove common Vietnamese stop words
        stop_words = {
            "và", "của", "với", "trong", "về", "cho", "từ", "có", "là", "được", 
            "này", "đó", "tôi", "bạn", "chúng", "ta", "một", "các", "những",
            "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with"
        }
        
        # Extract words longer than 3 characters
        words = re.findall(r'\b\w{4,}\b', message.lower())
        keywords = [word for word in words if word not in stop_words]
        
        # Return max 5 keywords
        return keywords[:5] 