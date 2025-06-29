/**
 * Debug utilities để clear auth state và force re-authentication
 */

export const clearAuthState = () => {
  console.log("🧹 [AUTH DEBUG] Clearing all auth state...");

  // Clear sessionStorage
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("jwt_token");
    console.log("✅ Cleared sessionStorage jwt_token");
  }

  // Clear cookies
  if (typeof document !== "undefined") {
    // Clear JWT cookie
    document.cookie =
      "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    // Clear NextAuth cookies
    document.cookie =
      "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie =
      "__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie =
      "next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie =
      "__Host-next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    console.log("✅ Cleared all auth cookies");
  }

  // Clear localStorage nếu có
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user");
    console.log("✅ Cleared localStorage auth data");
  }

  console.log("🎉 [AUTH DEBUG] Auth state cleared. Please re-authenticate.");
};

export const logAuthState = () => {
  console.log("🔍 [AUTH DEBUG] Current auth state:");

  // Check sessionStorage
  const sessionJwt =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("jwt_token")
      : null;
  console.log(
    "📦 SessionStorage JWT:",
    sessionJwt ? `${sessionJwt.substring(0, 20)}...` : "none"
  );

  // Check cookies
  if (typeof document !== "undefined") {
    const cookies = document.cookie.split(";");
    const jwtCookie = cookies.find((c) => c.trim().startsWith("jwt_token="));
    console.log(
      "🍪 Cookie JWT:",
      jwtCookie ? `${jwtCookie.substring(0, 30)}...` : "none"
    );

    const nextAuthSession = cookies.find((c) =>
      c.trim().startsWith("next-auth.session-token=")
    );
    console.log("🔐 NextAuth Session:", nextAuthSession ? "present" : "none");
  }

  // Check localStorage
  const localJwt =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("jwt_token")
      : null;
  console.log(
    "💾 LocalStorage JWT:",
    localJwt ? `${localJwt.substring(0, 20)}...` : "none"
  );
};

// Expose to window for easy debugging
if (typeof window !== "undefined") {
  (window as any).clearAuthState = clearAuthState;
  (window as any).logAuthState = logAuthState;
}
