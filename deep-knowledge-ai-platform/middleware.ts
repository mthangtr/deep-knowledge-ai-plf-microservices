import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check for JWT token in cookies
        const jwtToken = req.cookies.get("jwt_token")?.value;

        // Check if user has valid NextAuth session AND JWT cookie
        const isAuthorized = !!(token && token.id && token.email && jwtToken);

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
