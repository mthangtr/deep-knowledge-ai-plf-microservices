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
    console.log("🔍 [Learning Service] Getting headers...");

    // Get JWT token from sessionStorage, fallback to cookie
    let token = sessionStorage.getItem("jwt_token");

    // Fallback to cookie if sessionStorage is not available
    if (!token && typeof document !== "undefined") {
      const cookies = document.cookie.split(";");
      const jwtCookie = cookies.find((cookie) =>
        cookie.trim().startsWith("jwt_token=")
      );
      token = jwtCookie ? jwtCookie.split("=")[1] : null;
    }

    console.log("🔍 [Learning Service] JWT Token from sessionStorage:", {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenStart: token ? token.substring(0, 20) + "..." : null,
    });

    const headers = getAuthHeaders(token || undefined);
    console.log("🔍 [Learning Service] Headers:", {
      hasAuthHeader: !!headers.Authorization,
      authHeaderStart: headers.Authorization
        ? headers.Authorization.substring(0, 30) + "..."
        : null,
    });

    return headers;
  }

  // Topics API
  async getTopics(): Promise<ApiResponse<LearningTopic[]>> {
    try {
      console.log("🔍 [SERVICE] Calling getTopics...");
      const headers = await this.getHeaders();
      console.log("🔍 [SERVICE] Request URL:", API_ENDPOINTS.learning.topics);
      console.log("🔍 [SERVICE] Request headers:", headers);

      const response = await fetch(API_ENDPOINTS.learning.topics, {
        headers,
      });

      console.log("🔍 [SERVICE] HTTP Response:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      const jsonResponse = await response.json();
      console.log("🔍 [SERVICE] JSON Response:", jsonResponse);

      return jsonResponse;
    } catch (error) {
      console.error("❌ [SERVICE] Network error in getTopics:", error);
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
      const response = await fetch(API_ENDPOINTS.learning.nodes(topicId), {
        headers: await this.getHeaders(),
      });
      return await response.json();
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

  // Import tree data - alias for createTopicWithTree for backward compatibility
  async importTreeData(data: TreeData): Promise<ApiResponse<any>> {
    // Convert TreeNodeInput[] to TreeNode[] format
    const convertedNodes: TreeNode[] = data.tree.map((node) => ({
      id: node.temp_id || node.id || "",
      topic_id: "", // Will be set by API
      title: node.title,
      description: node.description,
      prompt_sample: node.prompt_sample,
      is_chat_enabled: node.is_chat_enabled ?? false,
      requires: node.requires || [],
      next: node.next || [],
      level: node.level || 0,
      position_x: node.position_x || 0,
      position_y: node.position_y || 0,
      is_completed: false,
      created_at: "",
      updated_at: "",
    }));

    const treeData = {
      title: "Generated Learning Tree",
      description: "AI generated learning tree",
      tree: convertedNodes,
    };
    return this.createTopicWithTree(treeData);
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

  async sendChatMessage(message: {
    topic_id: string;
    node_id?: string; // Optional - null for topic-level chat
    message: string;
    is_ai_response?: boolean;
    message_type?: "normal" | "auto_prompt" | "system";
  }): Promise<ApiResponse<LearningChat>> {
    try {
      const response = await fetch(API_ENDPOINTS.chat.messages, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(message),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async deleteTopicChats(
    topicId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.chat.messages}?topic_id=${topicId}&node_id=null`,
        {
          method: "DELETE",
          headers: await this.getHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async deleteNodeChats(
    nodeId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.chat.messages}?node_id=${nodeId}`,
        {
          method: "DELETE",
          headers: await this.getHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  // Auto prompt API - Updated for topic-level
  async createTopicAutoPrompt(topicData: {
    topic_id: string;
    topic_title: string;
    topic_description: string;
  }): Promise<AutoPromptResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.chat.autoPrompt, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify({
          ...topicData,
          type: "topic",
        }),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async createNodeAutoPrompt(nodeData: {
    topic_id: string;
    node_id: string;
    node_title: string;
    node_description: string;
  }): Promise<AutoPromptResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.chat.autoPrompt, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify({
          ...nodeData,
          type: "node",
        }),
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

  // New method for getting notes with topic_id + optional node_id
  async getNotes(
    topicId: string,
    nodeId?: string
  ): Promise<ApiResponse<LearningNote[]>> {
    try {
      const params = new URLSearchParams();
      params.append("topic_id", topicId);
      if (nodeId) {
        params.append("node_id", nodeId);
      }

      const response = await fetch(`${API_ENDPOINTS.notes.list}?${params}`, {
        headers: await this.getHeaders(),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async createNote(note: {
    topic_id: string;
    node_id?: string; // Optional - null for topic-level notes
    content: string;
    note_type?: "manual" | "extracted_from_chat" | "ai_summary";
    source_chat_id?: string;
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

  // AI Agent Chat Methods (New)
  async chatWithAI(params: {
    topic_id: string;
    node_id?: string;
    message: string;
    context_window?: number;
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<ApiResponse<{ response: string; context: any }>> {
    try {
      const response = await fetch(API_ENDPOINTS.chat.langchain, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(params),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async generateChatSummary(params: {
    topic_id: string;
    node_id?: string;
  }): Promise<ApiResponse<{ summary: string }>> {
    try {
      const response = await fetch(API_ENDPOINTS.chat.langchainSummary, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(params),
      });
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }

  async getChatContext(params: {
    topic_id: string;
    node_id?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("topic_id", params.topic_id);
      if (params.node_id) {
        queryParams.append("node_id", params.node_id);
      }

      const response = await fetch(
        `${API_ENDPOINTS.chat.context}?${queryParams}`,
        {
          headers: await this.getHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      return { error: "Lỗi kết nối mạng" };
    }
  }
}

// Export singleton instance
export const learningService = new LearningService();
