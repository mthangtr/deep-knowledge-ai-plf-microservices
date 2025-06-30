-- =====================================
-- DUAL CONTEXT STORAGE MIGRATION v2.0
-- Thêm support cho intelligent context compression
-- Created: 2024
-- =====================================

-- 1. Add dual context columns to learning_chats
ALTER TABLE learning_chats 
ADD COLUMN IF NOT EXISTS compressed_content TEXT,
ADD COLUMN IF NOT EXISTS compression_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS content_analysis JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS educational_metadata JSONB DEFAULT '{}';

-- 2. Create compression strategies enum type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compression_strategy') THEN
        CREATE TYPE compression_strategy AS ENUM (
            'NONE',
            'LIGHT',
            'MEDIUM', 
            'HEAVY',
            'TRUNCATE',
            'DUAL_STORE'
        );
    END IF;
END $$;

-- 3. Create content types enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
        CREATE TYPE content_type AS ENUM (
            'CONCEPT_QUESTION',
            'PRACTICAL_EXAMPLE',
            'CODE_EXPLANATION',
            'CALCULATION_PROBLEM',
            'LANGUAGE_PRACTICE',
            'CASE_STUDY',
            'HISTORICAL_ANALYSIS',
            'CREATIVE_WORK',
            'TROUBLESHOOTING',
            'OFF_TOPIC_CONTENT',
            'ABUSE_CONTENT'
        );
    END IF;
END $$;

-- 4. Add compression strategy tracking
ALTER TABLE learning_chats
ADD COLUMN IF NOT EXISTS detected_content_type content_type,
ADD COLUMN IF NOT EXISTS applied_compression_strategy compression_strategy DEFAULT 'NONE';

-- 5. Create context compression functions

-- Function to estimate content tokens
CREATE OR REPLACE FUNCTION estimate_content_tokens(content_text TEXT)
RETURNS INTEGER AS $$
BEGIN
    -- Simple estimation: ~4 characters = 1 token
    RETURN GREATEST(1, LENGTH(content_text) / 4);
END;
$$ LANGUAGE plpgsql;

-- Function to get compression ratio
CREATE OR REPLACE FUNCTION get_compression_ratio(
    original_content TEXT,
    compressed_content TEXT
) RETURNS FLOAT AS $$
BEGIN
    IF original_content IS NULL OR LENGTH(original_content) = 0 THEN
        RETURN 1.0;
    END IF;
    
    IF compressed_content IS NULL THEN
        RETURN 1.0;
    END IF;
    
    RETURN LENGTH(compressed_content)::FLOAT / LENGTH(original_content)::FLOAT;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze content type (basic rules-based)
CREATE OR REPLACE FUNCTION analyze_content_type(content_text TEXT)
RETURNS content_type AS $$
DECLARE
    content_lower TEXT;
BEGIN
    content_lower := LOWER(content_text);
    
    -- Code detection patterns
    IF content_text ~ '```|`[^`]+`|function\s*\(|class\s+\w+|import\s+\w+|def\s+\w+\(' THEN
        RETURN 'CODE_EXPLANATION';
    END IF;
    
    -- Question patterns
    IF content_lower ~ '^(what|how|why|when|where|which|explain|define|describe)' THEN
        RETURN 'CONCEPT_QUESTION';
    END IF;
    
    -- Math/calculation patterns
    IF content_text ~ '\d+\s*[+\-*/=]\s*\d+|equation|formula|calculate|solve for' THEN
        RETURN 'CALCULATION_PROBLEM';
    END IF;
    
    -- Language practice patterns
    IF content_lower ~ 'grammar|vocabulary|pronunciation|translate|sentence|paragraph' THEN
        RETURN 'LANGUAGE_PRACTICE';
    END IF;
    
    -- Case study patterns
    IF content_lower ~ 'case study|example|scenario|situation|business case|real.world' THEN
        RETURN 'CASE_STUDY';
    END IF;
    
    -- Historical patterns
    IF content_lower ~ 'history|historical|timeline|date|century|period|era' THEN
        RETURN 'HISTORICAL_ANALYSIS';
    END IF;
    
    -- Creative patterns
    IF content_lower ~ 'creative|art|design|music|poem|story|literature' THEN
        RETURN 'CREATIVE_WORK';
    END IF;
    
    -- Troubleshooting patterns
    IF content_lower ~ 'error|bug|issue|problem|debug|fix|troubleshoot|not working' THEN
        RETURN 'TROUBLESHOOTING';
    END IF;
    
    -- Default to practical example
    RETURN 'PRACTICAL_EXAMPLE';
END;
$$ LANGUAGE plpgsql;

-- Function to determine compression strategy
CREATE OR REPLACE FUNCTION determine_compression_strategy(
    content_text TEXT,
    detected_type content_type,
    is_user_message BOOLEAN DEFAULT FALSE,
    token_budget INTEGER DEFAULT 2000
) RETURNS compression_strategy AS $$
DECLARE
    content_length INTEGER;
    estimated_tokens INTEGER;
