import { TreeData } from "@/types/database";
import { debugLogger } from "@/lib/debug-logger";

interface AIGenerationResponse {
  success: boolean;
  data?: TreeData;
  error?: string;
  message?: string;
}

interface FlowiseAIResponse {
  text?: string;
  // Có thể có format khác tùy thuộc vào response của FlowiseAI
  [key: string]: any;
}

class AIGenerationService {
  private flowiseUrl =
    "https://cloud.flowiseai.com/api/v1/prediction/3e25445a-0652-45de-8ad6-8e1c78740a8c";
  private flowiseApiKey =
    process.env.FLOWISEAI_API_KEY ||
    "YQT-c-WYOGuUiRY7YqK5xAgoGvGnVlzKACW1dJEapS4";

  // OpenRouter config
  private openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
  private openRouterApiKey = process.env.OPENROUTER_API_KEY || "";
  private openRouterModel = "google/gemini-2.5-flash"; // Gemini 2.5 Flash

  /**
   * Generate learning tree từ user prompt với OpenRouter (direct AI access)
   */
  async generateLearningTreeWithOpenRouter(
    userPrompt: string
  ): Promise<AIGenerationResponse> {
    try {
      console.log("Gửi prompt đến OpenRouter:", userPrompt);

      if (!this.openRouterApiKey) {
        return {
          success: false,
          error: "Thiếu OPENROUTER_API_KEY trong env. Hãy thêm vào .env.local",
        };
      }

      const systemPrompt = `Bạn là chuyên gia tạo learning tree cho việc học tập. 
Hãy tạo một cấu trúc học tập dạng tree cho topic sau. 
Trả về CHÍNH XÁC format JSON này, không thêm text khác:

{
  "tree": [
    {
      "temp_id": "unique_id",
      "title": "Tiêu đề node", 
      "description": "Mô tả chi tiết node",
      "prompt_sample": "Sample prompt để chat về node này (optional)",
      "is_chat_enabled": true/false,
      "requires": ["temp_id_của_nodes_tiên_quyết"],
      "next": ["temp_id_của_nodes_tiếp_theo"],
      "level": 0,
      "position_x": 0,
      "position_y": 0
    }
  ]
}

Tạo 4-6 nodes, xếp theo level từ 0 đến 2. Node level 0 là overview, level 1 là concepts/setup, level 2 là practice.`;

      // Tạo timeout controller (2 phút cho OpenRouter)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log("OpenRouter request timeout sau 2 phút");
      }, 2 * 60 * 1000);

