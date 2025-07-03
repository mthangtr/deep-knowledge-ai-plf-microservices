"""
Debug Configuration for LangChain Python Service
Run this to enable debug mode and comprehensive logging
"""

import os
import sys
from loguru import logger

def setup_debug_logging():
    """Setup comprehensive debug logging for all components"""
    
    # Remove default logger
    logger.remove()
    
    # Add colorful console logger với detailed format
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
               "<level>{level: <8}</level> | "
               "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
               "<level>{message}</level>",
        level="DEBUG",
        colorize=True,
        backtrace=True,
        diagnose=True
    )
    
    # Add file logger cho production debugging
    logger.add(
        "debug-logs/smart_chat_debug.log",
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} | {message}",
        level="DEBUG",
        rotation="10 MB",
        retention="3 days",
        compression="zip",
        backtrace=True,
        diagnose=True
    )
    
    # Separate log file cho errors
    logger.add(
        "debug-logs/errors.log",
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} | {message}",
        level="ERROR",
        rotation="5 MB",
        retention="1 week",
        compression="zip",
        backtrace=True,
        diagnose=True
    )
    
    logger.info("🐛 Debug logging enabled with comprehensive tracking")

def setup_debug_environment():
    """Setup debug environment variables"""
    
    debug_vars = {
        "DEBUG_AGENTS": "true",
        "DEBUG_CONTEXT": "true", 
        "DEBUG_INTELLIGENCE": "true",
        "DEBUG_ORCHESTRATOR": "true",
        "DEBUG_MAIN": "true",
        "LOG_LEVEL": "DEBUG",
        "LOGURU_LEVEL": "DEBUG",
        "ENABLE_PERFORMANCE_LOGGING": "true",
        "LOG_SLOW_QUERIES": "true",
        "SLOW_QUERY_THRESHOLD": "1.0",
        "DEBUG_MODE": "true"
    }
    
    for key, value in debug_vars.items():
        if not os.getenv(key):
            os.environ[key] = value
    
    logger.info("🔧 Debug environment variables configured")

def print_debug_guide():
    """Print debugging guide for tracking conversations"""
    
    guide = """
🐛 DEBUG MODE ACTIVATED
======================

Debug Symbols Guide:
    🚀 [SMART-CHAT] - Main conversation flow
    🔍 [CONTEXT] - Context building & management  
    🧠 [INTELLIGENCE] - Persona selection & analysis
    🎭 [ORCHESTRATOR] - AI response generation
    ✅ - Success/completion markers
    ❌ - Error indicators
    ⚡ - Performance optimizations

Key Tracking Points:
    1. Request → Session creation → Context building
    2. Message analysis → Persona selection → Model routing
    3. System prompt → AI streaming → Response saving
    4. Performance metrics → Error handling

Debug Log Files:
    📂 debug-logs/smart_chat_debug.log - All debug info
    📂 debug-logs/errors.log - Errors only

Environment Variables Set:
    ✓ DEBUG_AGENTS=true
    ✓ DEBUG_CONTEXT=true
    ✓ DEBUG_INTELLIGENCE=true  
    ✓ DEBUG_ORCHESTRATOR=true
    ✓ DEBUG_MAIN=true

To disable debug mode:
    Set environment variables to 'false' or remove them
    
Happy debugging! 🚀
"""
    
    print(guide)
    logger.info("🐛 Debug guide displayed")

def enable_debug_mode():
    """Enable comprehensive debug mode"""
    
    # Create debug logs directory
    os.makedirs("debug-logs", exist_ok=True)
    
    # Setup environment
    setup_debug_environment()
    
    # Setup logging
    setup_debug_logging()
    
    # Show guide
    print_debug_guide()
    
    logger.success("🎯 Debug mode fully activated!")

if __name__ == "__main__":
    enable_debug_mode() 