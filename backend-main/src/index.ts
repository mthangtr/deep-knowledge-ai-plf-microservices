import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth.routes";
import topicRoutes from "./routes/topic.routes";
import noteRoutes from "./routes/note.routes";
import chatRoutes from "./routes/chat.routes";
import treeRoutes from "./routes/tree.routes";
import generateRoutes from "./routes/generate.routes";
import debugRoutes from "./routes/debug.routes";

// Import middleware
import { errorHandler } from "./middleware/error.middleware";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:8080",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "backend-main",
    timestamp: new Date().toISOString(),
  });
});

// Routes - Order matters! Specific routes first
app.use("/api/auth", authRoutes);
app.use("/api/learning/notes", noteRoutes);
app.use("/api/learning/chat", chatRoutes);
app.use("/api/learning/tree", treeRoutes);
app.use("/api/learning/generate", generateRoutes);
app.use("/api/learning", topicRoutes); // General topics route last
app.use("/api/debug", debugRoutes);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Backend Main Service running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
});