BEGIN
    content_length := LENGTH(content_text);
    estimated_tokens := estimate_content_tokens(content_text);
    
    -- Never compress user messages heavily
    IF is_user_message THEN
        IF content_length > 1000 THEN
            RETURN 'LIGHT';
        ELSE
            RETURN 'NONE';
        END IF;
    END IF;
    
    -- Content type specific strategies
    CASE detected_type
        WHEN 'CODE_EXPLANATION' THEN
            IF estimated_tokens > 500 THEN
                RETURN 'DUAL_STORE'; -- Keep code full, compress explanation
            ELSE
                RETURN 'LIGHT';
            END IF;
            
        WHEN 'CALCULATION_PROBLEM' THEN
            RETURN 'NONE'; -- Never compress math
            
        WHEN 'CONCEPT_QUESTION' THEN
            RETURN 'NONE'; -- Keep questions full
            
        WHEN 'PRACTICAL_EXAMPLE' THEN
            IF estimated_tokens > 1500 THEN
                RETURN 'MEDIUM';
            ELSIF estimated_tokens > 800 THEN
                RETURN 'LIGHT';
            ELSE
                RETURN 'NONE';
            END IF;
            
        WHEN 'CASE_STUDY' THEN
            IF estimated_tokens > 1200 THEN
                RETURN 'MEDIUM';
            ELSE
                RETURN 'LIGHT';
            END IF;
            
        WHEN 'OFF_TOPIC_CONTENT' THEN
            RETURN 'TRUNCATE';
            
        WHEN 'ABUSE_CONTENT' THEN
            RETURN 'TRUNCATE';
            
        ELSE
            -- Default strategy based on length
            IF estimated_tokens > 2000 THEN
                RETURN 'HEAVY';
            ELSIF estimated_tokens > 1000 THEN
                RETURN 'MEDIUM';
            ELSIF estimated_tokens > 500 THEN
                RETURN 'LIGHT';
            ELSE
                RETURN 'NONE';
            END IF;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 6. Create context building functions

-- Function to get context-optimized content
CREATE OR REPLACE FUNCTION get_context_content(chat_message learning_chats)
RETURNS TEXT AS $$
BEGIN
    -- Return compressed version if available and appropriate
    IF chat_message.compressed_content IS NOT NULL 
       AND chat_message.applied_compression_strategy != 'NONE' THEN
        RETURN chat_message.compressed_content;
    ELSE
        RETURN chat_message.message;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get search-optimized content (always full)
CREATE OR REPLACE FUNCTION get_search_content(chat_message learning_chats)
RETURNS TEXT AS $$
BEGIN
    -- Always return full content for search/embedding
    RETURN chat_message.message;
END;
$$ LANGUAGE plpgsql;

