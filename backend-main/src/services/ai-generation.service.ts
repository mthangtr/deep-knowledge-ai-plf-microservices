import axios from "axios";
import { TreeData } from "../types";

interface FlowiseResponse {
  text?: string;
  tree?: any;
  [key: string]: any;
}

class AIGenerationService {
  private flowiseUrl: string;
  private flowiseApiKey: string;

  constructor() {
    this.flowiseUrl =
      process.env.FLOWISE_API_URL ||
      "https://cloud.flowiseai.com/api/v1/prediction/3e25445a-0652-45de-8ad6-8e1c78740a8c";
    this.flowiseApiKey =
      process.env.FLOWISE_API_KEY ||
      "YQT-c-WYOGuUiRY7YqK5xAgoGvGnVlzKACW1dJEapS4";
  }

  async generateLearningTree(prompt: string): Promise<{
    success: boolean;
    data?: TreeData;
    error?: string;
    message?: string;
  }> {
    try {
      const response = await axios.post(
        this.flowiseUrl,
        {
          question: prompt,
          overrideConfig: {
            returnSourceDocuments: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.flowiseApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 60000, // 60 seconds timeout
        }
      );

      const flowiseData = response.data as FlowiseResponse;
      // Parse response
      let treeData: TreeData;

      if (flowiseData.text) {
        // Try to extract JSON from text response
        try {
          const jsonMatch = flowiseData.text.match(
            /```json\n?([\s\S]*?)\n?```/
          );
          if (jsonMatch) {
            treeData = JSON.parse(jsonMatch[1]);
          } else {
            // Try direct parse
            treeData = JSON.parse(flowiseData.text);
          }
        } catch (parseError) {
          console.error("Failed to parse FlowiseAI response:", parseError);
          return {
            success: false,
            error: "Failed to parse AI response",
            message: "AI trả về dữ liệu không đúng định dạng",
          };
        }
      } else if (flowiseData.tree) {
        treeData = flowiseData as TreeData;
      } else {
        return {
          success: false,
          error: "Invalid response format",
          message: "AI không trả về dữ liệu tree",
        };
      }

      // Validate tree data
      if (
        !treeData.tree ||
        !Array.isArray(treeData.tree) ||
        treeData.tree.length === 0
      ) {
        return {
          success: false,
          error: "Invalid tree structure",
          message: "Dữ liệu tree không hợp lệ",
        };
      }

      return {
        success: true,
        data: treeData,
        message: "Tạo learning tree thành công",
      };
    } catch (error) {
      console.error("FlowiseAI error:", error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          return {
            success: false,
            error: `FlowiseAI error: ${error.response.status}`,
            message: error.response.data?.message || "Lỗi từ FlowiseAI",
          };
        } else if (error.request) {
          return {
            success: false,
            error: "No response from FlowiseAI",
            message: "Không thể kết nối với FlowiseAI",
          };
        }
      }

      return {
        success: false,
        error: "Unknown error",
        message: "Lỗi không xác định khi gọi AI",
      };
    }
  }

  generateSampleTree(prompt: string): TreeData {
    // Generate sample tree for testing
    const baseNodes = [
      {
        temp_id: "node1",
        title: "Giới thiệu về " + prompt,
        description: "Tìm hiểu các khái niệm cơ bản và tổng quan",
        prompt_sample: "Giải thích cho tôi về " + prompt,
        is_chat_enabled: true,
        requires: [],
        next: ["node2", "node3"],
        level: 0,
        position_x: 400,
        position_y: 50,
      },
      {
        temp_id: "node2",
        title: "Các thành phần cơ bản",
        description: "Tìm hiểu chi tiết về các thành phần và cấu trúc",
        prompt_sample: "Các thành phần chính là gì?",
        is_chat_enabled: true,
        requires: ["node1"],
        next: ["node4"],
        level: 1,
        position_x: 200,
        position_y: 200,
      },
      {
        temp_id: "node3",
        title: "Ứng dụng thực tế",
        description: "Khám phá các ứng dụng và ví dụ thực tế",
        prompt_sample: "Cho ví dụ về ứng dụng thực tế",
        is_chat_enabled: true,
        requires: ["node1"],
        next: ["node4"],
        level: 1,
        position_x: 600,
        position_y: 200,
      },
      {
        temp_id: "node4",
        title: "Thực hành và dự án",
        description: "Áp dụng kiến thức vào thực hành",
        prompt_sample: "Hướng dẫn tôi làm một dự án nhỏ",
        is_chat_enabled: true,
        requires: ["node2", "node3"],
        next: [],
        level: 2,
        position_x: 400,
        position_y: 350,
      },
    ];

    return {
      tree: baseNodes,
      topicName: `Học về ${prompt}`,
      description: `Lộ trình học tập toàn diện về ${prompt} từ cơ bản đến nâng cao`,
    };
  }
}

export const aiGenerationService = new AIGenerationService();
