import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import {
  findUserByEmail,
  findUserById,
  publicUser,
  upsertOAuthUser,
  verifyPassword,
} from "./server/users-db";
import { sanitizeEmail } from "./sanitize";
import type { PlanId } from "./plans";
import type { UserRole } from "./roles";

export const authConfigured = Boolean(process.env.NEXTAUTH_SECRET);

export const googleAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export const githubAuthConfigured = Boolean(
  process.env.GITHUB_ID && process.env.GITHUB_SECRET
);

/** Facebook Login (Meta). Instagram posting still uses share intents — not Graph publish. */
export const facebookAuthConfigured = Boolean(
  process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
);

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await findUserByEmail(sanitizeEmail(credentials.email));
        if (!user) return null;
        if (user.bannedAt) {
          throw new Error("ACCOUNT_BANNED");
        }
        const ok = await verifyPassword(user, credentials.password);
        if (!ok) return null;
        const pub = publicUser(user);
        return {
          id: pub.id,
          email: pub.email,
          name: pub.name,
          plan: pub.plan,
          handle: pub.handle,
          role: pub.role,
          emailVerified: pub.emailVerified,
        };
      },
    }),
    ...(googleAuthConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    ...(githubAuthConfigured
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
          }),
        ]
      : []),
    ...(facebookAuthConfigured
      ? [
          FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID!,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;
      if (!user.email) return false;
      const upserted = await upsertOAuthUser({
        email: user.email,
        name: user.name,
        image: user.image,
      });
      if ("error" in upserted) return false;
      if (upserted.bannedAt) return false;
      user.id = upserted.id;
      user.plan = upserted.plan;
      user.handle = upserted.handle;
      user.role = upserted.role;
      user.emailVerified = Boolean(upserted.emailVerifiedAt);
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.plan = user.plan ?? "free";
        token.handle = user.handle ?? "";
        token.role = (user.role as UserRole) || "user";
        token.emailVerified = Boolean(user.emailVerified);
      }
      const uid = (token.uid as string) || (token.sub as string) || "";
      if (uid) {
        try {
          const dbUser = await findUserById(uid);
          if (dbUser) {
            if (dbUser.bannedAt) {
              token.banned = true;
            } else {
              token.banned = false;
            }
            token.uid = dbUser.id;
            token.plan = dbUser.plan;
            token.handle = dbUser.handle;
            token.role = dbUser.role;
            token.emailVerified = Boolean(dbUser.emailVerifiedAt);
          }
        } catch {
          // DB briefly unavailable — keep token
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.banned) {
        // Soft-ban: empty session user id so APIs reject
        if (session.user) {
          session.user.id = "";
          session.user.plan = "free";
          session.user.handle = "";
          session.user.role = "user";
          session.user.emailVerified = false;
        }
        return session;
      }
      if (session.user) {
        session.user.id = (token.uid as string) || token.sub || "";
        session.user.plan = (token.plan as PlanId) || "free";
        session.user.handle = (token.handle as string) || "";
        session.user.role = (token.role as UserRole) || "user";
        session.user.emailVerified = Boolean(token.emailVerified);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "dev-only-watchify-secret-change-me",
};
