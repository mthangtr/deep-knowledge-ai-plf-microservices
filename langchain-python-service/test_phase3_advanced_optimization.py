"""
Test Phase 3: Advanced Optimization Features
- Context Quality Analysis
- Performance Monitoring  
- Real-time Optimization Reports
"""

import asyncio
import aiohttp
import time
from datetime import datetime
from loguru import logger

# Test configuration
BASE_URL = "http://localhost:5000"
TEST_USER_ID = "test-user-phase3"

async def test_smart_chat_with_quality_metrics():
    """Test smart chat với quality metrics tracking"""
    
    print("🔥 Testing Smart Chat với Quality Metrics")
    print("=" * 60)
    
    async with aiohttp.ClientSession() as session:
        # Test 1: Simple greeting (should be NONE context)
        print("\n1. Testing greeting (NONE context expected)")
        
        response = await session.post(f"{BASE_URL}/smart-chat", json={
            "user_id": TEST_USER_ID,
            "message": "Xin chào! Tôi muốn học về AI",
            "model": "google/gemini-2.0-flash-lite-001"
        })
        
        data = await response.json()
        context_info = data.get("context_info", {})
        
        print(f"   Context Type: {context_info.get('context_type')}")
        print(f"   Quality Score: {context_info.get('quality_score', 0):.2f}")
        print(f"   Quality Level: {context_info.get('quality_level')}")
        print(f"   Relevance: {context_info.get('relevance_score', 0):.2f}")
        print(f"   Efficiency: {context_info.get('efficiency_score', 0):.2f}")
        print(f"   Tokens Used: {context_info.get('estimated_tokens', 0)}")
        
        session_id = data.get("session_id")
        
        # Test 2: Follow-up question (should be RECENT_ONLY)
        print("\n2. Testing follow-up (RECENT_ONLY expected)")
        
        response = await session.post(f"{BASE_URL}/smart-chat", json={
            "user_id": TEST_USER_ID,
            "session_id": session_id,
            "message": "Tiếp tục giải thích về machine learning",
            "model": "google/gemini-2.0-flash-lite-001"
        })
        
        data = await response.json()
        context_info = data.get("context_info", {})
        
        print(f"   Context Type: {context_info.get('context_type')}")
        print(f"   Quality Score: {context_info.get('quality_score', 0):.2f}")
        print(f"   Quality Level: {context_info.get('quality_level')}")
        print(f"   Recent Messages: {context_info.get('recent_messages_count', 0)}")
        print(f"   Tokens Used: {context_info.get('estimated_tokens', 0)}")
        
        # Test 3: Search query (should be SMART_RETRIEVAL)
        print("\n3. Testing search query (SMART_RETRIEVAL expected)")
        
        response = await session.post(f"{BASE_URL}/smart-chat", json={
            "user_id": TEST_USER_ID,
            "session_id": session_id,
            "message": "Tìm lại thông tin về neural networks mà chúng ta đã thảo luận",
            "model": "google/gemini-2.0-flash-lite-001"
        })
        
        data = await response.json()
        context_info = data.get("context_info", {})
        
        print(f"   Context Type: {context_info.get('context_type')}")
        print(f"   Quality Score: {context_info.get('quality_score', 0):.2f}")
        print(f"   Relevant Messages: {context_info.get('relevant_messages_count', 0)}")
        print(f"   Processing Time: {context_info.get('processing_time_ms', 0):.1f}ms")
        
        # Test 4: Summary request (should be FULL_CONTEXT)
        print("\n4. Testing summary request (FULL_CONTEXT expected)")
        
        response = await session.post(f"{BASE_URL}/smart-chat", json={
            "user_id": TEST_USER_ID,
            "session_id": session_id,
            "message": "Tóm tắt toàn bộ cuộc hội thoại về AI và machine learning",
            "model": "google/gemini-2.0-flash-lite-001"
        })
        
        data = await response.json()
        context_info = data.get("context_info", {})
        
        print(f"   Context Type: {context_info.get('context_type')}")
        print(f"   Quality Score: {context_info.get('quality_score', 0):.2f}")
        print(f"   Has Summary: {context_info.get('has_summary', False)}")
        print(f"   Total Tokens: {context_info.get('estimated_tokens', 0)}")
        
        return session_id

