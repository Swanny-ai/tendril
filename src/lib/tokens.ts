import "server-only";
import { db } from "@/lib/db";
import { generateRawToken, hashToken, isWellFormedToken, TOKEN_TTL_MS } from "@/lib/token-crypto";

export type TokenType = keyof typeof TOKEN_TTL_MS;

/** Creates a token and invalidates any earlier unused token of the same type. Returns the raw token. */
export async function issueToken(userId: string, type: TokenType): Promise<string> {
  const raw = generateRawToken();
  const now = new Date();
  await db.$transaction([
    db.authToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: now } }),
    db.authToken.create({ data: { userId, type, tokenHash: hashToken(raw), expires: new Date(now.getTime() + TOKEN_TTL_MS[type]) } }),
  ]);
  return raw;
}

/** Checks a token without using it (for showing the reset form). */
export async function peekToken(raw: unknown, type: TokenType): Promise<{ userId: string } | null> {
  if (!isWellFormedToken(raw)) return null;
  const t = await db.authToken.findUnique({ where: { tokenHash: hashToken(raw) }, select: { userId: true, type: true, expires: true, usedAt: true } });
  if (!t || t.type !== type || t.usedAt || t.expires < new Date()) return null;
  return { userId: t.userId };
}

/** Atomically marks a valid token as used. Returns the user id, or null if invalid, expired or already used. */
export async function consumeToken(raw: unknown, type: TokenType): Promise<string | null> {
  if (!isWellFormedToken(raw)) return null;
  const tokenHash = hashToken(raw);
  const t = await db.authToken.findUnique({ where: { tokenHash }, select: { id: true, userId: true, type: true } });
  if (!t || t.type !== type) return null;
  const { count } = await db.authToken.updateMany({
    where: { id: t.id, usedAt: null, expires: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  return count === 1 ? t.userId : null;
}
