"""
Test Enhanced Router Agent với confidence scoring và pattern matching
"""

import asyncio
from app.agents.router_agent import RouterAgent, ContextNeedType

async def test_router_patterns():
    """Test various message patterns với enhanced router"""
    
    router = RouterAgent(enable_llm_analysis=False)  # Rule-based only for testing
    
    test_cases = [
        # Greetings
        ("Xin chào", None, ContextNeedType.NONE),
        ("Xin chào, tôi muốn hỏi về Python", None, ContextNeedType.NONE),  # Negative pattern
        ("Hello", [], ContextNeedType.NONE),
        
        # Continuations
        ("Tiếp tục giải thích đi", [{"role": "assistant", "content": "Python là..."}], ContextNeedType.RECENT_ONLY),
        ("Nói thêm về điều đó", [{"role": "user", "content": "AI là gì?"}], ContextNeedType.RECENT_ONLY),
        ("Chi tiết hơn được không?", [{"role": "assistant", "content": "Machine learning..."}], ContextNeedType.RECENT_ONLY),
        
        # Clarifications
        ("Ý bạn là gì?", [{"role": "assistant", "content": "Neural networks..."}], ContextNeedType.RECENT_ONLY),
        ("Tôi không hiểu", [{"role": "assistant", "content": "Complex explanation..."}], ContextNeedType.RECENT_ONLY),
        
        # Historical references
        ("Như tôi đã hỏi tuần trước về Docker", None, ContextNeedType.SMART_RETRIEVAL),
        ("Hôm qua bạn nói gì về Kubernetes?", None, ContextNeedType.SMART_RETRIEVAL),
        
        # Search patterns
        ("Tìm lại phần về database design", None, ContextNeedType.SMART_RETRIEVAL),
        ("Liên quan đến microservices thì sao?", None, ContextNeedType.SMART_RETRIEVAL),
        
        # Summary requests
        ("Tóm tắt cuộc hội thoại này", [{"role": "user", "content": "..."}], ContextNeedType.FULL_CONTEXT),
        ("Review lại toàn bộ những gì chúng ta đã thảo luận", None, ContextNeedType.FULL_CONTEXT),
        
        # Edge cases
        ("OK", [{"role": "assistant", "content": "Đã giải thích xong"}], ContextNeedType.RECENT_ONLY),
        ("?", [{"role": "user", "content": "Explain more"}], ContextNeedType.RECENT_ONLY),
        ("Vậy nó hoạt động như thế nào?", [], ContextNeedType.RECENT_ONLY),  # Implicit reference
        
        # New topic
        ("Bây giờ tôi muốn hỏi về topic khác", None, ContextNeedType.NONE),
        ("Chuyển chủ đề sang AI", None, ContextNeedType.NONE),
    ]
    
    print("=" * 80)
    print("ENHANCED ROUTER AGENT TEST")
    print("=" * 80)
    
    for message, context, expected_type in test_cases:
        result = await router.analyze_context_need(message, context)
        
        # Format context for display
        context_str = "No context" if not context else f"{len(context)} messages"
        
        # Check if result matches expected
        match = "✅" if result.type == expected_type else "❌"
        
        print(f"\nMessage: '{message}'")
        print(f"Context: {context_str}")
        print(f"Expected: {expected_type.value}")
        print(f"Result: {result.type.value} (confidence: {result.confidence:.2f}) {match}")
        print(f"Reason: {result.reason}")
        
        if result.keywords:
            print(f"Keywords: {', '.join(result.keywords)}")
    
    print("\n" + "=" * 80)

async def test_confidence_levels():
    """Test confidence scoring với different scenarios"""
    
    router = RouterAgent(enable_llm_analysis=False)
    
    print("\nCONFIDENCE SCORING TEST")
    print("=" * 80)
    
    # Test với various confidence levels
    confidence_tests = [
        ("Xin chào", None),  # High confidence greeting
        ("Chào bạn có thể giúp tôi không?", None),  # Lower confidence (negative pattern)
        ("Về vấn đề machine learning", []),  # Medium confidence search
        ("hmm", [{"role": "assistant", "content": "Explanation"}]),  # Low confidence
        ("Tổng kết lại toàn bộ", []),  # High confidence summary
    ]
    
    for message, context in confidence_tests:
        result = await router.analyze_context_need(message, context)
        
        # Visual confidence bar
        conf_bar = "█" * int(result.confidence * 10) + "░" * (10 - int(result.confidence * 10))
        
        print(f"\nMessage: '{message}'")
        print(f"Type: {result.type.value}")
        print(f"Confidence: [{conf_bar}] {result.confidence:.2f}")
        print(f"Decision: {'HIGH' if result.confidence >= 0.8 else 'MEDIUM' if result.confidence >= 0.6 else 'LOW'}")

async def test_implicit_references():
    """Test detection of implicit references"""
    
    router = RouterAgent(enable_llm_analysis=False)
    
    print("\n\nIMPLICIT REFERENCE DETECTION")
    print("=" * 80)
    
    implicit_tests = [
        "Nó hoạt động như thế nào?",
        "Điều đó có nghĩa là gì?",
        "Vậy thì sao?",
        "Và sau đó?",
        "Nhưng tại sao lại như vậy?",
        "They seem interesting",
        "What about those features?",
    ]
    
    for message in implicit_tests:
        result = await router.analyze_context_need(message, [])
        has_implicit = "✓" if result.type != ContextNeedType.NONE else "✗"
        
        print(f"{has_implicit} '{message}' → {result.type.value}")

async def test_keyword_extraction():
    """Test enhanced keyword extraction"""
    
    router = RouterAgent()
    
    print("\n\nKEYWORD EXTRACTION TEST")
    print("=" * 80)
    
    keyword_tests = [
        "Tìm lại phần về Machine Learning và Deep Learning algorithms",
        "Về vấn đề Docker containers và Kubernetes orchestration",
        "Nhớ lại khi chúng ta thảo luận về RESTful API design patterns",
        "Liên quan đến database optimization và query performance",
    ]
    
    for message in keyword_tests:
        keywords = router._extract_keywords(message)
        print(f"\nMessage: '{message}'")
        print(f"Keywords: {', '.join(keywords)}")

if __name__ == "__main__":
    async def main():
        await test_router_patterns()
        await test_confidence_levels()
        await test_implicit_references()
        await test_keyword_extraction()
        
        print("\n" + "=" * 80)
        print("✨ Enhanced Router Agent testing completed!")
    
    asyncio.run(main()) 