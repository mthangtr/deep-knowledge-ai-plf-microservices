import { useState, useCallback } from "react";
import { API_ENDPOINTS, getAuthHeaders } from "@/lib/config";
import { ChatMessage } from "@/types";
import { useAIChat } from "@/components/providers/ai-chat-provider";
import { v4 as uuidv4 } from "uuid";

// The backend now sends different types of events.
// We only really care about 'user_message' and raw content from the AI stream.
interface StreamingResponse {
  type: "user_message" | "content" | "error" | "metadata";
  data?: ChatMessage; // For user_message event
  content?: string; // For AI content chunks
  error?: string;
  details?: string;
}

interface UseAIChatStreamCallbacks {
  onUserMessage?: (message: ChatMessage) => void;
  onChunk?: (content: string, fullContent: string) => void;
  onComplete?: (data: { ai_message: ChatMessage; session_id: string }) => void;
  onError?: (error: string, details?: string) => void;
}

export function useAIChatStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sessionId, setSessionId } = useAIChat();

  const getValidSessionId = useCallback(
    async (
      token: string,
      topicId: string,
      nodeId?: string
    ): Promise<string> => {
      if (sessionId) return sessionId;

      const res = await fetch(API_ENDPOINTS.chat.session(), {
        method: "POST",
        headers: getAuthHeaders(token),
        body: JSON.stringify({ topic_id: topicId, node_id: nodeId }),
      });

      if (!res.ok) {
        throw new Error("Failed to establish a chat session.");
      }
      const data = await res.json();
      const newSessionId = data.data.id;
      setSessionId(newSessionId);
      return newSessionId;
    },
    [sessionId, setSessionId]
  );

  const sendMessageStream = useCallback(
    async (
      message: string,
      topicId: string,
      nodeId?: string,
      callbacks?: UseAIChatStreamCallbacks
    ): Promise<{ success: boolean; error?: string }> => {
      setIsStreaming(true);
      setError(null);

      // 1. Get JWT token
      const token = sessionStorage.getItem("jwt_token") || "";
      if (!token) {
        const err = "Authentication token not found.";
        setError(err);
        callbacks?.onError?.(err);
        setIsStreaming(false);
        return { success: false, error: err };
      }

      try {
        // 2. Get or create a valid session ID
        const activeSessionId = await getValidSessionId(token, topicId, nodeId);

        // 3. Call the streaming endpoint
        const response = await fetch(
          API_ENDPOINTS.chat.stream(activeSessionId),
          {
            method: "POST",
            headers: getAuthHeaders(token),
            body: JSON.stringify({
              message: message.trim(),
              topic_id: topicId,
              node_id: nodeId,
            }),
          }
        );

        if (!response.body) {
          throw new Error("The response from the server is empty.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullAiContent = "";

        // 4. Process the stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data: StreamingResponse = JSON.parse(line.slice(5));

                if (data.type === "user_message" && data.data) {
                  callbacks?.onUserMessage?.(data.data);
                } else if (data.type === "content" && data.content) {
                  fullAiContent += data.content;
                  callbacks?.onChunk?.(data.content, fullAiContent);
                } else if (data.type === "error") {
                  throw new Error(data.error || "Streaming error from server");
                }
              } catch (e) {
                // Ignore parsing errors for non-JSON chunks
              }
            }
          }
        }

        // 5. Handle completion
        const finalAiMessage: ChatMessage = {
          id: uuidv4(), // Temporary client-side ID
          session_id: activeSessionId,
          role: "assistant",
          content: fullAiContent,
          created_at: new Date().toISOString(),
        };
        callbacks?.onComplete?.({
          ai_message: finalAiMessage,
          session_id: activeSessionId,
        });

        return { success: true };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred.";
        setError(errorMessage);
        callbacks?.onError?.(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, setSessionId, getValidSessionId]
  );

  return {
    sendMessageStream,
    isStreaming,
    error,
  };
}
