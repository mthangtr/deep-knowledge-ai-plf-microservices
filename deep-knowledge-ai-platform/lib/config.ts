// API Configuration
const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8080";
const LEARNING_BASE = `${API_GATEWAY_URL}/api/learning`;

export const API_ENDPOINTS = {
  // Auth endpoints
  auth: {
    callback: `${API_GATEWAY_URL}/api/auth/supabase-callback`,
    session: `${API_GATEWAY_URL}/api/auth/session`,
  },

  // Learning endpoints
  learning: {
    topics: LEARNING_BASE,
    topic: (id: string) => `${LEARNING_BASE}/${id}`,
    nodes: (topicId: string) => `${LEARNING_BASE}/${topicId}/nodes`,
    node: (topicId: string, nodeId: string) =>
      `${LEARNING_BASE}/${topicId}/nodes/${nodeId}`,
    nodeBatch: (topicId: string) => `${LEARNING_BASE}/${topicId}/nodes/batch`,
  },

  // Chat endpoints
  chat: {
    base: `${LEARNING_BASE}/chat`,
    session: () => `${LEARNING_BASE}/chat/session`,
    messages: (sessionId: string) =>
      `${LEARNING_BASE}/chat/sessions/${sessionId}/messages`,
    stream: (sessionId: string) =>
      `${LEARNING_BASE}/chat/sessions/${sessionId}/stream`,
    ai: `${LEARNING_BASE}/chat/ai`,
  },

  // Notes endpoints
  notes: {
    list: `${LEARNING_BASE}/notes`,
    detail: (id: string) => `${LEARNING_BASE}/notes/${id}`,
  },

  // Tree endpoints
  tree: {
    import: `${LEARNING_BASE}/tree`,
  },

  // Generate endpoints
  generate: {
    tree: `${LEARNING_BASE}/generate`,
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
