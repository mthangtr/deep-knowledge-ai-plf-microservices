import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

// Simple debug logger
class DebugLogger {
  private logDir: string;

  constructor() {
    this.logDir = path.join(process.cwd(), "debug-logs");
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(data: any) {
    const timestamp = new Date().toISOString();
    const filename = `debug-${timestamp.split("T")[0]}.log`;
    const filepath = path.join(this.logDir, filename);

    const logEntry = {
      timestamp,
      ...data,
    };

    fs.appendFileSync(filepath, JSON.stringify(logEntry, null, 2) + "\n\n");
  }

  getLatestLog() {
    try {
      const files = fs
        .readdirSync(this.logDir)
        .filter((f) => f.endsWith(".log"))
        .sort((a, b) => b.localeCompare(a));

      if (files.length === 0) return null;

      const latestFile = path.join(this.logDir, files[0]);
      const content = fs.readFileSync(latestFile, "utf-8");
      const lines = content.trim().split("\n\n");

      if (lines.length === 0) return null;

      // Get last log entry
      try {
        return JSON.parse(lines[lines.length - 1]);
      } catch (e) {
        return { error: "Failed to parse log entry" };
      }
    } catch (error) {
      return { error: "Failed to read logs" };
    }
  }

  cleanupOldLogs() {
    const files = fs
      .readdirSync(this.logDir)
      .filter((f) => f.endsWith(".log"))
      .sort((a, b) => a.localeCompare(b));

    // Keep only last 10 files
    if (files.length > 10) {
      const filesToDelete = files.slice(0, files.length - 10);
      filesToDelete.forEach((file) => {
        fs.unlinkSync(path.join(this.logDir, file));
      });
    }
  }
}

const debugLogger = new DebugLogger();

// GET /api/debug/flowiseai - Xem log gần nhất
router.get("/flowiseai", (req, res) => {
  try {
    const latestLog = debugLogger.getLatestLog();

    if (!latestLog) {
      return res.json({
        message: "Chưa có debug log nào",
        logs: null,
      });
    }

    return res.json({
      message: "Debug log gần nhất",
      logs: latestLog,
      tips: {
        checkResponse: "Kiểm tra field 'response' để xem FlowiseAI trả về gì",
        checkParseResult:
          "Kiểm tra field 'parseResult' để xem parse có thành công không",
        checkError: "Kiểm tra field 'error' để xem lỗi gì",
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: "Lỗi khi đọc debug log",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// DELETE /api/debug/flowiseai - Cleanup old logs
router.delete("/flowiseai", (req, res) => {
  try {
    debugLogger.cleanupOldLogs();

    return res.json({
      message: "Đã cleanup debug logs cũ (giữ lại 10 file gần nhất)",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Lỗi khi cleanup logs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Export for use in other modules
export { debugLogger };
export default router;
