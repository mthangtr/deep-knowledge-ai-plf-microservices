import { useState, useCallback } from "react";
import { API_ENDPOINTS } from "@/lib/config";

interface AIMessage {
  id: string;
  message: string;
  is_ai_response: boolean;
  created_at: string;
}

interface AISessionInfo {
  session_id: string;
  context_type: "NONE" | "RECENT_ONLY" | "SMART_RETRIEVAL" | "FULL_CONTEXT";
  estimated_tokens: number;
  message_count: number;
  total_tokens: number;
}

interface SendMessageResponse {
  success: boolean;
  data?: {
    user_message: AIMessage;
    ai_message: AIMessage;
    session_id: string;
    context_info: {
      context_type: string;
      estimated_tokens: number;
      recent_messages_count: number;
      relevant_messages_count: number;
      has_summary: boolean;
    };
    session_stats: {
      message_count: number;
      total_tokens: number;
      user_message_count: number;
      ai_message_count: number;
    };
    model_used: string;
    processing_time: number;
  };
  error?: string;
}

export function useAIChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (
      message: string,
      topicId: string,
      nodeId?: string
    ): Promise<SendMessageResponse> => {
      setIsLoading(true);
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

        const response = await fetch(API_ENDPOINTS.chat.ai, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            topic_id: topicId,
            node_id: nodeId,
            message,
            session_id: sessionId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to send message");
        }

        // Update session ID for next message
        if (data.data?.session_id) {
          setSessionId(data.data.session_id);
        }

        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  const getOrCreateSession = useCallback(
    async (topicId: string, nodeId?: string, title?: string) => {
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

        const response = await fetch(API_ENDPOINTS.chat.session, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            topic_id: topicId,
            node_id: nodeId,
            title,
          }),
        });

        const data = await response.json();

        if (response.ok && data.data) {
          setSessionId(data.data.id);
          return data.data;
        }

        throw new Error(data.error || "Failed to create session");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        return null;
      }
    },
    []
  );

  const getSessions = useCallback(
    async (topicId?: string, activeOnly = true) => {
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

        const params = new URLSearchParams();
        if (topicId) params.set("topic_id", topicId);
        params.set("active_only", String(activeOnly));

        const response = await fetch(
          `${API_ENDPOINTS.chat.sessions}?${params}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          return data.data || [];
        }

        throw new Error(data.error || "Failed to fetch sessions");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        return [];
      }
    },
    []
  );

  const resetSession = useCallback(() => {
    setSessionId(null);
  }, []);

  return {
    sessionId,
    isLoading,
    error,
    sendMessage,
    getOrCreateSession,
    getSessions,
    resetSession,
  };
}
