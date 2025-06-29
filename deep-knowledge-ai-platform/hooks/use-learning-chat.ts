import { useState, useEffect, useCallback } from "react";
import { learningService } from "@/lib/services/learning";
import { LearningChat } from "@/types/database";

interface UseLearningChatState {
  messages: LearningChat[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  currentChatMode: "topic" | "node" | null;
  currentTopicId: string | null;
  currentNodeId: string | null;
}

export function useLearningChat(topicId?: string, nodeId?: string) {
  const [state, setState] = useState<UseLearningChatState>({
    messages: [],
    loading: false,
    sending: false,
    error: null,
    currentChatMode: null,
    currentTopicId: null,
    currentNodeId: null,
  });

  // Determine chat mode based on parameters
  const chatMode = nodeId ? "node" : topicId ? "topic" : null;

  // Fetch messages based on current mode
  const fetchMessages = useCallback(async () => {
    if (!topicId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Use new unified API method
      const response = await learningService.getChats(topicId, nodeId);

      if (response.error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: response.error || "Lỗi khi tải messages",
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        messages: response.data || [],
        loading: false,
        error: null,
        currentChatMode: chatMode,
        currentTopicId: topicId,
        currentNodeId: nodeId || null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Lỗi kết nối khi tải messages",
      }));
    }
  }, [topicId, nodeId, chatMode]);

  // Send message
  const sendMessage = useCallback(
    async (messageData: { message: string }) => {
      if (!topicId) return null;

      setState((prev) => ({ ...prev, sending: true, error: null }));

      try {
        const response = await learningService.sendChatMessage({
          topic_id: topicId,
          node_id: chatMode === "node" ? nodeId : undefined,
          message: messageData.message,
          is_ai_response: false,
          message_type: "normal",
        });

        if (response.error) {
          setState((prev) => ({
            ...prev,
            sending: false,
            error: response.error || "Lỗi khi gửi message",
          }));
          return null;
        }

        const newMessage = response.data;
        if (newMessage) {
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, newMessage],
            sending: false,
            error: null,
          }));
        }

        return newMessage;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          sending: false,
          error: "Lỗi kết nối khi gửi message",
        }));
        return null;
      }
    },
    [topicId, nodeId, chatMode]
  );

  // Create auto prompt for topic
  const createTopicAutoPrompt = useCallback(
    async (topicData: {
      topic_id: string;
      topic_title: string;
      topic_description: string;
    }) => {
      setState((prev) => ({ ...prev, sending: true, error: null }));

      try {
        const response = await learningService.createTopicAutoPrompt(topicData);

        if (response.error) {
          setState((prev) => ({
            ...prev,
            sending: false,
            error: response.error || "Lỗi khi tạo auto prompt",
          }));
          return { error: response.error, skipped: false };
        }

        // If auto-prompt was skipped (already has chat), don't add to messages
        if (response.skipped) {
          setState((prev) => ({
            ...prev,
            sending: false,
            error: null,
          }));
          return { skipped: true, hasExistingChat: response.hasExistingChat };
        }

        const autoPrompt = response.data;
        if (autoPrompt) {
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, autoPrompt],
            sending: false,
            error: null,
          }));
        }

        return { data: autoPrompt, skipped: false };
      } catch (error) {
        setState((prev) => ({
          ...prev,
          sending: false,
          error: "Lỗi kết nối khi tạo auto prompt",
        }));
        return { error: "Lỗi kết nối", skipped: false };
      }
    },
    []
  );

  // Create auto prompt for node
  const createNodeAutoPrompt = useCallback(
    async (nodeData: {
      topic_id: string;
      node_id: string;
      node_title: string;
      node_description: string;
    }) => {
      setState((prev) => ({ ...prev, sending: true, error: null }));

      try {
        const response = await learningService.createNodeAutoPrompt(nodeData);

        if (response.error) {
          setState((prev) => ({
            ...prev,
            sending: false,
            error: response.error || "Lỗi khi tạo auto prompt",
          }));
          return { error: response.error, skipped: false };
        }

        // If auto-prompt was skipped (already has chat), don't add to messages
        if (response.skipped) {
          setState((prev) => ({
            ...prev,
            sending: false,
            error: null,
          }));
          return { skipped: true, hasExistingChat: response.hasExistingChat };
        }

        const autoPrompt = response.data;
        if (autoPrompt) {
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, autoPrompt],
            sending: false,
            error: null,
          }));
        }

        return { data: autoPrompt, skipped: false };
      } catch (error) {
        setState((prev) => ({
          ...prev,
          sending: false,
          error: "Lỗi kết nối khi tạo auto prompt",
        }));
        return { error: "Lỗi kết nối", skipped: false };
      }
    },
    []
  );

  // Clear messages
  const clearMessages = useCallback(async () => {
    if (!topicId) return false;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      let response;

      if (chatMode === "node" && nodeId) {
        response = await learningService.deleteNodeChats(nodeId);
      } else if (chatMode === "topic") {
        response = await learningService.deleteTopicChats(topicId);
      } else {
        setState((prev) => ({ ...prev, loading: false }));
        return false;
      }

      if (response.error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: response.error || "Lỗi khi xóa messages",
        }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        messages: [],
        loading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Lỗi kết nối khi xóa messages",
      }));
      return false;
    }
  }, [topicId, nodeId, chatMode]);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Load messages when parameters change
  useEffect(() => {
    if (topicId && chatMode) {
      fetchMessages();
    } else {
      // Reset state when no valid parameters
      setState((prev) => ({
        ...prev,
        messages: [],
        currentChatMode: null,
        currentTopicId: null,
        currentNodeId: null,
      }));
    }
  }, [fetchMessages, topicId, nodeId, chatMode]);

  return {
    // State
    messages: state.messages,
    loading: state.loading,
    sending: state.sending,
    error: state.error,
    currentChatMode: state.currentChatMode,
    currentTopicId: state.currentTopicId,
    currentNodeId: state.currentNodeId,

    // Actions
    sendMessage,
    createTopicAutoPrompt,
    createNodeAutoPrompt,
    fetchMessages,
    clearMessages,
    clearError,

    // Computed
    hasMessages: state.messages.length > 0,
    messagesCount: state.messages.length,
    isTopicChat: chatMode === "topic",
    isNodeChat: chatMode === "node",
  };
}