      const response = await fetch(this.openRouterUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://deep-knowledge-ai-platform.vercel.app",
          "X-Title": "Deep Knowledge AI Platform",
        },
        body: JSON.stringify({
          model: this.openRouterModel,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error("OpenRouter Error:", {
          status: response.status,
          statusText: response.statusText,
          url: this.openRouterUrl,
        });

        if (response.status === 401) {
          throw new Error(
            "OpenRouter API key không hợp lệ. Kiểm tra OPENROUTER_API_KEY"
          );
        }

        throw new Error(
          `OpenRouter error! status: ${response.status} - ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("OpenRouter response:", result);

      // 🐛 Log response vào file để debug
      debugLogger.logFlowiseResponse(userPrompt, result);

      // Extract content từ OpenRouter response
      const aiContent = result.choices?.[0]?.message?.content;
      if (!aiContent) {
        debugLogger.logFlowiseResponse(
          userPrompt,
          result,
          "No content in OpenRouter response"
        );
        return {
          success: false,
          error: "OpenRouter không trả về content",
        };
      }

      // Parse JSON từ AI content
      const treeData = this.parseTreeFromResponse({ text: aiContent });

      // 🐛 Log parse result
      if (treeData) {
        debugLogger.logFlowiseResponse(userPrompt, result, undefined, treeData);
      } else {
        debugLogger.logFlowiseResponse(
          userPrompt,
          result,
          "Parse failed - không thể extract JSON tree từ OpenRouter"
        );
      }

      if (!treeData) {
        return {
          success: false,
          error: "Không thể parse JSON tree từ OpenRouter response",
        };
      }

      return {
        success: true,
        data: treeData,
        message: "Tạo learning tree thành công với OpenRouter",
      };
    } catch (error) {
      console.error("Lỗi khi gọi OpenRouter:", error);

      // 🐛 Log error vào file
      debugLogger.logFlowiseResponse(
        userPrompt,
        null,
        error instanceof Error ? error.message : "Lỗi không xác định"
      );

      // Handle timeout từ AbortController
      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          error: "Timeout: OpenRouter mất quá 2 phút để generate.",
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi không xác định",
      };
    }
  }

  /**
   * Generate learning tree từ user prompt với FlowiseAI (legacy)
   */
  async generateLearningTree(
    userPrompt: string
  ): Promise<AIGenerationResponse> {
    try {
      console.log("Gửi prompt đến FlowiseAI:", userPrompt);

      const response = await fetch(this.flowiseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.flowiseApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: userPrompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: FlowiseAIResponse = await response.json();
      console.log("FlowiseAI response:", result);

      // 🐛 Log response vào file để debug
      debugLogger.logFlowiseResponse(userPrompt, result);

      // Parse JSON từ response text
      const treeData = this.parseTreeFromResponse(result);

      // 🐛 Log parse result
      if (treeData) {
        debugLogger.logFlowiseResponse(userPrompt, result, undefined, treeData);
      } else {
        debugLogger.logFlowiseResponse(
          userPrompt,
          result,
          "Parse failed - không thể extract JSON tree"
        );
      }

      if (!treeData) {
        return {
          success: false,
          error: "Không thể parse JSON tree từ AI response",
        };
      }

      return {
        success: true,
        data: treeData,
        message: "Tạo learning tree thành công",
      };
    } catch (error) {
      console.error("Lỗi khi gọi FlowiseAI:", error);

      // 🐛 Log error vào file
      debugLogger.logFlowiseResponse(
        userPrompt,
        null,
        error instanceof Error ? error.message : "Lỗi không xác định"
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi không xác định",
      };
    }
  }

  /**
   * Parse tree data từ FlowiseAI response
   */
  private parseTreeFromResponse(response: FlowiseAIResponse): TreeData | null {
    try {
      let jsonText = "";

      console.log(
        "🔍 Analyzing FlowiseAI response structure:",
        Object.keys(response)
      );

      // FlowiseAI có thể trả về trong nhiều field khác nhau
      if (response.text) {
        jsonText = response.text;
        console.log("📝 Found text field, length:", jsonText.length);
      } else if (response.answer) {
        jsonText = response.answer;
        console.log("📝 Found answer field, length:", jsonText.length);
      } else if (response.result) {
        jsonText = response.result;
        console.log("📝 Found result field, length:", jsonText.length);
      } else if (response.content) {
        jsonText = response.content;
        console.log("📝 Found content field, length:", jsonText.length);
      } else if (typeof response === "string") {
        jsonText = response;
        console.log("📝 Direct string response, length:", jsonText.length);
      } else {
        // Log toàn bộ response để debug
        console.log(
          "🚨 Unknown response format, full object:",
          JSON.stringify(response, null, 2)
        );
        throw new Error("Unknown response format from FlowiseAI");
      }

      console.log(
        "📄 Raw response text preview:",
        jsonText.substring(0, 500) + "..."
      );

      // Thử nhiều cách extract JSON
      let parsedData = null;

      // Method 1: Tìm JSON object bằng regex
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
          console.log("✅ Method 1 success: Regex JSON match");
        } catch (e) {
          console.log("❌ Method 1 failed: Invalid JSON from regex");
        }
      }

      // Method 2: Tìm JSON array trong response (FlowiseAI thường trả về array)
      if (!parsedData) {
        const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            const array = JSON.parse(arrayMatch[0]);
            parsedData = { tree: array };
            console.log("✅ Method 2 success: Found array, wrapped in tree");
          } catch (e) {
            console.log("❌ Method 2 failed: Invalid JSON array");
          }
        }
      }

      // Method 3: Thử parse trực tiếp
      if (!parsedData) {
        try {
          const direct = JSON.parse(jsonText);

          // Nếu direct parse thành công và là array → wrap thành {tree: [...]}
          if (Array.isArray(direct)) {
            parsedData = { tree: direct };
            console.log("✅ Method 3 success: Direct array parse, wrapped");
          } else {
            parsedData = direct;
            console.log("✅ Method 3 success: Direct object parse");
          }
        } catch (e) {
          console.log("❌ Method 3 failed: Direct parse failed");
        }
      }

      // Method 4: Clean whitespace và thử lại
      if (!parsedData) {
        try {
          const cleanedText = jsonText.replace(/\n\s*\n/g, "\n").trim();
          const cleaned = JSON.parse(cleanedText);

          if (Array.isArray(cleaned)) {
            parsedData = { tree: cleaned };
            console.log("✅ Method 4 success: Cleaned array, wrapped");
          } else {
            parsedData = cleaned;
            console.log("✅ Method 4 success: Cleaned object");
          }
        } catch (e) {
          console.log("❌ Method 4 failed: Cleaned text still invalid");
        }
      }

      if (!parsedData) {
        throw new Error("Cannot extract JSON from any known format");
      }

      console.log("🎯 Parsed data structure:", Object.keys(parsedData));

      // Auto-fix structure
      if (Array.isArray(parsedData)) {
        parsedData = { tree: parsedData };
        console.log("🔧 Auto-fixed: Wrapped array in tree object");
      }

      // Validate structure
      if (!parsedData.tree || !Array.isArray(parsedData.tree)) {
        throw new Error(
          `Invalid tree structure. Found: ${typeof parsedData.tree}`
        );
      }

      console.log("📊 Tree contains", parsedData.tree.length, "nodes");

      // Validate and auto-fix each node
      for (let i = 0; i < parsedData.tree.length; i++) {
        const node = parsedData.tree[i];

        // Auto-fix temp_id vs id field
        if (!node.temp_id && node.id) {
          node.temp_id = node.id;
          console.log(`🔧 Auto-fixed: Copied id to temp_id for node ${i}`);
        }
        if (!node.temp_id && !node.id) {
          node.temp_id = `node_${i}`;
          console.log(`🔧 Auto-fixed: Added temp_id for node ${i}`);
        }

        // Auto-fix missing fields
        if (!node.title) {
          throw new Error(`Node ${i} missing title`);
        }
        if (!node.description) {
          node.description = `Description for ${node.title}`;
          console.log(`🔧 Auto-fixed: Added description for node ${i}`);
        }
        if (!Array.isArray(node.requires)) {
          node.requires = [];
          console.log(
            `🔧 Auto-fixed: Added empty requires array for node ${i}`
          );
        }
        if (!Array.isArray(node.next)) {
          node.next = [];
          console.log(`🔧 Auto-fixed: Added empty next array for node ${i}`);
        }
        if (typeof node.level !== "number") {
          node.level = i;
          console.log(`🔧 Auto-fixed: Set level to ${i} for node ${i}`);
        }
      }

      console.log("✅ Successfully parsed and validated tree data");
      return parsedData as TreeData;
    } catch (error) {
      console.error("❌ Parse error:", error);
      return null;
    }
  }

  /**
   * Generate sample tree data cho testing - Đơn giản, ít nodes
   */
  generateSampleTree(topic: string): TreeData {
    return {
      tree: [
        {
          temp_id: "overview",
          title: `Tổng quan về ${topic}`,
          description: `Giới thiệu cơ bản về ${topic}, lịch sử phát triển và ứng dụng thực tế.`,
          is_chat_enabled: false, // Node chung chung, không chat được
          requires: [],
          next: ["setup", "concepts"],
          level: 0,
          position_x: 0,
          position_y: 0,
        },
        {
          temp_id: "setup",
          title: `Thiết lập môi trường ${topic}`,
          description: `Hướng dẫn cài đặt, cấu hình và setup môi trường phát triển.`,
          prompt_sample: `Hướng dẫn từng bước cài đặt và thiết lập môi trường phát triển ${topic}. Cần cài đặt những tool gì?`,
          is_chat_enabled: true,
          requires: ["overview"],
          next: ["practice"],
          level: 1,
          position_x: -200,
          position_y: 100,
        },
        {
          temp_id: "concepts",
          title: `Khái niệm cốt lõi của ${topic}`,
          description: `Hiểu về các thành phần nền tảng và nguyên lý hoạt động cơ bản.`,
          prompt_sample: `Giải thích các khái niệm cốt lõi và nguyên lý hoạt động cơ bản của ${topic}.`,
          is_chat_enabled: true,
          requires: ["overview"],
          next: ["practice"],
          level: 1,
          position_x: 200,
          position_y: 100,
        },
        {
          temp_id: "practice",
          title: `Thực hành và ứng dụng`,
          description: `Các bài tập và ví dụ thực tế để làm quen với ${topic}.`,
          prompt_sample: `Cho tôi một số bài tập thực hành cơ bản về ${topic}. Bắt đầu với ví dụ đơn giản.`,
          is_chat_enabled: true,
          requires: ["setup", "concepts"],
          next: [],
          level: 2,
          position_x: 0,
          position_y: 200,
        },
      ],
    };
  }
}

// Export singleton instance
export const aiGenerationService = new AIGenerationService();
