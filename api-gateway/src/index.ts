import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Service URLs
const BACKEND_MAIN_URL =
  process.env.BACKEND_MAIN_URL || "http://localhost:3001";
const BACKEND_AI_CHAT_URL =
  process.env.BACKEND_AI_CHAT_URL || "http://localhost:3002";

// Proxy configuration
const proxyOptions = {
  changeOrigin: true,
  logLevel: "debug" as const,
  onError: (err: Error, req: express.Request, res: express.Response) => {
    console.error("Proxy error:", err);
    res.status(502).json({ error: "Bad Gateway", message: err.message });
  },
};

// Route to Backend AI Chat Service (specific routes)
app.use(
  "/api/learning/chat/context",
  createProxyMiddleware({
    target: BACKEND_AI_CHAT_URL,
    ...proxyOptions,
    pathRewrite: {
      "^/api/learning/chat/context": "/api/chat/context",
    },
  })
);

app.use(
  "/api/learning/chat/langchain",
  createProxyMiddleware({
    target: BACKEND_AI_CHAT_URL,
    ...proxyOptions,
    pathRewrite: {
      "^/api/learning/chat/langchain": "/api/chat/langchain",
    },
  })
);

// Route to Backend Main Service (all learning routes including notes and basic chat)
app.use(
  "/api/learning",
  createProxyMiddleware({
    target: BACKEND_MAIN_URL,
    ...proxyOptions,
  })
);

// Route all other API requests to Backend Main Service
app.use(
  "/api",
  createProxyMiddleware({
    target: BACKEND_MAIN_URL,
    ...proxyOptions,
  })
);

// Error handling
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Gateway error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
);

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📡 Routing to:`);
  console.log(`   - Backend Main: ${BACKEND_MAIN_URL}`);
  console.log(`   - Backend AI Chat: ${BACKEND_AI_CHAT_URL}`);
});
