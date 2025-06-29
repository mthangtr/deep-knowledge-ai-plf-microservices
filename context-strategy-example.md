# Smart Context Management Strategy

## 1. Router Agent Decision Tree

```
User Message → Router Agent Analysis:

├─ "Tóm tắt cuộc hội thoại trước"
│  └─ FULL_CONTEXT_NEEDED = true
│
├─ "Bạn vừa nói gì về X?"
│  └─ RECENT_CONTEXT_NEEDED = true
│
├─ "Xin chào"
│  └─ NO_CONTEXT_NEEDED = true
│
└─ "Tiếp tục phân tích Y như lúc nãy"
   └─ SMART_RETRIEVAL_NEEDED = true
```

## 2. Context Tiers

### Tier 1: Recent (Always loaded)

- Last 5-10 messages
- Current session metadata
- User preferences

### Tier 2: Summary (Loaded on demand)

- Compressed conversation summary
- Key topics discussed
- Important decisions made

### Tier 3: Historical (Vector search)

- Full message history in vector DB
- Retrieved based on semantic similarity
- Only when router determines relevance

## 3. Implementation Strategy

```typescript
class ContextManager {
  async getContextForMessage(
    session_id: string,
    message: string,
    user_id: string
  ): Promise<ContextPackage> {
    // Always get recent context
    const recent = await this.getRecentMessages(session_id, 10);

    // Router decides if more context needed
    const contextNeed = await this.routerAgent.analyzeContextNeed(
      message,
      recent
    );

    let context: ContextPackage = { recent };

    switch (contextNeed.type) {
      case "FULL_CONTEXT":
        context.summary = await this.getSessionSummary(session_id);
        context.historical = await this.getFullHistory(session_id);
        break;

      case "SMART_RETRIEVAL":
        context.relevant = await this.vectorSearch(
          message,
          session_id,
          user_id
        );
        break;

      case "RECENT_ONLY":
        // Already have recent, do nothing
        break;
    }

    return context;
  }
}
```

## 4. Cost Optimization

### Token Usage Patterns:

- **Recent messages**: ~500-1000 tokens
- **Summary**: ~200-500 tokens
- **Vector retrieved**: ~1000-2000 tokens
- **Full context**: 10k+ tokens ❌ Expensive!

### Smart Compression:

```typescript
// Compress old messages into summary every 50 messages
if (session.message_count % 50 === 0) {
  const summary = await this.generateSummary(session.messages.slice(-50));

  // Keep only last 20 messages + summary
  session.compressed_summary = summary;
  session.messages = session.messages.slice(-20);
}
```

## 5. Session Isolation

```sql
-- Sessions table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(255),
  created_at TIMESTAMP,
  last_activity TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  summary TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id),
  user_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),

  -- Vector search
  embedding VECTOR(1536), -- OpenAI embeddings
  tokens_used INTEGER,

  -- Context metadata
  context_type VARCHAR(50), -- 'recent', 'summary', 'retrieved'
  parent_message_id UUID
);

-- Indexes for performance
CREATE INDEX idx_sessions_user_activity ON chat_sessions(user_id, last_activity DESC);
CREATE INDEX idx_messages_session_time ON chat_messages(session_id, timestamp DESC);
CREATE INDEX idx_messages_embedding ON chat_messages USING ivfflat (embedding vector_cosine_ops);
```

## 6. Real-world Examples

### ChatGPT-style:

```
User: "Tôi muốn học Python"
→ Context: None needed (new topic)

User: "Bắt đầu từ đâu?"
→ Context: Recent (refers to Python learning)

User: "Nhớ không 2 tuần trước tôi hỏi về Django?"
→ Context: Vector search (time-based + topic-based)
```

### Implementation Flow:

```
1. User message → backend-main (save to DB)
2. backend-main → backend-ai-agent-chat (with session_id)
3. Context manager → Analyze context need
4. Smart retrieval → Get minimal necessary context
5. Send to langchain-python → Process with optimized context
6. Response → Update session & save to DB
```
