# Integration Test Plan - AI Chat System

## 🎯 Test Scenario: Node Click → AI Chat Flow

### Mục tiêu

Kiểm tra luồng: User click node → gửi prompt_sample → AI response → chat tiếp tục

### Pre-requisites

1. ✅ Migration đã chạy thành công
2. ✅ Backend services đang chạy:
   - backend-main:3001
   - langchain-python:5000
3. ✅ Environment variables đã set:
   - DATABASE_URL
   - OPENAI_API_KEY
   - OPENROUTER_API_KEY

## 📋 Test Steps

### 1. Kiểm tra Database Migration

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('chat_sessions', 'learning_chats');

-- Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check if learning_chats has new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'learning_chats'
AND column_name IN ('session_id', 'embedding', 'model_used');
```

### 2. Kiểm tra Services Health

```bash
# Backend-main health
curl http://localhost:3001/health

# Langchain-python health
curl http://localhost:5000/health

# Check langchain DB connection
curl http://localhost:5000/session/test-session/stats
```

### 3. Test Frontend Integration

#### Bước 1: Tạo Topic mới

- Vào `/learning`
- Tạo topic: "Test AI Integration"
- Verify: topic được tạo thành công

#### Bước 2: Click vào Node

- Click "Xem cây kiến thức"
- Click vào một node có `is_chat_enabled = true`
- Expected:
  - UI chuyển sang node-level chat
  - `prompt_sample` được gửi tự động
  - AI trả lời về node đó

#### Bước 3: Chat tiếp tục

- Gửi thêm messages trong node chat
- Expected:
  - AI nhớ context của node
  - Session được maintain
  - Messages được lưu với embeddings

#### Bước 4: Chuyển node khác

- Click node khác
- Expected:
  - Session mới được tạo cho node mới
  - Context riêng biệt

### 4. Test API Endpoints

```bash
# Test AI chat endpoint
curl -X POST http://localhost:3001/api/learning/chat/ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topic_id": "TOPIC_ID",
    "node_id": "NODE_ID",
    "message": "Test message"
  }'

# Expected response:
{
  "success": true,
  "data": {
    "user_message": {...},
    "ai_message": {...},
    "session_id": "...",
    "context_info": {
      "context_type": "RECENT_ONLY|SMART_RETRIEVAL|FULL_CONTEXT",
      "estimated_tokens": 123
    }
  }
}
```

### 5. Database Verification

```sql
-- Check session creation
SELECT * FROM chat_sessions
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC;

-- Check messages with embeddings
SELECT id, message, is_ai_response, session_id,
       model_used, tokens_used,
       CASE WHEN embedding IS NOT NULL THEN 'Has embedding' ELSE 'No embedding' END
FROM learning_chats
WHERE session_id = 'SESSION_ID'
ORDER BY created_at;

-- Test vector search
SELECT id, message,
       1 - (embedding <=> 'QUERY_EMBEDDING'::vector) AS similarity
FROM learning_chats
WHERE user_id = 'USER_ID'
  AND embedding IS NOT NULL
ORDER BY similarity DESC
LIMIT 5;
```

## 🐛 Common Issues & Fixes

### Issue 1: "Database not initialized"

```bash
# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:port/db

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Issue 2: "No embedding generated"

```bash
# Check OpenAI API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

### Issue 3: Router analysis fails

```bash
# Check langchain service logs
docker logs deep-knowledge-langchain

# Test router directly
curl -X POST http://localhost:5000/smart-chat \
  -d '{"user_id":"test", "message":"Hello"}'
```

### Issue 4: Session not persistent

```sql
-- Check session triggers
SELECT * FROM chat_sessions WHERE id = 'SESSION_ID';

-- Check message count updates
SELECT message_count, tokens_used FROM chat_sessions
WHERE id = 'SESSION_ID';
```

## ✅ Success Criteria

- [ ] User click node → AI responds với context phù hợp
- [ ] Chat context được maintain trong session
- [ ] Messages có embeddings trong database
- [ ] Vector search trả về kết quả relevant
- [ ] Auto-compression kích hoạt sau 100 messages
- [ ] UI hiển thị đúng context type (topic vs node)
- [ ] No data loss khi restart services

## 📊 Performance Metrics

Monitor:

- Response time: < 3s cho smart chat
- Token usage: tracked trong session_stats
- Database query time: < 500ms cho vector search
- Memory usage: langchain service < 1GB

## 🔄 Rollback Plan

Nếu có issues:

1. Revert migration: `psql $DATABASE_URL < rollback.sql`
2. Use old chat system: comment out AI chat integration
3. Switch back to auto-prompts in `LearningPlatformLayout.tsx`
