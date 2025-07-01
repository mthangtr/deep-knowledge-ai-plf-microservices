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
from app.agents.multi_agent import MultiAgentOrchestrator
from app.agents.db_context_manager import DatabaseContextManager
from app.prompts.core_prompts import MASTER_SYSTEM_PROMPT
from app.prompts.personas import SOCRATIC_MENTOR, CREATIVE_EXPLORER, PRAGMATIC_ENGINEER, DIRECT_INSTRUCTOR
from app.services.model_router_service import model_router
from app.services.cache_manager import cache_manager

load_dotenv()

# Context manager for app lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up langchain-python service...")
    await db_context_manager.init_db()
    await cache_manager.connect()
    yield
    # Shutdown
    logger.info("Shutting down langchain-python service...")
    await cache_manager.close()
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

@app.post("/smart-chat")
async def smart_chat(request: SmartChatRequest):
    """Smart chat với streaming response"""
    start_time = time.time()
    
    async def generate_stream():
        try:
            logger.info(f"Smart chat - User: {request.user_id}, Session: {request.session_id}")
            logger.info(f"Message: {request.message[:100]}...")
            
            # FIXED: Always validate session for topic/node isolation
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
            
            # ENHANCED: Get context with quality analysis
            context_package, quality_metrics = await db_context_manager.get_context_for_message(
                session_id=session_id,
                user_id=request.user_id,
                message=request.message
            )

            # --- MODEL ROUTER ---
            selected_model, domain, tier = model_router.select_model(
                user_message=request.message,
                topic_title=context_package.topic_title,
                node_title=context_package.node_title
            )
            
            # Build a structured history string for the prompt
            history_str = "\n".join(
                [f"{msg.role}: {msg.content}" for msg in context_package.recent]
            )

            # --- Relevance Analysis ---
            relevance_score = _calculate_relevance_score(
                request.message,
                context_package.structural_context
            )
            
            relevance_guidance = ""
            topic_title = context_package.topic_title or "chủ đề hiện tại"

            if relevance_score <= 0.1:
                relevance_guidance = (
                    f"Cảnh báo: Câu hỏi này có vẻ không liên quan đến chủ đề chính là '{topic_title}'. "
                    "Trước khi trả lời, hãy lịch sự hỏi lại người dùng xem họ có muốn tiếp tục với câu hỏi này không "
                    "hay muốn quay lại chủ đề chính. Hãy đề xuất hai lựa chọn rõ ràng."
                )
            elif relevance_score <= 0.4:
                relevance_guidance = (
                    f"Lưu ý: Câu hỏi này có vẻ liên quan một phần đến chủ đề chính. "
                    f"Hãy cố gắng trả lời câu hỏi của người dùng và kết nối nó trở lại với chủ đề đang học là '{topic_title}' "
                    "để mở rộng tư duy."
                )
            
            logger.info(f"Relevance Score: {relevance_score:.2f}. Guidance: {'Provided' if relevance_guidance else 'None'}")

            # --- PERSONA ENGINE (ENHANCED) ---
            user_message_lower = request.message.lower()

            # Keywords for forcing a direct, non-Socratic answer
            direct_request_keywords = [
                "tôi không biết", "chưa bao giờ nghe", "muốn đi thẳng vào vấn đề",
                "giải thích trực tiếp", "đừng hỏi nữa", "cứ trả lời đi", "tôi không hiểu gì",
                "hãy nói về", "cho tôi biết về"
            ]

            selected_persona = None
            persona_name = ""

            # 1. Prioritize direct requests to override default Socratic method
            if any(keyword in user_message_lower for keyword in direct_request_keywords):
                selected_persona = DIRECT_INSTRUCTOR
                persona_name = "Direct Instructor"
            
            # 2. If not a direct request, check for other persona triggers
            if not selected_persona:
                creative_keywords = [
                    "giải thích đơn giản", "ví dụ vui", "thú vị", "một cách sáng tạo",
                    "như thể là", "ví như", "giống như là", "cho người không biết gì"
                ]
                pragmatic_keywords = [
                    "lỗi", "tối ưu", "step-by-step", "cụ thể", "hướng dẫn chi tiết",
                    "thực hành", "triển khai"
                ]

                if any(keyword in user_message_lower for keyword in creative_keywords):
                    selected_persona = CREATIVE_EXPLORER
                    persona_name = "Creative Explorer"
                elif any(keyword in user_message_lower for keyword in pragmatic_keywords):
                    selected_persona = PRAGMATIC_ENGINEER
                    persona_name = "Pragmatic Engineer"
                else:
                    # 3. Fallback to the default Socratic Mentor
                    selected_persona = SOCRATIC_MENTOR
                    persona_name = "Socratic Mentor"
            
            logger.info(f"Persona selected: {persona_name}")

            # --- Output Style Analysis ---
            output_style_guidance = "Hãy trả lời một cách tự nhiên với độ dài phù hợp." # Default
            
            concise_keywords = ["ngắn gọn", "tóm tắt", "ý chính", "câu trả lời ngắn"]
            detailed_keywords = ["chi tiết", "giải thích sâu", "cặn kẽ", "dài hơn"]
            refresh_keywords = ["giải thích lại", "nói cách khác", "theo cách khác", "ví dụ khác"]

            if any(keyword in user_message_lower for keyword in concise_keywords):
                output_style_guidance = "Chỉ dẫn: Hãy trả lời một cách cực kỳ súc tích, tập trung vào điểm chính, không quá 3 câu."
            elif any(keyword in user_message_lower for keyword in detailed_keywords):
                output_style_guidance = "Chỉ dẫn: Hãy giải thích một cách chi tiết và cặn kẽ, bao gồm các ví dụ và ngữ cảnh liên quan nếu có thể."
            elif any(keyword in user_message_lower for keyword in refresh_keywords):
                output_style_guidance = "Chỉ dẫn quan trọng: Người dùng đã nghe giải thích về chủ đề này. Hãy trình bày lại vấn đề bằng một góc nhìn hoặc ví dụ hoàn toàn mới. Tuyệt đối không lặp lại nội dung đã nói."

            
            # Format the master system prompt
            system_prompt = MASTER_SYSTEM_PROMPT.format(
                persona_description=selected_persona,
                topic_context=context_package.structural_context or "Không có chủ đề cụ thể.",
                summary=context_package.summary or "Không có tóm tắt.",
                history=history_str or "Đây là tin nhắn đầu tiên.",
                user_message=request.message,
                relevance_guidance=relevance_guidance or "Câu hỏi của người dùng có liên quan trực tiếp đến chủ đề.",
                output_style_guidance=output_style_guidance
            )
            
            # Send initial metadata
            metadata = {
                "type": "metadata",
                "session_id": session_id,
                "context_info": {
                    "context_type": context_package.context_type.value,
                    "recent_messages_count": len(context_package.recent),
                    "relevant_messages_count": len(context_package.relevant),
                    "has_summary": context_package.summary is not None,
                    "estimated_tokens": context_package.total_tokens_estimate,
                    "quality_score": quality_metrics.overall_quality,
                    "quality_level": quality_metrics.quality_level.value,
                    "relevance_score": quality_metrics.relevance_score,
                    "efficiency_score": quality_metrics.efficiency_score,
                    "processing_time_ms": quality_metrics.processing_time * 1000,
                    "persona_used": persona_name,
                    "model_used": selected_model,
                    "routing_info": {
                        "domain": domain.value,
                        "tier": tier.value
                    }
                }
            }
            yield f"data: {json.dumps(metadata)}\n\n"
            
            # Generate streaming AI response
            logger.info(f"Starting streaming with model: {selected_model}")
            
            try:
                # Get the async generator instance
                stream_generator = orchestrator.single_agent_chat_stream(
                    message=request.message,
                    context=[],
                    system_prompt=system_prompt,
                    options={"model": selected_model}
                )
                
                full_response = ""
                
                # Stream response chunks by iterating over the generator
                async for chunk_content in stream_generator:
                    if chunk_content:
                        full_response += chunk_content
                        
                        chunk_data = {
                            "type": "content",
                            "content": chunk_content
                        }
                        yield f"data: {json.dumps(chunk_data)}\n\n"
                
                # Get session stats
                session_stats = await db_context_manager.get_session_stats(session_id)
                
                processing_time = time.time() - start_time
                
                # Record performance metrics
                await db_context_manager.record_performance_metrics(
                    response_time=processing_time,
                    model_used=selected_model,
                    context_metrics=quality_metrics,
                    error=False
                )
                
                # Send completion signal
                completion = {
                    "type": "done",
                    "full_response": full_response,
                    "model_used": selected_model,
                    "processing_time": processing_time,
                    "session_stats": serialize_datetime_objects(session_stats)
                }
                yield f"data: {json.dumps(completion)}\n\n"
                
            except Exception as ai_error:
                logger.error(f"AI generation failed: {ai_error}")
                # Send error response
                error_data = {
                    "type": "error",
                    "error": "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Hãy thử lại sau.",
                    "details": str(ai_error)
                }
                yield f"data: {json.dumps(error_data)}\n\n"
                
        except Exception as e:
            logger.error(f"Smart chat error: {e}")
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

