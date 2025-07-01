import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Check required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  console.error("❌ [NextAuth Error] NEXTAUTH_SECRET is not set!");
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "supabase-callback",
      name: "Supabase Callback",
      credentials: {
        user: { type: "text" },
      },
      async authorize(credentials) {

        if (!credentials?.user) {
          console.error("❌ [NextAuth Authorize] No user credentials provided");
          return null;
        }

        try {
          const user = JSON.parse(credentials.user);


          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            // No longer passing token through NextAuth
          };
        } catch (error) {
          console.error(
            "❌ [NextAuth Authorize] Error parsing user credentials:",
            error
          );
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // User data đã có JWT token được set từ signin callback
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;

        // No longer storing JWT token in NextAuth session
        // JWT token is handled directly via sessionStorage

      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string,
          image: token.picture as string,
        };
        // No longer storing JWT token in session

      }
      return session;
    },
    async redirect({ url, baseUrl }) {


      // Nếu URL là relative, make it absolute
      if (url.startsWith("/")) {
        const fullUrl = new URL(url, baseUrl).toString();

        return fullUrl;
      }

      // Nếu URL cùng domain, allow
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // Default fallback
      return `${baseUrl}/learning`;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(code, metadata) {
      console.error("❌ [NextAuth Error]", code, metadata);
    },
    warn(code) {
      console.warn("⚠️ [NextAuth Warning]", code);
    },
    debug(code, metadata) {

    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
