// "Grow with ViewLink": pure affiliate rules (no DB), shared by the server and the dashboard.
//
// Creators share viewlink.me/join/<code>. People who sign up through it are their referrals;
// every payment a referral makes earns the creator a commission. The rate grows with the
// number of paying customers they've brought (levels below). Each commission is held for
// 30 days (refund window) before it can be paid out, and payouts start at $25.

export type Level = { key: "seed" | "sprout" | "bloom"; name: string; rate: number; from: number };

/** Levels by paying customers referred: the rate applies to every new payment. */
export const LEVELS: Level[] = [
  { key: "seed", name: "Seed", rate: 25, from: 0 },
  { key: "sprout", name: "Sprout", rate: 30, from: 5 },
  { key: "bloom", name: "Bloom", rate: 35, from: 20 },
];

export const HOLD_DAYS = 30;
export const MIN_PAYOUT_CENTS = 2500;
export const REF_COOKIE = "tendril-ref";
export const REF_COOKIE_DAYS = 60;

/** The level for a number of paying customers, and the next one (null at the top). */
export function levelFor(payingCustomers: number): { level: Level; next: Level | null } {
  let i = 0;
  for (let j = 0; j < LEVELS.length; j++) if (payingCustomers >= LEVELS[j].from) i = j;
  return { level: LEVELS[i], next: LEVELS[i + 1] ?? null };
}

/** Commission in cents for a payment, at a percentage rate (rounded down to the cent). */
export function commissionCents(paidCents: number, rate: number): number {
  return Math.max(0, Math.floor((paidCents * rate) / 100));
}

/** When a commission becomes available to pay out. */
export function availableAt(paidAt: Date): Date {
  return new Date(paidAt.getTime() + HOLD_DAYS * 86_400_000);
}

/** "abd***@gmail.com": enough to recognise a referral without showing their address. */
export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  return `${name.slice(0, Math.min(3, Math.max(1, name.length - 1)))}***@${domain}`;
}

/** Affiliate codes: 3–20 characters, lowercase letters, numbers, dashes and underscores. */
export function normalizeCode(input: string): string | null {
  const code = input.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{1,18}[a-z0-9]$/.test(code) ? code : null;
}

export const formatUsd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
