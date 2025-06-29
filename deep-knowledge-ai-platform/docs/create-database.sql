-- =====================================================
-- DEEP KNOWLEDGE AI PLATFORM - DATABASE SETUP
-- Script tạo database hoàn chỉnh với cấu trúc mới
-- Updated để support topic-level và node-level chat/notes
-- =====================================================

-- =====================================
-- 1. FUNCTIONS
-- =====================================

-- Function để auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function để sync user profile names
CREATE OR REPLACE FUNCTION sync_user_profile_names()
RETURNS TRIGGER AS $$
BEGIN
    -- Nếu full_name có giá trị và name rỗng, copy full_name sang name
    IF NEW.full_name IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN
        NEW.name = NEW.full_name;
    END IF;
    
    -- Nếu name có giá trị và full_name rỗng, copy name sang full_name  
    IF NEW.name IS NOT NULL AND (NEW.full_name IS NULL OR NEW.full_name = '') THEN
        NEW.full_name = NEW.name;
    END IF;
    
    -- Auto-assign free plan nếu chưa có plan
    IF NEW.plan_id IS NULL THEN
        SELECT id INTO NEW.plan_id FROM plans WHERE name = 'free' LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function để cập nhật thống kê topic
CREATE OR REPLACE FUNCTION update_topic_stats()
RETURNS TRIGGER AS $$
DECLARE
    topic_id_var UUID;
BEGIN
    -- Lấy topic_id từ OLD hoặc NEW
    IF TG_OP = 'DELETE' THEN
        topic_id_var := OLD.topic_id;
    ELSE
        topic_id_var := NEW.topic_id;
    END IF;
    
    -- Cập nhật tổng số nodes và completed nodes
    UPDATE learning_topics 
    SET 
        total_nodes = (
            SELECT COUNT(*) FROM tree_nodes WHERE topic_id = topic_id_var
        ),
        completed_nodes = (
            SELECT COUNT(*) FROM tree_nodes 
            WHERE topic_id = topic_id_var AND is_completed = true
        ),
        updated_at = NOW()
    WHERE id = topic_id_var;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function để validate chat reference integrity
CREATE OR REPLACE FUNCTION validate_chat_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- Nếu có node_id, kiểm tra xem node đó có thuộc về topic_id không
    IF NEW.node_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM tree_nodes 
            WHERE tree_nodes.id = NEW.node_id 
            AND tree_nodes.topic_id = NEW.topic_id
        ) THEN
            RAISE EXCEPTION 'Node % does not belong to topic %', NEW.node_id, NEW.topic_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function để validate note reference integrity
CREATE OR REPLACE FUNCTION validate_note_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- Nếu có node_id, kiểm tra xem node đó có thuộc về topic_id không
    IF NEW.node_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM tree_nodes 
            WHERE tree_nodes.id = NEW.node_id 
            AND tree_nodes.topic_id = NEW.topic_id
        ) THEN
            RAISE EXCEPTION 'Node % does not belong to topic %', NEW.node_id, NEW.topic_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================
-- 2. BACKUP VÀ DROP TABLES CŨ (nếu có)
-- =====================================

-- Backup dữ liệu cũ nếu tables tồn tại
DO $$
BEGIN
    -- Backup learning_topics nếu tồn tại
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'learning_topics') THEN
        CREATE TABLE IF NOT EXISTS learning_topics_backup AS 
        SELECT * FROM learning_topics;
        
        DROP TABLE IF EXISTS learning_notes CASCADE;
        DROP TABLE IF EXISTS learning_chats CASCADE;
        DROP TABLE IF EXISTS tree_nodes CASCADE;
        DROP TABLE IF EXISTS learning_topics CASCADE;
        DROP TABLE IF EXISTS user_learning_progress CASCADE;
        DROP TABLE IF EXISTS user_plan_history CASCADE;
        
        RAISE NOTICE 'Đã backup và drop tables cũ';
    END IF;
END $$;

-- =====================================
-- 3. CORE TABLES (Plans và User Profiles)
-- =====================================

