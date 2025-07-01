-- =====================================================
-- DEEP KNOWLEDGE AI PLATFORM - DATABASE SETUP (FINAL VERSION)
-- This script represents the final, consolidated database schema
-- after all migrations have been applied.
-- It's intended for setting up a new database from scratch.
-- Last Updated: 2024
-- =====================================================

-- =====================================
-- 0. EXTENSIONS
-- =====================================
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================
-- 1. FUNCTIONS
-- =====================================

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to sync user profile names and assign default plan
CREATE OR REPLACE FUNCTION sync_user_profile_names()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.full_name IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN
        NEW.name = NEW.full_name;
    END IF;
    IF NEW.name IS NOT NULL AND (NEW.full_name IS NULL OR NEW.full_name = '') THEN
        NEW.full_name = NEW.name;
    END IF;
    IF NEW.plan_id IS NULL THEN
        SELECT id INTO NEW.plan_id FROM plans WHERE name = 'free' LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update topic statistics
CREATE OR REPLACE FUNCTION update_topic_stats()
RETURNS TRIGGER AS $$
DECLARE
    topic_id_var UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        topic_id_var := OLD.topic_id;
    ELSE
        topic_id_var := NEW.topic_id;
    END IF;
    
    UPDATE learning_topics 
    SET 
        total_nodes = (SELECT COUNT(*) FROM tree_nodes WHERE topic_id = topic_id_var),
        completed_nodes = (SELECT COUNT(*) FROM tree_nodes WHERE topic_id = topic_id_var AND is_completed = true),
        updated_at = NOW()
    WHERE id = topic_id_var;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to validate chat reference integrity
CREATE OR REPLACE FUNCTION validate_chat_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.node_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM tree_nodes WHERE tree_nodes.id = NEW.node_id AND tree_nodes.topic_id = NEW.topic_id) THEN
            RAISE EXCEPTION 'Node % does not belong to topic %', NEW.node_id, NEW.topic_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to validate note reference integrity
CREATE OR REPLACE FUNCTION validate_note_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.node_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM tree_nodes WHERE tree_nodes.id = NEW.node_id AND tree_nodes.topic_id = NEW.topic_id) THEN
            RAISE EXCEPTION 'Node % does not belong to topic %', NEW.node_id, NEW.topic_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update session activity on new message
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

-- =====================================
-- 2. ENUM TYPES
-- =====================================
-- Note: These were added in migrations but are defined here for a clean setup.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compression_strategy') THEN
        CREATE TYPE compression_strategy AS ENUM ('NONE', 'LIGHT', 'MEDIUM', 'HEAVY', 'TRUNCATE', 'DUAL_STORE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
        CREATE TYPE content_type AS ENUM ('CONCEPT_QUESTION', 'PRACTICAL_EXAMPLE', 'CODE_EXPLANATION', 'CALCULATION_PROBLEM', 'LANGUAGE_PRACTICE', 'CASE_STUDY', 'HISTORICAL_ANALYSIS', 'CREATIVE_WORK', 'TROUBLESHOOTING', 'OFF_TOPIC_CONTENT', 'ABUSE_CONTENT');
    END IF;
END $$;


-- =====================================
-- 3. CORE TABLES (Plans, Users)
-- =====================================

CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  name TEXT,
  avatar_url TEXT,
  provider TEXT,
  plan_id UUID REFERENCES plans(id),
  plan_status TEXT DEFAULT 'active',
  plan_started_at TIMESTAMPTZ DEFAULT NOW(),
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_login_at TIMESTAMPTZ
);

-- =====================================
-- 4. LEARNING & CHAT SYSTEM TABLES
-- =====================================

