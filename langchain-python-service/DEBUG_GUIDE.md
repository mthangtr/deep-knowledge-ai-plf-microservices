# 🐛 Debug Guide - Smart AI Conversation System

## Kiến trúc mới (Simplified v3.0.0)

Sau khi refactor, hệ thống đã được đơn giản hóa từ **1,900+ lines** xuống còn **~600 lines** với 4 components chính:

### ✅ **Components mới (Clean & Smart)**

1. **SmartContextManager** (230 lines)

   - Thay thế: DatabaseContextManager phức tạp
   - Chức năng: Context management thông minh
   - Debug symbols: `🔍 [CONTEXT]`

2. **ConversationIntelligence** (200 lines)

   - Thay thế: Logic persona phân tán
   - Chức năng: Dynamic persona selection
   - Debug symbols: `🧠 [INTELLIGENCE]`

3. **SimplifiedOrchestrator** (150 lines)

   - Thay thế: Multi-agent complexity
   - Chức năng: Clean conversation flow
   - Debug symbols: `🎭 [ORCHESTRATOR]`

4. **Smart Main.py** (Updated)
   - Thay thế: Over-engineered endpoints
   - Chức năng: Streamlined API
   - Debug symbols: `🚀 [SMART-CHAT]`

### ❌ **Components đã xóa (Over-engineered)**

- ✗ ContextQualityAnalyzer (566 lines)
- ✗ PerformanceMonitor (757 lines)
- ✗ ContentCompressor (587 lines)
- ✗ DatabaseContextManager (deprecated)

---

## 🚀 **Cách enable Debug Mode**

### **Option 1: Quick Enable**

```bash
cd langchain-python-service
python debug_config.py
```

### **Option 2: Manual Environment**

```bash
export DEBUG_AGENTS=true
export DEBUG_CONTEXT=true
export DEBUG_INTELLIGENCE=true
export DEBUG_ORCHESTRATOR=true
export DEBUG_MAIN=true
export LOG_LEVEL=DEBUG
```

### **Option 3: Docker Debug**

```dockerfile
ENV DEBUG_AGENTS=true
ENV DEBUG_CONTEXT=true
ENV DEBUG_INTELLIGENCE=true
ENV DEBUG_ORCHESTRATOR=true
ENV DEBUG_MAIN=true
```

---

## 📊 **Debug Symbols & Flow Tracking**

### **Main Conversation Flow**

```
🚀 [SMART-CHAT] Request start
🚀 [SMART-CHAT] Step 1: Creating session...
🚀 [SMART-CHAT] Step 2: Saving user message...
🚀 [SMART-CHAT] Step 3: Building context...
🔍 [CONTEXT] Building context for session...
🔍 [CONTEXT] Found X recent messages
🔍 [CONTEXT] Relevance score: X.XXX
✅ [CONTEXT] Built in X.XXXs - XXX tokens

🚀 [SMART-CHAT] Step 4: Selecting model...
🚀 [SMART-CHAT] Step 5: Analyzing conversation...
🧠 [INTELLIGENCE] Analyzing message...
🧠 [INTELLIGENCE] Detected learning style: explorer
🧠 [INTELLIGENCE] Selected persona: Socratic Mentor
✅ [INTELLIGENCE] Analysis complete

🚀 [SMART-CHAT] Step 6: Building system prompt...
🚀 [SMART-CHAT] Step 7: Sending metadata...
🚀 [SMART-CHAT] Step 8: Starting AI response stream...
🎭 [ORCHESTRATOR] Starting response generation
🎭 [ORCHESTRATOR] Persona: Socratic Mentor
🎭 [ORCHESTRATOR] Starting stream...
✅ [ORCHESTRATOR] Conversation completed in X.XXs

✅ [SMART-CHAT] Completed in X.XXs - XXX chars
```

### **Error Tracking**

```
❌ [SMART-CHAT] Error: Connection timeout
❌ [CONTEXT] Error details: TimeoutError: Database timeout
❌ [ORCHESTRATOR] Chat stream error: Model unavailable
```

### **Performance Monitoring**

```
⚡ [CONTEXT] Optimizing - tokens exceed limit (3500 > 3000)
⚡ [CONTEXT] Optimized: 15 -> 10 messages
```

---

## 📂 **Log Files Location**

### **Debug Logs**

```
langchain-python-service/
└── debug-logs/
    ├── smart_chat_debug.log    # All debug information
    ├── errors.log              # Errors only
    └── archived/               # Rotated logs
```

