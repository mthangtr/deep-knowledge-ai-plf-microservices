import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "./supabase";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
}

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || undefined,
    };
  } catch (error) {
    console.error("Error getting authenticated user:", error);
    return null;
  }
}

export function createUnauthorizedResponse() {
  return Response.json(
    { error: "Unauthorized", message: "Vui lòng đăng nhập để tiếp tục" },
    { status: 401 }
  );
}

// =====================================
// APPLICATION-LEVEL AUTHORIZATION HELPERS
// =====================================

/**
 * Kiểm tra user có quyền truy cập topic không
 */
export async function validateTopicOwnership(
  topicId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("learning_topics")
      .select("user_id")
      .eq("id", topicId)
      .eq("user_id", userId)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error("Error validating topic ownership:", error);
    return false;
  }
}

/**
 * Kiểm tra user có quyền truy cập node không (thông qua topic ownership)
 */
export async function validateNodeOwnership(
  nodeId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("tree_nodes")
      .select(
        `
        topic_id,
        learning_topics!inner(user_id)
      `
      )
      .eq("id", nodeId)
      .eq("learning_topics.user_id", userId)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error("Error validating node ownership:", error);
    return false;
  }
}

/**
 * Kiểm tra user có quyền truy cập chat không (thông qua topic ownership)
 */
export async function validateChatOwnership(
  chatId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("learning_chats")
      .select(
        `
        topic_id,
        learning_topics!inner(user_id)
      `
      )
      .eq("id", chatId)
      .eq("learning_topics.user_id", userId)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error("Error validating chat ownership:", error);
    return false;
  }
}

/**
 * Kiểm tra user có quyền truy cập note không (thông qua topic ownership)
 */
export async function validateNoteOwnership(
  noteId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("learning_notes")
      .select(
        `
        topic_id,
        learning_topics!inner(user_id)
      `
      )
      .eq("id", noteId)
      .eq("learning_topics.user_id", userId)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error("Error validating note ownership:", error);
    return false;
  }
}

/**
 * Response helper cho unauthorized access
 */
export function createForbiddenResponse(resource: string = "resource") {
  return Response.json(
    {
      error: "Forbidden",
      message: `Bạn không có quyền truy cập ${resource} này`,
    },
    { status: 403 }
  );
}
