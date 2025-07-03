"""
Conversation Intelligence
Dynamic persona selection and user pattern analysis for adaptive AI conversations
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import re
from loguru import logger

from app.agents.smart_context_manager import SmartContextPackage
from app.prompts.personas import SOCRATIC_MENTOR, CREATIVE_EXPLORER, PRAGMATIC_ENGINEER, DIRECT_INSTRUCTOR
from app.prompts.domain_instructions import DOMAIN_INSTRUCTIONS_MAP
from app.config.model_router_config import Domain

class UserLearningStyle(Enum):
    """User learning style patterns"""
    EXPLORER = "explorer"          # Likes questions, discovery
    DIRECT_LEARNER = "direct"      # Wants straight answers
    CREATIVE_THINKER = "creative"  # Enjoys analogies, examples
    PRACTICAL_DOER = "practical"   # Focuses on implementation

class OutputStyle(Enum):
    """Response output styles"""
    CONCISE = "concise"
    DETAILED = "detailed"
    REFRESH = "refresh"
    STANDARD = "standard"

@dataclass
class ConversationAnalysis:
    """Analysis of current conversation context"""
    selected_persona: str
    persona_name: str
    output_style: OutputStyle
    relevance_guidance: str
    user_learning_style: UserLearningStyle
    confidence_score: float
    reasoning: str

class ConversationIntelligence:
    """Intelligence engine for adaptive conversation management"""
    
    def __init__(self):
        # Persona mapping
        self.personas = {
            "socratic": (SOCRATIC_MENTOR, "Socratic Mentor"),
            "creative": (CREATIVE_EXPLORER, "Creative Explorer"),
            "pragmatic": (PRAGMATIC_ENGINEER, "Pragmatic Engineer"),
            "direct": (DIRECT_INSTRUCTOR, "Direct Instructor")
        }
        
        # Keyword patterns for persona selection
        self.persona_keywords = {
            "direct": [
                "tôi không biết", "chưa bao giờ nghe", "muốn đi thẳng vào vấn đề",
                "giải thích trực tiếp", "đừng hỏi nữa", "cứ trả lời đi", "tôi không hiểu gì",
                "hãy nói về", "cho tôi biết về", "cần vào thẳng vấn đề", "vào thẳng vấn đề",
                "người mới", "mới bắt đầu", "nói thẳng", "thẳng vấn đề"
            ],
            "creative": [
                "giải thích đơn giản", "ví dụ vui", "thú vị", "một cách sáng tạo",
                "như thể là", "ví như", "giống như là", "cho người không biết gì",
                "làm cho dễ hiểu", "ví dụ sinh động"
            ],
            "pragmatic": [
                "lỗi", "tối ưu", "step-by-step", "cụ thể", "hướng dẫn chi tiết",
                "thực hành", "triển khai", "implement", "debug", "fix"
            ]
        }
        
        # Output style keywords
        self.output_style_keywords = {
            OutputStyle.CONCISE: ["ngắn gọn", "tóm tắt", "ý chính", "câu trả lời ngắn"],
            OutputStyle.DETAILED: ["chi tiết", "giải thích sâu", "cặn kẽ", "dài hơn"],
            OutputStyle.REFRESH: ["giải thích lại", "nói cách khác", "theo cách khác", "ví dụ khác"]
        }
        
        logger.info("Conversation Intelligence initialized")

    def analyze_conversation(
        self, 
        user_message: str, 
        context: SmartContextPackage,
        detected_domain: Domain
    ) -> ConversationAnalysis:
        """Analyze conversation and select optimal response strategy"""
        
        # 🐛 DEBUG: Analysis start
        logger.debug(f"🧠 [INTELLIGENCE] Analyzing message: {user_message[:50]}...")
        logger.debug(f"🧠 [INTELLIGENCE] Domain: {detected_domain.value}, relevance: {context.relevance_score:.3f}")
        
        # 1. Detect user learning style from message patterns
        user_style = self._detect_learning_style(user_message, context)
        logger.debug(f"🧠 [INTELLIGENCE] Detected learning style: {user_style.value}")
        
        # 2. Select persona based on message content and learning style
        persona_key, confidence = self._select_persona(user_message, user_style)
        persona_content, persona_name = self.personas[persona_key]
        logger.debug(f"🧠 [INTELLIGENCE] Selected persona: {persona_name} (confidence: {confidence:.3f})")
        
        # 3. Determine output style
        output_style = self._detect_output_style(user_message)
        logger.debug(f"🧠 [INTELLIGENCE] Output style: {output_style.value}")
        
        # 4. Generate relevance guidance
        relevance_guidance = self._generate_relevance_guidance(
            user_message, context.topic_context, context.relevance_score
        )
        logger.debug(f"🧠 [INTELLIGENCE] Relevance guidance: {relevance_guidance[:100]}...")
        
        # 5. Create reasoning explanation
        reasoning = self._generate_reasoning(
            persona_key, output_style, context.relevance_score, confidence
        )
        logger.debug(f"🧠 [INTELLIGENCE] Reasoning: {reasoning}")
        
        analysis = ConversationAnalysis(
            selected_persona=persona_content,
            persona_name=persona_name,
            output_style=output_style,
            relevance_guidance=relevance_guidance,
            user_learning_style=user_style,
            confidence_score=confidence,
            reasoning=reasoning
        )
        
        logger.info(f"✅ [INTELLIGENCE] Analysis complete: {persona_name} | {output_style.value} | confidence: {confidence:.3f}")
        return analysis

    def _detect_learning_style(self, message: str, context: SmartContextPackage) -> UserLearningStyle:
        """Detect user's learning style from message and history"""
        message_lower = message.lower()
        
        # Check for direct learning patterns
        if any(pattern in message_lower for pattern in self.persona_keywords["direct"]):
            return UserLearningStyle.DIRECT_LEARNER
            
        # Check for creative patterns
        if any(pattern in message_lower for pattern in self.persona_keywords["creative"]):
            return UserLearningStyle.CREATIVE_THINKER
            
        # Check for practical patterns
        if any(pattern in message_lower for pattern in self.persona_keywords["pragmatic"]):
            return UserLearningStyle.PRACTICAL_DOER
            
        # Analyze question patterns for explorer style
        question_indicators = ["tại sao", "như thế nào", "why", "how", "what if"]
        if any(indicator in message_lower for indicator in question_indicators):
            return UserLearningStyle.EXPLORER
            
        # Default based on context
        if context.recent_messages:
            # Analyze recent interaction patterns
            recent_text = " ".join([msg.content.lower() for msg in context.recent_messages[-3:]])
            if "tại sao" in recent_text or "how" in recent_text:
                return UserLearningStyle.EXPLORER
                
        return UserLearningStyle.EXPLORER  # Default to Socratic style

    def _select_persona(self, message: str, learning_style: UserLearningStyle) -> Tuple[str, float]:
        """Select best persona based on message content and learning style"""
        message_lower = message.lower()
        
        # Priority 1: Direct requests override everything
        direct_matches = [kw for kw in self.persona_keywords["direct"] if kw in message_lower]
        if direct_matches:
            return "direct", 0.9
            
        # Priority 2: Specific persona keywords
        for persona_key, keywords in self.persona_keywords.items():
            if persona_key != "direct":  # Already checked
                matches = [kw for kw in keywords if kw in message_lower]
                if matches:
                    confidence = min(0.8 + len(matches) * 0.1, 1.0)
                    return persona_key, confidence
        
        # Priority 3: Learning style mapping
        style_persona_map = {
            UserLearningStyle.DIRECT_LEARNER: "direct",
            UserLearningStyle.CREATIVE_THINKER: "creative", 
            UserLearningStyle.PRACTICAL_DOER: "pragmatic",
            UserLearningStyle.EXPLORER: "socratic"
        }
        
        return style_persona_map[learning_style], 0.6

    def _detect_output_style(self, message: str) -> OutputStyle:
        """Detect preferred output style from message"""
        message_lower = message.lower()
        
        for style, keywords in self.output_style_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                return style
                
        return OutputStyle.STANDARD

    def _generate_relevance_guidance(
        self, 
        message: str, 
        topic_context: Optional[str], 
        relevance_score: float
    ) -> str:
        """Generate guidance for handling message relevance to topic"""
        if not topic_context:
            return "Câu hỏi của người dùng được xử lý trong ngữ cảnh tổng quát."
            
        topic_title = self._extract_topic_title(topic_context)
        
        if relevance_score <= 0.1:
            return (
                f"Cảnh báo: Câu hỏi này có vẻ không liên quan đến chủ đề chính là '{topic_title}'. "
                "Trước khi trả lời, hãy lịch sự hỏi lại người dùng xem họ có muốn tiếp tục với câu hỏi này không "
                "hay muốn quay lại chủ đề chính. Hãy đề xuất hai lựa chọn rõ ràng."
            )
        elif relevance_score <= 0.4:
            return (
                f"Lưu ý: Câu hỏi này có vẻ liên quan một phần đến chủ đề chính. "
                f"Hãy cố gắng trả lời câu hỏi của người dùng và kết nối nó trở lại với chủ đề đang học là '{topic_title}' "
                "để mở rộng tư duy."
            )
        else:
            return "Câu hỏi của người dùng có liên quan trực tiếp đến chủ đề đang học."

    def _extract_topic_title(self, topic_context: str) -> str:
        """Extract topic title from context string"""
        if "Topic:" in topic_context:
            parts = topic_context.split("Topic:")[1].split(",")[0].strip()
            return parts if parts != "None" else "chủ đề hiện tại"
        return "chủ đề hiện tại"

    def _generate_reasoning(
        self, 
        persona_key: str, 
        output_style: OutputStyle, 
        relevance_score: float,
        confidence: float
    ) -> str:
        """Generate reasoning for the selected approach"""
        reasons = []
        
        # Persona reasoning
        persona_reasons = {
            "direct": "người dùng yêu cầu trả lời trực tiếp hoặc thể hiện là người mới bắt đầu",
            "creative": "người dùng muốn giải thích sinh động, dễ hiểu",
            "pragmatic": "người dùng tập trung vào thực hành và triển khai cụ thể",
            "socratic": "người dùng thích khám phá và tư duy phản biện"
        }
        reasons.append(f"Chọn {persona_key} vì {persona_reasons[persona_key]}")
        
        # Output style reasoning
        if output_style != OutputStyle.STANDARD:
            reasons.append(f"Điều chỉnh phong cách trả lời: {output_style.value}")
            
        # Relevance reasoning
        if relevance_score < 0.5:
            reasons.append(f"Mức độ liên quan thấp ({relevance_score:.1%}), cần xử lý đặc biệt")
            
        return "; ".join(reasons)

    def get_output_style_guidance(self, output_style: OutputStyle) -> str:
        """Get specific guidance for output style"""
        guidance_map = {
            OutputStyle.CONCISE: "Chỉ dẫn: Hãy trả lời một cách cực kỳ súc tích, tập trung vào điểm chính, không quá 3 câu.",
            OutputStyle.DETAILED: "Chỉ dẫn: Hãy giải thích một cách chi tiết và cặn kẽ, bao gồm các ví dụ và ngữ cảnh liên quan nếu có thể.",
            OutputStyle.REFRESH: "Chỉ dẫn quan trọng: Người dùng đã nghe giải thích về chủ đề này. Hãy trình bày lại vấn đề bằng một góc nhìn hoặc ví dụ hoàn toàn mới. Tuyệt đối không lặp lại nội dung đã nói.",
            OutputStyle.STANDARD: "Hãy trả lời một cách tự nhiên với độ dài phù hợp."
        }
        return guidance_map[output_style]

    def get_domain_instructions(self, domain: Domain) -> str:
        """Get domain-specific instructions"""
        return DOMAIN_INSTRUCTIONS_MAP.get(domain, DOMAIN_INSTRUCTIONS_MAP[Domain.DEFAULT]) 