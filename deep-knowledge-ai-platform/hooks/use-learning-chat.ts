import { useState, useEffect, useCallback, useMemo } from "react";
import { learningService } from "@/lib/services/learning";
import { LearningChat } from "@/types/database";
import { useAIChat } from "./use-ai-chat";

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

  // Integrate with new AI chat system
  const aiChat = useAIChat();

  // Determine chat mode and memoize it to prevent unnecessary re-renders
  const chatMode = useMemo(
    () => (nodeId ? "node" : topicId ? "topic" : null),
    [topicId, nodeId]
  );

  // Fetch messages when topic/node changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!topicId || !chatMode) {
        setState((prev) => ({
          ...prev,
          messages: [],
          currentChatMode: null,
          currentTopicId: null,
          currentNodeId: null,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        currentChatMode: chatMode,
        currentTopicId: topicId,
        currentNodeId: nodeId || null,
      }));

      try {
        const response = await learningService.getLearningChats(
          topicId,
          nodeId
        );

        if (response.error) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: response.error || "Lỗi khi tải tin nhắn",
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          messages: response.data || [],
          loading: false,
          error: null,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Lỗi kết nối khi tải tin nhắn",
        }));
      }
    };

    fetchMessages();
  }, [topicId, nodeId, chatMode]);

  // Send message using new AI chat system
  const sendMessage = useCallback(
    async (params: { message: string }) => {
      console.log(
        ">>> [use-learning-chat] sendMessage triggered at",
        new Date().toISOString()
      );

      if (!topicId || !params.message.trim()) return;

      // Create optimistic user message immediately
      const optimisticUserMessage: LearningChat = {
        id: `temp-user-${Date.now()}`, // Temporary ID
        topic_id: topicId,
        node_id: nodeId,
        user_id: "current", // Will be replaced by real user_id from backend
        message: params.message.trim(),
        is_ai_response: false,
        message_type: "normal",
        created_at: new Date().toISOString(),
      };

      // Add user message to state immediately (optimistic update)
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, optimisticUserMessage],
        sending: true,
        error: null,
      }));

      try {
        // Call AI service
        const response = await aiChat.sendMessage(
          params.message,
          topicId,
          nodeId
        );

        if (response.success && response.data) {
          // Destructure to help TypeScript understand data is not undefined
          const { user_message, ai_message } = response.data;

          // Replace optimistic message with real user message and add AI response
          setState((prev) => ({
            ...prev,
            messages: [
              ...prev.messages.filter(
                (msg) => msg.id !== optimisticUserMessage.id
              ), // Remove optimistic
              user_message, // Real user message from backend
              ai_message, // AI response
            ],
            sending: false,
            error: null,
          }));

          return { success: true, data: response.data };
        } else {
          // Remove optimistic message on error
          setState((prev) => ({
            ...prev,
            messages: prev.messages.filter(
              (msg) => msg.id !== optimisticUserMessage.id
            ),
            sending: false,
            error: "Lỗi kết nối khi gửi tin nhắn",
          }));
          return { error: "Lỗi kết nối" };
        }
      } catch (error) {
        // Remove optimistic message on error
        setState((prev) => ({
          ...prev,
          messages: prev.messages.filter(
            (msg) => msg.id !== optimisticUserMessage.id
          ),
          sending: false,
          error: "Lỗi kết nối khi gửi tin nhắn",
        }));
        return { error: "Lỗi kết nối" };
      }
    },
    [topicId, nodeId, aiChat.sendMessage]
  );

  // Create auto AI prompt for topic (when first opened)
  const createTopicAutoPrompt = useCallback(
    async (
      topicData: {
        topic_id: string;
        topic_title: string;
        topic_description: string;
      },
      hasExistingChat: boolean
    ) => {
      // Check is now done via argument, making the hook stable
      if (hasExistingChat) {
        return { skipped: true, hasExistingChat: true };
      }

      setState((prev) => ({ ...prev, sending: true, error: null }));

      try {
        const response = await aiChat.sendMessage(
          "Chào bạn, tôi muốn học về chủ đề này. Bạn có thể giới thiệu và hướng dẫn tôi không?",
          topicData.topic_id
        );

        if (response.success && response.data) {
          const { user_message, ai_message } = response.data;
          setState((prev) => ({
            ...prev,
            messages: [user_message, ai_message],
            sending: false,
            error: null,
          }));
          return { data: ai_message, skipped: false };
        } else {
          setState((prev) => ({
            ...prev,
            sending: false,
            error: response.error || "Lỗi khi tạo auto prompt",
          }));
          return { error: response.error, skipped: false };
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          sending: false,
          error: "Lỗi kết nối khi tạo auto prompt",
        }));
        return { error: "Lỗi kết nối", skipped: false };
      }
    },
    [aiChat.sendMessage] // Now this is stable
  );

  // Create auto AI prompt for node using prompt_sample
  const createNodeAutoPrompt = useCallback(
    async (nodeData: {
      topic_id: string;
      node_id: string;
      node_title: string;
      node_description: string;
      prompt_sample?: string;
    }) => {
      setState((prev) => ({ ...prev, sending: true, error: null }));

      try {
        // Use prompt_sample if available, otherwise create default
        const messageToSend =
          nodeData.prompt_sample ||
          `Hãy giải thích cho tôi về "${nodeData.node_title}". ${nodeData.node_description}`;

        const response = await aiChat.sendMessage(
          messageToSend,
          nodeData.topic_id,
          nodeData.node_id
        );

        console.log(
          ">>> [use-learning-chat] createNodeAutoPrompt response",
          response
        );

        if (response.success && response.data) {
          // Destructure to help TypeScript understand data is not undefined
          const { user_message, ai_message } = response.data;

          setState((prev) => ({
            ...prev,
            messages: [user_message, ai_message],
            sending: false,
            error: null,
          }));

          return { data: ai_message, skipped: false };
        } else {
          setState((prev) => ({
            ...prev,
            sending: false,
            error: response.error || "Lỗi khi tạo node prompt",
          }));
          return { error: response.error, skipped: false };
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          sending: false,
          error: "Lỗi kết nối khi tạo node prompt",
        }));
        return { error: "Lỗi kết nối", skipped: false };
      }
    },
    [aiChat.sendMessage]
  );

  // Clear messages
  const clearMessages = useCallback(async () => {
    if (!topicId) return;

    try {
      const response = await learningService.deleteLearningChats(
        topicId,
        nodeId
      );

      if (response.error) {
        setState((prev) => ({
          ...prev,
          error: response.error || "Lỗi khi xóa tin nhắn",
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        messages: [],
        error: null,
      }));

      // Reset AI chat session
      aiChat.resetSession();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Lỗi kết nối khi xóa tin nhắn",
      }));
    }
  }, [topicId, nodeId, aiChat.resetSession]);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    messages: state.messages,
    loading: state.loading || aiChat.isLoading,
    sending: state.sending,
    error: state.error || aiChat.error,
    currentChatMode: state.currentChatMode,
    currentTopicId: state.currentTopicId,
    currentNodeId: state.currentNodeId,

    // AI Chat info
    sessionId: aiChat.sessionId,

    // Actions
    sendMessage,
    createTopicAutoPrompt,
    createNodeAutoPrompt,
    clearMessages,
    clearError,

    // Computed
    hasMessages: state.messages.length > 0,
    messagesCount: state.messages.length,
    isTopicChat: chatMode === "topic",
    isNodeChat: chatMode === "node",

    // Stable alternative
    createTopicAutoPromptStable: createTopicAutoPrompt,
  };
}
