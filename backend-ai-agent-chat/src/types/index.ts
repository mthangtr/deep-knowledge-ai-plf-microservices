import { Request } from "express";

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

export interface LangChainRequest {
  topic_id: string;
  node_id?: string;
  message: string;
  context_window?: number;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ContextRequest {
  topic_id: string;
  node_id?: string;
  messages?: ChatMessage[];
  summary?: string;
  metadata?: Record<string, any>;
}
