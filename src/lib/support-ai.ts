import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// The support assistant: answers common ViewLink questions, and tells us when to hand the
// conversation to a real person. Used by lib/support.ts. Falls back cleanly (escalate) whenever
// no API key is set or the model call fails, so the chat always reaches a human.

export const supportAiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

// Default to the flagship model; set SUPPORT_AI_MODEL=claude-haiku-5-5 for a faster, cheaper bot.
const MODEL = process.env.SUPPORT_AI_MODEL || "claude-opus-5-5";

export type AiTurn = { role: "user" | "ai" | "agent"; body: string };
export type AiResult = { reply: string; escalate: boolean };

const SYSTEM = `You are the friendly support assistant for ViewLink (viewlink.me), a link-in-bio and smart-link tool for creators. Answer common questions clearly and briefly (2-4 short sentences, warm and plain). You are text-only in a small chat widget.

What ViewLink does:
- A bio page (link-in-bio) at a chosen @username, with blocks, themes and colors.
- Smart links of two kinds: "Deeplinks" (open an app/destination directly) and "Two-Steps" (a deep link with its own page shown first). These help links open outside in-app browsers like Instagram or TikTok.
- Custom domains, analytics, a verified badge, and an 18+ content warning option.

Plans (prices in USD):
- Free: 1 smart link, 1 bio page, no custom domain, 30 days of analytics. No custom themes or verified badge.
- Pro ($8/month or $80/year): up to 3 smart links, 3 bio pages, 1 custom domain, 1 year of analytics, custom themes, verified badge, badge removal, and Two-Steps template pages.
- Business ($25/month or $250/year): up to 20 smart links (10 of each kind), 10 bio pages, 10 custom domains — everything in Pro, just more.
- Every new account starts with 5 days of Pro free, no card needed.
- Payments are by card (through Paddle) or crypto. Yearly plans are 2 months free.

Common how-tos:
- Custom domain: Dashboard -> Custom domains -> add your domain, then add the DNS record it shows at your domain provider and wait for it to verify (can take a little while).
- New link: Dashboard -> Deeplinks or Two-Steps -> Create.
- Verify email: open the verification link we email you; resend it from the banner or Settings.
- Analytics and billing each have their own tab in the dashboard.

Hand off to a human (escalate) when: the person asks for a real person/agent, is frustrated or unhappy, reports a bug or something broken, has a billing/payment/refund problem, needs an account-specific action you can't verify or perform, asks something you're unsure about, or anything sensitive. When in doubt, escalate — never guess about their specific account, payments, or data.

Reply ONLY with a compact JSON object and nothing else, in this exact shape:
{"reply": "<your message to the user>", "escalate": <true or false>}
When escalate is true, make "reply" a short, warm line telling them you're connecting them with a real person who'll follow up here.`;

/** Ask the assistant for a reply (and whether to hand off). Throws on API/parse failure. */
export async function aiReply(history: AiTurn[]): Promise<AiResult> {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = history.map((t) => ({
    role: t.role === "user" ? "user" : "assistant",
    content: t.body,
  }));
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    messages,
  });
  // A safety refusal (rare for support chat) — hand to a person.
  if ((res.stop_reason as string) === "refusal") return { reply: "", escalate: true };
  const text = res.content.find((b) => b.type === "text")?.text?.trim() ?? "";
  // The model is told to return JSON; parse it, with a plain-text fallback.
  return parseResult(text);
}

function parseResult(text: string): AiResult {
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (json) {
    try {
      const obj = JSON.parse(json) as { reply?: unknown; escalate?: unknown };
      const reply = typeof obj.reply === "string" ? obj.reply.trim() : "";
      if (reply) return { reply, escalate: obj.escalate === true };
    } catch {
      /* fall through to plain text */
    }
  }
  // Couldn't read a structured answer — use the text if any, and don't escalate on that alone.
  return { reply: text, escalate: !text };
}
