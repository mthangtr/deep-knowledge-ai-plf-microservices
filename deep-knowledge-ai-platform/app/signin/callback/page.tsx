"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { clearAuthState, logAuthState } from "@/lib/debug-auth";

export default function SigninCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [error, setError] = useState<string>("");

    useEffect(() => {
        const handleCallback = async () => {
            try {
                console.log("🔍 [CALLBACK DEBUG] Starting callback processing...");

                // Log current auth state
                logAuthState();

                // Check for fragment-based tokens (Supabase modern auth)
                const hash = window.location.hash;
                console.log("🔍 [CALLBACK DEBUG] Fragment hash:", hash);

                if (hash && hash.startsWith('#')) {
                    // Parse fragment parameters
                    const fragmentParams = new URLSearchParams(hash.substring(1));
                    const access_token = fragmentParams.get("access_token");
                    const refresh_token = fragmentParams.get("refresh_token");
                    const token_type = fragmentParams.get("token_type");

                    console.log("🔍 [CALLBACK DEBUG] Fragment tokens:", {
                        hasAccessToken: !!access_token,
                        hasRefreshToken: !!refresh_token,
                        tokenType: token_type
                    });

                    if (access_token && refresh_token) {
                        console.log("🔄 [CALLBACK STEP] Processing fragment-based auth...");

                        // Call our supabase callback API with tokens in query params
                        const callbackUrl = new URL("/api/auth/supabase-callback", window.location.origin);
                        callbackUrl.searchParams.set("access_token", access_token);
                        callbackUrl.searchParams.set("refresh_token", refresh_token);

                        console.log("🔄 [CALLBACK STEP] Redirecting to:", callbackUrl.toString());

                        // Redirect to server-side callback với tokens
                        window.location.href = callbackUrl.toString();
                        return;
                    }
                }

                // Fallback: Check for URL params (from server redirect)
                const userParam = searchParams.get("user");
                const token = searchParams.get("token");

                console.log("🔍 [CALLBACK DEBUG] URL params:", {
                    hasUser: !!userParam,
                    hasToken: !!token
                });

                if (!userParam || !token) {
                    console.error("❌ [CALLBACK ERROR] Missing user data or token in URL params");
                    setError("Missing user data or token - check authentication flow");
                    setStatus("error");
                    return;
                }

                const user = JSON.parse(userParam);
                console.log("🔄 [CALLBACK STEP] Processing NextAuth signin...", {
                    userId: user.id,
                    email: user.email
                });

                // Clear any existing auth state first to prevent conflicts
                console.log("🧹 [CALLBACK STEP] Clearing old auth state...");
                clearAuthState();

                // Use the JWT token directly from backend instead of storing in NextAuth
                console.log("🔍 [CALLBACK] Using backend JWT token directly");

                // Store JWT token in both sessionStorage and cookie for API calls and middleware
                sessionStorage.setItem('jwt_token', token);
                document.cookie = `jwt_token=${token}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`;

                console.log("✅ [CALLBACK] JWT token stored successfully");

                // Sign in with NextAuth for session management (without backend JWT)
                const result = await signIn("supabase-callback", {
                    user: JSON.stringify(user), // Don't include token
                    redirect: false,
                    callbackUrl: "/learning",
                });

                console.log("🔍 [NEXTAUTH RESULT]", {
                    ok: result?.ok,
                    error: result?.error,
                    status: result?.status,
                    url: result?.url
                });

                if (result?.error) {
                    console.error("❌ [NEXTAUTH ERROR] NextAuth signin error:", result.error);
                    setError(`NextAuth Error: ${result.error}`);
                    setStatus("error");
                    return;
                }

                if (!result?.ok) {
                    console.error("❌ [NEXTAUTH ERROR] NextAuth signin failed:", result);
                    setError("Authentication failed - please try again");
                    setStatus("error");
                    return;
                }

                console.log("✅ [CALLBACK SUCCESS] NextAuth signin successful");
                setStatus("success");

                // Use NextAuth result URL or fallback to /learning
                const redirectUrl = result?.url || "/learning";
                console.log("🔄 [REDIRECT] Redirecting to:", redirectUrl);

                // Wait longer to ensure session is properly set
                setTimeout(async () => {
                    // Verify session before redirect
                    try {
                        const sessionResponse = await fetch('/api/auth/session');
                        const sessionData = await sessionResponse.json();
                        console.log("🔍 [SESSION CHECK] Before redirect:", {
                            hasUser: !!sessionData.user,
                            hasAccessToken: !!sessionData.accessToken,
                            userId: sessionData.user?.id
                        });
                    } catch (error) {
                        console.warn("⚠️ [SESSION CHECK] Could not verify session:", error);
                    }

                    router.push(redirectUrl);
                }, 2000); // Increase delay to 2 seconds

            } catch (error) {
                console.error("❌ [CALLBACK ERROR] Callback handling error:", error);
                setError("Failed to process authentication callback");
                setStatus("error");
            }
        };

        handleCallback();
    }, [searchParams, router]);

    const handleRetrySignin = () => {
        // Clear auth state before retry
        clearAuthState();
        router.push("/signin");
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Đang xử lý đăng nhập...</p>
                </div>
            </div>
        );
    }

    if (status === "success") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="text-green-500 text-6xl mb-4">✓</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Đăng nhập thành công!</h1>
                    <p className="text-gray-600">Đang chuyển hướng đến trang học tập...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md px-6">
                <div className="text-red-500 text-6xl mb-4">✗</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Lỗi đăng nhập</h1>
                <p className="text-gray-600 mb-6">
                    {error || "Có lỗi xảy ra trong quá trình đăng nhập"}
                </p>
                <button
                    onClick={handleRetrySignin}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                    Thử lại
                </button>
            </div>
        </div>
    );
} 