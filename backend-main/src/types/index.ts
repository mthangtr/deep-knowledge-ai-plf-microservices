export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

// Corresponds to the `learning_topics` table
export interface LearningTopic {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
}

// Corresponds to the `tree_nodes` table
export interface TreeNode {
  id: string;
  topic_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  prompt_sample: string | null;
  requires: string[];
  next: string[];
  level: number;
  position_x: number;
  position_y: number;
  is_completed: boolean;
  created_at: string;
}

// Corresponds to the `chat_sessions` table
export interface ChatSession {
  id: string;
  user_id: string;
  topic_id: string;
  node_id: string | null;
  created_at: string;
  last_activity: string;
}

// Corresponds to the `chat_messages` table
export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// Corresponds to the `learning_notes` table
export interface LearningNote {
  id: string;
  user_id: string;
  node_id: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

// Corresponds to the `user_learning_progress` table
export interface UserLearningProgress {
  id: number;
  user_id: string;
  node_id: string;
  is_completed: boolean;
  completed_at: string | null;
}

// Data structure from AI generation service
export interface TreeData {
  tree: any[];
  topicName?: string;
  description?: string;
}

import { Request } from "express";

// Extends Express Request to include authenticated user
export interface AuthRequest extends Request {
  user?: User;
}
