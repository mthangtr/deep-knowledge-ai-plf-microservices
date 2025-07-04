import {
  LearningTopic,
  LearningChat,
  LearningNote,
  TreeNode,
  TreeData,
} from "@/types/database";
import { API_ENDPOINTS, getAuthHeaders } from "@/lib/config";
import { getSession } from "next-auth/react";

type ApiResponse<T> = {
  data?: T;
  error?: string;
  details?: string;
  count?: number;
  success?: boolean;
  message?: string;
};

type AutoPromptResponse = {
  data?: LearningChat;
  error?: string;
  message?: string;
  skipped?: boolean;
  hasExistingChat?: boolean;
};

class LearningService {
  private async getHeaders() {
    // Get JWT token from sessionStorage, fallback to cookie
    let token = sessionStorage.getItem("jwt_token");

    console.log(
      `[DEBUG] getHeaders: Token from sessionStorage = ${
        token ? token.substring(0, 20) + "..." : "Not found"
      }`
    );

    // Fallback to cookie if sessionStorage is not available
    if (!token && typeof document !== "undefined") {
      const cookies = document.cookie.split(";");
      const jwtCookie = cookies.find((cookie) =>
        cookie.trim().startsWith("jwt_token=")
      );
      token = jwtCookie ? jwtCookie.split("=")[1] : null;
      console.log(
        `[DEBUG] getHeaders: Token from cookie = ${
          token ? token.substring(0, 20) + "..." : "Not found"
        }`
      );
    }

    const headers = getAuthHeaders(token || undefined);
    console.log(`[DEBUG] getHeaders: Final headers = `, headers);

    return headers;
  }

