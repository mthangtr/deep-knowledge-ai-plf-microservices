import { Router } from "express";
import { supabase } from "../config/supabase";
import { authenticate } from "../middleware/auth.middleware";
import { validateTopicOwnership } from "../utils/auth.utils";
import { AuthRequest } from "../types";

const router = Router();

// GET /api/learning/notes - Lấy notes theo topic hoặc node
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { topic_id, node_id, limit = "50" } = req.query;

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
      .from("learning_notes")
      .select("*")
      .eq("topic_id", topic_id)
      .order("created_at", { ascending: false })
      .limit(parseInt(limit as string));

    // Handle node_id
    if (node_id === "null" || !node_id) {
      query = query.is("node_id", null);
    } else {
      query = query.eq("node_id", node_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Lỗi lấy notes:", error);
      return res.status(500).json({
        error: "Không thể lấy notes",
        details: error.message,
      });
    }

    return res.json({
      data: data || [],
      count: data?.length || 0,
      filters: { topic_id, node_id, limit: parseInt(limit as string) },
    });
  } catch (error) {
    console.error("Lỗi server:", error);
    return res.status(500).json({
      error: "Lỗi server nội bộ",
    });
  }
});

// POST /api/learning/notes - Tạo note mới
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { topic_id, node_id, content, note_type, source_chat_id } = req.body;

    // Validate input
    if (!topic_id || !content?.trim()) {
      return res.status(400).json({
        error: "Missing topic_id or content",
      });
    }

    // Verify topic ownership
    const hasAccess = await validateTopicOwnership(topic_id, userId);
    if (!hasAccess) {
      return res.status(403).json({
        error: "Bạn không có quyền tạo note cho chủ đề này",
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

    const newNote = {
      topic_id,
      node_id: node_id || null,
      user_id: userId,
      content: content.trim(),
      note_type: note_type || "manual",
      source_chat_id: source_chat_id || null,
    };

    const { data, error } = await supabase
      .from("learning_notes")
      .insert([newNote])
      .select()
      .single();

    if (error) {
      console.error("Lỗi tạo note:", error);
      return res.status(500).json({
        error: "Không thể tạo note",
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

// GET /api/learning/notes/:id - Lấy chi tiết note
router.get("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const noteId = req.params.id;

    const { data, error } = await supabase
      .from("learning_notes")
      .select("*")
      .eq("id", noteId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: "Note không tồn tại hoặc bạn không có quyền truy cập",
      });
    }

    return res.json({ data });
  } catch (error) {
    console.error("Lỗi server:", error);
    return res.status(500).json({
      error: "Lỗi server nội bộ",
    });
  }
});

// PUT /api/learning/notes/:id - Cập nhật note
router.put("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const noteId = req.params.id;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        error: "Content không được để trống",
      });
    }

    // Verify ownership
    const { data: existingNote } = await supabase
      .from("learning_notes")
      .select("user_id")
      .eq("id", noteId)
      .single();

    if (!existingNote || existingNote.user_id !== userId) {
      return res.status(403).json({
        error: "Bạn không có quyền cập nhật note này",
      });
    }

    const { data, error } = await supabase
      .from("learning_notes")
      .update({ content: content.trim() })
      .eq("id", noteId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: "Không thể cập nhật note",
        details: error.message,
      });
    }

    return res.json({ data });
  } catch (error) {
    console.error("Lỗi server:", error);
    return res.status(500).json({
      error: "Lỗi server nội bộ",
    });
  }
});

// DELETE /api/learning/notes/:id - Xóa note
router.delete("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const noteId = req.params.id;

    // Verify ownership
    const { data: existingNote } = await supabase
      .from("learning_notes")
      .select("user_id")
      .eq("id", noteId)
      .single();

    if (!existingNote || existingNote.user_id !== userId) {
      return res.status(403).json({
        error: "Bạn không có quyền xóa note này",
      });
    }

    const { error } = await supabase
      .from("learning_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      return res.status(500).json({
        error: "Không thể xóa note",
        details: error.message,
      });
    }

    return res.json({
      success: true,
      message: "Note đã được xóa",
    });
  } catch (error) {
    console.error("Lỗi server:", error);
    return res.status(500).json({
      error: "Lỗi server nội bộ",
    });
  }
});

export default router;
