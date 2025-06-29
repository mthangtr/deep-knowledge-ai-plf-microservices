import { useState, useEffect, useCallback } from "react";
import { learningService } from "@/lib/services/learning";
import { TreeNode } from "@/types/database";

interface UseLearningNodesState {
  nodes: TreeNode[];
  loading: boolean;
  error: string | null;
  selectedNode: TreeNode | null;
}

export function useLearningNodes(topicId?: string) {
  const [state, setState] = useState<UseLearningNodesState>({
    nodes: [],
    loading: false,
    error: null,
    selectedNode: null,
  });

  // Fetch all nodes for a topic
  const fetchNodes = useCallback(
    async (targetTopicId?: string) => {
      const currentTopicId = targetTopicId || topicId;
      if (!currentTopicId) return;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await learningService.getTopicNodes(currentTopicId);

        if (response.error) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: response.error || "Lỗi khi tải danh sách nodes",
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          nodes: response.data || [],
          loading: false,
          error: null,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Lỗi kết nối khi tải nodes",
        }));
      }
    },
    [topicId]
  );

  // Create new node
  const createNode = useCallback(
    async (
      targetTopicId: string,
      nodeData: {
        title: string;
        description: string;
        level?: number;
        requires?: string[];
        next?: string[];
        position_x?: number;
        position_y?: number;
      }
    ) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await learningService.createNode(
          targetTopicId,
          nodeData
        );

        if (response.error) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: response.error || "Lỗi khi tạo node",
          }));
          return null;
        }

        const newNode = response.data;
        if (newNode) {
          setState((prev) => ({
            ...prev,
            nodes: [...prev.nodes, newNode],
            loading: false,
            error: null,
          }));
        }

        return newNode;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Lỗi kết nối khi tạo node",
        }));
        return null;
      }
    },
    []
  );

  // Create multiple nodes (batch)
  const createNodesBatch = useCallback(
    async (
      targetTopicId: string,
      nodesData: {
        title: string;
        description: string;
        level?: number;
        requires?: string[];
        next?: string[];
        position_x?: number;
        position_y?: number;
      }[]
    ) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await learningService.createNodesBatch(
          targetTopicId,
          nodesData
        );

        if (response.error) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: response.error || "Lỗi khi tạo nodes",
          }));
          return null;
        }

        const newNodes = response.data;
        if (newNodes && newNodes.length > 0) {
          setState((prev) => ({
            ...prev,
            nodes: [...prev.nodes, ...newNodes],
            loading: false,
            error: null,
          }));
        }

        return newNodes;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Lỗi kết nối khi tạo nodes",
        }));
        return null;
      }
    },
    []
  );

  // Select node
  const selectNode = useCallback((node: TreeNode | null) => {
    setState((prev) => ({ ...prev, selectedNode: node }));
  }, []);

  // Find node by id
  const findNodeById = useCallback(
    (nodeId: string) => {
      return state.nodes.find((node) => node.id === nodeId) || null;
    },
    [state.nodes]
  );

  // Get nodes by level
  const getNodesByLevel = useCallback(
    (level: number) => {
      return state.nodes.filter((node) => node.level === level);
    },
    [state.nodes]
  );

  // Get root nodes (level 0)
  const getRootNodes = useCallback(() => {
    return getNodesByLevel(0);
  }, [getNodesByLevel]);

  // Get child nodes of a node
  const getChildNodes = useCallback(
    (nodeId: string) => {
      return state.nodes.filter((node) => node.requires.includes(nodeId));
    },
    [state.nodes]
  );

  // Get prerequisite nodes of a node
  const getPrerequisiteNodes = useCallback(
    (nodeId: string) => {
      const targetNode = findNodeById(nodeId);
      if (!targetNode) return [];

      return targetNode.requires
        .map((reqId) => findNodeById(reqId))
        .filter((node): node is TreeNode => node !== null);
    },
    [findNodeById]
  );

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Auto fetch nodes when topicId changes
  useEffect(() => {
    if (topicId) {
      fetchNodes(topicId);
    } else {
      setState((prev) => ({ ...prev, nodes: [], selectedNode: null }));
    }
  }, [topicId, fetchNodes]);

  return {
    // State
    nodes: state.nodes,
    loading: state.loading,
    error: state.error,
    selectedNode: state.selectedNode,

    // Actions
    fetchNodes,
    createNode,
    createNodesBatch,
    selectNode,
    clearError,

    // Utilities
    findNodeById,
    getNodesByLevel,
    getRootNodes,
    getChildNodes,
    getPrerequisiteNodes,

    // Computed
    hasNodes: state.nodes.length > 0,
    nodesCount: state.nodes.length,
    maxLevel: Math.max(0, ...state.nodes.map((node) => node.level)),
  };
}