### **Log Format**

```
2024-01-20 10:30:45.123 | DEBUG    | app.agents.smart_context_manager:get_smart_context:105 | 🔍 [CONTEXT] Building context for session: 12345678...
```

---

## 🎯 **Key Tracking Points**

### **1. Context Building Process**

- Session creation/retrieval
- Message history loading
- Topic context extraction
- Token estimation & optimization
- Relevance scoring

### **2. Persona Selection Logic**

- User learning style detection
- Message intent analysis
- Persona confidence scoring
- Output style determination

### **3. Model Routing Decisions**

- Domain detection
- Model selection criteria
- Temperature & token limits
- Fallback strategies

### **4. Response Generation**

- System prompt construction
- Message history formatting
- Streaming chunk processing
- Response saving

### **5. Performance Metrics**

- Context building time
- Model response time
- Total request duration
- Token usage tracking

---

## 🔧 **Common Debug Scenarios**

### **Persona không đúng**

```bash
# Track persona selection
grep "🧠 \[INTELLIGENCE\]" debug-logs/smart_chat_debug.log | tail -20
```

### **Context bị thiếu**

```bash
# Track context building
grep "🔍 \[CONTEXT\]" debug-logs/smart_chat_debug.log | tail -20
```

### **Model selection issues**

```bash
# Track model routing
grep "🚀 \[SMART-CHAT\] Step 4" debug-logs/smart_chat_debug.log
```

### **Streaming problems**

```bash
# Track orchestrator
grep "🎭 \[ORCHESTRATOR\]" debug-logs/smart_chat_debug.log | tail -20
```

### **Performance issues**

```bash
# Track timing
grep "Completed in" debug-logs/smart_chat_debug.log | tail -10
```

---

## 📈 **Performance Monitoring**

### **Thresholds**

- Context building: < 0.5s
- Model routing: < 0.1s
- Persona selection: < 0.1s
- Total request: < 3.0s

### **Alerts**

- Slow query threshold: 1.0s
- Context token limit: 3000
- Session timeout: 30s

---

## 🧪 **Testing Debug System**

### **Test Request**

```bash
curl -X POST http://localhost:5000/smart-chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "message": "Giải thích về machine learning",
    "topic_id": "ml_basics"
  }'
```

### **Expected Debug Output**

```
🚀 [SMART-CHAT] New request from user: test_use...
🔍 [CONTEXT] Building context for session: abcd1234...
🧠 [INTELLIGENCE] Selected persona: Creative Explorer
🎭 [ORCHESTRATOR] Starting conversation with gemini-2.0-flash-lite-001
✅ [SMART-CHAT] Completed in 2.34s - 1234 chars
```

---

## 🎭 **Cách hệ thống hoạt động (Overview)**

### **1. Smart Context Management**

- Tự động detect standalone messages (chào hỏi, etc.)
- Intelligent context building với relevance scoring
- Token optimization khi vượt limit
- Session isolation theo topic/node

### **2. Dynamic Persona Selection**

- Phân tích learning style của user
- Chọn persona phù hợp (Socratic/Creative/Pragmatic/Direct)
- Confidence scoring và reasoning
- Topic relevance guidance

### **3. Intelligent Model Routing**

- Domain detection (Programming/Business/Education/etc.)
- Model selection based on complexity
- Temperature adjustment per domain
- Fallback strategies

### **4. Streamlined Response Generation**

- Single model approach (không multi-agent)
- Smart system prompt building
- Efficient streaming
- Error recovery

### **Benefits của Architecture mới:**

- ✅ 90% ít code phức tạp hơn
- ✅ Response time nhanh hơn
- ✅ Easier maintenance & debugging
- ✅ Fewer points of failure
- ✅ Clear separation of concerns

---

## 🚨 **Troubleshooting**

### **Debug không hoạt động**

```bash
# Check environment variables
python -c "import os; print({k:v for k,v in os.environ.items() if 'DEBUG' in k})"

# Check log files
ls -la debug-logs/
tail -f debug-logs/smart_chat_debug.log
```

### **Performance issues**

```bash
# Check slow operations
grep "exceed limit\|slow\|timeout" debug-logs/smart_chat_debug.log
```

### **Model errors**

```bash
# Check model routing
grep "❌.*model\|❌.*LLM" debug-logs/errors.log
```

**Happy debugging! 🚀**
