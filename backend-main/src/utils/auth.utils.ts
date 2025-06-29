import { Request } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase";
import { JWT_SECRET } from "../config/jwt";
import { User } from "../types";

export const verifyToken = (token: string): User | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      image: decoded.image,
    };
  } catch (error) {
    console.error("❌ JWT verification failed:", (error as Error).message);
    return null;
  }
};

export const getAuthenticatedUser = async (
  req: Request
): Promise<User | null> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  return verifyToken(token);
};

export const validateTopicOwnership = async (
  topicId: string,
  userId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from("learning_topics")
    .select("user_id")
    .eq("id", topicId)
    .eq("user_id", userId)
    .single();

  return !error && data?.user_id === userId;
};