-- Bảng plans
CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0, -- Giá tính theo USD cents
  currency TEXT NOT NULL DEFAULT 'USD',
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Bảng user_profiles (theo convention Supabase)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT, -- Supabase Auth mặc định sử dụng full_name
  name TEXT, -- Alias cho full_name để backward compatibility
  avatar_url TEXT,
  provider TEXT CHECK (provider IN ('email', 'magic_link', 'google', 'github')),
  plan_id UUID REFERENCES plans(id), -- Plan subscription
  plan_status TEXT DEFAULT 'active' CHECK (plan_status IN ('active', 'inactive', 'expired', 'cancelled')),
  plan_started_at TIMESTAMPTZ DEFAULT NOW(),
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_login_at TIMESTAMPTZ
);

-- =====================================
-- 4. LEARNING SYSTEM TABLES (Updated Schema with prompt_sample & is_chat_enabled)
-- =====================================

-- 4.1. Learning Topics (Chủ đề học tập chính)
CREATE TABLE IF NOT EXISTS learning_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, -- "Học React.js", "Đầu tư chứng khoán"
  description TEXT NOT NULL, -- Mô tả tổng quan chủ đề
  prompt TEXT, -- Prompt gốc user đã nhập
  total_nodes INTEGER DEFAULT 0, -- Tổng số nodes trong tree
  completed_nodes INTEGER DEFAULT 0, -- Số nodes đã hoàn thành
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4.2. Tree Nodes (Các node trong cây kiến thức) - ĐÃ CẬP NHẬT với prompt_sample & is_chat_enabled
CREATE TABLE IF NOT EXISTS tree_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES learning_topics(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, -- "JSX Basics", "Props & State"
  description TEXT NOT NULL, -- Mô tả chi tiết node
  prompt_sample TEXT, -- Prompt mẫu khi user click vào node để chat
  is_chat_enabled BOOLEAN DEFAULT true, -- Có cho phép chat với node này không (nodes chung chung = false)
  requires UUID[] DEFAULT '{}', -- Array các node_id phải học trước
  next UUID[] DEFAULT '{}', -- Array các node_id gợi ý học tiếp
  level INTEGER DEFAULT 0, -- Cấp độ trong cây (0 = root, 1 = level 1...)
  position_x FLOAT DEFAULT 0, -- Vị trí X trong mindmap
  position_y FLOAT DEFAULT 0, -- Vị trí Y trong mindmap
  is_completed BOOLEAN DEFAULT false, -- User đã hoàn thành node này chưa
  completed_at TIMESTAMPTZ, -- Thời gian hoàn thành
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4.3. Learning Chats (Chat cho topic và node) - UPDATED SCHEMA
CREATE TABLE IF NOT EXISTS learning_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES learning_topics(id) ON DELETE CASCADE NOT NULL, -- REQUIRED: Topic reference
  node_id UUID REFERENCES tree_nodes(id) ON DELETE CASCADE, -- OPTIONAL: Null = topic-level chat
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_ai_response BOOLEAN DEFAULT FALSE,
  message_type TEXT DEFAULT 'normal' CHECK (message_type IN ('normal', 'auto_prompt', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4.4. Learning Notes (Notes cho topic và node) - UPDATED SCHEMA
CREATE TABLE IF NOT EXISTS learning_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES learning_topics(id) ON DELETE CASCADE NOT NULL, -- REQUIRED: Topic reference
  node_id UUID REFERENCES tree_nodes(id) ON DELETE CASCADE, -- OPTIONAL: Null = topic-level notes
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'manual' CHECK (note_type IN ('manual', 'extracted_from_chat', 'ai_summary')),
  source_chat_id UUID REFERENCES learning_chats(id) ON DELETE SET NULL, -- Nếu note được trích từ chat
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4.5. User Learning Progress (Theo dõi tiến độ)
CREATE TABLE IF NOT EXISTS user_learning_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES learning_topics(id) ON DELETE CASCADE NOT NULL,
  current_node_id UUID REFERENCES tree_nodes(id) ON DELETE SET NULL, -- Node đang học
  total_time_spent INTEGER DEFAULT 0, -- Tổng thời gian học (phút)
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, topic_id) -- Mỗi user chỉ có 1 progress cho 1 topic
);

-- 4.6. User Plan History (Lịch sử thay đổi plan)
CREATE TABLE IF NOT EXISTS user_plan_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id),
  old_plan_id UUID REFERENCES plans(id),
  action TEXT CHECK (action IN ('upgrade', 'downgrade', 'cancel', 'renew', 'initial')),
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================
-- 5. INDEXES (Tối ưu performance) - UPDATED
-- =====================================

