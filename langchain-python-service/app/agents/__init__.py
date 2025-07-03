"""
Agents Package - Simplified & Smart AI Conversation System
"""

# ✅ NEW SIMPLIFIED COMPONENTS
from .smart_context_manager import SmartContextManager, SmartContextPackage
from .conversation_intelligence import ConversationIntelligence, ConversationAnalysis
from .simplified_orchestrator import SimplifiedOrchestrator

# ✅ CORE COMPONENTS (Still used)
from .context_manager import Message, ContextPackage, ContextNeedType

# ⚠️ DEPRECATED (Keep for backward compatibility but warn)
import warnings

# Multi-agent is kept but marked as deprecated
try:
    from .multi_agent import MultiAgentOrchestrator
    warnings.warn(
        "MultiAgentOrchestrator is deprecated. Use SimplifiedOrchestrator instead.",
        DeprecationWarning,
        stacklevel=2
    )
except ImportError:
    pass  # If file doesn't exist, that's fine

__all__ = [
    # New simplified components
    'SmartContextManager',
    'SmartContextPackage',
    'ConversationIntelligence', 
    'ConversationAnalysis',
    'UserPattern',
    'SimplifiedOrchestrator',
    
    # Core components
    'Message',
    'ContextPackage', 
    'ContextNeedType',
    
    # Deprecated (for backward compatibility)
    'MultiAgentOrchestrator',
]

# Debug info
import os
if os.getenv('DEBUG_AGENTS', 'false').lower() == 'true':
    from loguru import logger
    logger.info("🤖 Agents package loaded with simplified architecture")
    logger.info("✅ SmartContextManager: Intelligent context management")
    logger.info("✅ ConversationIntelligence: Dynamic persona selection")
    logger.info("✅ SimplifiedOrchestrator: Clean conversation flow")
    logger.warning("⚠️ MultiAgentOrchestrator: DEPRECATED - Use SimplifiedOrchestrator") 