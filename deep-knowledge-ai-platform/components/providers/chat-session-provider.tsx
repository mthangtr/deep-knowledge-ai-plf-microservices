"use client";

import {
    useState,
    useCallback,
    createContext,
    useContext,
    ReactNode,
} from "react";
import { API_ENDPOINTS } from "@/lib/config";

interface LearningSessionContextType {
    sessionId: string | null;
    isLoading: boolean;
    error: string | null;
    getOrCreateSession: (
        topicId: string,
        nodeId?: string,
        title?: string
    ) => Promise<any>;
    setSessionId: (id: string | null) => void;
}

const LearningSessionContext = createContext<LearningSessionContextType | undefined>(undefined);

interface LearningSessionProviderProps {
    children: ReactNode;
}

export function LearningSessionProvider({ children }: LearningSessionProviderProps) {
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


    const getOrCreateSession = useCallback(
        async (topicId: string, nodeId?: string, title?: string) => {
            try {
                const token = getToken();
                const response = await fetch(API_ENDPOINTS.chat.session(), {
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
        [setSessionId, setError, getToken]
    );

    const handleSetSessionId = useCallback((id: string | null) => {
        setSessionId(id);
    }, [setSessionId]);

    const value = {
        sessionId,
        isLoading,
        error,
        getOrCreateSession,
        setSessionId: handleSetSessionId,
    };

    return (
        <LearningSessionContext.Provider value={value}>{children}</LearningSessionContext.Provider>
    );
}

// --- Custom Hook ---
export function useLearningSession() {
    const context = useContext(LearningSessionContext);
    if (context === undefined) {
        throw new Error("useLearningSession must be used within an LearningSessionProvider");
    }
    return context;
} 