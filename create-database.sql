-- =============================================
-- === Deep Knowledge AI Platform Database Schema ===
-- === Version 2.2 (Final MVP)               ===
-- =============================================
-- This script defines the core tables, restoring full functionality
-- to user_profiles and tree_nodes as per the discussion.

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- === User & Plan Management              ===
-- =============================================

-- Table for defining subscription plans.
CREATE TABLE "public"."plans" (
    "id" serial PRIMARY KEY,
    "name" text NOT NULL UNIQUE,
    "price" numeric(10, 2) DEFAULT 0.00,
    "features" jsonb
);
ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;

-- Table for storing public user profile information, extending auth.users.
CREATE TABLE "public"."user_profiles" (
    "id" uuid NOT NULL PRIMARY KEY REFERENCES "auth"."users" ON DELETE CASCADE,
    "email" text UNIQUE,
    "full_name" text,
    "avatar_url" text,
    "plan_id" integer REFERENCES "public"."plans"(id),
    "plan_status" text DEFAULT 'active',
    "plan_started_at" timestamp with time zone DEFAULT now(),
    "plan_expires_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;

-- Table for tracking user plan subscriptions.
CREATE TABLE "public"."user_plan_history" (
    "id" bigserial PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES "public"."user_profiles" ON DELETE CASCADE,
    "plan_id" integer NOT NULL REFERENCES "public"."plans" ON DELETE RESTRICT,
    "start_date" timestamp with time zone DEFAULT now(),
    "end_date" timestamp with time zone
);
ALTER TABLE "public"."user_plan_history" ENABLE ROW LEVEL SECURITY;

-- =============================================
-- === Learning Content Structure          ===
-- =============================================

-- Table for main learning topics.
CREATE TABLE "public"."learning_topics" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" uuid NOT NULL REFERENCES "public"."user_profiles" ON DELETE CASCADE,
    "title" text NOT NULL,
    "description" text,
    "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."learning_topics" ENABLE ROW LEVEL SECURITY;

-- Table for individual learning nodes within a topic.
CREATE TABLE "public"."tree_nodes" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "topic_id" uuid NOT NULL REFERENCES "public"."learning_topics" ON DELETE CASCADE,
    "parent_id" uuid REFERENCES "public"."tree_nodes" ON DELETE SET NULL,
    "title" text NOT NULL,
    "description" text,
    "prompt_sample" text,
    "requires" uuid[] DEFAULT '{}',
    "next" uuid[] DEFAULT '{}',
    "level" integer DEFAULT 0,
    "position_x" float DEFAULT 0,
    "position_y" float DEFAULT 0,
    "is_completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."tree_nodes" ENABLE ROW LEVEL SECURITY;

-- =============================================
-- === Chat & Interaction System           ===
-- =============================================

-- Table to manage chat conversations (sessions).
CREATE TABLE "public"."chat_sessions" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" uuid NOT NULL REFERENCES "public"."user_profiles" ON DELETE CASCADE,
    "topic_id" uuid NOT NULL REFERENCES "public"."learning_topics" ON DELETE CASCADE,
    "node_id" uuid REFERENCES "public"."tree_nodes" ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT now(),
    "last_activity" timestamp with time zone DEFAULT now(),
    CONSTRAINT "unique_user_topic_node_session" UNIQUE ("user_id", "topic_id", "node_id")
);
ALTER TABLE "public"."chat_sessions" ENABLE ROW LEVEL SECURITY;

-- Table to store individual chat messages.
CREATE TABLE "public"."chat_messages" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "session_id" uuid NOT NULL REFERENCES "public"."chat_sessions" ON DELETE CASCADE,
    "role" text NOT NULL CHECK (role IN ('user', 'assistant')),
    "content" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;

-- =============================================
-- === User-Generated Data & Progress      ===
-- =============================================

-- Table for user's personal notes on a node.
CREATE TABLE "public"."learning_notes" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" uuid NOT NULL REFERENCES "public"."user_profiles" ON DELETE CASCADE,
    "node_id" uuid NOT NULL REFERENCES "public"."tree_nodes" ON DELETE CASCADE,
    "content" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."learning_notes" ENABLE ROW LEVEL SECURITY;

-- Table to track user's completion progress on nodes.
CREATE TABLE "public"."user_learning_progress" (
    "id" bigserial PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES "public"."user_profiles" ON DELETE CASCADE,
    "node_id" uuid NOT NULL REFERENCES "public"."tree_nodes" ON DELETE CASCADE,
    "is_completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    CONSTRAINT "unique_user_node_progress" UNIQUE ("user_id", "node_id")
);
ALTER TABLE "public"."user_learning_progress" ENABLE ROW LEVEL SECURITY;

-- =============================================
-- === Default Data Insertion              ===
-- =============================================

-- Insert default plans.
-- ON CONFLICT DO NOTHING ensures that if the script is run multiple times,
-- it won't create duplicate plans or cause errors.
INSERT INTO "public"."plans" (name, price, features) VALUES
('free', 0.00, '["Basic AI model", "Up to 3 learning topics", "Standard support"]')
ON CONFLICT (name) DO NOTHING;

INSERT INTO "public"."plans" (name, price, features) VALUES
('premium', 15.00, '["Advanced AI model", "Unlimited learning topics", "Priority support", "Vector search in chat"]')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- === End of Schema Definition            ===
-- =============================================
SELECT 'Final MVP Database schema created successfully with default plans.' as status;