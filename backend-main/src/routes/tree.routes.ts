import { Router } from "express";
import { randomUUID } from "crypto";
import { supabase } from "../config/supabase";
import { authenticate } from "../middleware/auth.middleware";
import { AuthRequest } from "../types";

const router = Router();

// POST /api/learning/tree - Import tree data (tạo topic mới với nodes)
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { title, description, tree } = req.body;

    // Validate input
    if (!title || !description || !Array.isArray(tree) || tree.length === 0) {
      return res.status(400).json({
        error: "Thiếu thông tin cần thiết",
        details: "Cần có title, description và ít nhất một node trong tree",
      });
    }

    // Start transaction: Tạo topic trước
    const newTopic = {
      user_id: userId,
      title: title.trim(),
      description: description.trim(),
    };

    const { data: createdTopic, error: topicError } = await supabase
      .from("learning_topics")
      .insert([newTopic])
      .select()
      .single();

    if (topicError || !createdTopic) {
      console.error("Lỗi tạo topic:", topicError);
      return res.status(500).json({
        error: "Không thể tạo topic",
        details: topicError?.message,
      });
    }

    // Tạo mapping temp_id → real UUID
    const tempIdMap = new Map<string, string>();
    tree.forEach((node: any) => {
      const tempId = node.temp_id || node.id;
      if (tempId && !tempIdMap.has(tempId)) {
        tempIdMap.set(tempId, randomUUID());
      }
    });

    // Tạo tree nodes với real UUIDs
    const nodes = tree.map((node: any) => {
      const tempId = node.temp_id || node.id;
      const realId = tempIdMap.get(tempId) || randomUUID();

      const parentId = node.parent_id
        ? tempIdMap.get(node.parent_id) || null
        : null;

      return {
        id: realId,
        topic_id: createdTopic.id,
        parent_id: parentId,
        title: node.title.trim(),
        description: node.description.trim(),
        prompt_sample: node.prompt_sample?.trim() || null,
        requires: [], // Explicitly ignoring as per new logic
        next: [], // Explicitly ignoring as per new logic
        level: node.level || 0,
        position_x: node.position_x || 0,
        position_y: node.position_y || 0,
        is_completed: false, // Default value, progress is tracked elsewhere
      };
    });

    const { data: createdNodes, error: nodesError } = await supabase
      .from("tree_nodes")
      .insert(nodes)
      .select();

    if (nodesError) {
      console.error("Lỗi tạo nodes:", nodesError);
      // Rollback: Xóa topic đã tạo
      await supabase.from("learning_topics").delete().eq("id", createdTopic.id);
      return res.status(500).json({
        error: "Không thể tạo tree nodes",
        details: nodesError.message,
      });
    }

    return res.status(201).json({
      message: `Đã tạo thành công topic "${createdTopic.title}" với ${
        createdNodes?.length || 0
      } nodes`,
      topic: createdTopic,
      nodes: createdNodes || [],
    });
  } catch (error) {
    console.error("Lỗi server:", error);
    return res.status(500).json({
      error: "Lỗi server nội bộ",
    });
  }
});

export default router;