-- Function to build smart context for session
CREATE OR REPLACE FUNCTION build_smart_context(
    session_id_param UUID,
    message_limit INTEGER DEFAULT 10,
    token_budget INTEGER DEFAULT 2000
) RETURNS TABLE (
    message_id UUID,
    role TEXT,
    content TEXT,
    content_type content_type,
    compression_ratio FLOAT,
    tokens_estimated INTEGER,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    current_tokens INTEGER := 0;
    msg_record RECORD;
BEGIN
    -- Get recent messages and build context within token budget
    FOR msg_record IN
        SELECT 
            lc.id,
            CASE WHEN lc.is_ai_response THEN 'assistant' ELSE 'user' END as role,
            get_context_content(lc) as context_content,
            lc.message as original_content,
            lc.detected_content_type,
            lc.applied_compression_strategy,
            lc.created_at
        FROM learning_chats lc
        WHERE lc.session_id = session_id_param
        ORDER BY lc.created_at DESC
        LIMIT message_limit
    LOOP
        -- Calculate tokens for this message
        DECLARE
            msg_tokens INTEGER := estimate_content_tokens(msg_record.context_content);
        BEGIN
            -- Check if we're within budget
            IF current_tokens + msg_tokens <= token_budget THEN
                current_tokens := current_tokens + msg_tokens;
                
                -- Return the message
                message_id := msg_record.id;
                role := msg_record.role;
                content := msg_record.context_content;
                content_type := msg_record.detected_content_type;
                compression_ratio := get_compression_ratio(msg_record.original_content, msg_record.context_content);
                tokens_estimated := msg_tokens;
                created_at := msg_record.created_at;
                
                RETURN NEXT;
            ELSE
                -- Stop if we exceed budget
                EXIT;
            END IF;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Add compression tracking table
CREATE TABLE IF NOT EXISTS compression_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES learning_chats(id) ON DELETE CASCADE NOT NULL,
    original_length INTEGER NOT NULL,
    compressed_length INTEGER,
    compression_ratio FLOAT,
    compression_strategy compression_strategy NOT NULL,
    content_type content_type,
    processing_time_ms INTEGER,
    token_savings INTEGER,
    quality_score FLOAT, -- For future ML quality assessment
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_learning_chats_content_type ON learning_chats(detected_content_type);
CREATE INDEX IF NOT EXISTS idx_learning_chats_compression_strategy ON learning_chats(applied_compression_strategy);
CREATE INDEX IF NOT EXISTS idx_learning_chats_compressed_content ON learning_chats USING gin(to_tsvector('english', compressed_content));

CREATE INDEX IF NOT EXISTS idx_compression_analytics_message_id ON compression_analytics(message_id);
CREATE INDEX IF NOT EXISTS idx_compression_analytics_strategy ON compression_analytics(compression_strategy);
CREATE INDEX IF NOT EXISTS idx_compression_analytics_content_type ON compression_analytics(content_type);

-- 9. Add triggers to auto-analyze new messages
CREATE OR REPLACE FUNCTION auto_analyze_message_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-detect content type for new messages
    IF NEW.detected_content_type IS NULL THEN
        NEW.detected_content_type := analyze_content_type(NEW.message);
    END IF;
    
    -- Auto-determine compression strategy
    IF NEW.applied_compression_strategy IS NULL OR NEW.applied_compression_strategy = 'NONE' THEN
        NEW.applied_compression_strategy := determine_compression_strategy(
            NEW.message,
            NEW.detected_content_type,
            NOT NEW.is_ai_response
        );
    END IF;
    
    -- Set content analysis metadata
    NEW.content_analysis := jsonb_build_object(
        'original_length', LENGTH(NEW.message),
        'estimated_tokens', estimate_content_tokens(NEW.message),
        'analysis_timestamp', NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_analyze_message_trigger
    BEFORE INSERT OR UPDATE ON learning_chats
    FOR EACH ROW EXECUTE FUNCTION auto_analyze_message_content();

-- 10. Helper views for analytics
CREATE OR REPLACE VIEW compression_stats AS
SELECT 
    detected_content_type,
    applied_compression_strategy,
    COUNT(*) as message_count,
    AVG(LENGTH(message)) as avg_original_length,
    AVG(LENGTH(compressed_content)) as avg_compressed_length,
    AVG(get_compression_ratio(message, compressed_content)) as avg_compression_ratio,
    SUM(estimate_content_tokens(message)) as total_original_tokens,
    SUM(estimate_content_tokens(COALESCE(compressed_content, message))) as total_context_tokens
FROM learning_chats
WHERE detected_content_type IS NOT NULL
GROUP BY detected_content_type, applied_compression_strategy
ORDER BY detected_content_type, applied_compression_strategy;

-- 11. Migration: Analyze existing messages
DO $$
DECLARE
    msg_record RECORD;
    analysis_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Analyzing existing messages for content type and compression strategy...';
    
    -- Update existing messages with content analysis
    FOR msg_record IN
        SELECT id, message, is_ai_response
        FROM learning_chats
        WHERE detected_content_type IS NULL
        ORDER BY created_at DESC
        LIMIT 1000 -- Process in batches
    LOOP
        UPDATE learning_chats
        SET 
            detected_content_type = analyze_content_type(msg_record.message),
            applied_compression_strategy = determine_compression_strategy(
                msg_record.message,
                analyze_content_type(msg_record.message),
                NOT msg_record.is_ai_response
            ),
            content_analysis = jsonb_build_object(
                'original_length', LENGTH(msg_record.message),
                'estimated_tokens', estimate_content_tokens(msg_record.message),
                'migration_analysis', true,
                'analysis_timestamp', NOW()
            )
        WHERE id = msg_record.id;
        
        analysis_count := analysis_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Analyzed % existing messages', analysis_count;
END $$;

-- =====================================
-- MIGRATION COMPLETE
-- =====================================
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'DUAL CONTEXT STORAGE MIGRATION COMPLETED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Added features:';
    RAISE NOTICE '- Dual context storage (full + compressed)';
    RAISE NOTICE '- Intelligent content type detection';
    RAISE NOTICE '- Compression strategy selection';
    RAISE NOTICE '- Educational content analysis';
    RAISE NOTICE '- Context building with token budgets';
    RAISE NOTICE '- Compression analytics tracking';
    RAISE NOTICE '';
    RAISE NOTICE 'Your context system now supports:';
    RAISE NOTICE '✓ Smart compression based on content type';
    RAISE NOTICE '✓ Educational content awareness';
    RAISE NOTICE '✓ Token budget management';
    RAISE NOTICE '✓ Dual storage for search + context';
    RAISE NOTICE '✓ Compression analytics and monitoring';
    RAISE NOTICE '✓ Auto-analysis of content types';
    RAISE NOTICE '==============================================';
END $$; 