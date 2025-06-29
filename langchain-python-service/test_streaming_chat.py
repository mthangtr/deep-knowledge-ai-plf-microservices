"""
🔥 Test LangChain OpenRouter với STREAMING
Test streaming functionality với LLMConfig đã được update
"""

import asyncio
from dotenv import load_dotenv
from app.models.llm_config import LLMConfig
from langchain_core.messages import HumanMessage

load_dotenv()

async def test_streaming_chat():
    """Test streaming chat với OpenRouter"""
    print("🚀 Testing LangChain Streaming with OpenRouter")
    print("=" * 60)
    
    try:
        # Tạo LLM với streaming enabled (disable retry wrapper)
        llm = LLMConfig.get_llm(
            model_name="google/gemini-2.0-flash-lite-001",  # Fast model
            streaming=True,  # Force streaming
            temperature=0.7,
            max_tokens=100,
            enable_retry=False  # Disable retry wrapper to avoid field modification
        )
        
        print(f"✅ LLM created successfully")
        print(f"📡 Streaming enabled: {llm.streaming}")
        
        # Test basic message
        messages = [
            HumanMessage(content="Chào bạn! Hãy trả lời ngắn gọn bằng tiếng Việt.")
        ]
        
        print("\n🎯 Sending message (streaming)...")
        
        # Stream response từng chunk
        response_chunks = []
        async for chunk in llm.astream(messages):
            if hasattr(chunk, 'content') and chunk.content:
                print(f"📥 Chunk: '{chunk.content}'")
                response_chunks.append(chunk.content)
        
        full_response = "".join(response_chunks)
        print(f"\n✅ Complete response: '{full_response}'")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_batch_streaming():
    """Test batch processing với streaming"""
    print("\n" + "=" * 60)
    print("🔄 Testing Batch Streaming")
    
    try:
        llm = LLMConfig.get_llm(
            model_name="google/gemini-2.0-flash-lite-001",
            streaming=True,
            temperature=0.3,
            enable_retry=False  # Disable retry wrapper
        )
        
        # Multiple questions
        questions = [
            "Định nghĩa AI trong 1 câu",
            "Machine Learning là gì?", 
            "Blockchain hoạt động ra sao?"
        ]
        
        for i, question in enumerate(questions, 1):
            print(f"\n📝 Question {i}: {question}")
            
            response_parts = []
            async for chunk in llm.astream([HumanMessage(content=question)]):
                if hasattr(chunk, 'content') and chunk.content:
                    response_parts.append(chunk.content)
            
            answer = "".join(response_parts)
            print(f"💡 Answer: {answer}")
        
        return True
        
    except Exception as e:
        print(f"❌ Batch error: {e}")
        return False

if __name__ == "__main__":
    async def main():
        success1 = await test_streaming_chat()
        success2 = await test_batch_streaming()
        
        print("\n" + "=" * 60)
        print("📊 STREAMING TEST RESULTS:")
        print(f"   Basic streaming: {'✅ PASS' if success1 else '❌ FAIL'}")
        print(f"   Batch streaming: {'✅ PASS' if success2 else '❌ FAIL'}")
        
        if success1 and success2:
            print("🎉 All streaming tests PASSED!")
            print("💡 OpenRouter streaming integration working correctly")
        else:
            print("⚠️  Some tests failed - check logs above")
    
    asyncio.run(main()) 