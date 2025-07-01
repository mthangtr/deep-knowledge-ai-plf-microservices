import { useState, useCallback } from "react";
import { TreeNode, TreeData } from "@/types/database";
import { learningService } from "@/lib/services/learning";
import { API_ENDPOINTS, getAuthHeaders } from "@/lib/config";

interface GenerationState {
  isLoading: boolean;
  isGenerating: boolean;
  isImporting: boolean;
  error: string | null;
  success: boolean;
  result: any | null;
  generatedTree: TreeData | null;
}

interface GenerationResult {
  success: boolean;
  message: string;
  data: {
    topic: any;
    nodes: TreeNode[];
    treeData: TreeData;
  };
}

interface APIGenerateResponse {
  message: string;
  prompt: string;
  useAI: boolean;
  aiGeneration: {
    success: boolean;
    message: string;
  };
  importResult: any;
  treeData: TreeData;
}

export function useLearningGeneration() {
  const [state, setState] = useState<GenerationState>({
    isLoading: false,
    isGenerating: false,
    isImporting: false,
    error: null,
    success: false,
    result: null,
    generatedTree: null,
  });

  // Helper để lấy auth headers (copy từ learning service)
  const getHeaders = useCallback(async () => {
    // Get JWT token from sessionStorage, fallback to cookie
    let token = sessionStorage.getItem("jwt_token");

    // Fallback to cookie if sessionStorage is not available
    if (!token && typeof document !== "undefined") {
      const cookies = document.cookie.split(";");
      const jwtCookie = cookies.find((cookie) =>
        cookie.trim().startsWith("jwt_token=")
      );
      token = jwtCookie ? jwtCookie.split("=")[1] : null;
    }

    return getAuthHeaders(token || undefined);
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isGenerating: false,
      isImporting: false,
      error: null,
      success: false,
      result: null,
      generatedTree: null,
    });
  }, []);

  // Generate learning tree từ prompt và tự động tạo topic + nodes
  // useAI = true: Gọi FlowiseAI thật (tốn credit nhưng thông minh)
  // useAI = false: Dùng sample tree cố định (miễn phí, cho testing)
  const generateLearningTree = useCallback(
    async (prompt: string, useAI: boolean = true) => {
      try {
        reset();

        setState((prev) => ({
          ...prev,
          isLoading: true,
          isGenerating: true,
          error: null,
        }));

        // Lấy auth headers
        const headers = await getHeaders();

        // Gọi API generate thật qua API Gateway
        const response = await fetch(API_ENDPOINTS.generate.tree, {
          method: "POST",
          headers,
          body: JSON.stringify({
            prompt: prompt,
            useAI: useAI,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();

          // Hiển thị error chi tiết hơn
          const errorMessage =
            errorData.error ||
            `HTTP ${response.status}: ${response.statusText}`;
          const details = errorData.details ? ` - ${errorData.details}` : "";
          const suggestion = errorData.suggestion
            ? ` (${errorData.suggestion})`
            : "";

          throw new Error(`${errorMessage}${details}${suggestion}`);
        }

        const apiResult: APIGenerateResponse = await response.json();

        setState((prev) => ({
          ...prev,
          isGenerating: false,
          isImporting: false, // API đã handle import luôn
          isLoading: false,
          success: true,
          result: {
            success: true,
            message: apiResult.message,
            data: {
              topic: apiResult.importResult?.topic || null, // Lấy topic từ importResult
              nodes: apiResult.importResult?.nodes || [], // Lấy nodes từ importResult
              treeData: apiResult.treeData,
            },
            importResult: apiResult.importResult,
            treeData: apiResult.treeData,
            prompt: apiResult.prompt,
            useAI: apiResult.useAI,
            aiGeneration: apiResult.aiGeneration,
          },
          generatedTree: apiResult.treeData,
        }));

        return {
          success: true,
          message: apiResult.message,
          data: {
            topic: apiResult.importResult?.topic || null,
            nodes: apiResult.importResult?.nodes || [],
            treeData: apiResult.treeData,
          },
          treeData: apiResult.treeData, // Thêm field này để tương thích với component
        } as GenerationResult & { treeData: TreeData };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Lỗi không xác định";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isGenerating: false,
          isImporting: false,
          error: errorMessage,
          success: false,
        }));

        console.error("Lỗi generate learning tree:", error);
        throw error;
      }
    },
    [reset, getHeaders]
  );

  // Generate sample tree (for testing) - shortcut cho useAI=false
  // Luôn tạo ra cùng 1 structure: "Tổng quan → Setup → Concepts → Practice"
  // Miễn phí, không cần FlowiseAI credit
  const generateSampleTree = useCallback(
    async (prompt: string) => {
      return generateLearningTree(prompt, false);
    },
    [generateLearningTree]
  );

  // Import tree data directly (nếu đã có tree data)
  const importTreeData = useCallback(
    async (treeData: {
      title: string;
      description: string;
      prompt?: string;
      tree: TreeNode[];
    }) => {
      try {
        setState((prev) => ({
          ...prev,
          isLoading: true,
          isImporting: true,
          error: null,
        }));

        const response = await learningService.createTopicWithTree(treeData);

        if (response.error) {
          throw new Error(response.error);
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isImporting: false,
          success: true,
          result: response.data,
        }));

        return response.data;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Lỗi không xác định";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isImporting: false,
          error: errorMessage,
          success: false,
        }));

        throw error;
      }
    },
    []
  );

  return {
    // State
    ...state,

    // Actions
    generateLearningTree,
    generateSampleTree,
    importTreeData,
    reset,

    // Computed
    canGenerate: !state.isLoading,
    statusText: state.isGenerating
      ? "Đang tạo learning tree với AI..."
      : state.isImporting
      ? "Đang lưu vào database..."
      : state.isLoading
      ? "Đang xử lý..."
      : null,

    // Helper để biết đang dùng AI hay sample
    isUsingAI: (useAI: boolean) => useAI,
    getGenerationMode: (useAI: boolean) =>
      useAI ? "FlowiseAI (thật)" : "Sample Tree (testing)",
  };
}
