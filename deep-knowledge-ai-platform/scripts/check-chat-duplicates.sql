    -- =============================================
    -- SCRIPT: Check and Clean Chat Duplicates
    -- Purpose: Detect và remove duplicate messages 
    -- trong learning_chats table
    -- =============================================

    -- 1. DETECT DUPLICATES
    -- =============================================

    -- Find exact duplicate messages (same content, topic, user, timestamp gần nhau)
    SELECT 
        topic_id,
        node_id,
        user_id,
        message,
        is_ai_response,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(id ORDER BY created_at) as message_ids,
        MIN(created_at) as first_created,
        MAX(created_at) as last_created,
        (MAX(created_at) - MIN(created_at)) as time_diff
    FROM learning_chats
    GROUP BY topic_id, node_id, user_id, message, is_ai_response
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC, topic_id, created_at;

    -- 2. FIND RECENT DUPLICATES (trong vòng 5 phút)
    -- =============================================

    -- Messages giống nhau được tạo trong vòng 5 phút (likely StrictMode duplicates)
    WITH recent_duplicates AS (
        SELECT 
            topic_id,
            node_id,
            user_id,
            message,
            is_ai_response,
            COUNT(*) as duplicate_count,
            ARRAY_AGG(id ORDER BY created_at) as message_ids,
            MIN(created_at) as first_created,
            MAX(created_at) as last_created,
            (MAX(created_at) - MIN(created_at)) as time_diff
        FROM learning_chats
        GROUP BY topic_id, node_id, user_id, message, is_ai_response
        HAVING COUNT(*) > 1 
        AND (MAX(created_at) - MIN(created_at)) < INTERVAL '5 minutes'
    )
    SELECT 
        rd.*,
        'StrictMode likely' as duplicate_reason
    FROM recent_duplicates rd
    ORDER BY duplicate_count DESC, first_created DESC;

    -- 3. SPECIFIC TOPIC DUPLICATES 
    -- =============================================

    -- Check duplicates cho topic cụ thể (replace với topic_id từ screenshot)
    SELECT 
        id,
        topic_id,
        node_id,
        user_id,
        message,
        is_ai_response,
        created_at,
        message_type,
        ROW_NUMBER() OVER (
            PARTITION BY topic_id, node_id, user_id, message, is_ai_response 
            ORDER BY created_at
        ) as row_num
    FROM learning_chats
    WHERE topic_id = '123a121d-bd12-4154-a104-5bc1c773a260'  -- Replace với actual topic_id
    AND message LIKE '%Chào bạn! Rất vui được hỗ trợ%'
    ORDER BY created_at, is_ai_response;

    -- 4. CONVERSATION PAIR DUPLICATES
    -- =============================================

    -- Find cases where cả user message VÀ AI response đều bị duplicate
    WITH conversation_pairs AS (
        SELECT 
            topic_id,
            node_id,
            user_id,
            LAG(message) OVER (PARTITION BY topic_id, node_id ORDER BY created_at) as prev_message,
            LAG(is_ai_response) OVER (PARTITION BY topic_id, node_id ORDER BY created_at) as prev_is_ai,
            LAG(created_at) OVER (PARTITION BY topic_id, node_id ORDER BY created_at) as prev_created,
            message,
            is_ai_response,
            created_at,
            id
        FROM learning_chats
        WHERE topic_id = '123a121d-bd12-4154-a104-5bc1c773a260'  -- Replace
        ORDER BY created_at
    ),
    duplicate_pairs AS (
        SELECT *
        FROM conversation_pairs
        WHERE prev_message IS NOT NULL
        AND message = prev_message
        AND is_ai_response = prev_is_ai
        AND (created_at - prev_created) < INTERVAL '1 minute'
    )
    SELECT 
        topic_id,
        'Duplicate conversation pair detected' as issue,
        prev_message as duplicated_message,
        prev_is_ai as is_ai_response,
        prev_created as first_occurrence,
        created_at as second_occurrence,
        (created_at - prev_created) as time_gap
    FROM duplicate_pairs;

    -- =============================================
    -- CLEANUP QUERIES (USE WITH CAUTION!)
    -- =============================================

    -- 5. PREVIEW: Messages to be deleted (DUPLICATE IDs)
    -- =============================================

    -- Shows which messages WOULD be deleted (keeps earliest, removes rest)
    WITH duplicates_to_remove AS (
        SELECT 
            id,
            topic_id,
            node_id,
            user_id,
            message,
            is_ai_response,
            created_at,
            ROW_NUMBER() OVER (
                PARTITION BY topic_id, node_id, user_id, message, is_ai_response 
                ORDER BY created_at ASC  -- Keep earliest, remove later ones
            ) as row_num
        FROM learning_chats
    )
    SELECT 
        id,
        topic_id,
        LEFT(message, 50) || '...' as message_preview,
        is_ai_response,
        created_at,
        'WOULD BE DELETED' as action
    FROM duplicates_to_remove
    WHERE row_num > 1  -- Duplicates (not the first occurrence)
    ORDER BY topic_id, created_at;

    -- 6. ACTUAL CLEANUP (UNCOMMENT TO EXECUTE)
    -- =============================================

    /*
    -- WARNING: This will permanently delete duplicate messages!
    -- Run the preview query first to confirm what will be deleted

    WITH duplicates_to_remove AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY topic_id, node_id, user_id, message, is_ai_response 
                ORDER BY created_at ASC  -- Keep earliest
            ) as row_num
        FROM learning_chats
    )
    DELETE FROM learning_chats
    WHERE id IN (
        SELECT id 
        FROM duplicates_to_remove 
        WHERE row_num > 1
    );

    -- Show cleanup results
    SELECT 
        'Cleanup completed' as status,
        COUNT(*) as remaining_messages
    FROM learning_chats;
    */

    -- 7. VERIFICATION AFTER CLEANUP
    -- =============================================

    -- Run this after cleanup để verify duplicates removed
    SELECT 
        topic_id,
        node_id,
        user_id,
        message,
        is_ai_response,
        COUNT(*) as count
    FROM learning_chats
    GROUP BY topic_id, node_id, user_id, message, is_ai_response
    HAVING COUNT(*) > 1
    ORDER BY count DESC;

    -- 8. SUMMARY STATISTICS
    -- =============================================

    SELECT 
        'Total messages' as metric,
        COUNT(*) as value
    FROM learning_chats

    UNION ALL

    SELECT 
        'Unique conversations' as metric,
        COUNT(DISTINCT topic_id) as value
    FROM learning_chats

    UNION ALL

    SELECT 
        'AI responses' as metric,
        COUNT(*) as value
    FROM learning_chats
    WHERE is_ai_response = true

    UNION ALL

    SELECT 
        'User messages' as metric,
        COUNT(*) as value
    FROM learning_chats
    WHERE is_ai_response = false; 