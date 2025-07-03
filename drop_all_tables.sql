-- This script drops all tables and views related to the application logic.
-- Use with caution, as this will result in complete data loss.
-- It's designed for a clean reset in a development environment.

-- Step 1: Drop all views that depend on the tables.
DROP VIEW IF EXISTS "public"."active_chat_sessions";
DROP VIEW IF EXISTS "public"."chateable_nodes";
DROP VIEW IF EXISTS "public"."node_level_chats";
DROP VIEW IF EXISTS "public"."topic_level_chats";
DROP VIEW IF EXISTS "public"."node_level_notes";
DROP VIEW IF EXISTS "public"."topic_level_notes";

-- Step 2: Drop all tables.
-- The CASCADE option will automatically handle dropping dependent objects like foreign keys.
DROP TABLE IF EXISTS "public"."chat_messages" CASCADE;
DROP TABLE IF EXISTS "public"."learning_chats" CASCADE; -- Drop old table just in case
DROP TABLE IF EXISTS "public"."chat_sessions" CASCADE;
DROP TABLE IF EXISTS "public"."user_learning_progress" CASCADE;
DROP TABLE IF EXISTS "public"."learning_notes" CASCADE;
DROP TABLE IF EXISTS "public"."tree_nodes" CASCADE;
DROP TABLE IF EXISTS "public"."learning_topics" CASCADE;
DROP TABLE IF EXISTS "public"."user_plan_history" CASCADE;
DROP TABLE IF EXISTS "public"."plans" CASCADE;
DROP TABLE IF EXISTS "public"."user_profiles" CASCADE;
DROP TABLE IF EXISTS "public"."context_cache" CASCADE;

-- Confirmation message
SELECT 'All specified tables and views have been dropped.' as status; 