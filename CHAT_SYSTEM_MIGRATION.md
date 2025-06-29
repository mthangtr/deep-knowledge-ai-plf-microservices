# Chat System Migration Guide

## 🚀 Overview

Hệ thống chat mới được thiết kế giống ChatGPT/Gemini với:

- ✅ **Persistent context** - AI nhớ toàn bộ cuộc hội thoại
- ✅ **Vector search** - Tìm kiếm semantic trong lịch sử chat
- ✅ **Smart compression** - Tự động nén session dài
- ✅ **Cross-session memory** - AI nhớ được context xuyên sessions
- ✅ **PostgreSQL + pgvector** - Single source of truth

## 📋 Migration Steps

### 1. **Run Database Migration**

```bash
# Connect to your PostgreSQL database
psql $DATABASE_URL

# Run migration
\i deep-knowledge-ai-platform/docs/migrations/001_add_chat_context_support.sql
```

### 2. **Update Environment Variables**

**backend-main/.env:**

```env
# Existing vars...
LANGCHAIN_SERVICE_URL=http://langchain-python:5000
```

**langchain-python-service/.env:**

```env
# Existing vars...
DATABASE_URL=postgresql://user:password@postgres:5432/dbname
OPENAI_API_KEY=sk-xxx  # For embeddings
```

### 3. **Deploy Services**

```bash
# Update langchain-python service
cd langchain-python-service
pip install -r requirements.txt
python -m app.main

# Or with Docker
docker-compose up --build langchain-python-service
```

### 4. **Remove backend-ai-agent-chat (Optional)**

Since backend-ai-agent-chat is not being used:

```bash
# Stop and remove the service
docker-compose stop backend-ai-chat
docker-compose rm backend-ai-chat

# Update docker-compose.yml to remove the service
```

## 🔄 API Flow

```
1. Frontend → POST /api/learning/chat/ai
   {
     "topic_id": "xxx",
     "node_id": "yyy", // optional
     "message": "User's message",
     "session_id": "zzz" // optional, will create new if not provided
   }

2. backend-main:
   - Validates permissions
   - Saves user message to PostgreSQL
   - Calls langchain-python service

3. langchain-python:
   - Gets/creates session
   - Generates embedding for message
   - Smart context retrieval (Router Agent)
   - Generates AI response
   - Saves to PostgreSQL with embedding

4. Response to Frontend:
   {
     "success": true,
     "data": {
       "user_message": {...},
       "ai_message": {...},
       "session_id": "xxx",
       "context_info": {
         "context_type": "RECENT_ONLY|SMART_RETRIEVAL|FULL_CONTEXT",
         "estimated_tokens": 1234
       },
       "session_stats": {
         "message_count": 10,
         "total_tokens": 5000
       }
     }
   }
```

## 🎯 Frontend Integration

```typescript
// hooks/use-ai-chat.ts
export function useAIChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  const sendMessage = async (
    message: string,
    topicId: string,
    nodeId?: string
  ) => {
    const response = await fetch("/api/learning/chat/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic_id: topicId,
        node_id: nodeId,
        message,
        session_id: sessionId,
      }),
    });

    const data = await response.json();

    // Update session ID for next message
    if (data.data?.session_id) {
      setSessionId(data.data.session_id);
    }

    return data;
  };

  return { sendMessage, sessionId };
}
```

## 🔍 Features

### Smart Context Types

1. **NONE** - Greeting or completely new topic
2. **RECENT_ONLY** - Last 5-10 messages sufficient
3. **SMART_RETRIEVAL** - Vector search for specific context
4. **FULL_CONTEXT** - Needs entire conversation

### Auto-Compression

When session exceeds 100 messages:

- Keeps last 30 messages in active memory
- Compresses older messages to summary
- Still searchable via vector embeddings

### Cross-Session Search

```sql
-- Find all mentions of "React hooks" across user's sessions
SELECT * FROM search_user_knowledge(
  query_embedding := embed('React hooks'),
  user_id := 'user-123',
  match_threshold := 0.8
);
```

## 🚨 Important Notes

1. **First-time setup**: Migration will automatically create sessions for existing chats
2. **Embeddings**: OpenAI API key required for text-embedding-3-small
3. **Performance**: pgvector indexes optimize similarity search
4. **Costs**: Track token usage in session stats

## 📊 Monitoring

Check session stats:

```bash
# Get session info
curl http://localhost:5000/session/{session_id}/stats

# Get user's sessions
curl http://localhost:5000/user/{user_id}/sessions
```

## 🔧 Troubleshooting

### "Database not initialized" error

- Check DATABASE_URL in langchain-python service
- Ensure pgvector extension is installed

### Slow vector search

- Run `VACUUM ANALYZE learning_chats;`
- Check pgvector indexes exist

### High token usage

- Monitor `context_type` in responses
- Adjust RouterAgent thresholds if needed

## ✅ Success Indicators

- [ ] Migration script runs without errors
- [ ] langchain-python connects to PostgreSQL
- [ ] Chat messages save with embeddings
- [ ] Sessions persist across restarts
- [ ] Vector search returns relevant results
- [ ] Auto-compression triggers at 100 messages

## 🎉 Result

Your chat system now works like ChatGPT:

- AI remembers entire conversation history
- Smart context retrieval saves tokens
- Persistent memory across sessions
- Single database, no data loss!
