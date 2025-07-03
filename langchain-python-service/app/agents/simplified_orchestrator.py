"""
Simplified Orchestrator
Clean, efficient orchestration for AI conversations without unnecessary complexity
"""

import asyncio
import time
from typing import Dict, Any, Optional, AsyncGenerator
from loguru import logger

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from app.models.llm_config import LLMConfig
from app.agents.smart_context_manager import SmartContextPackage
from app.agents.conversation_intelligence import ConversationAnalysis

class SimplifiedOrchestrator:
    """Simple but powerful conversation orchestrator"""
    
    def __init__(self):
        logger.info("Simplified Orchestrator initialized")
    
    async def chat_stream(
        self,
        message: str,
        context: SmartContextPackage,
        analysis: ConversationAnalysis,
        system_prompt: str,
        model_name: str = "google/gemini-2.0-flash-lite-001",
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> AsyncGenerator[str, None]:
        """Stream AI response with intelligent conversation management"""
        
        # 🐛 DEBUG: Orchestration start
        logger.debug(f"🎭 [ORCHESTRATOR] Starting response generation")
        logger.debug(f"🎭 [ORCHESTRATOR] Persona: {analysis.persona_name}")
        logger.debug(f"🎭 [ORCHESTRATOR] Model: {model_name}")
        logger.debug(f"🎭 [ORCHESTRATOR] Context tokens: {context.estimated_tokens}")
        logger.debug(f"🎭 [ORCHESTRATOR] Temperature: {temperature}, Max tokens: {max_tokens}")
        
        start_time = time.time()
        
        try:
            # Get LLM instance
            logger.debug(f"🎭 [ORCHESTRATOR] Initializing LLM: {model_name}")
            llm = LLMConfig.get_llm(
                model_name=model_name,
                temperature=temperature,
                max_tokens=max_tokens,
                streaming=True,
                enable_retry=False
            )
            
            # Build message history
            messages = self._build_messages(message, context, system_prompt)
            logger.debug(f"🎭 [ORCHESTRATOR] Built {len(messages)} messages for LLM")
            
            logger.info(f"🎭 [ORCHESTRATOR] Starting conversation with {model_name} - {analysis.persona_name} persona")
            logger.debug(f"🎭 [ORCHESTRATOR] Context: {len(context.recent_messages)} messages, {context.estimated_tokens} tokens")
            
            # Stream response
            full_response = ""
            chunk_count = 0
            logger.debug(f"🎭 [ORCHESTRATOR] Starting stream...")
            
            async for chunk in llm.astream(messages):
                if hasattr(chunk, 'content') and chunk.content:
                    content = str(chunk.content)
                    full_response += content
                    chunk_count += 1
                    
                    # Debug first few chunks
                    if chunk_count <= 3:
                        logger.debug(f"🎭 [ORCHESTRATOR] Chunk {chunk_count}: {content[:30]}...")
                    elif chunk_count == 4:
                        logger.debug(f"🎭 [ORCHESTRATOR] ... streaming in progress")
                    
                    yield content
            
            processing_time = time.time() - start_time
            logger.info(f"✅ [ORCHESTRATOR] Conversation completed in {processing_time:.2f}s - {len(full_response)} chars in {chunk_count} chunks")
            
        except Exception as e:
            logger.error(f"❌ [ORCHESTRATOR] Chat stream error: {e}")
            logger.debug(f"❌ [ORCHESTRATOR] Error details: {type(e).__name__}: {str(e)}")
            yield f"[LỖI: {str(e)}]"
    
    async def chat_single(
        self,
        message: str,
        context: SmartContextPackage,
        analysis: ConversationAnalysis,
        system_prompt: str,
        model_name: str = "google/gemini-2.0-flash-lite-001",
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> Dict[str, Any]:
        """Single response AI conversation"""
        
        start_time = time.time()
        
        try:
            # Get LLM instance
            llm = LLMConfig.get_llm(
                model_name=model_name,
                temperature=temperature,
                max_tokens=max_tokens,
                streaming=False,
                enable_retry=False
            )
            
            # Build message history
            messages = self._build_messages(message, context, system_prompt)
            
            logger.info(f"Single chat with {model_name} - {analysis.persona_name} persona")
            
            # Get response
            response = await llm.ainvoke(messages)
            
            # Extract content
            if hasattr(response, 'content'):
                content = response.content
                if isinstance(content, list):
                    response_text = " ".join(str(item) for item in content)
                else:
                    response_text = str(content)
            else:
                response_text = str(response)
            
            processing_time = time.time() - start_time
            
            return {
                "response": response_text,
                "model_used": model_name,
                "processing_time": processing_time,
                "conversation_info": {
                    "persona": analysis.persona_name,
                    "learning_style": analysis.user_learning_style.value,
                    "output_style": analysis.output_style.value,
                    "confidence": analysis.confidence_score,
                    "reasoning": analysis.reasoning
                }
            }
            
        except Exception as e:
            logger.error(f"Single chat error: {e}")
            raise
    
    def _build_messages(
        self, 
        user_message: str, 
        context: SmartContextPackage, 
        system_prompt: str
    ) -> list:
        """Build message history for LLM"""
        
        messages = []
        
        # Add system prompt
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        
        # Add context messages (recent conversation)
        for msg in context.recent_messages:
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                messages.append(AIMessage(content=msg.content))
        
        # Add current user message
        messages.append(HumanMessage(content=user_message))
        
        return messages
    
    def get_conversation_stats(self, context: SmartContextPackage) -> Dict[str, Any]:
        """Get conversation statistics"""
        return {
            "message_count": len(context.recent_messages),
            "estimated_tokens": context.estimated_tokens,
            "has_summary": context.session_summary is not None,
            "has_topic_context": context.topic_context is not None,
            "relevance_score": context.relevance_score,
            "user_knowledge_tracked": bool(context.user_knowledge_state)
        } 