// TODO: LangChain integration - Implement later when needed
/*
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  AIMessagePromptTemplate,
} from "langchain/prompts";
import { StringOutputParser } from "langchain/schema/output_parser";
*/
import { ChatMessage } from "../types";

export class LangChainService {
  // TODO: LangChain implementation
  // private model: ChatOpenAI;

  constructor() {
    console.log("⚠️ LangChain service initialized but not implemented yet");

    // TODO: Initialize LangChain components
    /*
    this.model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      temperature: 0.7,
      maxTokens: 2000,
    });
    */
  }

  async generateResponse(
    message: string,
    context: ChatMessage[],
    systemPrompt?: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    // TODO: Implement LangChain integration
    console.log("🔄 Simulating AI response generation...");

    // Temporary mock response
    return `Xin chào! Tôi đã nhận được tin nhắn: "${message}". 
Đây là response giả lập. LangChain integration sẽ được implement sau.
Context messages: ${context.length}`;

    /* TODO: Implement actual LangChain logic
    try {
      // Create custom model if options provided
      const chatModel = options
        ? new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName:
              options.model || process.env.OPENAI_MODEL || "gpt-3.5-turbo",
            temperature: options.temperature ?? 0.7,
            maxTokens: options.maxTokens ?? 2000,
          })
        : this.model;

      // Build prompt template
      const messages = [];

      // Add system message
      const defaultSystemPrompt = `Bạn là AI Learning Assistant cho Deep Knowledge AI Platform. 
Nhiệm vụ của bạn là:
- Hỗ trợ học viên hiểu sâu về chủ đề đang học
- Đưa ra giải thích rõ ràng, dễ hiểu với ví dụ thực tế
- Khuyến khích tư duy phản biện và đặt câu hỏi
- Điều chỉnh phong cách giảng dạy theo trình độ học viên
- Luôn trả lời bằng tiếng Việt

Hãy tương tác một cách thân thiện, động viên và hỗ trợ tốt nhất cho học viên.`;

      messages.push(
        SystemMessagePromptTemplate.fromTemplate(
          systemPrompt || defaultSystemPrompt
        )
      );

      // Add context messages
      for (const msg of context) {
        if (msg.role === "user") {
          messages.push(HumanMessagePromptTemplate.fromTemplate(msg.content));
        } else if (msg.role === "assistant") {
          messages.push(AIMessagePromptTemplate.fromTemplate(msg.content));
        }
      }

      // Add current message
      messages.push(HumanMessagePromptTemplate.fromTemplate(message));

      // Create chat prompt
      const chatPrompt = ChatPromptTemplate.fromMessages(messages);

      // Create chain
      const chain = chatPrompt.pipe(chatModel).pipe(new StringOutputParser());

      // Generate response
      const response = await chain.invoke({});

      return response;
    } catch (error) {
      console.error("LangChain error:", error);
      throw new Error("Không thể tạo phản hồi từ AI");
    }
    */
  }

  async generateSummary(messages: ChatMessage[]): Promise<string> {
    // TODO: Implement summary generation with LangChain
    console.log("🔄 Simulating summary generation...");

    return `Tóm tắt cuộc hội thoại (${messages.length} tin nhắn): 
Đây là summary giả lập. LangChain integration sẽ được implement sau.`;

    /* TODO: Implement actual summary logic
    try {
      const summaryPrompt = ChatPromptTemplate.fromTemplate(`
Hãy tóm tắt cuộc hội thoại sau đây một cách ngắn gọn, nêu rõ:
1. Chủ đề chính đang thảo luận
2. Những điểm quan trọng đã được trao đổi
3. Kiến thức chính mà học viên đã học được

Cuộc hội thoại:
{conversation}

Tóm tắt (tối đa 200 từ):
`);

      const conversation = messages
        .map(
          (msg) => `${msg.role === "user" ? "Học viên" : "AI"}: ${msg.content}`
        )
        .join("\n");

      const chain = summaryPrompt
        .pipe(this.model)
        .pipe(new StringOutputParser());

      const summary = await chain.invoke({ conversation });

      return summary;
    } catch (error) {
      console.error("Summary generation error:", error);
      throw new Error("Không thể tạo tóm tắt cuộc hội thoại");
    }
    */
  }

  async analyzeTopicProgress(
    topicDescription: string,
    nodeDescriptions: string[],
    completedNodes: string[]
  ): Promise<{
    overallProgress: number;
    suggestions: string[];
    nextSteps: string[];
  }> {
    // TODO: Implement progress analysis with LangChain
    console.log("🔄 Simulating progress analysis...");

    // Mock analysis
    const progress = Math.round(
      (completedNodes.length / nodeDescriptions.length) * 100
    );

    return {
      overallProgress: progress,
      suggestions: [
        "Đây là phân tích giả lập",
        "LangChain sẽ được implement sau",
        "Hiện tại chỉ tính progress cơ bản",
      ],
      nextSteps: [
        "Implement LangChain integration",
        "Setup OpenAI API",
        "Test với real data",
      ],
    };

    /* TODO: Implement actual analysis logic
    try {
      const analysisPrompt = ChatPromptTemplate.fromTemplate(`
Phân tích tiến độ học tập:

Chủ đề: {topicDescription}

Tất cả các nodes:
{allNodes}

Nodes đã hoàn thành:
{completedNodes}

Hãy phân tích và trả về JSON với format:
{{
  "overallProgress": <số từ 0-100>,
  "suggestions": ["gợi ý 1", "gợi ý 2", ...],
  "nextSteps": ["bước tiếp theo 1", "bước tiếp theo 2", ...]
}}
`);

      const chain = analysisPrompt
        .pipe(this.model)
        .pipe(new StringOutputParser());

      const result = await chain.invoke({
        topicDescription,
        allNodes: nodeDescriptions.join("\n"),
        completedNodes: completedNodes.join("\n"),
      });

      try {
        return JSON.parse(result);
      } catch (parseError) {
        console.error("Failed to parse analysis result:", parseError);
        return {
          overallProgress: Math.round(
            (completedNodes.length / nodeDescriptions.length) * 100
          ),
          suggestions: ["Tiếp tục học các node tiếp theo"],
          nextSteps: ["Hoàn thành các node còn lại"],
        };
      }
    } catch (error) {
      console.error("Topic analysis error:", error);
      throw new Error("Không thể phân tích tiến độ học tập");
    }
    */
  }
}

export const langChainService = new LangChainService();
