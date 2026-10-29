import { describe, expect, it } from "vitest";
import { BOT_FALLBACK, BOT_TOPICS, botReply } from "@/lib/support-bot";

const answer = (id: string) => BOT_TOPICS.find((t) => t.id === id)!.answer;

describe("botReply", () => {
  it("answers a topic button by its label", () => {
    for (const t of BOT_TOPICS) expect(botReply(t.label)).toEqual({ reply: t.answer, escalate: false });
  });
  it("matches typed questions by keyword", () => {
    expect(botReply("How do I connect my own domain?").reply).toBe(answer("domain"));
    expect(botReply("how much is the pro plan").reply).toBe(answer("plans"));
    expect(botReply("when does my trial end?").reply).toBe(answer("trial"));
  });
  it("hands off when asked for a person or for a real problem", () => {
    expect(botReply("can I talk to a real person").escalate).toBe(true);
    expect(botReply("I was charged twice, I want a refund").escalate).toBe(true);
    expect(botReply("my link is not working").escalate).toBe(true);
  });
  it("greets and thanks without handing off", () => {
    expect(botReply("hello").escalate).toBe(false);
    expect(botReply("thanks!").escalate).toBe(false);
  });
  it("hands off after two misses in a row", () => {
    expect(botReply("qwerty zxcv")).toEqual({ reply: BOT_FALLBACK, escalate: false });
    expect(botReply("qwerty zxcv", 1).escalate).toBe(true);
  });
});
