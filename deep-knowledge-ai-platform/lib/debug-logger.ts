import fs from "fs";
import path from "path";

interface DebugLog {
  timestamp: string;
  prompt: string;
  response: any;
  error?: string;
  parseResult?: any;
}

class DebugLogger {
  private debugDir = path.join(process.cwd(), "debug-logs");

  constructor() {
    // Tạo thư mục debug nếu chưa có
    if (!fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
  }

  /**
   * Log FlowiseAI response vào file
   */
  logFlowiseResponse(
    prompt: string,
    response: any,
    error?: string,
    parseResult?: any
  ) {
    try {
      const timestamp = new Date().toISOString();
      const filename = `flowiseai-${Date.now()}.json`;
      const filepath = path.join(this.debugDir, filename);

      const logData: DebugLog = {
        timestamp,
        prompt,
        response,
        error,
        parseResult,
      };

      // Ghi vào file
      fs.writeFileSync(filepath, JSON.stringify(logData, null, 2), "utf-8");

      console.log(`🐛 Debug log saved: ${filename}`);
      console.log(`📁 Full path: ${filepath}`);

      return filepath;
    } catch (err) {
      console.error("Lỗi khi ghi debug log:", err);
      return null;
    }
  }

  /**
   * Đọc log file gần nhất
   */
  getLatestLog(): DebugLog | null {
    try {
      const files = fs
        .readdirSync(this.debugDir)
        .filter((f) => f.startsWith("flowiseai-") && f.endsWith(".json"))
        .sort()
        .reverse();

      if (files.length === 0) return null;

      const latestFile = path.join(this.debugDir, files[0]);
      const content = fs.readFileSync(latestFile, "utf-8");
      return JSON.parse(content);
    } catch (err) {
      console.error("Lỗi khi đọc debug log:", err);
      return null;
    }
  }

  /**
   * Xóa các log cũ (giữ lại 10 file gần nhất)
   */
  cleanupOldLogs() {
    try {
      const files = fs
        .readdirSync(this.debugDir)
        .filter((f) => f.startsWith("flowiseai-") && f.endsWith(".json"))
        .sort()
        .reverse();

      // Giữ lại 10 file gần nhất, xóa phần còn lại
      const filesToDelete = files.slice(10);

      filesToDelete.forEach((file) => {
        const filepath = path.join(this.debugDir, file);
        fs.unlinkSync(filepath);
        console.log(`🗑️ Deleted old log: ${file}`);
      });
    } catch (err) {
      console.error("Lỗi khi cleanup logs:", err);
    }
  }
}

// Export singleton
export const debugLogger = new DebugLogger();