-- Core tables indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_plan_id ON user_profiles(plan_id);
CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);

-- Learning system indexes
CREATE INDEX IF NOT EXISTS idx_learning_topics_user_id ON learning_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_topics_is_active ON learning_topics(is_active);
CREATE INDEX IF NOT EXISTS idx_learning_topics_updated_at ON learning_topics(updated_at);

CREATE INDEX IF NOT EXISTS idx_tree_nodes_topic_id ON tree_nodes(topic_id);
CREATE INDEX IF NOT EXISTS idx_tree_nodes_level ON tree_nodes(level);
CREATE INDEX IF NOT EXISTS idx_tree_nodes_is_completed ON tree_nodes(is_completed);
CREATE INDEX IF NOT EXISTS idx_tree_nodes_is_chat_enabled ON tree_nodes(is_chat_enabled); -- INDEX mới cho chat filtering

-- Chat indexes - UPDATED cho topic + node support
CREATE INDEX IF NOT EXISTS idx_learning_chats_topic_id ON learning_chats(topic_id);
CREATE INDEX IF NOT EXISTS idx_learning_chats_node_id ON learning_chats(node_id);
CREATE INDEX IF NOT EXISTS idx_learning_chats_user_id ON learning_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_chats_message_type ON learning_chats(message_type);
CREATE INDEX IF NOT EXISTS idx_learning_chats_created_at ON learning_chats(created_at);
-- Composite index cho topic-level chats
CREATE INDEX IF NOT EXISTS idx_learning_chats_topic_null_node ON learning_chats(topic_id, created_at) WHERE node_id IS NULL;
-- Composite index cho node-level chats
CREATE INDEX IF NOT EXISTS idx_learning_chats_node_topic ON learning_chats(node_id, topic_id, created_at) WHERE node_id IS NOT NULL;

-- Notes indexes - UPDATED cho topic + node support
CREATE INDEX IF NOT EXISTS idx_learning_notes_topic_id ON learning_notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_learning_notes_node_id ON learning_notes(node_id);
CREATE INDEX IF NOT EXISTS idx_learning_notes_user_id ON learning_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_notes_note_type ON learning_notes(note_type);
-- Composite index cho topic-level notes
CREATE INDEX IF NOT EXISTS idx_learning_notes_topic_null_node ON learning_notes(topic_id, created_at) WHERE node_id IS NULL;
-- Composite index cho node-level notes
CREATE INDEX IF NOT EXISTS idx_learning_notes_node_topic ON learning_notes(node_id, topic_id, created_at) WHERE node_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_topic_id ON user_learning_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_last_accessed ON user_learning_progress(last_accessed_at);

CREATE INDEX IF NOT EXISTS idx_user_plan_history_user_id ON user_plan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plan_history_plan_id ON user_plan_history(plan_id);

-- =====================================
-- 6. TRIGGERS
-- =====================================

-- Drop triggers cũ nếu có
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS sync_user_profile_names_trigger ON user_profiles;
DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
DROP TRIGGER IF EXISTS update_learning_topics_updated_at ON learning_topics;
DROP TRIGGER IF EXISTS update_tree_nodes_updated_at ON tree_nodes;
DROP TRIGGER IF EXISTS update_learning_notes_updated_at ON learning_notes;
DROP TRIGGER IF EXISTS update_user_progress_updated_at ON user_learning_progress;
DROP TRIGGER IF EXISTS update_topic_stats_trigger ON tree_nodes;
DROP TRIGGER IF EXISTS validate_chat_reference_trigger ON learning_chats;
DROP TRIGGER IF EXISTS validate_note_reference_trigger ON learning_notes;

