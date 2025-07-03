import { LucideIcon } from "lucide-react";
import "next-auth";
import "next-auth/jwt";

// Common component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Feature related types
export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
}

// Navigation related types
export interface NavigationLink {
  id: string;
  label: string;
  href: string;
}

// Form suggestion types
export interface SuggestionOption {
  id: string;
  label: string;
  value: string;
}

// Footer link types
export interface FooterLink {
  id: string;
  label: string;
  href: string;
}

// Background orb types
export interface BackgroundOrb {
  id: string;
  size: string;
  position: string;
  color: string;
  animation: string;
}

// Event handler types
export type ClickHandler = () => void;
export type SuggestionClickHandler = (suggestion: SuggestionOption) => void;

// Corresponds to the `chat_sessions` table from the database
export interface ChatSession {
  id: string;
  user_id: string;
  topic_id: string;
  node_id: string | null;
  created_at: string;
  last_activity: string;
}

// Corresponds to the `chat_messages` table from the database
// This replaces the old ChatMessage interface
export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Import database types
export type { UserProfile, Plan, LearningNote } from "./database";

// Re-export with alias to avoid conflict
export type { LearningTopic as DatabaseLearningTopic } from "./database";

export interface AIForm {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FormField {
  id: string;
  type:
    | "text"
    | "email"
    | "number"
    | "select"
    | "textarea"
    | "checkbox"
    | "radio";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

// Thêm types cho nền tảng học tập AI (UI layer)
export interface LearningTopic {
  id: string;
  title: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

export interface Note {
  id: string;
  topicId: string;
  content: string;
  type: "extracted" | "manual";
  sourceMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
  level: number;
  topicId: string;
}

// Thêm types cho MindMap component mới
export interface MindMapNodeData {
  id: string;
  title: string;
  description: string;
  prompt_sample?: string; // Prompt mẫu khi user click vào node
  is_chat_enabled: boolean; // Có cho phép chat với node này không
  level: number;
  requires: string[]; // các node phải học trước
  next: string[]; // các node gợi ý học tiếp
}

export interface NodeModalData {
  id: string;
  title: string;
  description: string;
  level: number;
  requires: string[];
  next: string[];
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      image?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  }
}
