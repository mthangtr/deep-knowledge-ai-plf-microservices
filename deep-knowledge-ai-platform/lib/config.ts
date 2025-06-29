// API Configuration
const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8080";

export const API_ENDPOINTS = {
  // Auth endpoints
  auth: {
    callback: `${API_GATEWAY_URL}/api/auth/supabase-callback`,
    session: `${API_GATEWAY_URL}/api/auth/session`,
  },

  // Learning endpoints
  learning: {
    topics: `${API_GATEWAY_URL}/api/learning`,
    topic: (id: string) => `${API_GATEWAY_URL}/api/learning/${id}`,
    nodes: (topicId: string) =>
      `${API_GATEWAY_URL}/api/learning/${topicId}/nodes`,
    node: (topicId: string, nodeId: string) =>
      `${API_GATEWAY_URL}/api/learning/${topicId}/nodes/${nodeId}`,
    nodeBatch: (topicId: string) =>
      `${API_GATEWAY_URL}/api/learning/${topicId}/nodes/batch`,
  },

  // Chat endpoints
  chat: {
    messages: `${API_GATEWAY_URL}/api/learning/chat`,
    autoPrompt: `${API_GATEWAY_URL}/api/learning/chat/auto-prompt`,
    ai: `${API_GATEWAY_URL}/api/learning/chat/ai`, // New AI chat endpoint
    session: `${API_GATEWAY_URL}/api/learning/chat/session`,
    sessions: `${API_GATEWAY_URL}/api/learning/chat/sessions`,

    // AI Agent Chat endpoints (routed to different service)
    context: `${API_GATEWAY_URL}/api/learning/chat/context`,
    contextMessage: `${API_GATEWAY_URL}/api/learning/chat/context/message`,
    contextSummary: `${API_GATEWAY_URL}/api/learning/chat/context/summary`,

    langchain: `${API_GATEWAY_URL}/api/learning/chat/langchain`,
    langchainSummary: `${API_GATEWAY_URL}/api/learning/chat/langchain/generate-summary`,
    langchainAnalyze: `${API_GATEWAY_URL}/api/learning/chat/langchain/analyze-progress`,
    langchainCustom: `${API_GATEWAY_URL}/api/learning/chat/langchain/custom-prompt`,
    langchainModels: `${API_GATEWAY_URL}/api/learning/chat/langchain/models`,
  },

  // Notes endpoints
  notes: {
    list: `${API_GATEWAY_URL}/api/learning/notes`,
    detail: (id: string) => `${API_GATEWAY_URL}/api/learning/notes/${id}`,
  },

  // Tree endpoints
  tree: {
    import: `${API_GATEWAY_URL}/api/learning/tree`,
  },

  // Generate endpoints
  generate: {
    tree: `${API_GATEWAY_URL}/api/learning/generate`,
  },

  // Debug endpoints
  debug: {
    flowiseai: `${API_GATEWAY_URL}/api/debug/flowiseai`,
  },
};

// Helper function to get auth headers
export const getAuthHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};
