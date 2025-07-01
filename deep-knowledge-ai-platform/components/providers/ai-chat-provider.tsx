"use client";

import {
    useState,
    useCallback,
    createContext,
    useContext,
    ReactNode,
} from "react";
import { API_ENDPOINTS } from "@/lib/config";
import { LearningChat } from "@/types/database";

// --- Type Definitions ---
interface SendMessageResponse {
    success: boolean;
    data?: {
        user_message: LearningChat;
        ai_message: LearningChat;
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

interface AIChatContextType {
    sessionId: string | null;
    isLoading: boolean;
    error: string | null;
    sendMessage: (
        message: string,
        topicId: string,
        nodeId?: string
    ) => Promise<SendMessageResponse>;
    getOrCreateSession: (
        topicId: string,
        nodeId?: string,
        title?: string
    ) => Promise<any>;
    getSessions: (topicId?: string, activeOnly?: boolean) => Promise<any[]>;
    resetSession: () => void;
    setSessionId: (id: string | null) => void;
}

// --- Context Definition ---
const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

// --- Provider Component ---
interface AIChatProviderProps {
    children: ReactNode;
}

export function AIChatProvider({ children }: AIChatProviderProps) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getToken = () => {
        if (typeof window === "undefined") return null;
        let token = sessionStorage.getItem("jwt_token");
        if (!token && typeof document !== "undefined") {
            const cookies = document.cookie.split(";");
            const jwtCookie = cookies.find((cookie) =>
                cookie.trim().startsWith("jwt_token=")
            );
            token = jwtCookie ? jwtCookie.split("=")[1] : null;
        }
        return token;
    };

    const sendMessage = useCallback(
        async (
            message: string,
            topicId: string,
            nodeId?: string
        ): Promise<SendMessageResponse> => {
            setIsLoading(true);
            setError(null);
            try {
                const token = getToken();
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
                if (data.data?.session_id) {
                    setSessionId(data.data.session_id);
                }
                return data;
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Unknown error";
                setError(errorMessage);
                return { success: false, error: errorMessage };
            } finally {
                setIsLoading(false);
            }
        },
        [sessionId]
    );

    const getOrCreateSession = useCallback(
        async (topicId: string, nodeId?: string, title?: string) => {
            // ... implementation similar to sendMessage ...
            try {
                const token = getToken();
                const response = await fetch(API_ENDPOINTS.chat.session, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ topic_id: topicId, node_id: nodeId, title }),
                });
                const data = await response.json();
                if (response.ok && data.data) {
                    setSessionId(data.data.id);
                    return data.data;
                }
                throw new Error(data.error || "Failed to create session");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
                return null;
            }
        },
        []
    );

    const getSessions = useCallback(
        async (topicId?: string, activeOnly = true) => {
            // ... implementation similar to sendMessage ...
            try {
                const token = getToken();
                const params = new URLSearchParams();
                if (topicId) params.set("topic_id", topicId);
                params.set("active_only", String(activeOnly));

                const response = await fetch(
                    `${API_ENDPOINTS.chat.sessions}?${params}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const data = await response.json();
                if (response.ok) return data.data || [];
                throw new Error(data.error || "Failed to fetch sessions");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
                return [];
            }
        },
        []
    );

    const resetSession = useCallback(() => {
        setSessionId(null);
    }, []);

    // Expose setSessionId to be used by consumers
    const handleSetSessionId = useCallback((id: string | null) => {
        setSessionId(id);
    }, []);

    const value = {
        sessionId,
        isLoading,
        error,
        sendMessage,
        getOrCreateSession,
        getSessions,
        resetSession,
        setSessionId: handleSetSessionId,
    };

    return (
        <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
    );
}

// --- Custom Hook ---
export function useAIChat() {
    const context = useContext(AIChatContext);
    if (context === undefined) {
        throw new Error("useAIChat must be used within an AIChatProvider");
    }
    return context;
} 