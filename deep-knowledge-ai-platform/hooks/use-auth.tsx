import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/config";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  signInWithGitHub: () => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleAuthStateChange = async (_event: string, session: any) => {
    setLoading(true);
    const currentUser = session?.user || null;
    setUser(currentUser);

    if (currentUser) {
      try {
        const response = await fetch(API_ENDPOINTS.auth.callback, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: currentUser }),
        });

        if (!response.ok) {
          throw new Error("Failed to get JWT from backend-main");
        }

        const { token } = await response.json();
        sessionStorage.setItem("jwt_token", token);
        console.log("✅ Custom JWT stored in sessionStorage.");
      } catch (error) {
        console.error("[AUTH] Error getting custom JWT:", error);
        await supabase.auth.signOut();
      }
    } else {
      sessionStorage.removeItem("jwt_token");
      console.log("👤 User signed out, custom JWT removed.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await handleAuthStateChange("INITIAL_SESSION", session);
      } else {
        setLoading(false);
      }
    };

    checkUser();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    sessionStorage.removeItem("jwt_token");
    document.cookie = "jwt_token=; path=/; max-age=0";
    router.push("/");
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signInWithGitHub = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signInWithMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      return {
        success: true,
        message: "Chúng tôi đã gửi magic link đến email của bạn. Vui lòng kiểm tra hộp thư."
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOut,
        isAuthenticated: !!user,
        signInWithGoogle,
        signInWithMagicLink,
        signInWithGitHub,
        isLoading: loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
