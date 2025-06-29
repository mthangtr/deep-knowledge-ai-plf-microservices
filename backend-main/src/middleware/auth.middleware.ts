import { Request, Response, NextFunction } from "express";
import { getAuthenticatedUser } from "../utils/auth.utils";
import { AuthRequest } from "../types";

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Vui lòng đăng nhập để tiếp tục",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Token không hợp lệ",
    });
  }
};
