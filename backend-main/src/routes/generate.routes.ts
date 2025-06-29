import { Router } from "express";
import { randomUUID } from "crypto";
import { supabase } from "../config/supabase";
import { authenticate } from "../middleware/auth.middleware";
import { aiGenerationService } from "../services/ai-generation.service";
import { AuthRequest } from "../types";

const router = Router();

interface GenerateRequest {
  prompt: string;
  useAI?: boolean;
}

// POST /api/learning/generate - Generate learning tree từ user prompt
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const body: GenerateRequest = req.body;

    // Validate input
    if (!body.prompt || typeof body.prompt !== "string") {
      return res.status(400).json({
        error: "Thiếu prompt hoặc prompt không hợp lệ",
      });
    }

    const prompt = body.prompt.trim();
    if (prompt.length < 3) {
      return res.status(400).json({
        error: "Prompt phải có ít nhất 3 ký tự",
      });
    }

    let aiResponse;

    if (body.useAI !== false) {
      // Gọi FlowiseAI để generate tree
      aiResponse = await aiGenerationService.generateLearningTree(prompt);
    } else {
      // Tạo sample tree cho testing
      const sampleTree = aiGenerationService.generateSampleTree(prompt);
      aiResponse = {
        success: true,
        data: sampleTree,
        message: "Tạo sample tree thành công",
      };
    }

    if (!aiResponse.success || !aiResponse.data || !aiResponse.data.tree) {
      return res.status(500).json({
        error: "Không thể tạo learning tree",
        details: aiResponse.error,
        suggestion: "Thử lại với prompt khác hoặc liên hệ support",
      });
    }

    const treeData = aiResponse.data;

    // Validate tree data
    if (!Array.isArray(treeData.tree) || treeData.tree.length === 0) {
      return res.status(400).json({
        error: "Dữ liệu tree không hợp lệ",
        details: "Tree phải là array và có ít nhất 1 node",
      });
    }

    // Validate tree nodes
    for (const node of treeData.tree) {
      if (!node.title || !node.description) {
        return res.status(400).json({
          error: "Node trong tree không hợp lệ",
          details: `Node thiếu title hoặc description: ${JSON.stringify(node)}`,
        });
      }
    }

    // Start transaction: Tạo topic trước
    const newTopic = {
      user_id: userId,
      title:
        treeData.topicName ||
        `AI Generated: ${prompt.substring(0, 100)}${
          prompt.length > 100 ? "..." : ""
        }`,
      description:
        treeData.description ||
        `Lộ trình học được tạo từ AI cho prompt: "${prompt}"`,
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
        error: "Không thể tạo topic",
        details: topicError?.message,
      });
    }

    // Tạo mapping temp_id → real UUID
    const tempIdMap = new Map<string, string>();
    treeData.tree.forEach((node: any) => {
      const tempId = node.temp_id || node.id;
      if (tempId && !tempIdMap.has(tempId)) {
        const realUUID = randomUUID();
        tempIdMap.set(tempId, realUUID);
      }
    });

    // Tạo tree nodes với real UUIDs
    const nodes = treeData.tree.map((node: any) => {
      const tempId = node.temp_id || node.id;
      const realId = tempIdMap.get(tempId) || randomUUID();

      // Resolve requires/next từ temp_id sang real UUID
      const resolvedRequires = (node.requires || [])
        .map((reqTempId: string) => {
          const realUUID = tempIdMap.get(reqTempId);
          if (!realUUID) {
            console.warn(
              `⚠️ temp_id "${reqTempId}" not found in requires for node "${tempId}"`
            );
          }
          return realUUID;
        })
        .filter(Boolean);

      const resolvedNext = (node.next || [])
        .map((nextTempId: string) => {
          const realUUID = tempIdMap.get(nextTempId);
          if (!realUUID) {
            console.warn(
              `⚠️ temp_id "${nextTempId}" not found in next for node "${tempId}"`
            );
          }
          return realUUID;
        })
        .filter(Boolean);

      return {
        id: realId,
        topic_id: createdTopic.id,
        title: node.title.trim(),
        description: node.description.trim(),
        prompt_sample: node.prompt_sample?.trim() || null,
        is_chat_enabled: node.is_chat_enabled !== false,
        requires: resolvedRequires,
        next: resolvedNext,
        level: node.level || 0,
        position_x: node.position_x || 0,
        position_y: node.position_y || 0,
        is_completed: false,
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
      message: "Tạo và import learning tree thành công!",
      prompt: prompt,
      useAI: body.useAI !== false,
      aiGeneration: {
        success: aiResponse.success,
        message: aiResponse.message,
      },
      importResult: {
        topic: createdTopic,
        nodes: createdNodes || [],
        totalNodes: createdNodes?.length || 0,
        tempIdMapping: Object.fromEntries(tempIdMap),
      },
      treeData: aiResponse.data,
    });
  } catch (error) {
    console.error("Lỗi generate learning tree:", error);
    return res.status(500).json({
      error: "Lỗi server nội bộ",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/learning/generate - Get thông tin về service
router.get("/", (req, res) => {
  return res.json({
    service: "AI Learning Tree Generation",
    endpoints: {
      "POST /api/learning/generate": {
        description:
          "Generate learning tree từ user prompt và import trực tiếp vào database",
        authentication: "Required",
        body: {
          prompt: "string (required) - Chủ đề muốn học",
          useAI: "boolean (optional) - true = FlowiseAI, false = sample data",
        },
        example: {
          prompt: "Tôi muốn học React.js",
          useAI: true,
        },
        response: {
          success: "201 - Topic và nodes được tạo thành công",
          error: "500 - Lỗi database hoặc AI generation",
        },
      },
    },
    flowiseAI: {
      url: process.env.FLOWISE_API_URL || "Configured in environment",
      status: "ready",
    },
    features: {
      directImport: "Import tree trực tiếp không qua /tree endpoint",
      tempIdMapping: "Convert temp_id sang UUID với đầy đủ relationships",
      authentication: "JWT authentication required",
      rollback: "Auto rollback nếu insert nodes thất bại",
    },
  });
});

export default router;
