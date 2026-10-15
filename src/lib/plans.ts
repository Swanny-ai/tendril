import "server-only";
import { db } from "@/lib/db";
import { PLAN_LIMITS, planFromSubscription, type Capability, type PlanName } from "@/lib/plan-rules";

export class PlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanError";
  }
}

export async function getPlan(userId: string): Promise<PlanName> {
  const sub = await db.subscription.findUnique({ where: { userId }, select: { plan: true, status: true } });
  return planFromSubscription(sub);
}

export async function assertCan(userId: string, capability: Capability): Promise<void> {
  const plan = await getPlan(userId);
  if (!PLAN_LIMITS[plan][capability]) {
    throw new PlanError("This feature is part of Pro. Upgrade to use it.");
  }
}

export async function assertBlockCapacity(userId: string, pageId: string): Promise<void> {
  const plan = await getPlan(userId);
  const count = await db.block.count({ where: { pageId } });
  if (count >= PLAN_LIMITS[plan].maxBlocks) {
    throw new PlanError(
      plan === "FREE"
        ? `Free pages can have up to ${PLAN_LIMITS.FREE.maxBlocks} blocks. Upgrade to Pro for more.`
        : "You've reached the block limit for a page.",
    );
  }
}
