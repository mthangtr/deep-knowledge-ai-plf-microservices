from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv
from loguru import logger

from app.models.llm_config import LLMConfig
from app.agents.multi_agent import MultiAgentOrchestrator
from app.agents.context_manager import ContextManager

load_dotenv()

app = FastAPI(
    title="LangChain Python Service",
    description="Multi-agent LLM service với LangChain và OpenRouter",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize orchestrator and context manager
orchestrator = MultiAgentOrchestrator()
context_manager = ContextManager()

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
    session_id: str
    user_id: str
    message: str
    model: Optional[str] = "google/gemini-2.0-flash-lite-001"

class SmartChatResponse(BaseModel):
    response: str
    model_used: str
    processing_time: float
    context_info: Dict[str, Any]
    session_stats: Dict[str, Any]

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
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "openrouter_configured": bool(os.getenv("OPENROUTER_API_KEY")),
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
    """Smart chat với context management"""
    import time
    start_time = time.time()
    
    try:
        logger.info(f"Smart chat - Session: {request.session_id}, User: {request.user_id}")
        logger.info(f"Message: {request.message[:100]}...")
        
        # Add user message to context
        context_manager.add_message(
            session_id=request.session_id,
            user_id=request.user_id,
            role="user",
            content=request.message
        )
        
        # Get smart context for this message
        context_package = await context_manager.get_context_for_message(
            session_id=request.session_id,
            user_id=request.user_id,
            message=request.message
        )
        
        # Build context for LLM
        llm_context = []
        
        # Add recent messages
        for msg in context_package.recent:
            llm_context.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Add summary if available
        if context_package.summary:
            llm_context.insert(0, {
                "role": "system",
                "content": f"Tóm tắt cuộc hội thoại trước: {context_package.summary}"
            })
        
        # Add relevant historical messages
        for msg in context_package.relevant:
            llm_context.append({
                "role": msg.role,
                "content": f"[Relevant from history] {msg.content}"
            })
        
        # Generate AI response
        result = await orchestrator.single_agent_chat(
            message=request.message,
            context=llm_context,
            options={"model": request.model}
        )
        
        # Add AI response to context
        context_manager.add_message(
            session_id=request.session_id,
            user_id=request.user_id,
            role="assistant", 
            content=result["response"]
        )
        
        # Get session stats
        session_stats = context_manager.get_session_stats(request.session_id)
        
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
            session_stats=session_stats
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
    stats = context_manager.get_session_stats(session_id)
    return stats

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        reload=True,
        log_level="info"
    ) 