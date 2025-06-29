import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    console.log("🔍 [Middleware] Processing request:", {
      url: req.url,
      pathname: req.nextUrl.pathname,
    });
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check for JWT token in cookies
        const jwtToken = req.cookies.get("jwt_token")?.value;

        console.log("🔍 [Middleware Auth] Checking authorization:", {
          pathname: req.nextUrl.pathname,
          hasToken: !!token,
          tokenId: token?.id,
          tokenEmail: token?.email,
          hasJwtCookie: !!jwtToken,
        });

        // Check if user has valid NextAuth session AND JWT cookie
        const isAuthorized = !!(token && token.id && token.email && jwtToken);

        console.log("🔍 [Middleware Auth] Authorization result:", {
          isAuthorized,
          reason: !isAuthorized
            ? "Missing session or JWT cookie"
            : "Valid session and JWT",
        });

        return isAuthorized;
      },
    },
  }
);

export const config = {
  matcher: [
    "/learning/:path*",
    "/mindmap/:path*",
    "/profile",
    "/api/learning/:path*",
  ],
};
