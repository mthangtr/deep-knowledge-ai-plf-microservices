import { Router } from "express";
import ChatContext from "../models/ChatContext";
import { authenticate } from "../middleware/auth.middleware";
import { AuthRequest } from "../types";

const router = Router();

// GET /api/chat/context - Lấy context cho topic/node
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { topic_id, node_id } = req.query;

    if (!topic_id) {
      return res.status(400).json({
        error: "Missing topic_id parameter",
      });
    }

    // Build query
    const query: any = {
      topic_id,
      user_id: userId,
    };

    if (node_id === "null" || !node_id) {
      query.node_id = null;
    } else {
      query.node_id = node_id;
    }

    // Find context
    const context = await ChatContext.findOne(query);

    if (!context) {
      return res.json({
        exists: false,
        context: null,
        message: "No context found",
      });
    }

    return res.json({
      exists: true,
      context: {
        id: context._id,
        topic_id: context.topic_id,
        node_id: context.node_id,
        messages: context.context.messages,
        summary: context.context.summary,
        metadata: context.context.metadata,
        last_interaction: context.last_interaction,
        created_at: context.created_at,
        updated_at: context.updated_at,
      },
    });
  } catch (error) {
    console.error("Error getting context:", error);
    return res.status(500).json({
      error: "Lỗi khi lấy context",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /api/chat/context - Tạo hoặc cập nhật context
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { topic_id, node_id, messages, summary, metadata } = req.body;

    if (!topic_id) {
      return res.status(400).json({
        error: "Missing topic_id",
      });
    }

    // Build query
    const query: any = {
      topic_id,
      user_id: userId,
      node_id: node_id || null,
    };

    // Find existing context
    let context = await ChatContext.findOne(query);

    if (context) {
      // Update existing context
      if (messages && Array.isArray(messages)) {
        // Add new messages
        for (const msg of messages) {
          await context.addMessage(msg.role, msg.content);
        }
      }

      if (summary !== undefined) {
        context.context.summary = summary;
      }

      if (metadata) {
        context.context.metadata = {
          ...context.context.metadata,
          ...metadata,
        };
      }

      await context.save();
    } else {
      // Create new context
      context = new ChatContext({
        topic_id,
        node_id: node_id || null,
        user_id: userId,
        context: {
          messages: messages || [],
          summary: summary || null,
          metadata: metadata || {},
        },
      });

      await context.save();
    }

    return res.json({
      success: true,
      context: {
        id: context._id,
        topic_id: context.topic_id,
        node_id: context.node_id,
        messages: context.context.messages,
        summary: context.context.summary,
        metadata: context.context.metadata,
        last_interaction: context.last_interaction,
      },
    });
  } catch (error) {
    console.error("Error saving context:", error);
    return res.status(500).json({
      error: "Lỗi khi lưu context",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// PUT /api/chat/context/message - Thêm message vào context
router.put("/message", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { topic_id, node_id, role, content } = req.body;

    if (!topic_id || !role || !content) {
      return res.status(400).json({
        error: "Missing required fields: topic_id, role, content",
      });
    }

    // Build query
    const query: any = {
      topic_id,
      user_id: userId,
      node_id: node_id || null,
    };

    // Find context
    let context = await ChatContext.findOne(query);

    if (!context) {
      // Create new context with first message
      context = new ChatContext({
        topic_id,
        node_id: node_id || null,
        user_id: userId,
        context: {
          messages: [
            {
              role,
              content,
              timestamp: new Date(),
            },
          ],
        },
      });
      await context.save();
    } else {
      // Add message to existing context
      await context.addMessage(role, content);

      // Auto-cleanup old messages if too many
      if (context.context.messages.length > 50) {
        await context.clearOldMessages(30);
      }
    }

    return res.json({
      success: true,
      message: "Message added successfully",
      messageCount: context.context.messages.length,
    });
  } catch (error) {
    console.error("Error adding message:", error);
    return res.status(500).json({
      error: "Lỗi khi thêm message",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// DELETE /api/chat/context - Xóa context
router.delete("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { topic_id, node_id } = req.query;

    if (!topic_id) {
      return res.status(400).json({
        error: "Missing topic_id parameter",
      });
    }

    // Build query
    const query: any = {
      topic_id,
      user_id: userId,
    };

    if (node_id === "null" || !node_id) {
      query.node_id = null;
    } else {
      query.node_id = node_id;
    }

    // Delete context
    const result = await ChatContext.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: "Context not found",
      });
    }

    return res.json({
      success: true,
      message: "Context deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting context:", error);
    return res.status(500).json({
      error: "Lỗi khi xóa context",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/chat/context/summary - Lấy summary của tất cả contexts
router.get("/summary", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { topic_id } = req.query;

    const query: any = { user_id: userId };
    if (topic_id) {
      query.topic_id = topic_id;
    }

    const contexts = await ChatContext.find(query)
      .select("topic_id node_id context.summary last_interaction")
      .sort({ last_interaction: -1 });

    return res.json({
      data: contexts,
      count: contexts.length,
    });
  } catch (error) {
    console.error("Error getting summaries:", error);
    return res.status(500).json({
      error: "Lỗi khi lấy summaries",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
