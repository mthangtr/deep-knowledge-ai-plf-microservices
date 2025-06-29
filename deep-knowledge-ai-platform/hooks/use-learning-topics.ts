import { useState, useEffect, useCallback } from "react";
import { learningService } from "@/lib/services/learning";
import { LearningTopic } from "@/types/database";

interface UseLearningTopicsState {
  topics: LearningTopic[];
  loading: boolean;
  error: string | null;
  selectedTopic: LearningTopic | null;
}

export function useLearningTopics() {
  const [state, setState] = useState<UseLearningTopicsState>({
    topics: [],
    loading: false,
    error: null,
    selectedTopic: null,
  });

  // Fetch all topics
  const fetchTopics = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      console.log("🔍 [TOPICS HOOK] Starting fetchTopics...");
      const response = await learningService.getTopics();

      console.log("🔍 [TOPICS HOOK] Response:", {
        hasError: !!response.error,
        error: response.error,
        hasData: !!response.data,
        dataLength: response.data?.length,
        fullResponse: response,
      });

      if (response.error) {
        console.error("❌ [TOPICS HOOK] Error from service:", response.error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: response.error || "Lỗi khi tải danh sách topics",
        }));
        return;
      }

      console.log("✅ [TOPICS HOOK] Setting topics data:", response.data);
      setState((prev) => ({
        ...prev,
        topics: response.data || [],
        loading: false,
        error: null,
      }));
    } catch (error) {
      console.error("❌ [TOPICS HOOK] Fetch error:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Lỗi kết nối khi tải topics",
      }));
    }
  }, []);

  // Fetch single topic
  const fetchTopic = useCallback(async (id: string) => {
    try {
      const response = await learningService.getTopic(id);

      if (response.error) {
        console.error("Lỗi khi tải topic:", response.error);
        return null;
      }

      return response.data;
    } catch (error) {
      console.error("Lỗi kết nối khi tải topic:", error);
      return null;
    }
  }, []);

  // Create new topic
  const createTopic = useCallback(
    async (topicData: {
      title: string;
      description: string;
      prompt?: string;
    }) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await learningService.createTopic(topicData);

        if (response.error) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: response.error || "Lỗi khi tạo topic",
          }));
          return null;
        }

        const newTopic = response.data;
        if (newTopic) {
          setState((prev) => ({
            ...prev,
            topics: [newTopic, ...prev.topics],
            loading: false,
            error: null,
          }));
        }

        return newTopic;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Lỗi kết nối khi tạo topic",
        }));
        return null;
      }
    },
    []
  );

  // Update topic
  const updateTopic = useCallback(
    async (id: string, updates: Partial<LearningTopic>) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await learningService.updateTopic(id, updates);

        if (response.error) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: response.error || "Lỗi khi cập nhật topic",
          }));
          return null;
        }

        const updatedTopic = response.data;
        if (updatedTopic) {
          setState((prev) => ({
            ...prev,
            topics: prev.topics.map((topic) =>
              topic.id === id ? updatedTopic : topic
            ),
            selectedTopic:
              prev.selectedTopic?.id === id ? updatedTopic : prev.selectedTopic,
            loading: false,
            error: null,
          }));
        }

        return updatedTopic;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Lỗi kết nối khi cập nhật topic",
        }));
        return null;
      }
    },
    []
  );

  // Delete topic
  const deleteTopic = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await learningService.deleteTopic(id);

      if (response.error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: response.error || "Lỗi khi xóa topic",
        }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        topics: prev.topics.filter((topic) => topic.id !== id),
        selectedTopic:
          prev.selectedTopic?.id === id ? null : prev.selectedTopic,
        loading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Lỗi kết nối khi xóa topic",
      }));
      return false;
    }
  }, []);

  // Select topic
  const selectTopic = useCallback((topic: LearningTopic | null) => {
    setState((prev) => ({ ...prev, selectedTopic: topic }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Initial load
  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return {
    // State
    topics: state.topics,
    loading: state.loading,
    error: state.error,
    selectedTopic: state.selectedTopic,

    // Actions
    fetchTopics,
    fetchTopic,
    createTopic,
    updateTopic,
    deleteTopic,
    selectTopic,
    clearError,

    // Computed
    hasTopics: state.topics.length > 0,
    topicsCount: state.topics.length,
  };
}