CREATE TABLE IF NOT EXISTS learning_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  prompt TEXT,
  total_nodes INTEGER DEFAULT 0,
  completed_nodes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS tree_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES learning_topics(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  prompt_sample TEXT,
  is_chat_enabled BOOLEAN DEFAULT true,
  requires UUID[] DEFAULT '{}',
  next UUID[] DEFAULT '{}',
  level INTEGER DEFAULT 0,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES learning_topics(id) ON DELETE CASCADE,
  node_id UUID REFERENCES tree_nodes(id) ON DELETE CASCADE,
  title VARCHAR(255),
  compressed_summary TEXT,
  message_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  user_knowledge_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES learning_topics(id) ON DELETE CASCADE NOT NULL,
  node_id UUID REFERENCES tree_nodes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_ai_response BOOLEAN DEFAULT FALSE,
  message_type TEXT DEFAULT 'normal' CHECK (message_type IN ('normal', 'auto_prompt', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Columns from migration 1
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  embedding VECTOR(1536),
  context_type VARCHAR(50) DEFAULT 'recent',
  tokens_used INTEGER DEFAULT 0,
  model_used VARCHAR(100),
  parent_message_id UUID REFERENCES learning_chats(id),
  -- Columns from migration 2 (and removed in 3) are omitted.
  -- These columns were dropped: compressed_content, compression_metadata, applied_compression_strategy
  content_analysis JSONB DEFAULT '{}',
  educational_metadata JSONB DEFAULT '{}',
  detected_content_type content_type
);
COMMENT ON TABLE learning_chats IS 'Smart single context storage with token-based compression. Original message is used for all purposes.';
COMMENT ON COLUMN learning_chats.context_type IS 'Context classification: recent, compressed, historical';
COMMENT ON COLUMN learning_chats.message IS 'Original message content - used for both search and context';


CREATE TABLE IF NOT EXISTS learning_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES learning_topics(id) ON DELETE CASCADE NOT NULL,
  node_id UUID REFERENCES tree_nodes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'manual' CHECK (note_type IN ('manual', 'extracted_from_chat', 'ai_summary')),
  source_chat_id UUID REFERENCES learning_chats(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS user_learning_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES learning_topics(id) ON DELETE CASCADE NOT NULL,
  current_node_id UUID REFERENCES tree_nodes(id) ON DELETE SET NULL,
  total_time_spent INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS context_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  cache_key VARCHAR(255) NOT NULL,
  cache_value JSONB NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(session_id, cache_key)
);

CREATE TABLE IF NOT EXISTS compression_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES learning_chats(id) ON DELETE CASCADE NOT NULL,
  original_tokens INTEGER,
  compressed_tokens INTEGER,
  ratio FLOAT,
  content_type content_type,
  compression_strategy compression_strategy,
  model_used VARCHAR(100),
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================
-- 5. INDEXES
-- =====================================
-- Core
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
-- Learning Topics
CREATE INDEX IF NOT EXISTS idx_learning_topics_user_id ON learning_topics(user_id);
-- Tree Nodes
CREATE INDEX IF NOT EXISTS idx_tree_nodes_topic_id ON tree_nodes(topic_id);
-- Chat Sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_topic_id ON chat_sessions(topic_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_activity ON chat_sessions(last_activity DESC);
-- Learning Chats
CREATE INDEX IF NOT EXISTS idx_learning_chats_topic_id ON learning_chats(topic_id);
CREATE INDEX IF NOT EXISTS idx_learning_chats_node_id ON learning_chats(node_id);
CREATE INDEX IF NOT EXISTS idx_learning_chats_user_id ON learning_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_chats_created_at ON learning_chats(created_at);
CREATE INDEX IF NOT EXISTS idx_learning_chats_session_id ON learning_chats(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_chats_embedding ON learning_chats USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_learning_chats_session_recent ON learning_chats (session_id, created_at DESC) WHERE context_type = 'recent';
CREATE INDEX IF NOT EXISTS idx_learning_chats_user_search ON learning_chats USING gin(to_tsvector('english', message)) WHERE context_type IN ('recent', 'compressed');
-- Learning Notes
CREATE INDEX IF NOT EXISTS idx_learning_notes_topic_id ON learning_notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_learning_notes_node_id ON learning_notes(node_id);
-- Other
CREATE INDEX IF NOT EXISTS idx_context_cache_session_id ON context_cache(session_id);
CREATE INDEX IF NOT EXISTS idx_compression_analytics_message_id ON compression_analytics(message_id);

-- =====================================
-- 6. TRIGGERS
-- =====================================
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER sync_user_profile_names_trigger BEFORE INSERT OR UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION sync_user_profile_names();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_topics_updated_at BEFORE UPDATE ON learning_topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tree_nodes_updated_at BEFORE UPDATE ON tree_nodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_notes_updated_at BEFORE UPDATE ON learning_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_learning_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_topic_stats_trigger AFTER INSERT OR UPDATE OR DELETE ON tree_nodes FOR EACH ROW EXECUTE FUNCTION update_topic_stats();
CREATE TRIGGER validate_chat_reference_trigger BEFORE INSERT OR UPDATE ON learning_chats FOR EACH ROW EXECUTE FUNCTION validate_chat_reference();
CREATE TRIGGER validate_note_reference_trigger BEFORE INSERT OR UPDATE ON learning_notes FOR EACH ROW EXECUTE FUNCTION validate_note_reference();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_session_on_new_message AFTER INSERT ON learning_chats FOR EACH ROW EXECUTE FUNCTION update_session_activity();


-- =====================================
-- 7. ADVANCED FUNCTIONS (from migrations)
-- =====================================
CREATE OR REPLACE FUNCTION match_chat_messages(query_embedding VECTOR(1536), user_id_param UUID, match_threshold FLOAT DEFAULT 0.8, match_count INT DEFAULT 5)
RETURNS TABLE (id UUID, message TEXT, is_ai_response BOOLEAN, session_id UUID, topic_id UUID, node_id UUID, similarity FLOAT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY SELECT lc.id, lc.message, lc.is_ai_response, lc.session_id, lc.topic_id, lc.node_id, 1 - (lc.embedding <=> query_embedding) AS similarity, lc.created_at
  FROM learning_chats lc WHERE lc.user_id = user_id_param AND lc.embedding IS NOT NULL AND 1 - (lc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION search_user_knowledge(query_embedding VECTOR(1536), user_id_param UUID, topic_id_param UUID DEFAULT NULL, session_id_param UUID DEFAULT NULL, match_threshold FLOAT DEFAULT 0.75, match_count INT DEFAULT 10)
RETURNS TABLE (id UUID, message TEXT, is_ai_response BOOLEAN, session_id UUID, session_title VARCHAR(255), topic_id UUID, topic_title TEXT, node_id UUID, node_title TEXT, similarity FLOAT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY SELECT lc.id, lc.message, lc.is_ai_response, lc.session_id, cs.title AS session_title, lc.topic_id, lt.title AS topic_title, lc.node_id, tn.title AS node_title, 1 - (lc.embedding <=> query_embedding) AS similarity, lc.created_at
  FROM learning_chats lc LEFT JOIN chat_sessions cs ON lc.session_id = cs.id LEFT JOIN learning_topics lt ON lc.topic_id = lt.id LEFT JOIN tree_nodes tn ON lc.node_id = tn.id
  WHERE lc.user_id = user_id_param AND lc.embedding IS NOT NULL AND (topic_id_param IS NULL OR lc.topic_id = topic_id_param) AND (session_id_param IS NULL OR lc.session_id = session_id_param) AND 1 - (lc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_session_compression_need(p_session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_chars INTEGER;
    message_count INTEGER;
    estimated_tokens INTEGER;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(LENGTH(message)), 0) INTO message_count, total_chars FROM learning_chats WHERE session_id = p_session_id;
    estimated_tokens := total_chars / 4;
    RETURN (estimated_tokens > 4500 OR message_count > 80);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_session_stats(p_session_id UUID)
RETURNS TABLE(message_count BIGINT, user_message_count BIGINT, ai_message_count BIGINT, total_chars BIGINT, estimated_tokens INTEGER, first_message_at TIMESTAMPTZ, last_message_at TIMESTAMPTZ, avg_message_length NUMERIC, needs_compression BOOLEAN) AS $$
BEGIN
    RETURN QUERY SELECT COUNT(*), COUNT(*) FILTER (WHERE NOT is_ai_response), COUNT(*) FILTER (WHERE is_ai_response), COALESCE(SUM(LENGTH(message)), 0), (COALESCE(SUM(LENGTH(message)), 0) / 4)::INTEGER, MIN(created_at), MAX(created_at), AVG(LENGTH(message)), check_session_compression_need(p_session_id)
    FROM learning_chats WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;


-- =====================================
-- 8. VIEWS
-- =====================================
CREATE OR REPLACE VIEW public.active_chat_sessions AS
SELECT cs.id, cs.user_id, cs.topic_id, cs.node_id, cs.title, cs.message_count, cs.tokens_used, cs.last_activity, cs.created_at, lt.title AS topic_title, tn.title AS node_title
FROM chat_sessions cs LEFT JOIN learning_topics lt ON cs.topic_id = lt.id LEFT JOIN tree_nodes tn ON cs.node_id = tn.id
WHERE cs.is_active = true;


-- =====================================
-- 9. DEFAULT DATA
-- =====================================

INSERT INTO plans (name, description, price, features) VALUES
('free', 'Free plan with basic features', 0, '["Up to 3 topics", "Basic chat", "Community support"]')
ON CONFLICT (name) DO NOTHING;

INSERT INTO plans (name, description, price, features) VALUES
('pro', 'Pro plan with advanced features', 2000, '["Unlimited topics", "Advanced AI chat", "Vector search", "Priority support"]')
ON CONFLICT (name) DO NOTHING;

-- =====================================
-- 10. RLS POLICIES
-- =====================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE compression_analytics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read access on plans" ON plans FOR SELECT USING (true);
CREATE POLICY "Users can manage their own profile" ON user_profiles FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users can manage their own topics" ON learning_topics FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view nodes of their own topics" ON tree_nodes FOR SELECT USING (EXISTS (SELECT 1 FROM learning_topics WHERE id = tree_nodes.topic_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage nodes of their own topics" ON tree_nodes FOR ALL USING (EXISTS (SELECT 1 FROM learning_topics WHERE id = tree_nodes.topic_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage their own chats" ON learning_chats FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own notes" ON learning_notes FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own progress" ON user_learning_progress FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own sessions" ON chat_sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own cache" ON context_cache FOR ALL USING (EXISTS (SELECT 1 FROM chat_sessions WHERE id = context_cache.session_id AND user_id = auth.uid()));
CREATE POLICY "Users can view their own compression analytics" ON compression_analytics FOR SELECT USING (EXISTS (SELECT 1 FROM learning_chats WHERE id = compression_analytics.message_id AND user_id = auth.uid()));


-- Final notification
DO $$
BEGIN
    RAISE NOTICE '=== DATABASE SETUP SCRIPT COMPLETED SUCCESSFULLY ===';
END $$; 