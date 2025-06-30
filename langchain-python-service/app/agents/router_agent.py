from typing import Dict, List, Optional, Literal
from enum import Enum
from pydantic import BaseModel
from loguru import logger
import json
import re

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

# Enhanced pattern definitions with negative patterns
PATTERN_DEFINITIONS = {
    'greeting': {
        'patterns': [
            "xin chào", "hello", "hi", "chào bạn", "chào", "halo", 
            "good morning", "good afternoon", "good evening",
            "hey", "bonjour", "hola"
        ],
        'negative_patterns': [
            "chào hỏi về", "chào và hỏi", "xin chào tôi muốn hỏi",
            "chào bạn có thể", "hello can you"
        ],
        'context_type': ContextNeedType.NONE,
        'confidence': 0.95
    },
    'new_topic': {
        'patterns': [
            "chuyển chủ đề", "hỏi khác", "topic mới", "bây giờ", "giờ tôi muốn",
            "câu hỏi khác", "vấn đề khác", "thay đổi chủ đề", "sang vấn đề",
            "không liên quan nhưng", "btw", "by the way", "ngoài ra"
        ],
        'negative_patterns': [
            "liên quan đến", "về chủ đề", "tiếp tục chủ đề"
        ],
        'context_type': ContextNeedType.NONE,
        'confidence': 0.85
    },
    'continuation': {
        'patterns': [
            "tiếp tục", "như bạn nói", "như bạn vừa", "theo như", "dựa trên",
            "từ phần trước", "quay lại", "như đã nói", "như vậy thì",
            "nói thêm về", "giải thích thêm", "chi tiết hơn", "cụ thể hơn",
            "elaborate", "more about", "continue"
        ],
        'context_type': ContextNeedType.RECENT_ONLY,
        'confidence': 0.9
    },
    'clarification': {
        'patterns': [
            "ý bạn là", "bạn có thể giải thích", "không hiểu", "làm rõ",
            "what do you mean", "can you explain", "huh", "sao cơ",
            "nghĩa là sao", "tức là", "có phải là"
        ],
        'context_type': ContextNeedType.RECENT_ONLY,
        'confidence': 0.85
    },
    'reference': {
        'patterns': [
            "trước đó", "lúc nãy", "vừa rồi", "phần trước", "ban nãy",
            "earlier", "previously", "before", "above",
            "như đã thảo luận", "như đã đề cập"
        ],
        'context_type': ContextNeedType.RECENT_ONLY,
        'confidence': 0.85
    },
    'historical': {
        'patterns': [
            "tuần trước", "hôm qua", "tháng trước", "nhớ không", "lần trước",
            "đã nói", "đã hỏi", "đã thảo luận", "lịch sử", "trước đây",
            "last week", "yesterday", "last time", "remember when",
            "ngày", "hôm", "lúc"
        ],
        'context_type': ContextNeedType.SMART_RETRIEVAL,
        'confidence': 0.9
    },
    'search': {
        'patterns': [
            "tìm", "nhớ lại", "về vấn đề", "liên quan đến", "chủ đề",
            "search for", "find", "lookup", "về cái", "về phần",
            "khi nào", "ở đâu", "ai đã"
        ],
        'context_type': ContextNeedType.SMART_RETRIEVAL,
        'confidence': 0.8
    },
    'summary': {
        'patterns': [
            "tóm tắt", "kết luận", "tổng kết", "toàn bộ cuộc hội thoại",
            "review lại", "recap", "summarize", "tổng hợp", "liệt kê",
            "những gì đã", "tất cả những", "overview", "big picture"
        ],
        'context_type': ContextNeedType.FULL_CONTEXT,
        'confidence': 0.95
    }
}

