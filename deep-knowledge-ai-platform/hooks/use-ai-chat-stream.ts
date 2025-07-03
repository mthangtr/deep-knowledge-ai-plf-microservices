import { useState, useCallback } from "react";
import { API_ENDPOINTS } from "@/lib/config";
import { LearningChat } from "@/types/database";
import { useAIChat } from "@/components/providers/ai-chat-provider";

interface StreamingResponse {
  type: "user_message" | "metadata" | "content" | "done" | "error";
  message?: LearningChat;
  content?: string;
  session_id?: string;
  context_info?: any;
  ai_message?: LearningChat;
  model_used?: string;
  processing_time?: number;
  error?: string;
  details?: string;
}

interface UseAIChatStreamCallbacks {
  onUserMessage?: (message: LearningChat) => void;
  onMetadata?: (metadata: any) => void;
  onChunk?: (content: string, fullContent: string) => void;
  onComplete?: (data: { ai_message: LearningChat; session_id: string }) => void;
  onError?: (error: string, details?: string) => void;
}

export function useAIChatStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sessionId, setSessionId } = useAIChat();

  const sendMessageStream = useCallback(
    async (
      message: string,
      topicId: string,
      nodeId?: string,
      callbacks?: UseAIChatStreamCallbacks
    ): Promise<{ success: boolean; error?: string }> => {
      setIsStreaming(true);
      setError(null);

      try {
        // Get JWT token from sessionStorage
        let token = sessionStorage.getItem("jwt_token");

        // Fallback to cookie if sessionStorage is not available
        if (!token && typeof document !== "undefined") {
          const cookies = document.cookie.split(";");
          const jwtCookie = cookies.find((cookie) =>
            cookie.trim().startsWith("jwt_token=")
          );
          token = jwtCookie ? jwtCookie.split("=")[1] : null;
        }

        const payload = {
          topic_id: topicId,
          node_id: nodeId,
          message: message.trim(),
          session_id: sessionId,
        };

        // 🐛 DEBUG: Log the payload before sending
        console.log(
          "🚀 [FRONTEND REQUEST] Sending to /smart-chat:",
          JSON.stringify(payload, null, 2)
        );

        const response = await fetch(API_ENDPOINTS.chat.aiStream, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        let fullAiContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data: StreamingResponse = JSON.parse(line.slice(6));

                switch (data.type) {
                  case "user_message":
                    if (data.message) {
                      callbacks?.onUserMessage?.(data.message);
                    }
                    break;

                  case "metadata":
                    callbacks?.onMetadata?.(data);
                    break;

                  case "content":
                    if (data.content) {
                      fullAiContent += data.content;
                      callbacks?.onChunk?.(data.content, fullAiContent);
                    }
                    break;

                  case "done":
                    if (data.ai_message && data.session_id) {
                      setSessionId(data.session_id);
                      callbacks?.onComplete?.({
                        ai_message: data.ai_message,
                        session_id: data.session_id,
                      });
                    }
                    break;

                  case "error":
                    const errorMsg = data.error || "Unknown streaming error";
                    setError(errorMsg);
                    callbacks?.onError?.(errorMsg, data.details);
                    return { success: false, error: errorMsg };
                }
              } catch (parseError) {
                console.error("Error parsing streaming data:", parseError);
              }
            }
          }
        }

        return { success: true };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        callbacks?.onError?.(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, setSessionId]
  );

  return {
    sendMessageStream,
    isStreaming,
    error,
  };
}
