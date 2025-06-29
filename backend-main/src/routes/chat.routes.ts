import { Router } from "express";
import { supabase } from "../config/supabase";
import { authenticate } from "../middleware/auth.middleware";
import { validateTopicOwnership } from "../utils/auth.utils";
import { AuthRequest } from "../types";

const router = Router();

// GET /api/learning/chat - Lấy danh sách chat messages
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { topic_id, node_id } = req.query;

    if (!topic_id) {
      return res.status(400).json({
        error: "Missing topic_id parameter",
      });
    }

    // Verify topic ownership
    const hasAccess = await validateTopicOwnership(topic_id as string, userId);
    if (!hasAccess) {
      return res.status(403).json({
        error: "Bạn không có quyền truy cập chủ đề này",
      });
    }

    // Build query
    let query = supabase
      .from("learning_chats")
      .select("*")
      .eq("topic_id", topic_id)
      .order("created_at", { ascending: true });

    // Handle node_id
    if (node_id === "null" || !node_id) {
      query = query.is("node_id", null);
    } else {
      query = query.eq("node_id", node_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Lỗi lấy danh sách chat:", error);
      return res.status(500).json({
        error: "Không thể lấy danh sách chat",
        details: error.message,
      });
    }

    return res.json({
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Lỗi server:", error);
    return res.status(500).json({
      error: "Lỗi server nội bộ",
    });
  }
});

// POST /api/learning/chat - Tạo chat message mới
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { topic_id, node_id, message, is_ai_response, message_type } =
      req.body;

    // Validate input
    if (!topic_id || !message) {
      return res.status(400).json({
        error: "Missing topic_id or message",
      });
    }

    // Verify topic ownership
    const hasAccess = await validateTopicOwnership(topic_id, userId);
    if (!hasAccess) {
      return res.status(403).json({
        error: "Bạn không có quyền truy cập chủ đề này",
      });
    }

    // If node_id provided, verify it belongs to topic
    if (node_id) {
      const { data: node, error: nodeError } = await supabase
        .from("tree_nodes")
        .select("topic_id")
        .eq("id", node_id)
        .eq("topic_id", topic_id)
        .single();

      if (nodeError || !node) {
        return res.status(404).json({
          error: "Node not found or doesn't belong to topic",
        });
      }
    }

    const newChat = {
      topic_id,
      node_id: node_id || null,
      user_id: userId,
      message: message.trim(),
      is_ai_response: is_ai_response || false,
      message_type: message_type || "normal",
    };

    const { data, error } = await supabase
      .from("learning_chats")
      .insert([newChat])
      .select()
      .single();

    if (error) {
      console.error("Lỗi tạo chat:", error);
      return res.status(500).json({
        error: "Không thể tạo chat message",
        details: error.message,
      });
    }

    return res.status(201).json({ data });
  } catch (error) {
    console.error("Lỗi server:", error);
    return res.status(500).json({
      error: "Lỗi server nội bộ",
    });
  }
});