-- Tạo triggers mới
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE
    ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER sync_user_profile_names_trigger BEFORE INSERT OR UPDATE
    ON user_profiles FOR EACH ROW EXECUTE FUNCTION sync_user_profile_names();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE
    ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_topics_updated_at BEFORE UPDATE
    ON learning_topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tree_nodes_updated_at BEFORE UPDATE
    ON tree_nodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_notes_updated_at BEFORE UPDATE
    ON learning_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE
    ON user_learning_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger để cập nhật topic stats khi có thay đổi trong tree_nodes
CREATE TRIGGER update_topic_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tree_nodes
    FOR EACH ROW EXECUTE FUNCTION update_topic_stats();

-- Triggers để validate data integrity
CREATE TRIGGER validate_chat_reference_trigger
    BEFORE INSERT OR UPDATE ON learning_chats
    FOR EACH ROW EXECUTE FUNCTION validate_chat_reference();

CREATE TRIGGER validate_note_reference_trigger
    BEFORE INSERT OR UPDATE ON learning_notes
    FOR EACH ROW EXECUTE FUNCTION validate_note_reference();

-- =====================================
-- 7. DEFAULT DATA
-- =====================================

-- Insert default plans
INSERT INTO plans (name, description, price, currency, features, is_active) VALUES
(
  'free',
  'Gói miễn phí với các tính năng cơ bản',
  0,
  'USD',
  '["Truy cập cơ bản", "5 chat sessions/ngày", "Ghi chú cơ bản", "1 mind map/ngày"]',
  true
),
(
  'premium',
  'Gói cao cấp với đầy đủ tính năng',
  1000, -- $10.00
  'USD',
  '["Truy cập không giới hạn", "Chat sessions không giới hạn", "Ghi chú nâng cao", "Mind map không giới hạn", "AI mentor chuyên sâu", "Phân tích học tập", "Xuất báo cáo", "Hỗ trợ ưu tiên"]',
  true
)
ON CONFLICT (name) DO NOTHING;

-- =====================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================

-- Tắt RLS cho user_profiles để cho phép Supabase Auth tự động insert
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Tắt RLS cho learning system tables - sử dụng application-level authorization
-- Điều này đơn giản hơn và không ảnh hưởng NextAuth session management
ALTER TABLE learning_topics DISABLE ROW LEVEL SECURITY;
ALTER TABLE tree_nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_progress DISABLE ROW LEVEL SECURITY;

-- Chỉ bật RLS cho plans và plan history (ít thay đổi)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plan_history ENABLE ROW LEVEL SECURITY;

-- =====================================
-- 9. RLS POLICIES - SIMPLIFIED
-- =====================================

-- Drop policies cũ nếu có
DROP POLICY IF EXISTS "Anyone can read plans" ON plans;
DROP POLICY IF EXISTS "Service role full access plans" ON plans;
DROP POLICY IF EXISTS "Users can CRUD own topics" ON learning_topics;
DROP POLICY IF EXISTS "Service role full access topics" ON learning_topics;
DROP POLICY IF EXISTS "Users can CRUD nodes of own topics" ON tree_nodes;
DROP POLICY IF EXISTS "Service role full access nodes" ON tree_nodes;
DROP POLICY IF EXISTS "Users can CRUD chats of own nodes" ON learning_chats;
DROP POLICY IF EXISTS "Users can CRUD chats of own topics" ON learning_chats;
DROP POLICY IF EXISTS "Service role full access chats" ON learning_chats;
DROP POLICY IF EXISTS "Users can CRUD notes of own nodes" ON learning_notes;
DROP POLICY IF EXISTS "Users can CRUD notes of own topics" ON learning_notes;
DROP POLICY IF EXISTS "Service role full access notes" ON learning_notes;
DROP POLICY IF EXISTS "Users can CRUD own progress" ON user_learning_progress;
DROP POLICY IF EXISTS "Service role full access progress" ON user_learning_progress;

-- Plans policies (vẫn dùng RLS vì ít thay đổi)
CREATE POLICY "Anyone can read active plans" ON plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access plans" ON plans 
    FOR ALL USING (auth.role() = 'service_role');