  // Topics API
  async getTopics(): Promise<ApiResponse<LearningTopic[]>> {
    try {
      const headers = await this.getHeaders();

      const response = await fetch(API_ENDPOINTS.learning.topics, {
        headers,
      });

      const jsonResponse = await response.json();

      return jsonResponse;
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async getTopic(id: string): Promise<ApiResponse<LearningTopic>> {
    try {
      const response = await fetch(API_ENDPOINTS.learning.topic(id), {
        headers: await this.getHeaders(),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async createTopic(topic: {
    title: string;
    description: string;
    prompt?: string;
  }): Promise<ApiResponse<LearningTopic>> {
    try {
      const response = await fetch(API_ENDPOINTS.learning.topics, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(topic),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async updateTopic(
    id: string,
    updates: Partial<LearningTopic>
  ): Promise<ApiResponse<LearningTopic>> {
    try {
      const response = await fetch(API_ENDPOINTS.learning.topic(id), {
        method: "PUT",
        headers: await this.getHeaders(),
        body: JSON.stringify(updates),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async deleteTopic(id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await fetch(API_ENDPOINTS.learning.topic(id), {
        method: "DELETE",
        headers: await this.getHeaders(),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  // Tree Nodes API
  async getTopicNodes(topicId: string): Promise<ApiResponse<TreeNode[]>> {
    try {
      // Gọi API lấy topic + nodes, chỉ lấy phần nodes
      const response = await fetch(API_ENDPOINTS.learning.topic(topicId), {
        headers: await this.getHeaders(),
      });
      const result = await response.json();

      console.log("=== FRONTEND FETCH DEBUG ===");
      console.log("Request URL:", API_ENDPOINTS.learning.topic(topicId));
      console.log("Raw response:", result);

      if (result.nodes) {
        console.log("Extracted nodes:", result.nodes);
        console.log(
          "Sample node parent_id values:",
          result.nodes.slice(0, 3).map((n: any) => ({
            id: n.id?.substring(0, 8),
            title: n.title?.substring(0, 20),
            parent_id: n.parent_id,
          }))
        );
        return { data: result.nodes };
      }

      return result;
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async createNode(
    topicId: string,
    node: {
      title: string;
      description: string;
      level?: number;
      requires?: string[];
      next?: string[];
      position_x?: number;
      position_y?: number;
    }
  ): Promise<ApiResponse<TreeNode>> {
    try {
      const response = await fetch(API_ENDPOINTS.learning.nodes(topicId), {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(node),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async createNodesBatch(
    topicId: string,
    nodes: {
      title: string;
      description: string;
      level?: number;
      requires?: string[];
      next?: string[];
      position_x?: number;
      position_y?: number;
    }[]
  ): Promise<ApiResponse<TreeNode[]>> {
    try {
      const response = await fetch(API_ENDPOINTS.learning.nodeBatch(topicId), {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify({ nodes }),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  // Tree Import API - Tạo topic + nodes từ AI generation
  async createTopicWithTree(data: {
    title: string;
    description: string;
    prompt?: string;
    tree: TreeNode[];
  }): Promise<
    ApiResponse<{
      topic: LearningTopic;
      nodes: TreeNode[];
      treeData: TreeData;
    }>
  > {
    try {
      const response = await fetch(API_ENDPOINTS.tree.import, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  // AI Generation API
  async generateLearningTree(
    prompt: string,
    useAI: boolean = true
  ): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(API_ENDPOINTS.generate.tree, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify({ prompt, useAI }),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  // Chat API - Updated for topic-level and node-level chat
  async getTopicChats(topicId: string): Promise<ApiResponse<LearningChat[]>> {
    try {
      const params = new URLSearchParams();
      params.append("topic_id", topicId);
      params.append("node_id", "null"); // Get topic-level chats only

      const response = await fetch(`${API_ENDPOINTS.chat.messages}?${params}`, {
        headers: await this.getHeaders(),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async getNodeChats(nodeId: string): Promise<ApiResponse<LearningChat[]>> {
    try {
      const params = new URLSearchParams();
      params.append("node_id", nodeId);

      const response = await fetch(`${API_ENDPOINTS.chat.messages}?${params}`, {
        headers: await this.getHeaders(),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  // New method for getting chats with topic_id + optional node_id
  async getChats(
    topicId: string,
    nodeId?: string
  ): Promise<ApiResponse<LearningChat[]>> {
    try {
      const params = new URLSearchParams();
      params.append("topic_id", topicId);
      if (nodeId) {
        params.append("node_id", nodeId);
      }

      const response = await fetch(`${API_ENDPOINTS.chat.messages}?${params}`, {
        headers: await this.getHeaders(),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  // Lấy messages cho một session, không cần topic_id/node_id nữa
  async getLearningChats(
    sessionId: string
  ): Promise<ApiResponse<LearningChat[]>> {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.chat.messages(sessionId)}`,
        {
          headers: await this.getHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  // New AI chat method using the updated endpoint
  async sendAIMessage(params: {
    topic_id: string;
    node_id?: string;
    message: string;
    session_id?: string;
  }): Promise<
    ApiResponse<{
      user_message: LearningChat;
      ai_message: LearningChat;
      session_id: string;
      context_info: any;
      session_stats: any;
      model_used: string;
      processing_time: number;
    }>
  > {
    try {
      const response = await fetch(API_ENDPOINTS.chat.ai, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(params),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  // Delete chats method with topic_id + optional node_id
  async deleteLearningChats(
    topicId: string,
    nodeId?: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const params = new URLSearchParams();
      params.append("topic_id", topicId);
      if (nodeId) {
        params.append("node_id", nodeId);
      }

      const response = await fetch(`${API_ENDPOINTS.chat.messages}?${params}`, {
        method: "DELETE",
        headers: await this.getHeaders(),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async sendChatMessage(message: {
    topic_id: string;
    node_id?: string;
    message: string;
    is_ai_response?: boolean;
    message_type?: "normal" | "auto_prompt" | "system";
  }): Promise<ApiResponse<LearningChat>> {
    try {
      const response = await fetch(`${API_ENDPOINTS.chat.base}/messages`, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(message),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  // Notes API - Updated for topic-level and node-level notes
  async getTopicNotes(topicId: string): Promise<ApiResponse<LearningNote[]>> {
    try {
      const params = new URLSearchParams();
      params.append("topic_id", topicId);
      params.append("node_id", "null"); // Get topic-level notes only

      const response = await fetch(`${API_ENDPOINTS.notes.list}?${params}`, {
        headers: await this.getHeaders(),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async getNodeNotes(nodeId: string): Promise<ApiResponse<LearningNote[]>> {
    try {
      const params = new URLSearchParams();
      params.append("node_id", nodeId);

      const response = await fetch(`${API_ENDPOINTS.notes.list}?${params}`, {
        headers: await this.getHeaders(),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  // Lấy notes cho một node cụ thể
  async getNotes(nodeId: string): Promise<ApiResponse<LearningNote[]>> {
    try {
      // Chỉ gửi node_id, không gửi topic_id
      const params = new URLSearchParams({ node_id: nodeId });
      const response = await fetch(
        `${API_ENDPOINTS.notes.list}?${params.toString()}`,
        {
          headers: await this.getHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async createNote(note: {
    node_id: string;
    content: string;
  }): Promise<ApiResponse<LearningNote>> {
    try {
      const response = await fetch(API_ENDPOINTS.notes.list, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(note),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async updateNote(
    id: string,
    content: string
  ): Promise<ApiResponse<LearningNote>> {
    try {
      const response = await fetch(API_ENDPOINTS.notes.detail(id), {
        method: "PUT",
        headers: await this.getHeaders(),
        body: JSON.stringify({ content }),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async deleteNote(id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await fetch(API_ENDPOINTS.notes.detail(id), {
        method: "DELETE",
        headers: await this.getHeaders(),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }
}

// Export singleton instance
export const learningService = new LearningService();
