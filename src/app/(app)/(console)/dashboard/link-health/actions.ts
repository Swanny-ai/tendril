"use server";

import { healthQuota, runHealthCheck } from "@/lib/link-health";
import type { HealthResult, HealthStatus } from "@/lib/link-health-rules";
import { rateLimit } from "@/lib/rate-limit";
import { requireUserId } from "@/lib/session";

export type HealthActionResult =
  | { ok: true; status: HealthStatus; result: HealthResult; checkedAt: string; left: number }
  | { ok: false; error: string };

/** Runs a Link Health check on one of the account's links or bio pages (counts toward today's checks). */
export async function runHealthCheckAction(kind: "link" | "page", id: string): Promise<HealthActionResult> {
  const userId = await requireUserId();
  if (kind !== "link" && kind !== "page") return { ok: false, error: "Unknown link." };
  if (!rateLimit(`health:${userId}`, 6, 60_000)) return { ok: false, error: "Too many checks at once. Try again in a minute." };
  const quota = await healthQuota(userId);
  if (quota.left <= 0) return { ok: false, error: `You've used all ${quota.limit} checks for today. They reset at midnight UTC.` };
  const run = await runHealthCheck(userId, kind, id);
  if (!run) return { ok: false, error: "That link no longer exists." };
  return { ok: true, status: run.status, result: run.result, checkedAt: run.checkedAt, left: quota.left - 1 };
}
