import os
from typing import Dict, List, Optional
from langchain_openai import ChatOpenAI
from pydantic import SecretStr
from loguru import logger

class LLMConfig:
    """Configuration cho OpenRouter LLM models"""
    
    # Available models với metadata
    AVAILABLE_MODELS = {
        "openai/gpt-4o-mini": {
            "provider": "OpenAI",
            "supports_streaming": True,
            "supports_non_streaming": True,
            "context_window": 128000,
            "max_output": 16000,
            "cost_per_mtok_input": 0.15,
            "cost_per_mtok_output": 0.60,
            "warm_up_time": "fast"
        },
        "google/gemini-2.0-flash-lite-001": {
            "provider": "OpenRouter",
            "supports_streaming": True,
            "supports_non_streaming": True,
            "context_window": 1048576,
            "max_output": 8192,
            "cost_per_mtok_input": 0.075,
            "cost_per_mtok_output": 0.3,
            "warm_up_time": "fast"
        },
        "google/gemini-2.5-flash": {
            "provider": "OpenRouter", 
            "supports_streaming": True,
            "supports_non_streaming": True,
            "context_window": 1048576,
            "max_output": 8192,
            "cost_per_mtok_input": 0.30,
            "cost_per_mtok_output": 2.50,
            "warm_up_time": "fast"
        },
        "google/gemini-2.5-pro": {
            "provider": "OpenRouter",
            "supports_streaming": True,
            "supports_non_streaming": True,
            "context_window": 1048576,
            "max_output": 66000,
            "cost_per_mtok_input": 1.25,
            "cost_per_mtok_output": 10.0,
            "warm_up_time": "medium"
        },
        "anthropic/claude-3-sonnet-20240229": {
            "provider": "OpenRouter",
            "supports_streaming": True,
            "supports_non_streaming": True,
            "context_window": 200000,
            "max_output": 64000,
            "cost_per_mtok_input": 3.0,
            "cost_per_mtok_output": 15.0,
            "warm_up_time": "medium"
        },
        "deepseek/deepseek-r1-0528:free": {
            "provider": "OpenRouter",
            "supports_streaming": True,
            "supports_non_streaming": False,  # 🔥 Free models often streaming-only
            "context_window": 32768,
            "max_output": 4096,
            "cost_per_mtok_input": 0,
            "cost_per_mtok_output": 0,
            "warm_up_time": "slow"
        }
    }
    
    @staticmethod
    def get_default_model() -> str:
        """Get default model name"""
        return "openai/gpt-4o-mini"
    
    @staticmethod
    def get_llm(
        model_name: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        streaming: bool = False,  # Add streaming parameter
        enable_retry: bool = True,
        **kwargs
    ) -> ChatOpenAI:
        """Factory method để tạo OpenRouter LLM instance"""
        model = model_name or LLMConfig.get_default_model()
        model_config = LLMConfig.AVAILABLE_MODELS.get(model, LLMConfig.AVAILABLE_MODELS[LLMConfig.get_default_model()])
        
        return LLMConfig._create_openrouter_llm(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            streaming=streaming,  # Pass streaming parameter
            enable_retry=enable_retry,
            **kwargs
        )
    
    @staticmethod
    def _create_openrouter_llm(
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        streaming: bool = False,  # Add streaming parameter
        enable_retry: bool = True,
        **kwargs
    ) -> ChatOpenAI:
        """Tạo OpenRouter LLM instance với proper configuration"""
        
        # 🔥 Force streaming since OpenRouter non-streaming returns empty responses
        force_streaming = kwargs.get("streaming", None)
        if force_streaming is None:
            # If streaming parameter is explicitly passed, use it
            use_streaming = streaming
        else:
            use_streaming = force_streaming
        
        model_kwargs = {}
        
        # Add provider-specific parameters
        provider_params = kwargs.get("provider_params", {})
        model_kwargs.update(provider_params)
        
        # Configure for reliability
        if use_streaming:
            model_kwargs["stream"] = True
        else:
            model_kwargs["stream"] = False
        
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable is required")
        
        llm = ChatOpenAI(
            model=model,
            api_key=SecretStr(api_key),
            base_url="https://openrouter.ai/api/v1",
            model_kwargs=model_kwargs,
            streaming=use_streaming,  # Use the determined streaming value
            max_retries=2,
            timeout=30,
            temperature=temperature,
            default_headers={
                "Referer": os.getenv("APP_URL", "http://localhost:3000"),  # Required for leaderboard
                "X-Title": os.getenv("APP_NAME", "Deep Knowledge AI Platform"),  # Required for leaderboard
            }
        )
        
        # LLM created successfully
        
        # Wrap with retry logic if enabled
        if enable_retry:
            return LLMConfig._wrap_with_retry(llm, LLMConfig.AVAILABLE_MODELS[model])
        
        return llm
    
    @classmethod
    def get_available_models(cls) -> List[Dict]:
        """Get list of available models với metadata"""
        return [
            {
                "id": model_id,
                "name": model_id.split("/")[-1],
                **model_config
            }
            for model_id, model_config in cls.AVAILABLE_MODELS.items()
        ]
    
    @classmethod
    def get_model_info(cls, model_name: str) -> Optional[Dict]:
        """Get model configuration"""
        return cls.AVAILABLE_MODELS.get(model_name)
    
    @classmethod
    def _wrap_with_retry(cls, llm: ChatOpenAI, model_info: Dict) -> ChatOpenAI:
        """Wrap LLM với retry logic nếu cần"""
        # For now, return as-is. Could add retry wrapper later
        return llm 