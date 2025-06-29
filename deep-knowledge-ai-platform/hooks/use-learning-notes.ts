import { useState, useEffect, useCallback } from "react";
import { learningService } from "@/lib/services/learning";
import { LearningNote } from "@/types/database";

interface UseLearningNotesState {
  notes: LearningNote[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  currentNotesMode: "topic" | "node" | null;
  currentTopicId: string | null;
  currentNodeId: string | null;
}

export function useLearningNotes(topicId?: string, nodeId?: string) {
  const [state, setState] = useState<UseLearningNotesState>({
    notes: [],
    loading: false,
    saving: false,
    error: null,
    currentNotesMode: null,
    currentTopicId: null,
    currentNodeId: null,
  });

  // Determine notes mode based on parameters
  const notesMode = nodeId ? "node" : topicId ? "topic" : null;

  // Fetch notes based on current mode
  const fetchNotes = useCallback(async () => {
    if (!topicId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Use new unified API method
      const response = await learningService.getNotes(topicId, nodeId);

      if (response.error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: response.error || "Lỗi khi tải notes",
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        notes: response.data || [],
        loading: false,
        error: null,
        currentNotesMode: notesMode,
        currentTopicId: topicId,
        currentNodeId: nodeId || null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Lỗi kết nối khi tải notes",
      }));
    }
  }, [topicId, nodeId, notesMode]);

  // Create note
  const createNote = useCallback(
    async (noteData: {
      content: string;
      note_type?: "manual" | "extracted_from_chat" | "ai_summary";
      source_chat_id?: string;
    }) => {
      if (!topicId) return null;

      setState((prev) => ({ ...prev, saving: true, error: null }));

      try {
        const response = await learningService.createNote({
          topic_id: topicId,
          node_id: notesMode === "node" ? nodeId : undefined,
          content: noteData.content,
          note_type: noteData.note_type || "manual",
          source_chat_id: noteData.source_chat_id,
        });

        if (response.error) {
          setState((prev) => ({
            ...prev,
            saving: false,
            error: response.error || "Lỗi khi tạo note",
          }));
          return null;
        }

        const newNote = response.data;
        if (newNote) {
          setState((prev) => ({
            ...prev,
            notes: [...prev.notes, newNote],
            saving: false,
            error: null,
          }));
        }

        return newNote;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          saving: false,
          error: "Lỗi kết nối khi tạo note",
        }));
        return null;
      }
    },
    [topicId, nodeId, notesMode]
  );

  // Update note
  const updateNote = useCallback(async (id: string, content: string) => {
    setState((prev) => ({ ...prev, saving: true, error: null }));

    try {
      const response = await learningService.updateNote(id, content);

      if (response.error) {
        setState((prev) => ({
          ...prev,
          saving: false,
          error: response.error || "Lỗi khi cập nhật note",
        }));
        return null;
      }

      const updatedNote = response.data;
      if (updatedNote) {
        setState((prev) => ({
          ...prev,
          notes: prev.notes.map((note) =>
            note.id === id ? updatedNote : note
          ),
          saving: false,
          error: null,
        }));
      }

      return updatedNote;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        saving: false,
        error: "Lỗi kết nối khi cập nhật note",
      }));
      return null;
    }
  }, []);

  // Delete note
  const deleteNote = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, saving: true, error: null }));

    try {
      const response = await learningService.deleteNote(id);

      if (response.error) {
        setState((prev) => ({
          ...prev,
          saving: false,
          error: response.error || "Lỗi khi xóa note",
        }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        notes: prev.notes.filter((note) => note.id !== id),
        saving: false,
        error: null,
      }));

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        saving: false,
        error: "Lỗi kết nối khi xóa note",
      }));
      return false;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Load notes when parameters change
  useEffect(() => {
    if (topicId && notesMode) {
      fetchNotes();
    } else {
      // Reset state when no valid parameters
      setState((prev) => ({
        ...prev,
        notes: [],
        currentNotesMode: null,
        currentTopicId: null,
        currentNodeId: null,
      }));
    }
  }, [fetchNotes, topicId, notesMode]);

  return {
    // State
    notes: state.notes,
    loading: state.loading,
    saving: state.saving,
    error: state.error,
    currentNotesMode: state.currentNotesMode,
    currentTopicId: state.currentTopicId,
    currentNodeId: state.currentNodeId,

    // Actions
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    clearError,

    // Computed
    hasNotes: state.notes.length > 0,
    notesCount: state.notes.length,
    isTopicNotes: notesMode === "topic",
    isNodeNotes: notesMode === "node",
  };
}
