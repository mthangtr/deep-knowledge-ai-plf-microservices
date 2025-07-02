import { Router } from "express";
import { randomUUID } from "crypto";
import { supabase } from "../config/supabase";
import { authenticate } from "../middleware/auth.middleware";
import { aiGenerationService } from "../services/ai-generation.service";
import { AuthRequest } from "../types";

const router = Router();

interface GenerateRequest {
  prompt: string;
}

// POST /api/learning/generate - Generate learning tree from user prompt via LangChain Service
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const body: GenerateRequest = req.body;

    // Validate input
    if (
      !body.prompt ||
      typeof body.prompt !== "string" ||
      body.prompt.trim().length < 3
    ) {
      return res.status(400).json({
        error: "Prompt không hợp lệ. Yêu cầu ít nhất 3 ký tự.",
      });
    }

    const prompt = body.prompt.trim();

    // Call the new LangChain service to generate the tree
    const aiResponse = await aiGenerationService.generateLearningTree(prompt);

    if (!aiResponse.success || !aiResponse.data || !aiResponse.data.tree) {
      return res.status(502).json({
        error: "Không thể tạo learning tree từ AI service",
        details: aiResponse.message,
      });
    }

    const treeData = aiResponse.data;

    // Start transaction: Create the topic first
    const newTopic = {
      user_id: userId,
      title: treeData.topicName,
      description: treeData.description,
      prompt: prompt,
      is_active: true,
      total_nodes: treeData.tree.length,
      completed_nodes: 0,
    };

    const { data: createdTopic, error: topicError } = await supabase
      .from("learning_topics")
      .insert([newTopic])
      .select()
      .single();

    if (topicError || !createdTopic) {
      console.error("Lỗi tạo topic:", topicError);
      return res.status(500).json({
        error: "Không thể tạo topic trong database",
        details: topicError?.message,
      });
    }

    // Map temp_id to real UUIDs
    const tempIdMap = new Map<string, string>();
    treeData.tree.forEach((node: any) => {
      if (node.temp_id && !tempIdMap.has(node.temp_id)) {
        tempIdMap.set(node.temp_id, randomUUID());
      }
    });

    // Prepare tree nodes with real UUIDs and relationships
    const nodes = treeData.tree.map((node: any) => {
      const realId = tempIdMap.get(node.temp_id) || randomUUID();
      const resolvedRequires = (node.requires || [])
        .map((reqId: string) => tempIdMap.get(reqId))
        .filter(Boolean);
      const resolvedNext = (node.next || [])
        .map((nextId: string) => tempIdMap.get(nextId))
        .filter(Boolean);

      return {
        id: realId,
        topic_id: createdTopic.id,
        title: node.title,
        description: node.description,
        prompt_sample: node.prompt_sample || null,
        is_chat_enabled: node.is_chat_enabled !== false,
        requires: resolvedRequires,
        next: resolvedNext,
        level: node.level || 0,
        position_x: 0,
        position_y: 0,
        is_completed: false,
      };
    });

    // Insert nodes into the database
    const { data: createdNodes, error: nodesError } = await supabase
      .from("tree_nodes")
      .insert(nodes)
      .select();

    if (nodesError) {
      console.error("Lỗi tạo nodes:", nodesError);
      // Rollback: Delete the topic if node creation fails
      await supabase.from("learning_topics").delete().eq("id", createdTopic.id);
      return res.status(500).json({
        error: "Không thể tạo các node của tree",
        details: nodesError.message,
      });
    }

    return res.status(201).json({
      message: "Tạo và import learning tree thành công!",
      topic: createdTopic,
      nodes: createdNodes || [],
    });
  } catch (error) {
    console.error("Lỗi generate learning tree:", error);
    return res.status(500).json({
      error: "Lỗi server nội bộ",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/learning/generate - Get service info
router.get("/", (_req, res) => {
  return res.json({
    service: "AI Learning Tree Generation",
    description:
      "This service now uses an internal LangChain service to generate learning paths.",
    langchain_service_url:
      process.env.LANGCHAIN_SERVICE_URL || "Configured in environment",
  });
});

export default router;
