import asyncio
import time
import os
from typing import List, Dict, Any, Optional
from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocess as mp
from dataclasses import dataclass

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from loguru import logger

from app.models.llm_config import LLMConfig


@dataclass
class AgentConfig:
    name: str
    role: str
    system_prompt: str
    model: str = "deepseek/deepseek-r1-0528:free"
    temperature: float = 0.7
    max_tokens: int = 1000


class MultiAgentOrchestrator:
    """Orchestrates multi-agent conversations with multiprocessing"""
    
    def __init__(self):
        self.max_workers = min(4, os.cpu_count() or 4)
        logger.info(f"MultiAgentOrchestrator initialized with {self.max_workers} workers")
    
    async def single_agent_chat(
        self,
        message: str,
        context: Optional[List[Dict]] = None,
        system_prompt: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Single agent chat response"""
        start_time = time.time()
        
        try:
            # Get LLM
            model_name = options.get("model") if options else None
            llm = LLMConfig.get_llm(
                model_name=model_name,
                temperature=options.get("temperature", 0.7) if options else 0.7,
                max_tokens=options.get("max_tokens", 2000) if options else 2000,
                enable_retry=False  # Disable retry wrapper to avoid field modification
            )
            
            # Build messages
            messages = []
            
            # Add system prompt
            if system_prompt:
                messages.append(SystemMessage(content=system_prompt))
            else:
                default_system = """Bạn là AI Learning Assistant cho Deep Knowledge AI Platform.
Nhiệm vụ của bạn là:
- Hỗ trợ học viên hiểu sâu về chủ đề đang học
- Đưa ra giải thích rõ ràng, dễ hiểu với ví dụ thực tế
- Khuyến khích tư duy phản biện và đặt câu hỏi
- Điều chỉnh phong cách giảng dạy theo trình độ học viên
- Luôn trả lời bằng tiếng Việt

Hãy tương tác một cách thân thiện, động viên và hỗ trợ tốt nhất cho học viên."""
                messages.append(SystemMessage(content=default_system))
            
            # Add context messages
            if context:
                for msg in context[-10:]:  # Last 10 messages
                    if msg["role"] == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        messages.append(AIMessage(content=msg["content"]))
            
            # Add current message
            messages.append(HumanMessage(content=message))
            
            # Generate response
            logger.info(f"Sending {len(messages)} messages to LLM")
            response = await llm.ainvoke(messages)
            logger.info(f"LLM response type: {type(response)}")
            
            processing_time = time.time() - start_time
            
            # Handle response content (could be str or list)
            if hasattr(response, 'content'):
                content = response.content
                logger.info(f"LLM response content type: {type(content)}")
                if isinstance(content, list):
                    response_text = " ".join(str(item) for item in content)
                else:
                    response_text = str(content)
            else:
                logger.warning("Response has no content attribute, using string representation")
                response_text = str(response)
            
            return {
                "response": response_text,
                "model_used": model_name or LLMConfig.get_default_model(),
                "processing_time": processing_time,
                "agent_info": {
                    "type": "single_agent",
                    "system_prompt_used": bool(system_prompt)
                }
            }
            
        except Exception as e:
            logger.error(f"Single agent chat error: {e}")
            raise
    
    async def single_agent_chat_stream(
        self,
        message: str,
        context: Optional[List[Dict]] = None,
        system_prompt: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Single agent chat với streaming response"""
        start_time = time.time()
        
        try:
            # Get streaming LLM
            model_name = options.get("model") if options else None
            llm = LLMConfig.get_llm(
                model_name=model_name,
                temperature=options.get("temperature", 0.7) if options else 0.7,
                max_tokens=options.get("max_tokens", 2000) if options else 2000,
                streaming=True,  # Force streaming
                enable_retry=False
            )
            
            # Build messages
            messages = []
            
            # Add system prompt
            if system_prompt:
                messages.append(SystemMessage(content=system_prompt))
            else:
                default_system = """Bạn là AI Learning Assistant cho Deep Knowledge AI Platform.
Nhiệm vụ của bạn là:
- Hỗ trợ học viên hiểu sâu về chủ đề đang học
- Đưa ra giải thích rõ ràng, dễ hiểu với ví dụ thực tế
- Khuyến khích tư duy phản biện và đặt câu hỏi
- Điều chỉnh phong cách giảng dạy theo trình độ học viên
- Luôn trả lời bằng tiếng Việt

Hãy tương tác một cách thân thiện, động viên và hỗ trợ tốt nhất cho học viên."""
                messages.append(SystemMessage(content=default_system))
            
            # Add context messages
            if context:
                for msg in context[-10:]:  # Last 10 messages
                    if msg["role"] == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        messages.append(AIMessage(content=msg["content"]))
            
            # Add current message
            messages.append(HumanMessage(content=message))
            
            # Create async generator for streaming
            async def stream_generator():
                try:
                    logger.info(f"Starting streaming response for {len(messages)} messages")
                    async for chunk in llm.astream(messages):
                        if hasattr(chunk, 'content') and chunk.content:
                            content = chunk.content
                            if isinstance(content, list):
                                # Handle list content
                                for item in content:
                                    if hasattr(item, 'text'):
                                        yield item.text
                                    else:
                                        yield str(item)
                            else:
                                yield str(content)
                except Exception as e:
                    logger.error(f"Streaming error: {e}")
                    yield f"[Error: {str(e)}]"
            
            processing_time = time.time() - start_time
            
            return {
                "stream": stream_generator(),
                "model_used": model_name or LLMConfig.get_default_model(),
                "processing_time": processing_time,
                "agent_info": {
                    "type": "single_agent_stream",
                    "system_prompt_used": bool(system_prompt)
                }
            }
            
        except Exception as e:
            logger.error(f"Single agent stream error: {e}")
            raise
    
    async def multi_agent_conversation(
        self,
        topic: str,
        agents: List[Dict[str, Any]],
        rounds: int = 3,
        context: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Multi-agent conversation with parallel processing"""
        start_time = time.time()
        
        try:
            # Validate agents
            if len(agents) < 2:
                raise ValueError("At least 2 agents required for conversation")
            
            conversation = []
            agents_used = []
            
            # Convert to AgentConfig objects
            agent_configs = []
            for agent_data in agents:
                config = AgentConfig(
                    name=agent_data["name"],
                    role=agent_data.get("role", "assistant"),
                    system_prompt=agent_data["system_prompt"],
                    model=agent_data.get("model", "google/gemini-2.0-flash-lite-001"),
                    temperature=agent_data.get("temperature", 0.7),
                    max_tokens=agent_data.get("max_tokens", 1000)
                )
                agent_configs.append(config)
                agents_used.append(config.name)
            
            # Initial context
            conversation_context = ""
            if context:
                conversation_context = "\n".join([
                    f"{msg['role']}: {msg['content']}" 
                    for msg in context[-5:]  # Last 5 messages
                ])
            
            # Run conversation rounds
            for round_num in range(rounds):
                logger.info(f"Starting conversation round {round_num + 1}/{rounds}")
                
                # Parallel agent responses
                tasks = []
                for i, agent in enumerate(agent_configs):
                    # Create conversation prompt for this agent
                    agent_prompt = f"""
{agent.system_prompt}

Chủ đề thảo luận: {topic}

Cuộc hội thoại trước đó:
{conversation_context}

Bạn là {agent.name}. Hãy đóng góp ý kiến của mình về chủ đề này.
Trả lời ngắn gọn (tối đa 150 từ) và tập trung vào vai trò của bạn.
"""
                    
                    task = self._agent_response_async(agent, agent_prompt)
                    tasks.append((agent.name, task))
                
                # Wait for all responses
                round_responses = []
                for agent_name, task in tasks:
                    try:
                        response = await task
                        round_responses.append({
                            "agent": agent_name,
                            "message": response
                        })
                        conversation.append({
                            "agent": agent_name,
                            "message": response
                        })
                        logger.info(f"Agent {agent_name} responded in round {round_num + 1}")
                    except Exception as e:
                        logger.error(f"Agent {agent_name} failed in round {round_num + 1}: {e}")
                        # Continue with other agents
                
                # Update conversation context
                round_context = "\n".join([
                    f"{resp['agent']}: {resp['message']}" 
                    for resp in round_responses
                ])
                conversation_context += f"\n\nRound {round_num + 1}:\n{round_context}"
            
            # Generate summary
            summary = await self._generate_summary(conversation, topic)
            
            total_time = time.time() - start_time
            
            return {
                "conversation": conversation,
                "summary": summary,
                "agents_used": agents_used,
                "total_processing_time": total_time
            }
            
        except Exception as e:
            logger.error(f"Multi-agent conversation error: {e}")
            raise
    
    async def _agent_response_async(self, agent: AgentConfig, prompt: str) -> str:
        """Get async response from a single agent"""
        try:
            logger.info(f"Agent {agent.name} generating response...")
            llm = LLMConfig.get_llm(
                model_name=agent.model,
                temperature=agent.temperature,
                max_tokens=agent.max_tokens,
                enable_retry=False  # Disable retry wrapper to avoid field modification
            )
            
            messages = [HumanMessage(content=prompt)]
            response = await llm.ainvoke(messages)
            
            # Handle response content (could be str or list)
            if hasattr(response, 'content'):
                content = response.content
                if isinstance(content, list):
                    result = " ".join(str(item) for item in content)
                else:
                    result = str(content)
                logger.info(f"Agent {agent.name} response: {len(result)} chars")
                return result
            else:
                logger.warning(f"Agent {agent.name} response has no content")
                return str(response)
            
        except Exception as e:
            logger.error(f"Agent {agent.name} response error: {e}")
            return f"[Agent {agent.name} gặp lỗi: {str(e)}]"
    
    async def _generate_summary(self, conversation: List[Dict], topic: str) -> str:
        """Generate conversation summary"""
        try:
            llm = LLMConfig.get_llm(
                model_name="google/gemini-2.0-flash-lite-001",
                enable_retry=False  # Disable retry wrapper to avoid field modification
            )
            
            conv_text = "\n".join([
                f"{msg['agent']}: {msg['message']}" 
                for msg in conversation
            ])
            
            summary_prompt = f"""
Hãy tóm tắt cuộc hội thoại sau đây về chủ đề "{topic}":

{conv_text}

Tóm tắt ngắn gọn (tối đa 200 từ):
- Các điểm chính được thảo luận
- Những ý kiến khác nhau
- Kết luận hoặc hướng giải quyết (nếu có)
"""
            
            messages = [HumanMessage(content=summary_prompt)]
            response = await llm.ainvoke(messages)
            
            # Handle response content (could be str or list)
            if hasattr(response, 'content'):
                content = response.content
                if isinstance(content, list):
                    return " ".join(str(item) for item in content)
                return str(content)
            else:
                logger.warning("Summary response has no content attribute")
                return str(response)
            
        except Exception as e:
            logger.error(f"Summary generation error: {e}")
            return "Không thể tạo tóm tắt cuộc hội thoại." 