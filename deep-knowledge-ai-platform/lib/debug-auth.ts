/**
 * Debug utilities để clear auth state và force re-authentication
 */

export const clearAuthState = () => {

  // Clear sessionStorage
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("jwt_token");
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

  }

  // Clear localStorage nếu có
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user");
  }

};

export const logAuthState = () => {

  // Check sessionStorage
  const sessionJwt =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("jwt_token")
      : null;

  // Check cookies
  if (typeof document !== "undefined") {
    const cookies = document.cookie.split(";");
    const jwtCookie = cookies.find((c) => c.trim().startsWith("jwt_token="));

    const nextAuthSession = cookies.find((c) =>
      c.trim().startsWith("next-auth.session-token=")
    );
  }

  // Check localStorage
  const localJwt =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("jwt_token")
      : null;
};

// Expose to window for easy debugging
if (typeof window !== "undefined") {
  (window as any).clearAuthState = clearAuthState;
  (window as any).logAuthState = logAuthState;
}