class RouterAgent:
    """Enhanced Router Agent với pattern matching thông minh và confidence scoring"""
    
    def __init__(self, enable_llm_analysis: bool = False):
        self.model = "google/gemini-2.0-flash-lite-001"
        self.enable_llm_analysis = enable_llm_analysis
        self.confidence_threshold = 0.8  # Threshold để trigger LLM analysis
        logger.info(f"Enhanced Router Agent initialized - LLM analysis: {enable_llm_analysis}")
    
    async def analyze_context_need(
        self, 
        message: str, 
        recent_messages: Optional[List[Dict]] = None
    ) -> ContextNeed:
        """Enhanced context analysis với multi-level decision making"""
        
        # Level 1: Smart pattern matching với confidence
        pattern_result = self._enhanced_pattern_analysis(message, recent_messages)
        
        # Nếu confidence cao, return ngay
        if pattern_result.confidence >= self.confidence_threshold:
            logger.info(f"High confidence pattern match: {pattern_result.type} ({pattern_result.confidence:.2f})")
            return pattern_result
        
        # Level 2: Context-aware analysis
        if recent_messages:
            context_result = self._analyze_with_context(message, recent_messages, pattern_result)
            if context_result.confidence >= self.confidence_threshold:
                logger.info(f"Context-aware match: {context_result.type} ({context_result.confidence:.2f})")
                return context_result
        
        # Level 3: LLM analysis for edge cases (if enabled)
        if self.enable_llm_analysis and pattern_result.confidence < 0.6:
            try:
                llm_result = await self._smart_llm_analysis(message, recent_messages)
                if llm_result.confidence > pattern_result.confidence:
                    logger.info(f"LLM analysis result: {llm_result.type} ({llm_result.confidence:.2f})")
                    return llm_result
            except Exception as e:
                logger.warning(f"LLM analysis failed, using pattern result: {e}")
        
        # Return best result so far
        logger.info(f"Final decision: {pattern_result.type} ({pattern_result.confidence:.2f})")
        return pattern_result
    
    def _enhanced_pattern_analysis(self, message: str, recent_messages: Optional[List[Dict]] = None) -> ContextNeed:
        """Enhanced pattern matching với negative patterns và scoring"""
        
        message_lower = message.lower().strip()
        message_length = len(message.split())
        
        # Check for empty or very short messages
        if message_length <= 2:
            # Very short messages are likely continuations if there's context
            if recent_messages and len(recent_messages) > 0:
                return ContextNeed(
                    type=ContextNeedType.RECENT_ONLY,
                    reason="Tin nhắn ngắn, có thể là tiếp tục",
                    confidence=0.7
                )
            else:
                return ContextNeed(
                    type=ContextNeedType.NONE,
                    reason="Tin nhắn ngắn, không có context",
                    confidence=0.8
                )
        
        # Score each pattern category
        best_match = None
        best_score = 0.0
        
        for category, config in PATTERN_DEFINITIONS.items():
            score = self._calculate_pattern_score(message_lower, config)
            
            if score > best_score:
                best_score = score
                best_match = {
                    'category': category,
                    'config': config,
                    'score': score
                }
        
        # Build result based on best match
        if best_match and best_score > 0:
            config = best_match['config']
            
            # Adjust confidence based on context availability
            confidence = config['confidence'] * best_score
            
            # Special handling for greetings
            if best_match['category'] == 'greeting' and (not recent_messages or len(recent_messages) == 0):
                confidence = min(confidence * 1.2, 0.95)  # Boost confidence for initial greeting
            
            keywords = self._extract_keywords(message) if config['context_type'] == ContextNeedType.SMART_RETRIEVAL else []
            
            return ContextNeed(
                type=config['context_type'],
                reason=f"Pattern match: {best_match['category']}",
                keywords=keywords,
                confidence=confidence
            )
        
        # No strong pattern match - use heuristics
        return self._heuristic_analysis(message, recent_messages)
    
    def _calculate_pattern_score(self, message: str, config: Dict) -> float:
        """Calculate pattern matching score với negative pattern penalty"""
        
        positive_matches = 0
        negative_matches = 0
        
        # Check positive patterns
        for pattern in config['patterns']:
            if pattern in message:
                positive_matches += 1
        
        # Check negative patterns (if any)
        if 'negative_patterns' in config:
            for neg_pattern in config['negative_patterns']:
                if neg_pattern in message:
                    negative_matches += 1
        
        # Calculate score
        if positive_matches == 0:
            return 0.0
        
        # Penalize for negative matches
        score = positive_matches / len(config['patterns'])
        if negative_matches > 0:
            penalty = negative_matches / len(config.get('negative_patterns', [1]))
            score *= (1 - penalty * 0.5)  # Reduce score by up to 50% for negative matches
        
        return score
    
    def _analyze_with_context(self, message: str, recent_messages: List[Dict], initial_result: ContextNeed) -> ContextNeed:
        """Analyze với conversation context để improve accuracy"""
        
        # Check conversation momentum
        if len(recent_messages) >= 3:
            # Active conversation - bias towards needing context
            if initial_result.type == ContextNeedType.NONE and initial_result.confidence < 0.7:
                # Question mark indicates possible continuation
                if "?" in message or any(q in message.lower() for q in ["how", "what", "why", "when", "where"]):
                    return ContextNeed(
                        type=ContextNeedType.RECENT_ONLY,
                        reason="Câu hỏi trong conversation đang diễn ra",
                        confidence=0.75
                    )
        
        # Check for implicit references
        if self._has_implicit_reference(message):
            if initial_result.type == ContextNeedType.NONE:
                return ContextNeed(
                    type=ContextNeedType.RECENT_ONLY,
                    reason="Có reference ngầm định",
                    confidence=0.8
                )
        
        return initial_result
    
    def _has_implicit_reference(self, message: str) -> bool:
        """Detect implicit references that need context"""
        
        implicit_patterns = [
            r'\b(nó|họ|cái đó|cái này|điều đó|điều này|vấn đề đó|chủ đề đó)\b',
            r'\b(it|they|this|that|these|those|the same)\b',
            r'\b(vậy|thế|như vậy|như thế|do đó|vì vậy)\b',
            r'^(và|nhưng|hoặc|tuy nhiên|mặc dù)',  # Starting with conjunction
        ]
        
        message_lower = message.lower()
        for pattern in implicit_patterns:
            if re.search(pattern, message_lower):
                return True
        
        return False
    
    def _heuristic_analysis(self, message: str, recent_messages: Optional[List[Dict]] = None) -> ContextNeed:
        """Fallback heuristic analysis khi không match patterns"""
        
        message_lower = message.lower()
        
        # Question heuristics
        if "?" in message or any(q in message_lower for q in ["gì", "nào", "sao", "thế nào", "bao nhiêu"]):
            # Standalone question vs contextual question
            if recent_messages and len(recent_messages) > 0:
                # Check if question refers to recent content
                last_message = recent_messages[-1].get('content', '') if recent_messages else ''
                if self._messages_related(message, last_message):
                    return ContextNeed(
                        type=ContextNeedType.RECENT_ONLY,
                        reason="Câu hỏi liên quan đến nội dung gần đây",
                        confidence=0.7
                    )
            
            return ContextNeed(
                type=ContextNeedType.NONE,
                reason="Câu hỏi độc lập",
                confidence=0.6
            )
        
        # Default based on conversation state
        if recent_messages and len(recent_messages) > 0:
            return ContextNeed(
                type=ContextNeedType.RECENT_ONLY,
                reason="Tiếp tục cuộc hội thoại",
                confidence=0.65
            )
        
        return ContextNeed(
            type=ContextNeedType.NONE,
            reason="Không xác định rõ context need",
            confidence=0.5
        )
    
    def _messages_related(self, msg1: str, msg2: str) -> bool:
        """Check if two messages are topically related"""
        
        # Extract meaningful words from both messages
        words1 = set(w.lower() for w in re.findall(r'\w{3,}', msg1))
        words2 = set(w.lower() for w in re.findall(r'\w{3,}', msg2))
        
        # Remove common words
        common_words = {'the', 'and', 'của', 'với', 'trong', 'cho', 'này', 'khi', 'để'}
        words1 -= common_words
        words2 -= common_words
        
        # Check overlap
        if not words1 or not words2:
            return False
        
        overlap = len(words1 & words2)
        min_len = min(len(words1), len(words2))
        
        # Consider related if >30% word overlap
        return (overlap / min_len) > 0.3
    
    async def _smart_llm_analysis(self, message: str, recent_messages: Optional[List[Dict]] = None) -> ContextNeed:
        """Lightweight LLM analysis for edge cases only"""
        
        try:
            llm = LLMConfig.get_llm(
                model_name=self.model,
                temperature=0.1,
                max_tokens=100,  # Very short response
                enable_retry=False
            )
            
            # Build compact prompt
            recent_summary = ""
            if recent_messages and len(recent_messages) > 0:
                # Only last 2 messages for efficiency
                recent_summary = "\n".join([
                    f"{msg.get('role', 'unknown')}: {msg.get('content', '')[:50]}..."
                    for msg in recent_messages[-2:]
                ])
            
            prompt = f"""Classify context need for message. Reply ONLY with JSON.

Message: "{message}"
Recent: {recent_summary if recent_summary else "None"}

JSON format:
{{"type": "NONE|RECENT_ONLY|SMART_RETRIEVAL|FULL_CONTEXT", "confidence": 0.0-1.0}}"""

            messages = [HumanMessage(content=prompt)]
            response = await llm.ainvoke(messages)
            
            # Parse response
            content = response.content
            if isinstance(content, list):
                content = " ".join(str(item) for item in content)
            
            # Extract JSON
            import json
            json_match = re.search(r'\{[^}]+\}', str(content))
            if json_match:
                result = json.loads(json_match.group())
                return ContextNeed(
                    type=ContextNeedType(result.get("type", "RECENT_ONLY")),
                    reason="LLM edge case analysis",
                    confidence=float(result.get("confidence", 0.5)),
                    keywords=self._extract_keywords(message) if result.get("type") == "SMART_RETRIEVAL" else []
                )
                
        except Exception as e:
            logger.warning(f"Smart LLM analysis failed: {e}")
        
        # Fallback
        return ContextNeed(
            type=ContextNeedType.RECENT_ONLY,
            reason="LLM analysis fallback",
            confidence=0.5
        )
    
    def _extract_keywords(self, message: str) -> List[str]:
        """Enhanced keyword extraction cho better search"""
        
        # Remove common stop words
        stop_words = {
            # Vietnamese
            "và", "của", "với", "trong", "về", "cho", "từ", "có", "là", "được", 
            "này", "đó", "tôi", "bạn", "chúng", "ta", "một", "các", "những",
            "như", "thì", "để", "khi", "nếu", "vì", "do", "bởi", "theo",
            # English
            "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", 
            "with", "a", "an", "is", "are", "was", "were", "been", "have", "has"
        }
        
        # Extract words and phrases
        words = re.findall(r'\b\w{3,}\b', message.lower())
        
        # Filter stop words and extract meaningful terms
        keywords = []
        for word in words:
            if word not in stop_words and word.isalpha():
                keywords.append(word)
        
        # Extract potential phrases (consecutive capitalized words)
        phrases = re.findall(r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*', message)
        keywords.extend([p.lower() for p in phrases])
        
        # Remove duplicates while preserving order
        seen = set()
        unique_keywords = []
        for kw in keywords:
            if kw not in seen:
                seen.add(kw)
                unique_keywords.append(kw)
        
        # Return top 7 keywords (increased from 5)
        return unique_keywords[:7] 