# NEW ENDPOINTS: Performance Monitoring & Optimization

@app.get("/monitoring/performance")
async def get_performance_metrics(hours_back: int = 24):
    """Get performance monitoring summary"""
    try:
        summary = db_context_manager.get_performance_summary(hours_back)
        return summary
    except Exception as e:
        logger.error(f"Error getting performance metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/monitoring/quality")
async def get_quality_trends(hours_back: int = 24):
    """Get context quality trends"""
    try:
        trends = db_context_manager.get_quality_trends(hours_back)
        return trends
    except Exception as e:
        logger.error(f"Error getting quality trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/monitoring/optimization-report")
async def get_optimization_report():
    """Get comprehensive optimization recommendations"""
    try:
        report = await db_context_manager.get_optimization_report()
        return report
    except Exception as e:
        logger.error(f"Error generating optimization report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/monitoring/alerts")
async def get_recent_alerts(hours_back: int = 1):
    """Get recent performance alerts"""
    try:
        alerts = db_context_manager.performance_monitor.get_recent_alerts(hours_back)
        
        return {
            "period_hours": hours_back,
            "total_alerts": len(alerts),
            "alerts": [
                {
                    "level": alert.level.value,
                    "type": alert.type,
                    "message": alert.message,
                    "metric_value": alert.metric_value,
                    "threshold": alert.threshold,
                    "timestamp": alert.timestamp.isoformat(),
                    "recommendations": alert.recommendations
                }
                for alert in alerts
            ]
        }
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/monitoring/dashboard")
async def get_monitoring_dashboard():
    """Get comprehensive monitoring dashboard data"""
    try:
        # Get current metrics
        current_metrics = db_context_manager.performance_monitor.get_current_metrics()
        
        # Get recent alerts
        recent_alerts = db_context_manager.performance_monitor.get_recent_alerts(1)
        
        # Get performance summary
        performance_24h = db_context_manager.get_performance_summary(24)
        
        # Get quality trends
        quality_24h = db_context_manager.get_quality_trends(24)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "current_metrics": {
                "avg_response_time": current_metrics.avg_response_time if current_metrics else 0,
                "avg_context_quality": current_metrics.avg_context_quality if current_metrics else 0,
                "requests_per_minute": current_metrics.requests_per_minute if current_metrics else 0,
                "error_rate": current_metrics.error_rate if current_metrics else 0,
                "most_used_model": current_metrics.most_used_model if current_metrics else "none"
            },
            "alerts": {
                "total_last_hour": len(recent_alerts),
                "critical_count": len([a for a in recent_alerts if a.level.value == "CRITICAL"]),
                "latest_alerts": [
                    {
                        "level": a.level.value,
                        "type": a.type,
                        "message": a.message,
                        "timestamp": a.timestamp.isoformat()
                    }
                    for a in recent_alerts[:5]  # Latest 5 alerts
                ]
            },
            "performance_24h": performance_24h,
            "quality_24h": quality_24h,
            "system_status": "healthy" if len([a for a in recent_alerts if a.level.value == "CRITICAL"]) == 0 else "degraded"
        }
    except Exception as e:
        logger.error(f"Error getting monitoring dashboard: {e}")
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