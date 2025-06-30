from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv
from loguru import logger
from contextlib import asynccontextmanager

from app.models.llm_config import LLMConfig
from app.agents.multi_agent import MultiAgentOrchestrator
from app.agents.db_context_manager import DatabaseContextManager
from app.agents.router_agent import ContextNeedType

load_dotenv()

# Context manager for app lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up langchain-python service...")
    await db_context_manager.init_db()
    yield
    # Shutdown
    logger.info("Shutting down langchain-python service...")
    await db_context_manager.close()

app = FastAPI(
    title="LangChain Python Service",
    description="Multi-agent LLM service với LangChain và OpenRouter",
    version="2.0.0",
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

# Initialize orchestrator and database context manager
orchestrator = MultiAgentOrchestrator()
db_context_manager = DatabaseContextManager()

# Pydantic models
class ChatMessage(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str

class ChatRequest(BaseModel):
    message: str
    context: List[ChatMessage] = []
    system_prompt: Optional[str] = None
    options: Optional[Dict[str, Any]] = {}

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

class MultiAgentRequest(BaseModel):
    topic: str
    agents: List[Dict[str, Any]]
    rounds: int = 3
    context: List[ChatMessage] = []

class MultiAgentResponse(BaseModel):
    conversation: List[Dict[str, str]]
    summary: str
    agents_used: List[str]
    total_processing_time: float

@app.get("/")
async def root():
    return {
        "service": "LangChain Python Service",
        "status": "running",
        "version": "2.0.0",
        "database": "PostgreSQL with pgvector"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "openrouter_configured": bool(os.getenv("OPENROUTER_API_KEY")),
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "database_configured": bool(os.getenv("DATABASE_URL")),
        "models_available": LLMConfig.get_available_models()
    }

@app.post("/chat", response_model=ChatResponse)
async def chat_single(request: ChatRequest):
    """Single agent chat endpoint"""
    try:
        logger.info(f"Processing single chat: {request.message[:50]}...")
        
        # Convert ChatMessage to Dict
        context_dict = [
            {"role": msg.role, "content": msg.content}
            for msg in request.context
        ]
        
        result = await orchestrator.single_agent_chat(
            message=request.message,
            context=context_dict,
            system_prompt=request.system_prompt,
            options=request.options
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/smart-chat", response_model=SmartChatResponse)
async def smart_chat(request: SmartChatRequest):
    """Smart chat với persistent context management (like ChatGPT)"""
    import time
    start_time = time.time()
    
    try:
        logger.info(f"Smart chat - User: {request.user_id}, Session: {request.session_id}")
        logger.info(f"Message: {request.message[:100]}...")
        
        # FIXED: Always validate session for topic/node isolation
        # Let database logic handle proper session isolation instead of blindly reusing frontend session_id
        session_id = await db_context_manager.get_or_create_session(
            user_id=request.user_id,
            topic_id=request.topic_id,
            node_id=request.node_id,
            title=f"Chat - {request.message[:50]}..."
        )
        
        if not request.session_id:
            logger.info(f"Created new session: {session_id}")
        elif request.session_id != session_id:
            logger.info(f"Switched to proper session: {session_id} (was: {request.session_id})")
        else:
            logger.info(f"Using existing session: {session_id}")
        
        # FIXED: Get context BEFORE adding current message để tránh duplicate
        # Get smart context for this message (không bao gồm message hiện tại)
        context_package = await db_context_manager.get_context_for_message(
            session_id=session_id,
            user_id=request.user_id,
            message=request.message
        )
        
        # Build context for LLM - OPTIMIZED: Smart context building
        llm_context = []
        
        # Add recent messages (always include)
        for msg in context_package.recent:
            llm_context.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Only add summary if we have many messages to avoid token waste
        if context_package.summary and len(context_package.recent) > 5:
            llm_context.insert(0, {
                "role": "system",
                "content": f"Tóm tắt cuộc hội thoại trước: {context_package.summary}"
            })
        
        # Only add relevant messages if context type requires it
        if context_package.context_type == ContextNeedType.SMART_RETRIEVAL:
            for msg in context_package.relevant[:3]:  # Limit to 3 most relevant
                llm_context.append({
                    "role": msg.role,
                    "content": f"[Relevant] {msg.content}"
                })
        
        # FIXED: Better logging to understand context composition
        logger.info(f"Context built - Recent: {len(context_package.recent)}, "
                   f"Relevant: {len(context_package.relevant)}, "
                   f"Has summary: {context_package.summary is not None}")
        logger.info(f"Final LLM context messages: {len(llm_context)}")
        
        # Generate AI response với context + current message
        logger.info(f"Calling single_agent_chat with model: {request.model}")
        
        try:
            result = await orchestrator.single_agent_chat(
                message=request.message,  # Current message để process
                context=llm_context,      # Context từ history (không chứa current message)
                options={"model": request.model}
            )
            logger.info(f"AI response generated: {len(result['response'])} chars")
        except Exception as ai_error:
            logger.error(f"AI generation failed: {ai_error}")
            # Fallback response
            result = {
                "response": "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Hãy thử lại sau.",
                "model_used": request.model or "fallback",
                "processing_time": 0.1,
                "agent_info": {"type": "fallback", "error": str(ai_error)}
            }
        
        # FIXED: Save user message SAU KHI đã generate AI response
        await db_context_manager.add_message(
            session_id=session_id,
            user_id=request.user_id,
            role="user",
            content=request.message
        )
        
        # Add AI response to context
        await db_context_manager.add_message(
            session_id=session_id,
            user_id=request.user_id,
            role="assistant", 
            content=result["response"],
            model_used=result["model_used"],
            tokens_used=context_package.total_tokens_estimate
        )
        
        # Get session stats
        session_stats = await db_context_manager.get_session_stats(session_id)
        
        processing_time = time.time() - start_time
        
        return SmartChatResponse(
            response=result["response"],
            model_used=result["model_used"],
            processing_time=processing_time,
            context_info={
                "context_type": context_package.context_type.value,
                "recent_messages_count": len(context_package.recent),
                "relevant_messages_count": len(context_package.relevant),
                "has_summary": context_package.summary is not None,
                "estimated_tokens": context_package.total_tokens_estimate
            },
            session_stats=session_stats,
            session_id=session_id
        )
        
    except Exception as e:
        logger.error(f"Smart chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/multi-agent", response_model=MultiAgentResponse)
async def multi_agent_conversation(request: MultiAgentRequest):
    """Multi-agent conversation endpoint"""
    try:
        logger.info(f"Processing multi-agent conversation: {request.topic[:50]}...")
        
        # Convert ChatMessage to Dict
        context_dict = [
            {"role": msg.role, "content": msg.content}
            for msg in request.context
        ]
        
        result = await orchestrator.multi_agent_conversation(
            topic=request.topic,
            agents=request.agents,
            rounds=request.rounds,
            context=context_dict
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Multi-agent error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def get_models():
    """Get available LLM models"""
    return {
        "models": LLMConfig.get_available_models(),
        "default": LLMConfig.get_default_model()
    }

@app.get("/session/{session_id}/stats")
async def get_session_stats(session_id: str):
    """Get session statistics"""
    stats = await db_context_manager.get_session_stats(session_id)
    return stats

@app.get("/user/{user_id}/sessions")
async def get_user_sessions(user_id: str, active_only: bool = True):
    """Get user's chat sessions"""
    try:
        if not db_context_manager.db_pool:
            raise HTTPException(status_code=503, detail="Database not initialized")
            
        async with db_context_manager.db_pool.acquire() as conn:
            query = """
                SELECT 
                    cs.id,
                    cs.title,
                    cs.message_count,
                    cs.last_activity,
                    cs.created_at,
                    lt.title as topic_title,
                    tn.title as node_title
                FROM chat_sessions cs
                LEFT JOIN learning_topics lt ON cs.topic_id = lt.id
                LEFT JOIN tree_nodes tn ON cs.node_id = tn.id
                WHERE cs.user_id = $1
            """
            
            if active_only:
                query += " AND cs.is_active = true"
            
            query += " ORDER BY cs.last_activity DESC"
            
            rows = await conn.fetch(query, user_id)
            
            return {
                "sessions": [dict(row) for row in rows],
                "total": len(rows)
            }
    except Exception as e:
        logger.error(f"Error getting user sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        reload=True,
        log_level="info"
    ) 