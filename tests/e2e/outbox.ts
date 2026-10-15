import fs from "node:fs";
import path from "node:path";
import { expect } from "@playwright/test";

// Reads the development mail outbox written by src/lib/mailer.ts (MAIL_TRANSPORT=file).
const OUTBOX = path.join(process.cwd(), ".mail-outbox.jsonl");

type Mail = { to: string; subject: string; text: string; sentAt: string };

function mails(): Mail[] {
  if (!fs.existsSync(OUTBOX)) return [];
  return fs.readFileSync(OUTBOX, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Mail);
}

export function mailCount(to: string) {
  return mails().filter((m) => m.to === to).length;
}

/** Waits for the newest email to `to` whose subject matches, and returns the first link in it. */
export async function latestLink(to: string, subject: RegExp): Promise<string> {
  let link = "";
  await expect
    .poll(() => {
      const m = mails().filter((x) => x.to === to && subject.test(x.subject)).at(-1);
      link = m?.text.match(/https?:\/\/\S+/)?.[0] ?? "";
      return link;
    }, { timeout: 10_000 })
    .not.toBe("");
  return new URL(link).pathname + new URL(link).search;
}
