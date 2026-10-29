// The scripted support assistant (no AI): matches a creator's message against common topics and
// answers from a fixed script. It hands off to a real person when they ask for one, describe a
// problem only a person can fix, or it fails to understand them twice in a row.
// Pure (no DB), shared by lib/support.ts and the widget's topic buttons.

export type BotTopic = { id: string; label: string; keywords: string[]; answer: string };

export const BOT_TOPICS: BotTopic[] = [
  {
    id: "plans",
    label: "Plans & pricing",
    keywords: ["plan", "price", "pricing", "cost", "pro", "business", "free", "upgrade", "how much", "subscription"],
    answer:
      "We have 3 plans:\n• Free: 1 smart link, 1 bio page, 30 days of analytics.\n• Pro ($8/month or $80/year): 3 smart links, 3 bio pages, 1 custom domain, 1 year of analytics, themes and the verified badge.\n• Business ($25/month or $250/year): 20 smart links, 10 bio pages, 10 custom domains.\nYou can upgrade from Dashboard → Billing.",
  },
  {
    id: "trial",
    label: "Free trial",
    keywords: ["trial", "5 days", "five days", "free pro", "trial end", "expired"],
    answer:
      "Every new account gets 5 days of Pro free, no card needed. When it ends your account moves to Free and your extra Pro features pause. Pick a plan in Dashboard → Billing to keep them.",
  },
  {
    id: "domain",
    label: "Custom domain",
    keywords: ["domain", "dns", "cname", "custom domain", "my own domain", "connect domain", "verify domain"],
    answer:
      "To connect your domain: Dashboard → Custom domains → add your domain, then add the DNS record we show at your domain provider (GoDaddy, Namecheap, Cloudflare…). It verifies by itself once the DNS updates, which can take from a few minutes up to a few hours. Custom domains are on Pro and Business.",
  },
  {
    id: "links",
    label: "Deeplinks & Two-Steps",
    keywords: ["deeplink", "deep link", "two-steps", "two steps", "smart link", "create link", "new link", "instagram", "tiktok", "in-app"],
    answer:
      "Deeplinks open your destination outside Instagram/TikTok's in-app browser. Two-Steps does the same with a page of yours shown first. Create one from Dashboard → Deeplinks or Two-Steps → Create link.",
  },
  {
    id: "payment",
    label: "Payments",
    keywords: ["pay", "payment", "card", "crypto", "paddle", "invoice", "receipt", "cancel"],
    answer:
      "You can pay by card (through Paddle) or with crypto, monthly or yearly (yearly = 2 months free). To change or cancel your plan, go to Dashboard → Billing. If a payment failed or you were charged wrongly, tap \"Talk to a real person\".",
  },
  {
    id: "email",
    label: "Verify my email",
    keywords: ["verify", "verification", "email", "confirm email", "didn't get", "no email"],
    answer:
      "Open the verification link we emailed you (check spam too). You can resend it from the banner at the top of your dashboard or from Settings.",
  },
  {
    id: "analytics",
    label: "Analytics",
    keywords: ["analytics", "stats", "views", "clicks", "visitors", "traffic"],
    answer:
      "Your views, clicks and visitors are in Dashboard → Analytics. Free keeps 30 days of history; Pro and Business keep a full year with country and device breakdowns.",
  },
];

// Asking for a person, or a problem a script can't solve.
const HUMAN_WORDS = ["human", "real person", "agent", "someone", "talk to", "speak to", "support team", "operator", "contact"];
const PROBLEM_WORDS = ["refund", "charged", "bug", "broken", "not working", "doesn't work", "doesnt work", "error", "hacked", "banned", "suspended", "delete my account", "scam", "angry", "useless"];

const GREETING_WORDS = ["hi", "hello", "hey", "salam", "bonjour", "yo"];
const THANKS_WORDS = ["thanks", "thank you", "thx", "merci", "ok", "okay", "great", "perfect"];

export const BOT_FALLBACK = "Sorry, I didn't quite get that. Pick one of the topics below, or tap \"Talk to a real person\".";
const GREETING = "Hi! 👋 I'm the ViewLink assistant. Pick a topic below or type your question.";
const THANKS = "You're welcome! Anything else I can help with?";

export type BotResult = { reply: string; escalate: boolean };

const norm = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9'\- ]+/g, " ").replace(/\s+/g, " ").trim()} `;
const has = (text: string, words: string[]) => words.some((w) => text.includes(` ${w} `) || (w.includes(" ") && text.includes(w)));

/**
 * The scripted reply to `message`. `previousMisses` is how many fallback replies came right before
 * it: a second miss in a row hands the chat to a person.
 */
export function botReply(message: string, previousMisses = 0): BotResult {
  const text = norm(message);
  if (has(text, HUMAN_WORDS) || has(text, PROBLEM_WORDS)) return { reply: "", escalate: true };

  // A topic button sends its label: match it exactly first.
  const byLabel = BOT_TOPICS.find((t) => norm(t.label) === text);
  if (byLabel) return { reply: byLabel.answer, escalate: false };

  // Otherwise the topic with the most keyword hits.
  let best: BotTopic | null = null;
  let bestScore = 0;
  for (const t of BOT_TOPICS) {
    const score = t.keywords.filter((k) => has(text, [k])).length;
    if (score > bestScore) [best, bestScore] = [t, score];
  }
  if (best) return { reply: best.answer, escalate: false };

  const words = text.trim().split(" ");
  if (words.length <= 3 && has(text, GREETING_WORDS)) return { reply: GREETING, escalate: false };
  if (words.length <= 4 && has(text, THANKS_WORDS)) return { reply: THANKS, escalate: false };

  if (previousMisses >= 1) return { reply: "", escalate: true };
  return { reply: BOT_FALLBACK, escalate: false };
}
