import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config (no Prisma adapter, no Nodemailer)
// Used by middleware for session checks
export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAppRoute = nextUrl.pathname.startsWith("/app");
      const hasNoAuth = nextUrl.searchParams.has("noauth");

      if (isAppRoute && !isLoggedIn && !hasNoAuth) {
        return false; // Redirect to login
      }
      return true;
    },
  },
};
