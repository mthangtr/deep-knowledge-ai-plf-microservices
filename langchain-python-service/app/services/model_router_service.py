from typing import Optional, Tuple
from loguru import logger
import re

from app.config.model_router_config import (
    Domain,
    ModelTier,
    DOMAIN_KEYWORDS,
    LEVEL_2_KEYWORDS,
    LEVEL_3_KEYWORDS,
    FORCE_LEVEL_3_KEYWORDS,
    MODEL_STRATEGY
)
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.models.llm_config import LLMConfig

class ModelRouterService:
    """A service to select the best LLM model based on context and message."""

    def _determine_domain(self, user_message: str, topic_title: Optional[str], node_title: Optional[str]) -> Domain:
        """Determines the knowledge domain based on message, topic, and node titles."""
        
        # Combine all available context for a comprehensive check
        context_text = f"{user_message} {topic_title or ''} {node_title or ''}".lower()

        if not context_text.strip():
            return Domain.DEFAULT

        for domain, keywords in DOMAIN_KEYWORDS.items():
            if any(keyword in context_text for keyword in keywords):
                return domain
        
        return Domain.DEFAULT

    def _determine_tier(self, user_message: str) -> ModelTier:
        """Determines the complexity tier based on the user's message."""
        msg_lower = user_message.lower()

        # Priority 1: Check for keywords that force the highest tier.
        if any(keyword in msg_lower for keyword in FORCE_LEVEL_3_KEYWORDS):
            return ModelTier.LEVEL_3

        # Priority 2: Check for Level 3 keywords.
        if any(keyword in msg_lower for keyword in LEVEL_3_KEYWORDS):
            return ModelTier.LEVEL_3

        # Priority 3: Check for Level 2.
        if any(keyword in msg_lower for keyword in LEVEL_2_KEYWORDS):
            return ModelTier.LEVEL_2
            
        # Default to Level 1.
        return ModelTier.LEVEL_1

    def select_model(
        self,
        user_message: str,
        topic_title: Optional[str] = None,
        node_title: Optional[str] = None,
        preferred_model: Optional[str] = None
    ) -> Tuple[str, Domain]:
        """
        Selects the best model based on domain, tier, and preferences.
        Returns a tuple of (model_name, detected_domain).
        """
        domain = self._determine_domain(user_message, topic_title, node_title)

        if preferred_model and preferred_model in LLMConfig.AVAILABLE_MODELS:
            logger.info(f"Using user-preferred model: {preferred_model}, but domain detected as: {domain.value}")
            return preferred_model, domain

        tier = self._determine_tier(user_message)

        model_name = MODEL_STRATEGY.get(domain, {}).get(tier)
        if not model_name:
            # Fallback to default if specific strategy not found
            model_name = MODEL_STRATEGY[Domain.DEFAULT][tier]

        logger.info(f"Selected model: {model_name} (Domain: {domain.value}, Tier: {tier.value})")
        return model_name, domain

# Create a single instance to be used across the application
model_router = ModelRouterService() 