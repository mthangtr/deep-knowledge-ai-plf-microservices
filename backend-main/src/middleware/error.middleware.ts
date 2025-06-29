import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", err);

  if (err.status) {
    return res.status(err.status).json({
      error: err.message || "Error occurred",
      details: err.details,
    });
  }

  // Supabase errors
  if (err.code === "PGRST116") {
    return res.status(404).json({
      error: "Not found",
      message: "Không tìm thấy dữ liệu",
    });
  }

  if (err.code === "23505") {
    return res.status(409).json({
      error: "Duplicate entry",
      message: "Dữ liệu đã tồn tại",
    });
  }

  // Default error
  return res.status(500).json({
    error: "Internal Server Error",
    message: "Lỗi server nội bộ",
  });
};
