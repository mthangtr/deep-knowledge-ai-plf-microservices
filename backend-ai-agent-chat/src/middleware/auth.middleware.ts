import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt";
import { AuthRequest, User } from "../types";

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Vui lòng đăng nhập để tiếp tục",
      });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        image: decoded.image,
      } as User;
      next();
    } catch (error) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token không hợp lệ",
      });
    }
  } catch (error) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Lỗi xác thực",
    });
  }
};
