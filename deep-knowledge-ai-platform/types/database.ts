// =====================================
// NEW DATABASE STRUCTURE - Thiết kế mới
// =====================================

export interface LearningTopic {
  id: string;
  user_id: string;
  title: string; // "Học React.js", "Đầu tư chứng khoán"
  description: string;
  prompt?: string; // Prompt gốc user đã nhập
  total_nodes: number;
  completed_nodes: number; // Số node đã hoàn thành
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TreeNode {
  id: string;
  topic_id: string;
  title: string; // "JSX Basics", "Props & State"
  description: string;
  prompt_sample?: string; // Prompt mẫu khi user click vào node
  is_chat_enabled: boolean; // Có cho phép chat với node này không (nodes chung chung = false)
  requires: string[]; // Array các node_id phải học trước
  next: string[]; // Array các node_id gợi ý học tiếp
  level: number; // Cấp độ trong cây (0 = root, 1 = level 1...)
  position_x: number; // Vị trí X trong mindmap
  position_y: number; // Vị trí Y trong mindmap
  is_completed: boolean; // User đã hoàn thành node này chưa
  completed_at?: string; // Thời gian hoàn thành
  created_at: string;
  updated_at: string;
}

export interface LearningChat {
  id: string;
  topic_id: string; // Reference to learning_topics.id - REQUIRED
  node_id?: string; // Reference to tree_nodes.id - OPTIONAL (null = topic-level chat)
  user_id?: string;
  message: string;
  is_ai_response: boolean;
  message_type: "normal" | "auto_prompt" | "system";
  created_at: string;
}

export interface LearningNote {
  id: string;
  topic_id: string; // Reference to learning_topics.id - REQUIRED
  node_id?: string; // Reference to tree_nodes.id - OPTIONAL (null = topic-level notes)
  user_id?: string;
  content: string;
  note_type: "manual" | "extracted_from_chat" | "ai_summary";
  source_chat_id?: string; // Reference to learning_chats.id
  created_at: string;
  updated_at: string;
}

export interface UserLearningProgress {
  id: string;
  user_id: string;
  topic_id: string;
  current_node_id?: string; // Node đang học
  total_time_spent: number; // Tổng thời gian học (phút)
  last_accessed_at: string;
  created_at: string;
  updated_at: string;
}

// =====================================
// LEGACY INTERFACES - Để backward compatibility
// =====================================

// TreeNodeInput for AI generation (với temp_id)
export interface TreeNodeInput {
  temp_id?: string; // Temporary ID cho AI input
  id?: string; // Backward compatibility
  topic_id?: string;
  title: string;
  description: string;
  prompt_sample?: string;
  is_chat_enabled?: boolean;
  requires?: string[]; // temp_ids
  next?: string[]; // temp_ids
  level?: number;
  position_x?: number;
  position_y?: number;
  is_completed?: boolean;
  created_at?: string;
  updated_at?: string;
}

// TreeData for AI generation
export interface TreeData {
  topicName?: string; // ✅ NEW: AI-generated topic name
  description?: string; // ✅ NEW: AI-generated description
  tree: TreeNodeInput[];
}

export interface UserProfile {
  id: string; // auth.users.id
  email: string;
  full_name?: string; // Supabase Auth default field
  name?: string; // Alias for full_name
  avatar_url?: string;
  provider?: "magic_link" | "google" | "github";
  plan_id?: string; // Reference to plans.id
  plan_status?: "active" | "inactive" | "expired" | "cancelled";
  plan_started_at?: string;
  plan_expires_at?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number; // Giá tính theo USD cents (1000 = $10.00)
  currency: string;
  features: string[]; // JSON array các tính năng
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, "created_at" | "updated_at">;
        Update: Partial<Omit<UserProfile, "created_at" | "updated_at">>;
      };
      plans: {
        Row: Plan;
        Insert: Omit<Plan, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Plan, "id" | "created_at" | "updated_at">>;
      };
      learning_topics: {
        Row: LearningTopic;
        Insert: Omit<
          LearningTopic,
          "id" | "created_at" | "updated_at" | "total_nodes" | "completed_nodes"
        >;
        Update: Partial<
          Omit<LearningTopic, "id" | "created_at" | "updated_at">
        >;
      };
      tree_nodes: {
        Row: TreeNode;
        Insert: Omit<
          TreeNode,
          "id" | "created_at" | "updated_at" | "is_completed" | "completed_at"
        >;
        Update: Partial<Omit<TreeNode, "id" | "created_at" | "updated_at">>;
      };
      learning_chats: {
        Row: LearningChat;
        Insert: Omit<LearningChat, "id" | "created_at">;
        Update: Partial<Omit<LearningChat, "id" | "created_at">>;
      };
      learning_notes: {
        Row: LearningNote;
        Insert: Omit<LearningNote, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<LearningNote, "id" | "created_at" | "updated_at">>;
      };
      user_learning_progress: {
        Row: UserLearningProgress;
        Insert: Omit<UserLearningProgress, "id" | "created_at" | "updated_at">;
        Update: Partial<
          Omit<UserLearningProgress, "id" | "created_at" | "updated_at">
        >;
      };
    };
  };
};
