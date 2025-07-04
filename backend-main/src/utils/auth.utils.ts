import { Request } from "express";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../config/supabase";
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

  let token: string | null = null;

  // Try Authorization header first
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  // Fallback to cookie
  else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(";");
    const jwtCookie = cookies.find((cookie) =>
      cookie.trim().startsWith("jwt_token=")
    );
    if (jwtCookie) {
      token = jwtCookie.split("=")[1];
    }
  }

  if (!token) {
    return null;
  }

  const user = verifyToken(token);
  return user;
};

export const validateTopicOwnership = async (
  topicId: string,
  userId: string
): Promise<boolean> => {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is required for this operation.");
  }
  const { data, error } = await supabaseAdmin
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

  console.log(
    `[DEBUG] validateNodeOwnership: Looking for node_id: ${nodeId} for user: ${userId}`
  );

  const { data: node, error } = await supabaseAdmin
    .from("tree_nodes")
    .select("topic_id")
    .eq("id", nodeId)
    .single();

  if (error || !node) {
    console.log(
      `[DEBUG] validateNodeOwnership: Node not found. Error:`,
      error?.message
    );
    console.log(
      `[DEBUG] validateNodeOwnership: Checking if ${nodeId} might be a topic_id instead...`
    );

    // Check if the provided ID might actually be a topic_id
    const { data: topic, error: topicError } = await supabaseAdmin
      .from("learning_topics")
      .select("id")
      .eq("id", nodeId)
      .single();

    if (!topicError && topic) {
      console.log(
        `[DEBUG] validateNodeOwnership: FOUND! ${nodeId} is actually a topic_id, not a node_id`
      );
    }

    return false; // Node does not exist
  }

  console.log(
    `[DEBUG] validateNodeOwnership: Found node with topic_id: ${node.topic_id}`
  );

  // Now, check if the user owns the topic.
  return validateTopicOwnership(node.topic_id, userId);
};

// Ensures a user profile exists for the given user, creating one if it doesn't.
// This function handles potential race conditions.
export const getOrCreateUserProfile = async (user: {
  id: string;
  email?: string;
  name?: string;
  image?: string;
}) => {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is required for this operation.");
  }

  // First, try to insert the user.
  // This is more efficient than SELECT-then-INSERT in the common case (new user).
  const { data: newProfile, error: createError } = await supabaseAdmin
    .from("user_profiles")
    .insert({
      id: user.id,
      email: user.email,
      full_name: user.name,
      avatar_url: user.image,
      last_login_at: new Date().toISOString(), // Update last login time
    })
    .select("id")
    .single();

  // If the insert was successful, we're done.
  if (!createError && newProfile) {
    return newProfile;
  }

  // If the error is a duplicate key violation, it means the user already exists.
  // This is the expected "failure" in a race condition.
  if (createError && createError.code === "23505") {
    // 23505 is the code for unique_violation
    // The user exists, so let's fetch their profile.
    const { data: existingProfile, error: fetchError } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (fetchError) {
      // This would be an unexpected error.
      throw new Error(
        `Failed to fetch existing user profile after insert attempt: ${fetchError.message}`
      );
    }

    // Also update their last login time
    await supabaseAdmin
      .from("user_profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);

    return existingProfile;
  }

  // If it's a different error, we should throw it.
  if (createError) {
    throw new Error(`Could not create user profile: ${createError.message}`);
  }

  // Fallback in case insert somehow fails without an error but returns no data
  return null;
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
    console.warn(
      `[validateSessionOwnership] Không tìm thấy session hoặc lỗi DB`,
      { sessionId, userId, error }
    );
    return false; // Session does not exist
  }

  if (data.user_id !== userId) {
    console.warn(`[validateSessionOwnership] user_id mismatch`, {
      sessionId,
      userId,
      sessionUserId: data.user_id,
    });
  } else {
    console.info(`[validateSessionOwnership] user_id khớp`, {
      sessionId,
      userId,
    });
  }

  return data.user_id === userId;
};