// DELETE /api/learning/chat - Xóa chat messages
router.delete("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { topic_id, node_id } = req.query;

    if (!topic_id) {
      return res.status(400).json({
        error: "Missing topic_id parameter",
      });
    }

    // Verify topic ownership
    const hasAccess = await validateTopicOwnership(topic_id as string, userId);
    if (!hasAccess) {
      return res.status(403).json({
        error: "Bạn không có quyền xóa chat của chủ đề này",
      });
    }

    // Build delete query
    let deleteQuery = supabase
      .from("learning_chats")
      .delete()
      .eq("topic_id", topic_id);

    if (node_id === "null" || !node_id) {
      deleteQuery = deleteQuery.is("node_id", null);
    } else {
      deleteQuery = deleteQuery.eq("node_id", node_id);
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error("Lỗi xóa chat:", error);
      return res.status(500).json({
        error: "Không thể xóa chat messages",
        details: error.message,
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Lỗi server:", error);
    return res.status(500).json({
      error: "Lỗi server nội bộ",
    });
  }
});

// POST /api/learning/chat/auto-prompt - Tạo auto prompt
router.post("/auto-prompt", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      topic_id,
      type,
      topic_title,
      topic_description,
      node_id,
      node_title,
      node_description,
    } = req.body;

    // Validate input
    if (!topic_id) {
      return res.status(400).json({
        error: "Missing topic_id",
      });
    }

    const isTopicLevel = type === "topic";
    const isNodeLevel = type === "node";

    if (!isTopicLevel && !isNodeLevel) {
      return res.status(400).json({
        error: "Invalid type. Must be 'topic' or 'node'",
      });
    }

    if (isTopicLevel && (!topic_title || !topic_description)) {
      return res.status(400).json({
        error:
          "Missing topic_title or topic_description for topic-level prompt",
      });
    }

    if (isNodeLevel && (!node_id || !node_title || !node_description)) {
      return res.status(400).json({
        error:
          "Missing node_id, node_title, or node_description for node-level prompt",
      });
    }

    // Verify topic ownership
    const hasAccess = await validateTopicOwnership(topic_id, userId);
    if (!hasAccess) {
      return res.status(403).json({
        error: "Bạn không có quyền truy cập chủ đề này",
      });
    }

    // If node-level, verify node exists
    if (isNodeLevel) {
      const { data: node, error: nodeError } = await supabase
        .from("tree_nodes")
        .select("topic_id")
        .eq("id", node_id)
        .eq("topic_id", topic_id)
        .single();

      if (nodeError || !node) {
        return res.status(404).json({
          error: "Node not found or doesn't belong to topic",
        });
      }
    }

    // Check existing chats
    let checkQuery = supabase
      .from("learning_chats")
      .select("id")
      .eq("topic_id", topic_id)
      .limit(1);

    if (isNodeLevel) {
      checkQuery = checkQuery.eq("node_id", node_id);
    } else {
      checkQuery = checkQuery.is("node_id", null);
    }

    const { data: existingChats, error: checkError } = await checkQuery;

    if (checkError) {
      console.error("Error checking existing chats:", checkError);
      return res.status(500).json({
        error: "Cannot check existing chats",
        details: checkError.message,
      });
    }

    // If chats exist, skip auto-prompt
    if (existingChats && existingChats.length > 0) {
      return res.json({
        message: `${
          isTopicLevel ? "Topic" : "Node"
        } already has chat history, no auto-prompt needed`,
        hasExistingChat: true,
        skipped: true,
      });
    }

    // Generate auto prompt message
    let autoPromptMessage = "";

    if (isTopicLevel) {
      autoPromptMessage = `Chào bạn! Tôi là AI Mentor và tôi sẽ hỗ trợ bạn học về chủ đề: "${topic_title}".

📝 **Mô tả chủ đề:** ${topic_description}

🎯 **Tôi có thể giúp bạn:**
- Giải thích các khái niệm cơ bản và nâng cao
- Phân tích và thảo luận các vấn đề phức tạp  
- Đưa ra ví dụ thực tế và case study
- Hướng dẫn thực hành và bài tập
- Thảo luận phản biện để phát triển tư duy phê phán

💬 **Hãy bắt đầu bằng cách cho tôi biết:**
- Bạn đã có kiến thức gì về chủ đề này chưa?
- Bạn muốn tập trung vào khía cạnh nào đầu tiên?
- Có câu hỏi cụ thể nào bạn muốn thảo luận không?

Tôi sẽ thích ứng với phong cách học tập của bạn và đưa ra những góc nhìn khác nhau để bạn có thể hiểu sâu hơn!`;
    } else {
      autoPromptMessage = `Chào bạn! Chúng ta sẽ cùng khám phá chủ đề: "${node_title}"

📖 **Nội dung học:** ${node_description}

🎯 **Trong phần này, chúng ta sẽ:**
- Tìm hiểu sâu về khái niệm và nguyên lý
- Phân tích ví dụ thực tế và ứng dụng
- Thảo luận các quan điểm khác nhau
- Luyện tập thông qua câu hỏi và bài tập

💡 **Phương pháp học tập:**
- Tôi sẽ đặt câu hỏi để kích thích tư duy
- Chúng ta sẽ thảo luận và phản biện các ý tưởng
- Bạn có thể đặt câu hỏi bất cứ lúc nào
- Tôi sẽ điều chỉnh nội dung theo mức độ hiểu biết của bạn

🤔 **Để bắt đầu hiệu quả, hãy cho tôi biết:**
- Bạn đã biết gì về "${node_title}"?
- Có điều gì bạn đặc biệt tò mò về chủ đề này?

Hãy sẵn sàng cho một cuộc thảo luận thú vị và bổ ích!`;
    }

    // Create auto prompt message
    const newAutoPrompt = {
      topic_id,
      node_id: isNodeLevel ? node_id : null,
      user_id: userId,
      message: autoPromptMessage,
      is_ai_response: true,
      message_type: "auto_prompt" as const,
    };

    const { data, error } = await supabase
      .from("learning_chats")
      .insert([newAutoPrompt])
      .select()
      .single();

    if (error) {
      console.error("Lỗi tạo auto prompt:", error);
      return res.status(500).json({
        error: "Không thể tạo auto prompt",
        details: error.message,
      });
    }

    return res.status(201).json({
      data,
      message: `Auto prompt created successfully for ${
        isTopicLevel ? "topic" : "node"
      }: ${isTopicLevel ? topic_title : node_title}`,
      hasExistingChat: false,
      skipped: false,
    });
  } catch (error) {
    console.error("Lỗi server:", error);
    return res.status(500).json({
      error: "Lỗi server nội bộ",
    });
  }
});

export default router;
