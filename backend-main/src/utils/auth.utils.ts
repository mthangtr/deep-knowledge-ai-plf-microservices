import { Request } from "express";
import jwt from "jsonwebtoken";
import { supabase, supabaseAdmin } from "../config/supabase";
import { JWT_SECRET } from "../config/jwt";
import { User } from "../types";

export const verifyToken = (token: string): User | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      image: decoded.image,
    };
  } catch (error: any) {
    console.error("❌ JWT verification failed:", error.message);
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

// Checks if the user owns the topic associated with a given node.
export const validateNodeOwnership = async (
  nodeId: string,
  userId: string
): Promise<boolean> => {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is required for this operation.");
  }

  const { data: node, error } = await supabaseAdmin
    .from("tree_nodes")
    .select("topic_id")
    .eq("id", nodeId)
    .single();

  if (error || !node) {
    return false; // Node does not exist
  }

  // Now, check if the user owns the topic.
  return validateTopicOwnership(node.topic_id, userId);
};

// Ensures a user profile exists for the given user, creating one if it doesn't.
export const getOrCreateUserProfile = async (user: {
  id: string;
  email?: string;
  name?: string;
  image?: string;
}) => {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is required for this operation.");
  }

  // 1. Check if profile already exists
  const { data: existingProfile, error: fetchError } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    // PGRST116 = no rows found
    throw new Error(`Error fetching user profile: ${fetchError.message}`);
  }

  // 2. If profile exists, return it
  if (existingProfile) {
    return existingProfile;
  }

  // 3. If not, create a new profile
  const { data: newProfile, error: createError } = await supabaseAdmin
    .from("user_profiles")
    .insert({
      id: user.id,
      email: user.email,
      full_name: user.name,
      avatar_url: user.image,
    })
    .select("id")
    .single();

  if (createError) {
    throw new Error(`Could not create user profile: ${createError.message}`);
  }

  return newProfile;
};

export const validateSessionOwnership = async (
  sessionId: string,
  userId: string
): Promise<boolean> => {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is required for this operation.");
  }

  const { data, error } = await supabaseAdmin
    .from("chat_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();

  if (error || !data) {
    return false; // Session does not exist
  }

  return data.user_id === userId;
};
