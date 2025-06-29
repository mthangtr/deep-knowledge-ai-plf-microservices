import os
from typing import Dict, List, Optional
from langchain_openai import ChatOpenAI
from pydantic import SecretStr
from loguru import logger
import time
import json

class OpenRouterError(Exception):
    """Custom exception for OpenRouter API errors"""
    def __init__(self, code: int, message: str, metadata: Optional[Dict] = None):
        self.code = code
        self.message = message
        self.metadata = metadata or {}
        super().__init__(f"OpenRouter Error {code}: {message}")

class LLMConfig:
    """Configuration for LLM models via OpenRouter với proper error handling"""
    
    # Available models on OpenRouter (updated with current models)
    AVAILABLE_MODELS = {
        "google/gemini-2.5-flash": {
            "name": "Gemini 2.5 Flash",
            "provider": "Google",
            "context_length": 1000000,
            "cost_per_token": 0.0001,
            "supports_streaming": True,
            "supports_non_streaming": True,
            "warm_up_time": "fast",
            "recommended_for": ["fast_responses", "general_chat", "latest_model"]
        },
        "google/gemini-2.0-flash-lite-001": {
            "name": "Gemini 2.0 Flash Lite",
            "provider": "Google",
            "context_length": 1000000,
            "cost_per_token": 0.00005,
            "supports_streaming": True,
            "supports_non_streaming": True,
            "warm_up_time": "fast",  # Usually ready quickly
            "recommended_for": ["cost_effective", "fast_responses", "general_chat"]
        },
        "deepseek/deepseek-r1-0528:free": {
            "name": "DeepSeek R1 (Free)",
            "provider": "DeepSeek",
            "context_length": 65536,
            "cost_per_token": 0.0,
            "supports_streaming": True,
            "supports_non_streaming": False,  # 🔥 Free models often streaming-only
            "warm_up_time": "slow",  # May need cold start time
            "recommended_for": ["free_usage", "reasoning", "analysis", "coding"]
        }
    }
    
    @classmethod
    def get_llm(cls, model_name: Optional[str] = None, enable_retry: bool = True, **kwargs):
        """Create LangChain LLM instance for OpenRouter với error handling"""
        
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")
        
        # Check for force OpenAI flag (should be false for OpenRouter)
        force_openai = os.getenv("FORCE_OPENAI", "false").lower() == "true"
        
        if force_openai and openai_key:
            logger.info("FORCE_OPENAI=true, using OpenAI direct")
            return cls._get_openai_direct(model_name, **kwargs)
        
        # Use OpenRouter as primary
        if not openrouter_key:
            if openai_key:
                logger.warning("OpenRouter key not found, falling back to OpenAI direct")
                return cls._get_openai_direct(model_name, **kwargs)
            else:
                raise ValueError("OPENROUTER_API_KEY environment variable is required")
        
        model = model_name or cls.get_default_model()
        model_info = cls.get_model_info(model)
        
        if not model_info:
            logger.warning(f"Model {model} not in available models, using default")
            model = cls.get_default_model()
            model_info = cls.get_model_info(model)
        
        # Default parameters
        default_params = {
            "temperature": 0.7,
            "max_tokens": 2000,
            "top_p": 1.0,
        }
        
        # Merge with provided kwargs
        params = {**default_params, **kwargs}
        
        # 🔥 Force streaming since OpenRouter non-streaming returns empty responses
        force_streaming = kwargs.get("streaming", None)
        if force_streaming is None:
            # OpenRouter requires streaming for reliable responses
            use_streaming = True
        else:
            use_streaming = force_streaming
        
        # OpenRouter headers according to docs
        app_url = os.getenv("APP_URL", "http://localhost:3000")
        app_name = os.getenv("APP_NAME", "Deep Knowledge AI Platform")
        
        # Adjust timeout based on model warm-up time
        timeout = 60  # Default
        if model_info and model_info.get("warm_up_time") == "slow":
            timeout = 120  # Longer timeout for models that may need cold start
        
        # Create model kwargs - suppress warning với explicit parameters
        model_kwargs = {
            "max_tokens": params["max_tokens"],
            "top_p": params["top_p"],
        }
        
        if use_streaming:
            model_kwargs["stream"] = True
        else:
            model_kwargs["stream"] = False
        
        # Create OpenAI-compatible client for OpenRouter
        llm = ChatOpenAI(
            model=model,
            api_key=SecretStr(openrouter_key) if openrouter_key else None,
            base_url="https://openrouter.ai/api/v1", 
            temperature=params["temperature"],
            streaming=use_streaming,  # 🔥 Use streaming for reliability
            timeout=timeout,
            model_kwargs=model_kwargs,
            default_headers={
                "Referer": app_url,  # Required for leaderboard
                "X-Title": app_name,  # Required for leaderboard
            }
        )
        
        # LLM created successfully
        
        # Wrap with retry logic if enabled
        if enable_retry:
            return cls._wrap_with_retry(llm, model_info)
        
        return llm
    
    @classmethod
    def _wrap_with_retry(cls, llm, model_info: Optional[Dict]):
        """Wrap LLM với retry logic cho no-content và error handling"""
        
        original_invoke = llm.invoke
        original_ainvoke = llm.ainvoke
        
        def invoke_with_retry(messages, max_retries=3, **kwargs):
            """Sync invoke với retry logic"""
            for attempt in range(max_retries):
                try:
                    result = original_invoke(messages, **kwargs)
                    if result and result.content:
                        return result
                    
                    # No content generated - may be cold start
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt
                        logger.warning(f"No content generated (attempt {attempt + 1}), retrying in {wait_time}s")
                        time.sleep(wait_time)
                    
                except Exception as e:
                    logger.error(f"LLM invoke error (attempt {attempt + 1}): {e}")
                    if attempt < max_retries - 1:
                        time.sleep(2)
                    else:
                        raise
            
            raise OpenRouterError(503, "No content generated after retries")
        
        async def ainvoke_with_retry(messages, max_retries=3, **kwargs):
            """Async invoke với retry logic"""
            import asyncio
            
            for attempt in range(max_retries):
                try:
                    result = await original_ainvoke(messages, **kwargs)
                    if result and result.content:
                        return result
                    
                    # No content generated - may be cold start
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt
                        logger.warning(f"No content generated (attempt {attempt + 1}), retrying in {wait_time}s")
                        await asyncio.sleep(wait_time)
                    
                except Exception as e:
                    logger.error(f"LLM ainvoke error (attempt {attempt + 1}): {e}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2)
                    else:
                        raise
            
            raise OpenRouterError(503, "No content generated after retries")
        
        # Replace methods
        llm.invoke = invoke_with_retry
        llm.ainvoke = ainvoke_with_retry
        
        return llm
    
    @classmethod
    def _get_openai_direct(cls, model_name: Optional[str] = None, **kwargs):
        """Create direct OpenAI LLM instance as fallback"""
        
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            raise ValueError("OPENAI_API_KEY environment variable is required for fallback")
        
        # Map OpenRouter model names to OpenAI model names
        openai_model_map = {
            "deepseek/deepseek-r1-0528:free": "deepseek/deepseek-r1-0528:free",  # Fallback for free models
        }
        
        model = model_name or "deepseek/deepseek-r1-0528:free"
        openai_model = openai_model_map.get(model, "deepseek/deepseek-r1-0528:free")
        
        # Default parameters
        default_params = {
            "temperature": 0.7,
            "max_tokens": 2000,
        }
        
        # Merge with provided kwargs
        params = {**default_params, **kwargs}
        
        llm = ChatOpenAI(
            model=openai_model,  # Use 'model' for LangChain 0.3.x
            api_key=SecretStr(openai_key),  # Convert to SecretStr
            temperature=params["temperature"],
            timeout=60,  # Use 'timeout' for LangChain 0.3.x
            streaming=False  # 🔥 Disable streaming for fallback too
        )
        
        # OpenAI direct LLM created
        return llm
    
    @classmethod
    def get_available_models(cls) -> List[Dict]:
        """Get list of available models"""
        return [
            {
                "id": model_id,
                **model_info
            }
            for model_id, model_info in cls.AVAILABLE_MODELS.items()
        ]
    
    @classmethod
    def get_default_model(cls) -> str:
        """Get default model from env or fallback"""
        return os.getenv("DEFAULT_MODEL", "google/gemini-2.5-flash")
    
    @classmethod
    def get_model_info(cls, model_id: str) -> Optional[Dict]:
        """Get information about a specific model"""
        return cls.AVAILABLE_MODELS.get(model_id)
    
    @classmethod
    def estimate_cost(cls, model_id: str, token_count: int) -> float:
        """Estimate cost for token usage"""
        model_info = cls.get_model_info(model_id)
        if not model_info:
            return 0.0
        
        return token_count * model_info["cost_per_token"] 