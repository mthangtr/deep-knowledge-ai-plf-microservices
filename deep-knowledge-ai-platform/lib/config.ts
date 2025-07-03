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
    base: `${API_GATEWAY_URL}/api/learning/chat`,
    session: () => `${API_ENDPOINTS.chat.base}/session`,
    messages: (sessionId: string) =>
      `${API_ENDPOINTS.chat.base}/sessions/${sessionId}/messages`,
    stream: (sessionId: string) =>
      `${API_ENDPOINTS.chat.base}/sessions/${sessionId}/stream`,
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
