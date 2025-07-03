from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import time
import json
from datetime import datetime
from dotenv import load_dotenv
from loguru import logger
from contextlib import asynccontextmanager
import re

from app.models.llm_config import LLMConfig
from app.agents.simplified_orchestrator import SimplifiedOrchestrator
from app.agents.smart_context_manager import SmartContextManager
from app.agents.conversation_intelligence import ConversationIntelligence
from app.prompts.core_prompts import MASTER_SYSTEM_PROMPT
from app.prompts.personas import SOCRATIC_MENTOR, CREATIVE_EXPLORER, PRAGMATIC_ENGINEER, DIRECT_INSTRUCTOR
from app.services.model_router_service import model_router
from app.services.cache_manager import cache_manager
from app.prompts.domain_instructions import DOMAIN_INSTRUCTIONS_MAP
from app.config.model_router_config import Domain
from app.routes import learning_path_routes

load_dotenv()

# Context manager for app lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting simplified langchain-python service...")
    await smart_context_manager.init_db()
    await cache_manager.connect()
    yield
    # Shutdown
    logger.info("Shutting down langchain-python service...")
    await cache_manager.close()
    await smart_context_manager.close()

app = FastAPI(
    title="LangChain Python Service - Simplified",
    description="Intelligent AI conversation service với simplified architecture",
    version="3.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize simplified components
orchestrator = SimplifiedOrchestrator()
smart_context_manager = SmartContextManager()
conversation_intelligence = ConversationIntelligence()

# Include routers
app.include_router(learning_path_routes.router)

# Pydantic models
class ChatMessage(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str

class ChatRequest(BaseModel):
    message: str
    context: List[ChatMessage] = []
    system_prompt: Optional[str] = None
    options: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    model_used: str
    processing_time: float
    agent_info: Optional[Dict[str, Any]] = None

class SmartChatRequest(BaseModel):
    session_id: Optional[str] = None
    user_id: str
    message: str
    topic_id: Optional[str] = None
    node_id: Optional[str] = None
    model: Optional[str] = "google/gemini-2.0-flash-lite-001"

class SmartChatResponse(BaseModel):
    response: str
    model_used: str
    processing_time: float
    context_info: Dict[str, Any]
    session_stats: Dict[str, Any]
    session_id: str

# Helper function để serialize datetime objects
def serialize_datetime_objects(obj):
    """Convert datetime objects to ISO strings for JSON serialization"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: serialize_datetime_objects(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime_objects(item) for item in obj]
    else:
        return obj

# --- Helper Function for Relevance Check ---
def _calculate_relevance_score(user_message: str, structural_context: Optional[str]) -> float:
    """Calculates a relevance score between the user message and the topic context."""
    if not structural_context or not user_message:
        return 1.0  # Assume relevant if no context to compare against

    # Simple keyword extraction (words with 4+ chars)
    def extract_keywords(text: str) -> set:
        return set(re.findall(r'\b\w{4,}\b', text.lower()))

    message_keywords = extract_keywords(user_message)
    context_keywords = extract_keywords(structural_context)

    if not message_keywords or not context_keywords:
        return 0.0 # No common ground

    # Jaccard Similarity
    intersection = len(message_keywords.intersection(context_keywords))
    union = len(message_keywords.union(context_keywords))

    return intersection / union if union > 0 else 0.0

@app.get("/")
async def root():
    return {
        "service": "LangChain Python Service - Simplified",
        "status": "running",
        "version": "3.0.0",
        "architecture": "Smart Context + Conversation Intelligence"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "openrouter_configured": bool(os.getenv("OPENROUTER_API_KEY")),
        "database_configured": bool(os.getenv("DATABASE_URL")),
        "models_available": LLMConfig.get_available_models(),
        "architecture": "simplified"
    }

@app.post("/smart-chat")
async def smart_chat(request: SmartChatRequest):
    """Intelligent chat với simplified but powerful architecture"""
    start_time = time.time()
    
    async def generate_stream():
        try:
            # 🐛 DEBUG: Log the raw incoming request object
            logger.info(f"🚀 [RAW REQUEST] Received: {request.model_dump_json(indent=2)}")
            
            # 🐛 DEBUG: Main flow start
            logger.info(f"🚀 [SMART-CHAT] New request from user: {request.user_id[:8]}...")
            logger.debug(f"🚀 [SMART-CHAT] Message: {request.message[:100]}...")
            logger.debug(f"🚀 [SMART-CHAT] Topic: {request.topic_id}, Node: {request.node_id}")
            
            # 1. Get or create session with topic/node isolation
            logger.debug(f"🚀 [SMART-CHAT] Step 1: Creating session...")
            session_id = await smart_context_manager.get_or_create_session(
                user_id=request.user_id,
                session_id=request.session_id,
                topic_id=request.topic_id,
                node_id=request.node_id,
                title=f"Chat - {request.message[:50]}..."
            )
            # logger.debug(f"🚀 [SMART-CHAT] Session: {session_id[:8]}...")
            
            # 2. Save user message is now handled by backend-main to prevent duplicates.
            # logger.debug(f"🚀 [SMART-CHAT] Step 2: Saving user message...")
            # if request.topic_id:
            #     await smart_context_manager.add_message(
            #         session_id=session_id,
            #         user_id=request.user_id,
            #         topic_id=request.topic_id,
            #         node_id=request.node_id,
            #         role="user",
            #         content=request.message
            #     )
            #     logger.debug(f"🚀 [SMART-CHAT] Message saved to topic: {request.topic_id}")
            # else:
            #     logger.debug(f"🚀 [SMART-CHAT] No topic - message not saved")

            # 3. Get smart context
            logger.debug(f"🚀 [SMART-CHAT] Step 3: Building context...")
            context = await smart_context_manager.get_smart_context(
                session_id=session_id,
                user_id=request.user_id,
                message=request.message
            )

            # 4. Smart model selection
            logger.debug(f"🚀 [SMART-CHAT] Step 4: Selecting model...")
            selected_model, detected_domain = model_router.select_model(
                user_message=request.message,
                topic_title=context.topic_context,
                node_title=None,
                preferred_model=request.model
            )
            logger.debug(f"🚀 [SMART-CHAT] Selected: {selected_model}, Domain: {detected_domain.value}")

            # 5. Conversation intelligence analysis
            logger.debug(f"🚀 [SMART-CHAT] Step 5: Analyzing conversation...")
            analysis = conversation_intelligence.analyze_conversation(
                user_message=request.message,
                context=context,
                detected_domain=detected_domain
            )

            # 6. Build comprehensive system prompt
            logger.debug(f"🚀 [SMART-CHAT] Step 6: Building system prompt...")
            domain_instructions = conversation_intelligence.get_domain_instructions(detected_domain)
            output_guidance = conversation_intelligence.get_output_style_guidance(analysis.output_style)
            
            # Build conversation history string
            history_str = "\n".join([
                f"{msg.role}: {msg.content}" for msg in context.recent_messages
            ])
            logger.debug(f"🚀 [SMART-CHAT] History: {len(context.recent_messages)} messages")
            
            system_prompt = MASTER_SYSTEM_PROMPT.format(
                persona_description=analysis.selected_persona,
                domain_specific_instructions=domain_instructions,
                topic_context=context.topic_context or "Không có chủ đề cụ thể.",
                summary=context.session_summary or "Không có tóm tắt.",
                history=history_str or "Đây là tin nhắn đầu tiên.",
                user_message=request.message,
                relevance_guidance=analysis.relevance_guidance,
                output_style_guidance=output_guidance
            )
            logger.debug(f"🚀 [SMART-CHAT] System prompt built ({len(system_prompt)} chars)")
            
            # 7. Send initial metadata
            logger.debug(f"🚀 [SMART-CHAT] Step 7: Sending metadata...")
            metadata = {
                "type": "metadata",
                "session_id": session_id,
                "context_info": {
                    "estimated_tokens": context.estimated_tokens,
                    "relevance_score": context.relevance_score,
                    "is_relevant": context.is_relevant,
                    "has_summary": context.session_summary is not None,
                    "has_topic_context": context.topic_context is not None,
                    "persona_used": analysis.persona_name,
                    "learning_style": analysis.user_learning_style.value,
                    "output_style": analysis.output_style.value,
                    "confidence": analysis.confidence_score,
                    "reasoning": analysis.reasoning,
                    "model_used": selected_model,
                    "domain": detected_domain.value
                }
            }
            yield f"data: {json.dumps(metadata)}\n\n"
            
            # 8. Stream AI response
            logger.debug(f"🚀 [SMART-CHAT] Step 8: Starting AI response stream...")
            full_response = ""
            chunk_count = 0
            
            async for chunk in orchestrator.chat_stream(
                message=request.message,
                context=context,
                analysis=analysis,
                system_prompt=system_prompt,
                model_name=selected_model,
                temperature=0.7,
                max_tokens=2000
            ):
                if chunk and not chunk.startswith("[LỖI:"):
                    full_response += chunk
                    chunk_count += 1
                    
                    chunk_data = {
                        "type": "content",
                        "content": chunk
                    }
                    yield f"data: {json.dumps(chunk_data)}\n\n"
            
            logger.debug(f"🚀 [SMART-CHAT] Stream completed: {chunk_count} chunks, {len(full_response)} chars")
            
            # 9. Save AI response is now handled by backend-main to prevent duplicates.
            # logger.debug(f"🚀 [SMART-CHAT] Step 9: Saving AI response...")
            # if full_response and request.topic_id:
            #     await smart_context_manager.add_message(
            #         session_id=session_id,
            #         user_id=request.user_id,
            #         topic_id=request.topic_id,
            #         node_id=request.node_id,
            #         role="assistant",
            #         content=full_response,
            #         model_used=selected_model
            #     )
            #     logger.debug(f"🚀 [SMART-CHAT] AI response saved")
            # else:
            #     logger.debug(f"🚀 [SMART-CHAT] No topic - AI response not saved")

            # 10. Send completion signal
            processing_time = time.time() - start_time
            session_stats = orchestrator.get_conversation_stats(context)
            
            logger.info(f"✅ [SMART-CHAT] Completed in {processing_time:.2f}s - {len(full_response)} chars")
            
            completion = {
                "type": "done",
                "full_response": full_response,
                "model_used": selected_model,
                "processing_time": processing_time,
                "session_stats": serialize_datetime_objects(session_stats)
            }
            yield f"data: {json.dumps(completion)}\n\n"
            
        except Exception as e:
            logger.error(f"❌ [SMART-CHAT] Error: {e}")
            logger.debug(f"❌ [SMART-CHAT] Error details: {type(e).__name__}: {str(e)}")
            error_data = {
                "type": "error",
                "error": "Lỗi hệ thống, vui lòng thử lại",
                "details": str(e)
            }
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/plain; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        reload=True,
        log_level="info"
    ) 