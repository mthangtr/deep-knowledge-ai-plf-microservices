import axios from "axios";
import { TreeData } from "../types";

class AIGenerationService {
  private langchainServiceUrl: string;

  constructor() {
    this.langchainServiceUrl =
      process.env.LANGCHAIN_SERVICE_URL || "http://localhost:5000";
  }

  async generateLearningTree(prompt: string): Promise<{
    success: boolean;
    data?: TreeData;
    error?: string;
    message?: string;
  }> {
    try {
      const response = await axios.post(
        `${this.langchainServiceUrl}/learning-path/generate`,
        {
          message: prompt,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 5 * 60 * 1000, // 120 seconds timeout for potentially long generation
        }
      );

      const generatedData = response.data as TreeData;

      // Validate the response from the langchain service
      if (
        !generatedData.topicName ||
        !generatedData.description ||
        !generatedData.tree ||
        !Array.isArray(generatedData.tree)
      ) {
        return {
          success: false,
          error: "Invalid AI response structure",
          message:
            "Dữ liệu trả về từ AI service không đúng định dạng mong muốn.",
        };
      }

      return {
        success: true,
        data: generatedData,
        message: "Tạo learning tree thành công từ LangChain Service.",
      };
    } catch (error) {
      console.error("LangChain Service Error:", error);

      let errorMessage = "Lỗi không xác định khi gọi AI service.";
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          errorMessage =
            error.response.data?.detail ||
            `Lỗi từ LangChain Service: ${error.response.status}`;
        } else if (error.request) {
          // The request was made but no response was received
          errorMessage = "Không thể kết nối tới LangChain Service.";
        }
      }

      return {
        success: false,
        error: "LangChain Service Error",
        message: errorMessage,
      };
    }
  }
}

export const aiGenerationService = new AIGenerationService();
