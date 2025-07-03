import { useState, useEffect, useCallback } from "react";
import { learningService } from "@/lib/services/learning";
import { LearningNote } from "@/types/database";

interface UseLearningNotesState {
  notes: LearningNote[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  currentNodeId: string | null;
}

export function useLearningNotes(nodeId?: string) {
  const [state, setState] = useState<UseLearningNotesState>({
    notes: [],
    loading: false,
    saving: false,
    error: null,
    currentNodeId: null,
  });

  // Fetch notes based on current node
  const fetchNotes = useCallback(async () => {
    if (!nodeId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await learningService.getNotes(nodeId);

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
        currentNodeId: nodeId,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Lỗi kết nối khi tải notes",
      }));
    }
  }, [nodeId]);

  // Create note
  const createNote = useCallback(
    async (noteData: { content: string }) => {
      if (!nodeId) return null;

      setState((prev) => ({ ...prev, saving: true, error: null }));

      try {
        const response = await learningService.createNote({
          node_id: nodeId,
          content: noteData.content,
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
    [nodeId]
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
    if (nodeId) {
      fetchNotes();
    } else {
      // Reset state when no valid parameters
      setState((prev) => ({
        ...prev,
        notes: [],
        currentNodeId: null,
      }));
    }
  }, [fetchNotes, nodeId]);

  return {
    // State
    notes: state.notes,
    loading: state.loading,
    saving: state.saving,
    error: state.error,
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
  };
}
