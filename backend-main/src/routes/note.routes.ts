import { Router } from "express";
import { supabase } from "../config/supabase";
import { authenticate } from "../middleware/auth.middleware";
import { validateNodeOwnership } from "../utils/auth.utils";
import { AuthRequest } from "../types";

const router = Router();

// GET /api/learning/notes - Get notes by node_id
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { node_id } = req.query;

    if (!node_id || typeof node_id !== "string") {
      return res.status(400).json({
        error: "Missing or invalid node_id parameter",
      });
    }

    // Verify user has access to this node before proceeding
    const hasAccess = await validateNodeOwnership(node_id, userId);
    if (!hasAccess) {
      return res.status(403).json({
        error: "Bạn không có quyền truy cập các ghi chú của node này",
      });
    }

    // Fetch notes for the given node that belong to the current user
    const { data, error } = await supabase
      .from("learning_notes")
      .select("*")
      .eq("node_id", node_id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Lỗi lấy notes:", error);
      return res.status(500).json({
        error: "Không thể lấy notes",
        details: error.message,
      });
    }

    return res.json({
      data: data || [],
    });
  } catch (error) {
    console.error("Lỗi server:", error);
    return res.status(500).json({
      error: "Lỗi server nội bộ",
    });
  }
});

// POST /api/learning/notes - Create a new note for a node
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { node_id, content } = req.body;

    // Validate input
    if (!node_id || !content?.trim()) {
      return res.status(400).json({
        error: "Missing node_id or content",
      });
    }

    // Verify user has access to this node before creating a note
    const hasAccess = await validateNodeOwnership(node_id, userId);
    if (!hasAccess) {
      return res.status(403).json({
        error: "Bạn không có quyền tạo note cho node này",
      });
    }

    const newNote = {
      node_id,
      user_id: userId,
      content: content.trim(),
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