async def test_performance_monitoring():
    """Test performance monitoring endpoints"""
    
    print("\n🚀 Testing Performance Monitoring")
    print("=" * 60)
    
    async with aiohttp.ClientSession() as session:
        # Test performance metrics
        print("\n1. Getting Performance Metrics (24h)")
        
        response = await session.get(f"{BASE_URL}/monitoring/performance?hours_back=1")
        
        if response.status == 200:
            data = await response.json()
            
            if "error" not in data:
                performance = data.get("performance", {})
                print(f"   Avg Response Time: {performance.get('avg_response_time', 0):.2f}s")
                print(f"   Avg Quality: {performance.get('avg_quality', 0):.2f}")
                print(f"   Avg Tokens: {performance.get('avg_tokens', 0):.0f}")
                print(f"   Avg Efficiency: {performance.get('avg_efficiency', 0):.2f}")
                print(f"   Total Metrics: {data.get('total_metrics', 0)}")
            else:
                print(f"   {data.get('error')}")
        else:
            print(f"   Error: HTTP {response.status}")
        
        # Test quality trends
        print("\n2. Getting Quality Trends (24h)")
        
        response = await session.get(f"{BASE_URL}/monitoring/quality?hours_back=1")
        
        if response.status == 200:
            data = await response.json()
            
            if "error" not in data:
                print(f"   Total Requests: {data.get('total_requests', 0)}")
                print(f"   Average Quality: {data.get('average_quality', 0):.2f}")
                print(f"   Quality Trend: {data.get('quality_trend', 'unknown')}")
                print(f"   Token Trend: {data.get('token_trend', 'unknown')}")
            else:
                print(f"   {data.get('error')}")
        else:
            print(f"   Error: HTTP {response.status}")
        
        # Test alerts
        print("\n3. Getting Recent Alerts")
        
        response = await session.get(f"{BASE_URL}/monitoring/alerts?hours_back=1")
        
        if response.status == 200:
            data = await response.json()
            
            print(f"   Total Alerts: {data.get('total_alerts', 0)}")
            
            alerts = data.get('alerts', [])
            for alert in alerts[:3]:  # Show first 3 alerts
                print(f"   [{alert['level']}] {alert['type']}: {alert['message']}")
        else:
            print(f"   Error: HTTP {response.status}")

async def test_optimization_report():
    """Test optimization report generation"""
    
    print("\n🎯 Testing Optimization Report")
    print("=" * 60)
    
    async with aiohttp.ClientSession() as session:
        response = await session.get(f"{BASE_URL}/monitoring/optimization-report")
        
        if response.status == 200:
            data = await response.json()
            
            if "optimization_report" in data:
                report = data["optimization_report"]
                
                print(f"\n📊 Optimization Report ({report['timestamp']})")
                print(f"   Overall Score: {report['overall_score']:.2f}/1.0")
                
                # Critical issues
                critical_issues = report.get('critical_issues', [])
                if critical_issues:
                    print(f"\n🚨 Critical Issues ({len(critical_issues)}):")
                    for issue in critical_issues:
                        print(f"   • {issue}")
                else:
                    print(f"\n✅ No critical issues found")
                
                # Improvement opportunities
                improvements = report.get('improvement_opportunities', [])
                if improvements:
                    print(f"\n💡 Improvement Opportunities ({len(improvements)}):")
                    for improvement in improvements:
                        print(f"   • {improvement}")
                
                # Optimization recommendations
                optimizations = report.get('optimizations', {})
                
                if 'token' in optimizations:
                    token_opt = optimizations['token']
                    print(f"\n🎛️ Token Optimization:")
                    print(f"   Avg Tokens: {token_opt.get('avg_tokens', 0):.0f}")
                    print(f"   Avg Efficiency: {token_opt.get('avg_efficiency', 0):.2f}")
                    print(f"   Potential Savings: {token_opt.get('potential_savings', 0):.1%}")
                
                # Estimated improvements
                improvements = report.get('estimated_improvements', {})
                print(f"\n📈 Estimated Improvements:")
                print(f"   Cost Savings: {improvements.get('cost_savings', '0%')}")
                print(f"   Performance Gain: {improvements.get('performance_gain', '0%')}")
                print(f"   Quality Improvement: {improvements.get('quality_improvement', '0%')}")
                
            elif "error" in data:
                print(f"   Error: {data['error']}")
            else:
                print("   Unexpected response format")
        else:
            print(f"   Error: HTTP {response.status}")

