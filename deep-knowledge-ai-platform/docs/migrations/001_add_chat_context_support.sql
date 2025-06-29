-- =====================================
-- CHAT CONTEXT MIGRATION v1.0
-- Thêm support cho persistent chat context như ChatGPT/Gemini
-- Created: 2024
-- =====================================

-- 1. Enable pgvector extension cho semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Chat Sessions table (persistent conversations)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES learning_topics(id) ON DELETE CASCADE,
  node_id UUID REFERENCES tree_nodes(id) ON DELETE CASCADE,
  title VARCHAR(255),
  compressed_summary TEXT, -- Tóm tắt khi session dài
  message_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Extend learning_chats với vector support
ALTER TABLE learning_chats 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS embedding VECTOR(1536), -- OpenAI text-embedding-3-small
ADD COLUMN IF NOT EXISTS context_type VARCHAR(50) DEFAULT 'recent',
ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS model_used VARCHAR(100),
ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES learning_chats(id);

-- 4. Context Cache table (để tránh re-generate embeddings)
CREATE TABLE IF NOT EXISTS context_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  cache_key VARCHAR(255) NOT NULL,
  cache_value JSONB NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(session_id, cache_key)
);

-- 5. Vector similarity search function
CREATE OR REPLACE FUNCTION match_chat_messages(
  query_embedding VECTOR(1536),
  user_id_param UUID,
  match_threshold FLOAT DEFAULT 0.8,
  match_count INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  message TEXT,
  is_ai_response BOOLEAN,
  session_id UUID,
  topic_id UUID,
  node_id UUID,
  similarity FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lc.id,
    lc.message,
    lc.is_ai_response,
    lc.session_id,
    lc.topic_id,
    lc.node_id,
    1 - (lc.embedding <=> query_embedding) AS similarity,
    lc.created_at
  FROM learning_chats lc
  WHERE 
    lc.user_id = user_id_param
    AND lc.embedding IS NOT NULL
    AND 1 - (lc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Cross-session search function (tìm kiếm xuyên sessions)
CREATE OR REPLACE FUNCTION search_user_knowledge(
  query_embedding VECTOR(1536),
  user_id_param UUID,
  topic_id_param UUID DEFAULT NULL,
  session_id_param UUID DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 10
) RETURNS TABLE (
  id UUID,
  message TEXT,
  is_ai_response BOOLEAN,
  session_id UUID,
  session_title VARCHAR(255),
  topic_id UUID,
  topic_title TEXT,
  node_id UUID,
  node_title TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lc.id,
    lc.message,
    lc.is_ai_response,
    lc.session_id,
    cs.title AS session_title,
    lc.topic_id,
    lt.title AS topic_title,
    lc.node_id,
    tn.title AS node_title,
    1 - (lc.embedding <=> query_embedding) AS similarity,
    lc.created_at
  FROM learning_chats lc
  LEFT JOIN chat_sessions cs ON lc.session_id = cs.id
  LEFT JOIN learning_topics lt ON lc.topic_id = lt.id
  LEFT JOIN tree_nodes tn ON lc.node_id = tn.id
  WHERE 
    lc.user_id = user_id_param
    AND lc.embedding IS NOT NULL
    AND (topic_id_param IS NULL OR lc.topic_id = topic_id_param)
    AND (session_id_param IS NULL OR lc.session_id = session_id_param)
    AND 1 - (lc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Auto-compress sessions function
CREATE OR REPLACE FUNCTION compress_chat_session(session_id_param UUID)
RETURNS VOID AS $$
DECLARE
  message_count INT;
  old_messages JSONB;
BEGIN
  -- Count messages
  SELECT COUNT(*) INTO message_count
  FROM learning_chats
  WHERE session_id = session_id_param;
  
  -- Only compress if more than 50 messages
  IF message_count > 50 THEN
    -- Get old messages (keep last 30)
    SELECT json_agg(json_build_object(
      'role', CASE WHEN is_ai_response THEN 'assistant' ELSE 'user' END,
      'content', message,
      'created_at', created_at
    ) ORDER BY created_at)
    INTO old_messages
    FROM (
      SELECT message, is_ai_response, created_at
      FROM learning_chats
      WHERE session_id = session_id_param
      ORDER BY created_at
      LIMIT message_count - 30
    ) t;
    
    -- Update session summary
    UPDATE chat_sessions
    SET 
      compressed_summary = compressed_summary || E'\n\n--- Compressed at ' || NOW() || ' ---\n' || old_messages::TEXT,
      updated_at = NOW()
    WHERE id = session_id_param;
    
    -- Delete old messages (keep last 30)
    DELETE FROM learning_chats
    WHERE session_id = session_id_param
    AND id NOT IN (
      SELECT id
      FROM learning_chats
      WHERE session_id = session_id_param
      ORDER BY created_at DESC
      LIMIT 30
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Session stats function
CREATE OR REPLACE FUNCTION get_session_stats(session_id_param UUID)
RETURNS TABLE (
  message_count BIGINT,
  user_message_count BIGINT,
  ai_message_count BIGINT,
  total_tokens INTEGER,
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  avg_message_length FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS message_count,
    COUNT(*) FILTER (WHERE NOT is_ai_response)::BIGINT AS user_message_count,
    COUNT(*) FILTER (WHERE is_ai_response)::BIGINT AS ai_message_count,
    COALESCE(SUM(tokens_used), 0)::INTEGER AS total_tokens,
    MIN(created_at) AS first_message_at,
    MAX(created_at) AS last_message_at,
    AVG(LENGTH(message))::FLOAT AS avg_message_length
  FROM learning_chats
  WHERE session_id = session_id_param;
END;
$$ LANGUAGE plpgsql;

-- 9. Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_topic_id ON chat_sessions(topic_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_activity ON chat_sessions(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_active ON chat_sessions(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_learning_chats_session_id ON learning_chats(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_chats_embedding ON learning_chats USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_learning_chats_context_type ON learning_chats(context_type);

CREATE INDEX IF NOT EXISTS idx_context_cache_session_id ON context_cache(session_id);
CREATE INDEX IF NOT EXISTS idx_context_cache_expires_at ON context_cache(expires_at);

-- 10. Add triggers
CREATE TRIGGER update_chat_sessions_updated_at 
  BEFORE UPDATE ON chat_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update session activity when new message added
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    UPDATE chat_sessions
    SET 
      last_activity = NOW(),
      message_count = message_count + 1,
      tokens_used = tokens_used + COALESCE(NEW.tokens_used, 0)
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_on_new_message
  AFTER INSERT ON learning_chats
  FOR EACH ROW EXECUTE FUNCTION update_session_activity();

-- 11. Migration helpers
-- Migrate existing chats to sessions
DO $$
DECLARE
  topic_record RECORD;
  new_session_id UUID;
BEGIN
  -- Create sessions for existing topic chats
  FOR topic_record IN 
    SELECT DISTINCT t.id AS topic_id, t.user_id, t.title
    FROM learning_topics t
    JOIN learning_chats c ON c.topic_id = t.id
    WHERE c.session_id IS NULL
  LOOP
    -- Create session
    INSERT INTO chat_sessions (user_id, topic_id, title, message_count)
    VALUES (
      topic_record.user_id, 
      topic_record.topic_id,
      'Chat - ' || topic_record.title,
      (SELECT COUNT(*) FROM learning_chats WHERE topic_id = topic_record.topic_id AND session_id IS NULL)
    )
    RETURNING id INTO new_session_id;
    
    -- Update chats
    UPDATE learning_chats
    SET session_id = new_session_id
    WHERE topic_id = topic_record.topic_id
    AND session_id IS NULL;
    
    RAISE NOTICE 'Created session % for topic %', new_session_id, topic_record.title;
  END LOOP;
END $$;

-- 12. Add helper view for active sessions
CREATE OR REPLACE VIEW active_chat_sessions AS
SELECT 
  cs.*,
  lt.title AS topic_title,
  tn.title AS node_title,
  u.email AS user_email,
  u.full_name AS user_name,
  (
    SELECT COUNT(*) 
    FROM learning_chats lc 
    WHERE lc.session_id = cs.id
  ) AS actual_message_count,
  (
    SELECT MAX(created_at)
    FROM learning_chats lc
    WHERE lc.session_id = cs.id
  ) AS last_message_at
FROM chat_sessions cs
LEFT JOIN learning_topics lt ON cs.topic_id = lt.id
LEFT JOIN tree_nodes tn ON cs.node_id = tn.id
LEFT JOIN user_profiles u ON cs.user_id = u.id
WHERE cs.is_active = true;

-- 13. Grant permissions (if needed)
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================
-- MIGRATION COMPLETE
-- =====================================
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'CHAT CONTEXT MIGRATION COMPLETED';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Added features:';
  RAISE NOTICE '- pgvector extension for semantic search';
  RAISE NOTICE '- chat_sessions table for persistent conversations';
  RAISE NOTICE '- Vector embeddings in learning_chats';
  RAISE NOTICE '- Context cache for performance';
  RAISE NOTICE '- Vector similarity search functions';
  RAISE NOTICE '- Auto-compression for long sessions';
  RAISE NOTICE '- Session statistics and analytics';
  RAISE NOTICE '';
  RAISE NOTICE 'Your chat system now supports:';
  RAISE NOTICE '✓ Persistent context like ChatGPT';
  RAISE NOTICE '✓ Semantic search across conversations';
  RAISE NOTICE '✓ Cross-session knowledge retrieval';
  RAISE NOTICE '✓ Automatic session compression';
  RAISE NOTICE '✓ Token usage tracking';
  RAISE NOTICE '==============================================';
END $$; 