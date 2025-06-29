import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("Error:", error);

  return res.status(500).json({
    error: "Internal server error",
    message: "Đã xảy ra lỗi trên server",
  });
};
