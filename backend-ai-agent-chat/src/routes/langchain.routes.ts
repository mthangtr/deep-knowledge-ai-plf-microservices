import { Router } from "express";
import ChatContext from "../models/ChatContext";
import { langChainService } from "../services/langchain.service";
import { authenticate } from "../middleware/auth.middleware";
import { AuthRequest, LangChainRequest } from "../types";

const router = Router();

// POST /api/chat/langchain - Chat với AI sử dụng LangChain
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      topic_id,
      node_id,
      message,
      context_window = 10,
      model,
      temperature,
      max_tokens,
    } = req.body as LangChainRequest;

    if (!topic_id || !message) {
      return res.status(400).json({
        error: "Missing required fields: topic_id, message",
      });
    }

    // Get or create context
    const query: any = {
      topic_id,
      user_id: userId,
      node_id: node_id || null,
    };

    let context = await ChatContext.findOne(query);

    if (!context) {
      // Create new context
      context = new ChatContext({
        topic_id,
        node_id: node_id || null,
        user_id: userId,
        context: {
          messages: [],
        },
      });
    }

    // Get recent messages for context
    const recentMessages = context.getRecentMessages(context_window);

    // Generate AI response
    const aiResponse = await langChainService.generateResponse(
      message,
      recentMessages,
      undefined, // Use default system prompt
      {
        model,
        temperature,
        maxTokens: max_tokens,
      }
    );

    // Save user message and AI response to context
    await context.addMessage("user", message);
    await context.addMessage("assistant", aiResponse);

    // Auto-cleanup if too many messages
    if (context.context.messages.length > 50) {
      await context.clearOldMessages(30);
    }

    return res.json({
      success: true,
      response: aiResponse,
      context: {
        id: context._id,
        messageCount: context.context.messages.length,
        lastInteraction: context.last_interaction,
      },
    });
  } catch (error) {
    console.error("LangChain chat error:", error);
    return res.status(500).json({
      error: "Lỗi khi chat với AI",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /api/chat/langchain/generate-summary - Tạo summary cho context
router.post(
  "/generate-summary",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { topic_id, node_id } = req.body;

      if (!topic_id) {
        return res.status(400).json({
          error: "Missing topic_id",
        });
      }

      // Get context
      const query: any = {
        topic_id,
        user_id: userId,
        node_id: node_id || null,
      };

      const context = await ChatContext.findOne(query);

      if (!context || context.context.messages.length === 0) {
        return res.status(404).json({
          error: "No context found or no messages to summarize",
        });
      }

      // Generate summary
      const summary = await langChainService.generateSummary(
        context.context.messages
      );

      // Save summary to context
      context.context.summary = summary;
      await context.save();

      return res.json({
        success: true,
        summary,
        messageCount: context.context.messages.length,
      });
    } catch (error) {
      console.error("Summary generation error:", error);
      return res.status(500).json({
        error: "Lỗi khi tạo summary",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// POST /api/chat/langchain/analyze-progress - Phân tích tiến độ học tập
router.post(
  "/analyze-progress",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { topic_description, node_descriptions, completed_nodes } =
        req.body;

      if (!topic_description || !Array.isArray(node_descriptions)) {
        return res.status(400).json({
          error:
            "Missing required fields: topic_description, node_descriptions",
        });
      }

      const analysis = await langChainService.analyzeTopicProgress(
        topic_description,
        node_descriptions,
        completed_nodes || []
      );

      return res.json({
        success: true,
        analysis,
      });
    } catch (error) {
      console.error("Progress analysis error:", error);
      return res.status(500).json({
        error: "Lỗi khi phân tích tiến độ",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// POST /api/chat/langchain/custom-prompt - Chat với custom system prompt
router.post("/custom-prompt", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      topic_id,
      node_id,
      message,
      system_prompt,
      context_window = 10,
      model,
      temperature,
      max_tokens,
    } = req.body;

    if (!topic_id || !message || !system_prompt) {
      return res.status(400).json({
        error: "Missing required fields: topic_id, message, system_prompt",
      });
    }

    // Get or create context
    const query: any = {
      topic_id,
      user_id: userId,
      node_id: node_id || null,
    };

    let context = await ChatContext.findOne(query);

    if (!context) {
      context = new ChatContext({
        topic_id,
        node_id: node_id || null,
        user_id: userId,
        context: {
          messages: [],
        },
      });
    }

    // Get recent messages
    const recentMessages = context.getRecentMessages(context_window);

    // Generate AI response with custom prompt
    const aiResponse = await langChainService.generateResponse(
      message,
      recentMessages,
      system_prompt,
      {
        model,
        temperature,
        maxTokens: max_tokens,
      }
    );

    // Save messages
    await context.addMessage("user", message);
    await context.addMessage("assistant", aiResponse);

    return res.json({
      success: true,
      response: aiResponse,
      context: {
        id: context._id,
        messageCount: context.context.messages.length,
      },
    });
  } catch (error) {
    console.error("Custom prompt chat error:", error);
    return res.status(500).json({
      error: "Lỗi khi chat với custom prompt",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/chat/langchain/models - Lấy danh sách models khả dụng
router.get("/models", authenticate, async (req, res) => {
  try {
    const models = [
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        description: "Fast and efficient",
      },
      { id: "gpt-4", name: "GPT-4", description: "Most capable model" },
      {
        id: "gpt-4-turbo-preview",
        name: "GPT-4 Turbo",
        description: "Latest GPT-4 with 128k context",
      },
    ];

    return res.json({
      models,
      default: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Lỗi khi lấy danh sách models",
    });
  }
});

export default router;
