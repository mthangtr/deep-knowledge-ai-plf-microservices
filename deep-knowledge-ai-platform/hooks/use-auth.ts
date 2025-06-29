import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { supabase } from "@/lib/supabase";

interface AuthResult {
  success: boolean;
  message?: string;
  error?: string;
}

export function useAuth() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);

  // Gửi Magic Link
  const signInWithMagicLink = async (email: string): Promise<AuthResult> => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/signin/callback`,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message || "Không thể gửi magic link",
        };
      }

      return {
        success: true,
        message: "Vui lòng kiểm tra email của bạn để đăng nhập!",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Có lỗi xảy ra khi gửi magic link",
      };
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập với Google
  const signInWithGoogle = async (): Promise<AuthResult> => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/signin/callback`,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message || "Không thể đăng nhập với Google",
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Có lỗi xảy ra khi đăng nhập với Google",
      };
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập với GitHub
  const signInWithGitHub = async (): Promise<AuthResult> => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/signin/callback`,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message || "Không thể đăng nhập với GitHub",
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Có lỗi xảy ra khi đăng nhập với GitHub",
      };
    } finally {
      setLoading(false);
    }
  };

  // Đăng xuất
  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      // Đăng xuất khỏi Supabase
      await supabase.auth.signOut();
      // Đăng xuất khỏi NextAuth
      await signOut({ callbackUrl: "/signin" });
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    user: session?.user || null,
    isAuthenticated: !!session,
    isLoading: status === "loading" || loading,
    session,

    // Actions
    signInWithMagicLink,
    signInWithGoogle,
    signInWithGitHub,
    logout,
  };
}
