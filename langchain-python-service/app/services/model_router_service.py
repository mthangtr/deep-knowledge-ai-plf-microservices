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

class ModelRouterService:
    """A service to select the best LLM model based on context and message."""

    def _determine_domain(self, topic_title: Optional[str], node_title: Optional[str]) -> Domain:
        """Determines the knowledge domain based on topic and node titles."""
        if not topic_title and not node_title:
            return Domain.DEFAULT

        # Combine titles for a comprehensive check
        full_title = f"{topic_title or ''} {node_title or ''}".lower()

        for domain, keywords in DOMAIN_KEYWORDS.items():
            if any(keyword in full_title for keyword in keywords):
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
        node_title: Optional[str] = None
    ) -> Tuple[str, Domain, ModelTier]:
        """
        Selects the optimal model, returning the model name, its domain, and tier.
        """
        domain = self._determine_domain(topic_title, node_title)
        tier = self._determine_tier(user_message)

        selected_model = MODEL_STRATEGY[domain][tier]
        
        logger.info(f"Model selected. Domain: {domain.value}, Tier: {tier.value} -> Model: {selected_model}")

        return selected_model, domain, tier

# Create a single instance to be used across the application
model_router = ModelRouterService() 