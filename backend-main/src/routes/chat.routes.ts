import { Router } from "express";
import { supabase } from "../config/supabase";
import { authenticate } from "../middleware/auth.middleware";
import { AuthRequest } from "../types";
import { validateTopicOwnership } from "../utils/auth.utils";

const router = Router();

// Helper function to verify that the user owns the session
const verifySessionOwnership = async (sessionId: string, userId: string) => {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();
  return !error && !!data;
};

// POST /api/learning/chat/session - Get or create a chat session
router.post("/session", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { topic_id, node_id } = req.body;

    if (!topic_id) {
      return res.status(400).json({ error: "Missing topic_id" });
    }

    const hasAccess = await validateTopicOwnership(topic_id, userId);
    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: "Bạn không có quyền truy cập chủ đề này" });
    }

    // Check for an existing session
    let query = supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("topic_id", topic_id);

    if (node_id) {
      query = query.eq("node_id", node_id);
    } else {
      query = query.is("node_id", null);
    }

    const { data: existingSession, error: checkError } =
      await query.maybeSingle();

    if (checkError) {
      console.error("Error checking for existing session:", checkError);
      return res.status(500).json({
        error: "Lỗi khi kiểm tra session",
        details: checkError.message,
      });
    }

    if (existingSession) {
      return res.json({ data: existingSession, isNew: false });
    }

    // Create a new session if none exists
    const newSession = {
      user_id: userId,
      topic_id,
      node_id: node_id || null,
    };

    const { data: createdSession, error: createError } = await supabase
      .from("chat_sessions")
      .insert(newSession)
      .select()
      .single();

    if (createError) {
      console.error("Error creating new session:", createError);
      return res.status(500).json({
        error: "Không thể tạo session mới",
        details: createError.message,
      });
    }

    return res.status(201).json({ data: createdSession, isNew: true });
  } catch (error) {
    console.error("Server error in /session:", error);
    return res.status(500).json({ error: "Lỗi server nội bộ" });
  }
});

// GET /api/learning/chat/sessions/:sessionId/messages - Get all messages for a session
router.get(
  "/sessions/:sessionId/messages",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { sessionId } = req.params;

      const isOwner = await verifySessionOwnership(sessionId, userId);
      if (!isOwner) {
        return res
          .status(403)
          .json({ error: "Bạn không có quyền truy cập session này" });
      }

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return res.status(500).json({
          error: "Không thể lấy tin nhắn",
          details: error.message,
        });
      }

      return res.json({ data: data || [] });
    } catch (error) {
      console.error("Server error in /messages:", error);
      return res.status(500).json({ error: "Lỗi server nội bộ" });
    }
  }
);

// POST /api/learning/chat/sessions/:sessionId/stream - Post a message and get a streamed AI response
router.post(
  "/sessions/:sessionId/stream",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { sessionId } = req.params;
      const { message, topic_id, node_id } = req.body; // topic_id, node_id are for langchain context

      if (!message) {
        return res.status(400).json({ error: "Missing message content" });
      }

      const isOwner = await verifySessionOwnership(sessionId, userId);
      if (!isOwner) {
        return res
          .status(403)
          .json({ error: "Bạn không có quyền truy cập session này" });
      }

      // 1. Save user message
      const { data: savedUserMessage, error: userMessageError } = await supabase
        .from("chat_messages")
        .insert({
          session_id: sessionId,
          role: "user",
          content: message.trim(),
        })
        .select()
        .single();

      if (userMessageError) {
        console.error("Error saving user message:", userMessageError);
        return res
          .status(500)
          .json({ error: "Không thể lưu tin nhắn của bạn" });
      }

      // Set up SSE headers
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      // Immediately send the saved user message to the client
      res.write(
        `data: ${JSON.stringify({
          type: "user_message",
          data: savedUserMessage,
        })}\n\n`
      );

      // 2. Call LangChain service for a streaming response
      const langchainUrl =
        process.env.LANGCHAIN_SERVICE_URL ||
        "http://langchain-python-service:5000";
      const aiResponse = await fetch(`${langchainUrl}/smart-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
          message: message,
          topic_id: topic_id,
          node_id: node_id,
          // model: "..." // optional model override
        }),
      });

      if (!aiResponse.ok || !aiResponse.body) {
        throw new Error(
          `LangChain service error: ${
            aiResponse.status
          } ${await aiResponse.text()}`
        );
      }

      // 3. Stream the response to the client and collect the full message
      let fullAiResponse = "";
      const reader = aiResponse.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Forward the raw chunk to the client
        res.write(chunk);

        // Naively parse content from stream for saving later
        // This assumes the streaming format is `data: {"type":"content","content":"..."}\n\n`
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data:")) {
            try {
              const parsed = JSON.parse(line.substring(5));
              if (parsed.type === "content") {
                fullAiResponse += parsed.content;
              }
            } catch (e) {
              // Ignore parsing errors, just continue
            }
          }
        }
      }

      // 4. Save the full AI response
      if (fullAiResponse) {
        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: fullAiResponse,
        });
      }

      // 5. Update session's last activity timestamp
      await supabase
        .from("chat_sessions")
        .update({ last_activity: new Date().toISOString() })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error during AI stream:", error);
      // Send an error event to the client before closing
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          error: "AI service failed",
        })}\n\n`
      );
    } finally {
      // End the stream
      res.end();
    }
  }
);

export default router;
