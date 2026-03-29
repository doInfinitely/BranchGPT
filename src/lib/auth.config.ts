import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";

const providers: Provider[] = [];

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}

// Edge-compatible auth config (no Prisma adapter, no Nodemailer)
// Used by middleware for session checks
export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized() {
      return true; // Auth disabled — allow all routes without login
    },
  },
};
