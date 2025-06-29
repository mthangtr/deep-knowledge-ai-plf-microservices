export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

export interface LearningTopic {
  id: string;
  user_id: string;
  title: string;
  description: string;
  prompt?: string | null;
  is_active: boolean;
  total_nodes: number;
  completed_nodes: number;
  created_at: string;
  updated_at: string;
}

export interface TreeNode {
  id: string;
  topic_id: string;
  title: string;
  description: string;
  prompt_sample?: string | null;
  is_chat_enabled: boolean;
  requires: string[];
  next: string[];
  level: number;
  position_x: number;
  position_y: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningChat {
  id: string;
  topic_id: string;
  node_id?: string | null;
  user_id: string;
  message: string;
  is_ai_response: boolean;
  message_type: "normal" | "debate" | "auto_prompt";
  created_at: string;
  updated_at: string;
}

export interface LearningNote {
  id: string;
  topic_id: string;
  node_id?: string | null;
  user_id: string;
  content: string;
  note_type: "manual" | "ai_generated" | "summary";
  source_chat_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreeData {
  tree: any[];
  topicName?: string;
  description?: string;
}

import { Request } from "express";

export interface AuthRequest extends Request {
  user?: User;
}
