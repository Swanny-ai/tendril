import NextAuth, { CredentialsSignin } from "next-auth";
import { connection } from "next/server";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { startTrial } from "@/lib/trial";
import { emailSchema } from "@/lib/validation";

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
export const fanvueEnabled = Boolean(process.env.AUTH_FANVUE_ID && process.env.AUTH_FANVUE_SECRET);

/** The fields of Fanvue's GET /users/me that sign-in uses. */
type FanvueProfile = { uuid: string; email?: string | null; displayName?: string | null; handle?: string | null; avatarUrl?: string | null };

/**
 * "Sign in with Fanvue": OAuth 2.0 with PKCE against auth.fanvue.com (a confidential client using
 * HTTP Basic on the token call, the Auth.js default). Fanvue's ID token only carries the user id,
 * so the profile (email, name, avatar) comes from the API's GET /users/me with the read:self scope.
 * Docs: https://api.fanvue.com/docs/authentication/overview.md
 */
function Fanvue(): Provider {
  return {
    id: "fanvue",
    name: "Fanvue",
    type: "oauth",
    // Fanvue returns an ID token alongside the access token; its claims are checked against this issuer.
    issuer: "https://auth.fanvue.com",
    clientId: process.env.AUTH_FANVUE_ID,
    clientSecret: process.env.AUTH_FANVUE_SECRET,
    authorization: { url: "https://auth.fanvue.com/oauth2/auth", params: { scope: "openid offline_access offline read:self" } },
    token: "https://auth.fanvue.com/oauth2/token",
    userinfo: {
      url: "https://api.fanvue.com/users/me",
      async request({ tokens }: { tokens: { access_token?: string } }) {
        const res = await fetch("https://api.fanvue.com/users/me", {
          headers: { Authorization: `Bearer ${tokens.access_token}`, "X-Fanvue-API-Version": "2025-06-26" },
        });
        if (!res.ok) throw new Error(`Fanvue /users/me failed: ${res.status}`);
        return res.json();
      },
    },
    checks: ["pkce", "state"],
    profile(p: FanvueProfile) {
      return { id: p.uuid, email: p.email ?? null, name: p.displayName || p.handle || null, image: p.avatarUrl ?? null };
    },
  };
}

class InvalidLogin extends CredentialsSignin {
  code = "invalid_credentials";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(db as any),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const email = emailSchema.safeParse(raw?.email);
        const password = typeof raw?.password === "string" ? raw.password : "";
        if (!email.success || !password) throw new InvalidLogin();
        const user = await db.user.findUnique({ where: { email: email.data } });
        if (!user?.passwordHash) throw new InvalidLogin();
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) throw new InvalidLogin();
        return { id: user.id, email: user.email, name: user.name, image: user.image, sessionVersion: user.sessionVersion };
      },
    }),
    ...(googleEnabled ? [Google({ allowDangerousEmailAccountLinking: false })] : []),
    ...(fanvueEnabled ? [Fanvue()] : []),
  ],
  callbacks: {
    // Every account needs an email; a Fanvue account without one can't sign up this way.
    signIn({ user, account }) {
      if (account?.provider === "fanvue" && !user.email) return "/login?error=FanvueNoEmail";
      return true;
    },
    // Sessions are JWTs, so they can't be deleted server-side. Each token carries the
    // user's sessionVersion; bumping it (password reset/change) signs out every device.
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
        const sv = (user as { sessionVersion?: number }).sessionVersion;
        token.sv =
          typeof sv === "number"
            ? sv
            : ((await db.user.findUnique({ where: { id: user.id }, select: { sessionVersion: true } }))?.sessionVersion ?? 0);
        return token;
      }
      if (!token.uid) return token;
      const current = await db.user.findUnique({ where: { id: token.uid as string }, select: { sessionVersion: true } });
      // Never trust "update" triggers to change sv: clients can call the session update endpoint.
      if (!current || current.sessionVersion !== token.sv) return null;
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) session.user.id = token.uid as string;
      return session;
    },
  },
  events: {
    // Google reports whether the address is verified; trust it so these users skip our email check.
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email_verified && user.id) {
        await db.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } }).catch(() => {});
      }
    },
    // A brand-new account (here: Google sign-up; credentials sign-up grants it in the action) gets the Pro trial.
    async createUser({ user }) {
      if (user.id) await startTrial(user.id).catch(() => {});
    },
  },
});

/** Returns the signed-in user's id or null. */
export async function currentUserId(): Promise<string | null> {
  await connection();
  const session = await auth();
  return session?.user?.id ?? null;
}
