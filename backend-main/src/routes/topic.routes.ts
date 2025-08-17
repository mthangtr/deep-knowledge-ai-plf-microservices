import { Router } from "express";
import { supabaseAdmin } from "../config/supabase";
import { getAuthenticatedUser } from "../utils/auth.utils";

const router = Router();

// GET /api/learning/topics
router.get("/", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not initialized");
    }
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: topics, error } = await supabaseAdmin
      .from("learning_topics")
      .select(
        `
        id, user_id, title, description, created_at, updated_at, is_active,
        tree_nodes ( id )
      `
      )
      .eq("user_id", user.id)
      // .eq("is_active", true) // Tạm thời bỏ để debug
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching topics:", error);
      return res
        .status(500)
        .json({ error: "Database error", details: error.message });
    }

    const topicsWithNodeCount = topics.map((topic) => ({
      ...topic,
      node_count: topic.tree_nodes.length,
    }));

    return res.json({ data: topicsWithNodeCount });
  } catch (error) {
    console.error("Error in topics endpoint:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/learning - Tạo learning topic mới
router.post("/", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not initialized");
    }
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { title, description } = req.body;

    // Validate input
    if (!title || !description) {
      return res.status(400).json({
        error: "Thiếu title hoặc description",
      });
    }

    const newTopic = {
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      is_active: true,
    };

    const { data, error } = await supabaseAdmin
      .from("learning_topics")
      .insert([newTopic])
      .select()
      .single();

    if (error) {
      console.error("Lỗi tạo topic:", error);
      return res.status(500).json({
        error: "Không thể tạo topic mới",
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

// GET /api/learning/:id - Lấy thông tin topic và nodes
router.get("/:id", async (req, res) => {
  console.log(`[DEBUG] [GET /api/learning/:id] === NEW REQUEST ===`);
  console.log(`[DEBUG] [GET /api/learning/:id] Request URL: ${req.url}`);
  console.log(`[DEBUG] [GET /api/learning/:id] Params:`, req.params);
  console.log(`[DEBUG] [GET /api/learning/:id] Headers:`, req.headers);
  try {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not initialized");
    }
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const topicId = req.params.id;

    console.log(
      `[DEBUG] [GET /api/learning/:id] Fetching topic_id: ${topicId} for user_id: ${user.id}`
    );

    console.log(
      `[DEBUG] [GET /api/learning/:id] Querying learning_topics table...`
    );
    // Get topic using admin client
    const { data: topic, error: topicError } = await supabaseAdmin
      .from("learning_topics")
      .select(
        `
        id, user_id, title, description, created_at, updated_at, is_active
      `
      )
      .eq("id", topicId)
      .eq("user_id", user.id)
      .single();

    console.log(`[DEBUG] [GET /api/learning/:id] Topic query result:`, {
      topic,
      topicError: topicError?.message,
      hasData: !!topic,
    });

    if (topicError || !topic) {
      return res.status(404).json({
        error: "Topic không tồn tại hoặc bạn không có quyền truy cập",
      });
    }

    console.log(
      `[DEBUG] [GET /api/learning/:id] Querying tree_nodes table for topic_id: ${topicId}...`
    );
    // Get nodes using admin client
    const { data: nodes, error: nodesError } = await supabaseAdmin
      .from("tree_nodes")
      .select(
        `
        id, topic_id, parent_id, title, description, prompt_sample, requires, next, level, position_x, position_y, created_at
      `
      )
      .eq("topic_id", topicId)
      .order("level", { ascending: true });

    // 🔍 DEEP DEBUG: Direct SQL query test
    const { data: sqlTestNodes, error: sqlError } = await supabaseAdmin
      .from("tree_nodes")
      .select("id, parent_id, title, level")
      .eq("topic_id", topicId)
      .not("parent_id", "is", null)
      .limit(5);

    console.log(`[🔍 DEEP DEBUG] SQL test - nodes with parent_id NOT NULL:`, {
      count: sqlTestNodes?.length || 0,
      error: sqlError?.message,
      samples: sqlTestNodes?.map((n) => ({
        id: n.id.substring(0, 8),
        parent_id: n.parent_id?.substring(0, 8),
        title: n.title.substring(0, 20),
        level: n.level,
      })),
    });

    console.log(`[🔍 DEEP DEBUG] RAW SUPABASE RESPONSE:`, {
      nodesCount: nodes?.length || 0,
      error: nodesError?.message,
      rawResponseType: typeof nodes,
      isArray: Array.isArray(nodes),
    });

    // 🔍 DEEP DEBUG: Log nodes by level from Supabase
    if (nodes && nodes.length > 0) {
      const nodesByLevel = {
        level0: nodes.filter((n) => n.level === 0).slice(0, 3),
        level1: nodes.filter((n) => n.level === 1).slice(0, 3),
        level2: nodes.filter((n) => n.level === 2).slice(0, 3),
      };

      console.log(`[🔍 DEEP DEBUG] Nodes by level from Supabase:`, {
        totalNodes: nodes.length,
        level0Count: nodes.filter((n) => n.level === 0).length,
        level1Count: nodes.filter((n) => n.level === 1).length,
        level2Count: nodes.filter((n) => n.level === 2).length,

        level0Samples: nodesByLevel.level0.map((n) => ({
          id: n.id?.substring(0, 8),
          title: n.title?.substring(0, 20),
          parent_id: n.parent_id,
          level: n.level,
        })),

        level1Samples: nodesByLevel.level1.map((n) => ({
          id: n.id?.substring(0, 8),
          title: n.title?.substring(0, 20),
          parent_id: n.parent_id?.substring(0, 8),
          level: n.level,
        })),

        level2Samples: nodesByLevel.level2.map((n) => ({
          id: n.id?.substring(0, 8),
          title: n.title?.substring(0, 20),
          parent_id: n.parent_id?.substring(0, 8),
          level: n.level,
        })),
      });
    }

    // ✅ Logs cleaned up - using only DEEP DEBUG above

    if (nodesError) {
      console.error("Lỗi lấy nodes:", nodesError);
    }

    // ✅ Logs cleaned up - using only DEEP DEBUG above

    // Disable caching for this endpoint
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    // 🔍 DEEP DEBUG: Process nodes (if any transformation happens)
    const processedNodes = nodes || [];

    console.log(
      `[🔍 DEEP DEBUG] After processing (should be same):`,
      processedNodes.slice(0, 3).map((n) => ({
        id: n.id?.substring(0, 8),
        title: n.title?.substring(0, 20),
        parent_id: n.parent_id,
        parent_id_type: typeof n.parent_id,
        parent_id_strict_null: n.parent_id === null,
      }))
    );

    // 🔍 DEEP DEBUG: Final response object
    const responseData = {
      topic,
      nodes: processedNodes,
    };

    console.log(`[🔍 DEEP DEBUG] Final response object:`, {
      topicId: responseData.topic.id,
      nodesCount: responseData.nodes.length,
      firstNodeParentId: responseData.nodes[0]?.parent_id,
      firstNodeParentIdType: typeof responseData.nodes[0]?.parent_id,
    });

    // 🔍 DEEP DEBUG: JSON.stringify test
    const jsonString = JSON.stringify(responseData.nodes[0]);
    console.log(`[🔍 DEEP DEBUG] JSON.stringify first node:`, jsonString);

    // 🔍 DEEP DEBUG: JSON.parse test
    const parsedBack = JSON.parse(jsonString);
    console.log(`[🔍 DEEP DEBUG] JSON.parse back:`, {
      parent_id: parsedBack.parent_id,
      parent_id_type: typeof parsedBack.parent_id,
    });

    // 🚨 SIMPLE DEBUG: Check what we're actually sending
    console.log("=== FINAL BACKEND RESPONSE CHECK ===");
    console.log("Response nodes count:", responseData.nodes.length);
    console.log(
      "First 3 nodes parent_id check:",
      responseData.nodes.slice(0, 3).map((n) => ({
        id: n.id.substring(0, 8),
        level: n.level,
        parent_id: n.parent_id,
        parent_id_substring: n.parent_id ? n.parent_id.substring(0, 8) : "NULL",
      }))
    );

    // Level 1 check
    const level1Nodes = responseData.nodes
      .filter((n) => n.level === 1)
      .slice(0, 3);
    console.log(
      "Level 1 nodes parent_id:",
      level1Nodes.map((n) => ({
        id: n.id.substring(0, 8),
        parent_id: n.parent_id,
        parent_id_substring: n.parent_id ? n.parent_id.substring(0, 8) : "NULL",
      }))
    );

    return res.json(responseData);
  } catch (error) {
    console.error("Lỗi server:", error);
    return res.status(500).json({
      error: "Lỗi server nội bộ",
    });
  }
});

// PUT /api/learning/:id - Cập nhật topic
router.put("/:id", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not initialized");
    }
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const topicId = req.params.id;
    const { title, description, is_active } = req.body;

    // Verify ownership
    const { data: existingTopic } = await supabaseAdmin
      .from("learning_topics")
      .select("user_id")
      .eq("id", topicId)
      .single();

    if (!existingTopic || existingTopic.user_id !== user.id) {
      return res.status(403).json({
        error: "Bạn không có quyền cập nhật topic này",
      });
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from("learning_topics")
      .update(updates)
      .eq("id", topicId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: "Không thể cập nhật topic",
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

// DELETE /api/learning/:id - Xóa topic (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not initialized");
    }
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const topicId = req.params.id;

    // Verify ownership
    const { data: existingTopic } = await supabaseAdmin
      .from("learning_topics")
      .select("user_id")
      .eq("id", topicId)
      .single();

    if (!existingTopic || existingTopic.user_id !== user.id) {
      return res.status(403).json({
        error: "Bạn không có quyền xóa topic này",
      });
    }

    // Soft delete by setting is_active = false
    const { error } = await supabaseAdmin
      .from("learning_topics")
      .update({ is_active: false })
      .eq("id", topicId);

    if (error) {
      return res.status(500).json({
        error: "Không thể xóa topic",
        details: error.message,
      });
    }

    return res.json({
      success: true,
      message: "Topic đã được xóa",
    });
  } catch (error) {
    console.error("Lỗi server:", error);
    return res.status(500).json({
      error: "Lỗi server nội bộ",
    });
  }
});

// GET /api/learning/:id/nodes - Lấy danh sách nodes của topic
router.get("/:id/nodes", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not initialized");
    }
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const topicId = req.params.id;

    // Verify topic ownership
    const { data: topic } = await supabaseAdmin
      .from("learning_topics")
      .select("user_id")
      .eq("id", topicId)
      .single();

    if (!topic || topic.user_id !== user.id) {
      return res.status(403).json({
        error: "Bạn không có quyền truy cập topic này",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("tree_nodes")
      .select("*")
      .eq("topic_id", topicId)
      .order("level", { ascending: true });

    if (error) {
      return res.status(500).json({
        error: "Không thể lấy danh sách nodes",
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

// PUT /api/learning/:id/nodes/:nodeId - Update user progress for a single node
router.put("/:id/nodes/:nodeId", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not initialized");
    }
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id: topicId, nodeId } = req.params;
    const { is_completed } = req.body;

    if (typeof is_completed !== "boolean") {
      return res
        .status(400)
        .json({ error: "Trường is_completed phải là boolean" });
    }

    // Verify topic ownership to ensure user can "complete" a node in it
    const { data: topic } = await supabaseAdmin
      .from("learning_topics")
      .select("user_id")
      .eq("id", topicId)
      .single();

    if (!topic || topic.user_id !== user.id) {
      return res.status(403).json({
        error: "Bạn không có quyền cập nhật node này",
      });
    }

    // Upsert the progress
    const { data, error } = await supabaseAdmin
      .from("user_learning_progress")
      .upsert(
        {
          user_id: user.id,
          node_id: nodeId,
          is_completed: is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,node_id" }
      )
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: "Không thể cập nhật tiến độ học tập",
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

// POST /api/learning/:id/nodes/batch - Update user progress for multiple nodes
router.post("/:id/nodes/batch", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not initialized");
    }
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const topicId = req.params.id;
    const { nodeIds, is_completed } = req.body;

    if (
      !Array.isArray(nodeIds) ||
      nodeIds.length === 0 ||
      typeof is_completed !== "boolean"
    ) {
      return res.status(400).json({
        error: "nodeIds phải là array và is_completed phải là boolean",
      });
    }

    // Verify topic ownership
    const { data: topic } = await supabaseAdmin
      .from("learning_topics")
      .select("user_id")
      .eq("id", topicId)
      .single();

    if (!topic || topic.user_id !== user.id) {
      return res.status(403).json({
        error: "Bạn không có quyền cập nhật các node này",
      });
    }

    // Prepare records for upsert
    const progressRecords = nodeIds.map((nodeId) => ({
      user_id: user.id,
      node_id: nodeId,
      is_completed: is_completed,
      completed_at: is_completed ? new Date().toISOString() : null,
    }));

    // Upsert the progress records
    const { data, error } = await supabaseAdmin
      .from("user_learning_progress")
      .upsert(progressRecords, { onConflict: "user_id,node_id" })
      .select();

    if (error) {
      return res.status(500).json({
        error: "Không thể cập nhật hàng loạt tiến độ học tập",
        details: error.message,
      });
    }

    return res.json({
      success: true,
      message: `Đã cập nhật ${data?.length || 0} mục tiến độ`,
      data,
    });
  } catch (error) {
    console.error("Lỗi server:", error);
    return res.status(500).json({
      error: "Lỗi server nội bộ",
    });
  }
});

export default router;