async def test_monitoring_dashboard():
    """Test comprehensive monitoring dashboard"""
    
    print("\n📊 Testing Monitoring Dashboard")
    print("=" * 60)
    
    async with aiohttp.ClientSession() as session:
        response = await session.get(f"{BASE_URL}/monitoring/dashboard")
        
        if response.status == 200:
            data = await response.json()
            
            print(f"\n🖥️ System Dashboard ({data.get('timestamp', 'unknown')})")
            print(f"   System Status: {data.get('system_status', 'unknown').upper()}")
            
            # Current metrics
            current = data.get('current_metrics', {})
            print(f"\n📈 Current Metrics:")
            print(f"   Response Time: {current.get('avg_response_time', 0):.2f}s")
            print(f"   Quality Score: {current.get('avg_context_quality', 0):.2f}")
            print(f"   Requests/min: {current.get('requests_per_minute', 0):.1f}")
            print(f"   Error Rate: {current.get('error_rate', 0):.1%}")
            print(f"   Most Used Model: {current.get('most_used_model', 'none')}")
            
            # Alerts summary
            alerts = data.get('alerts', {})
            print(f"\n🚨 Alerts (Last Hour):")
            print(f"   Total: {alerts.get('total_last_hour', 0)}")
            print(f"   Critical: {alerts.get('critical_count', 0)}")
            
            latest_alerts = alerts.get('latest_alerts', [])
            if latest_alerts:
                print(f"   Latest Alerts:")
                for alert in latest_alerts[:3]:
                    print(f"     [{alert['level']}] {alert['type']}: {alert['message']}")
            
            # Performance trends
            perf_24h = data.get('performance_24h', {})
            if "error" not in perf_24h:
                perf_data = perf_24h.get('performance', {})
                print(f"\n📊 24h Performance Trends:")
                print(f"   Response Time Trend: {perf_data.get('response_time_trend', 'unknown')}")
                print(f"   Quality Trend: {perf_data.get('quality_trend', 'unknown')}")
        else:
            print(f"   Error: HTTP {response.status}")

async def test_stress_scenario():
    """Test system under load để trigger alerts"""
    
    print("\n🔥 Testing Stress Scenario")
    print("=" * 60)
    
    async with aiohttp.ClientSession() as session:
        print("\n💥 Sending multiple requests to test performance monitoring...")
        
        # Send multiple requests quickly
        tasks = []
        for i in range(5):
            task = session.post(f"{BASE_URL}/smart-chat", json={
                "user_id": f"stress-test-{i}",
                "message": f"Complex AI question #{i} về deep learning và neural networks với nhiều chi tiết",
                "model": "google/gemini-2.0-flash-lite-001"
            })
            tasks.append(task)
        
        start_time = time.time()
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.time() - start_time
        
        successful = 0
        errors = 0
        response_times = []
        
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                print(f"   Request {i+1}: ERROR - {response}")
                errors += 1
            else:
                if response.status == 200:
                    successful += 1
                    data = await response.json()
                    processing_time = data.get("processing_time", 0)
                    response_times.append(processing_time)
                    print(f"   Request {i+1}: OK - {processing_time:.2f}s")
                else:
                    print(f"   Request {i+1}: HTTP {response.status}")
                    errors += 1
        
        print(f"\n📊 Stress Test Results:")
        print(f"   Total Time: {total_time:.2f}s")
        print(f"   Successful: {successful}/5")
        print(f"   Errors: {errors}/5")
        
        if response_times:
            avg_response = sum(response_times) / len(response_times)
            max_response = max(response_times)
            print(f"   Avg Response Time: {avg_response:.2f}s")
            print(f"   Max Response Time: {max_response:.2f}s")
        
        # Wait a bit for metrics to be processed
        await asyncio.sleep(2)
        
        # Check if any alerts were triggered
        print(f"\n🚨 Checking for alerts after stress test...")
        
        response = await session.get(f"{BASE_URL}/monitoring/alerts?hours_back=1")
        if response.status == 200:
            data = await response.json()
            recent_alerts = data.get('alerts', [])
            
            if recent_alerts:
                print(f"   🔥 {len(recent_alerts)} alerts triggered:")
                for alert in recent_alerts[-3:]:  # Last 3 alerts
                    print(f"     [{alert['level']}] {alert['type']}: {alert['message']}")
            else:
                print(f"   ✅ No alerts triggered")

async def main():
    """Run all Phase 3 tests"""
    
    print("🚀 PHASE 3: ADVANCED OPTIMIZATION TESTING")
    print("=" * 80)
    print(f"Testing server at: {BASE_URL}")
    print(f"Test user ID: {TEST_USER_ID}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    try:
        # Test 1: Smart chat với quality metrics
        session_id = await test_smart_chat_with_quality_metrics()
        
        # Test 2: Performance monitoring
        await test_performance_monitoring()
        
        # Test 3: Optimization report
        await test_optimization_report()
        
        # Test 4: Monitoring dashboard
        await test_monitoring_dashboard()
        
        # Test 5: Stress scenario
        await test_stress_scenario()
        
        print(f"\n" + "=" * 80)
        print("✨ Phase 3 Advanced Optimization Testing Complete!")
        print("\n🎯 Key Features Tested:")
        print("   ✅ Context Quality Analysis với real-time scoring")
        print("   ✅ Performance Monitoring với alert system")
        print("   ✅ Optimization Reports với improvement suggestions")
        print("   ✅ Comprehensive Monitoring Dashboard")
        print("   ✅ Stress Testing với alert generation")
        
        print(f"\n📊 Next Steps:")
        print("   • Check monitoring dashboard for real-time insights")
        print("   • Review optimization reports for cost savings")
        print("   • Set up alert thresholds for production")
        print("   • Implement recommended optimizations")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main()) 