-- User Plan History policies (vẫn dùng RLS vì ít thay đổi)
CREATE POLICY "Users can read own plan history" ON user_plan_history
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role full access plan history" ON user_plan_history 
    FOR ALL USING (auth.role() = 'service_role');

-- NOTE: Learning system tables (topics, nodes, chats, notes, progress) 
-- không dùng RLS - authorization được handle ở application level

-- =====================================
-- 10. UTILITY VIEWS (Optional - for easier querying)
-- =====================================

-- View để query topic-level chats dễ dàng
CREATE OR REPLACE VIEW topic_level_chats AS
SELECT 
    c.*,
    t.title as topic_title,
    t.user_id as topic_owner_id
FROM learning_chats c
JOIN learning_topics t ON c.topic_id = t.id
WHERE c.node_id IS NULL;

-- View để query node-level chats dễ dàng
CREATE OR REPLACE VIEW node_level_chats AS
SELECT 
    c.*,
    t.title as topic_title,
    n.title as node_title,
    t.user_id as topic_owner_id
FROM learning_chats c
JOIN learning_topics t ON c.topic_id = t.id
JOIN tree_nodes n ON c.node_id = n.id
WHERE c.node_id IS NOT NULL;

-- View để query topic-level notes dễ dàng
CREATE OR REPLACE VIEW topic_level_notes AS
SELECT 
    n.*,
    t.title as topic_title,
    t.user_id as topic_owner_id
FROM learning_notes n
JOIN learning_topics t ON n.topic_id = t.id
WHERE n.node_id IS NULL;

-- View để query node-level notes dễ dàng
CREATE OR REPLACE VIEW node_level_notes AS
SELECT 
    n.*,
    t.title as topic_title,
    tn.title as node_title,
    t.user_id as topic_owner_id
FROM learning_notes n
JOIN learning_topics t ON n.topic_id = t.id
JOIN tree_nodes tn ON n.node_id = tn.id
WHERE n.node_id IS NOT NULL;

-- View để query nodes có thể chat
CREATE OR REPLACE VIEW chateable_nodes AS
SELECT 
    n.*,
    t.title as topic_title,
    t.user_id as topic_owner_id
FROM tree_nodes n
JOIN learning_topics t ON n.topic_id = t.id
WHERE n.is_chat_enabled = true;

-- =====================================
-- 11. COMPLETION MESSAGE
-- =====================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'DEEP KNOWLEDGE AI PLATFORM DATABASE SETUP';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Database setup completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '- plans (with free/premium plans)';
    RAISE NOTICE '- user_profiles';
    RAISE NOTICE '- learning_topics';
    RAISE NOTICE '- tree_nodes (with prompt_sample & is_chat_enabled)';
    RAISE NOTICE '- learning_chats (topic + node support)';
    RAISE NOTICE '- learning_notes (topic + node support)';
    RAISE NOTICE '- user_learning_progress';
    RAISE NOTICE '- user_plan_history';
    RAISE NOTICE '';
    RAISE NOTICE 'New Features trong tree_nodes:';
    RAISE NOTICE '- prompt_sample (TEXT): Prompt mẫu khi user click node';
    RAISE NOTICE '- is_chat_enabled (BOOLEAN): Có cho phép chat với node không';
    RAISE NOTICE '  + Nodes tổng quan/chung chung: is_chat_enabled = false';
    RAISE NOTICE '  + Nodes cụ thể: is_chat_enabled = true + prompt_sample';
    RAISE NOTICE '';
    RAISE NOTICE 'Features enabled:';
    RAISE NOTICE '- Application-level authorization (no RLS conflicts)';
    RAISE NOTICE '- Auto-update triggers';
    RAISE NOTICE '- Topic statistics tracking';
    RAISE NOTICE '- Performance indexes (including chat filtering)';
    RAISE NOTICE '- Data integrity validation triggers';
    RAISE NOTICE '- Utility views cho easy querying';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for AI generation với smart chat controls!';
    RAISE NOTICE '==============================================';
END $$; 