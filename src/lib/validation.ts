import { z } from "zod";
import { RESERVED_USERNAMES } from "@/config/reserved";
import { BLOCK_KINDS } from "@/lib/blocks";

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "That password is too long");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters")
  .max(30, "At most 30 characters")
  .regex(/^[a-z0-9_.]+$/, "Letters, numbers, dots and underscores only")
  .refine((u) => !u.startsWith(".") && !u.endsWith(".") && !u.includes(".."), "Dots can't start, end or repeat")
  .refine((u) => !RESERVED_USERNAMES.has(u), "That name is reserved");

/**
 * Normalizes and validates a destination URL. Only http(s) is allowed, and
 * links back into our own redirect route are rejected to prevent loops.
 */
export function normalizeDestinationUrl(raw: string, ownHost?: string): { ok: true; url: string } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) return { ok: false, error: "Add a URL" };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http and https links are allowed" };
  }
  if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") {
    return { ok: false, error: "That doesn't look like a valid URL" };
  }
  if (ownHost && parsed.host === ownHost && parsed.pathname.startsWith("/go/")) {
    return { ok: false, error: "That link points back to a ViewLink redirect" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "Links can't contain usernames or passwords" };
  }
  return { ok: true, url: parsed.toString() };
}

export const SOCIAL_NETWORKS = [
  "instagram", "tiktok", "youtube", "x", "facebook", "snapchat", "threads", "telegram", "whatsapp", "discord",
  "twitch", "spotify", "patreon", "onlyfans", "github", "linkedin", "email",
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export const socialEntrySchema = z.object({
  network: z.enum(SOCIAL_NETWORKS),
  handle: z.string().trim().min(1).max(100),
});

export const profileSchema = z.object({
  displayName: z.string().trim().max(60),
  bio: z.string().trim().max(160),
  tagline: z.string().trim().max(60).optional(),
  handle: z
    .string()
    .trim()
    .max(30)
    .regex(/^[\w.]*$/, "Letters, numbers, dots and underscores only")
    .optional(),
  showHandle: z.boolean().optional(),
  seoTitle: z.string().trim().max(70).optional().nullable(),
  seoDescription: z.string().trim().max(160).optional().nullable(),
  published: z.boolean().optional(),
});

export const blockTypeSchema = z.enum(BLOCK_KINDS);

// Images we serve ourselves (uploads, template art) or any https image.
const imageUrlSchema = z
  .string()
  .max(2048)
  .refine((u) => /^\/(media|uploads|templates)\/[\w./-]+$/.test(u) || /^https:\/\/[^\s"'<>]+$/.test(u), "Use an uploaded image or an https:// image link");

export const blockUpdateSchema = z.object({
  title: z.string().trim().max(100).optional(),
  url: z.string().max(2048).optional().nullable(),
  enabled: z.boolean().optional(),
  contentWarning: z.boolean().optional(),
  contentWarningText: z.string().trim().max(200).optional().nullable(),
  data: z
    .object({
      text: z.string().max(500).optional(),
      socials: z.array(socialEntrySchema).max(12).optional(),
      imageUrl: z.union([imageUrlSchema, z.literal("")]).optional(),
      style: z.enum(["button", "card"]).optional(),
      until: z.string().datetime({ offset: true }).optional(),
    })
    .optional(),
});

export const RESERVED_LINK_SLUGS = new Set(["admin", "api", "login", "signup", "dashboard", "warning", "left", "go"]);

export const smartLinkSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters")
  .max(50, "At most 50 characters")
  .regex(/^[a-z0-9-]+$/, "Letters, numbers and dashes only")
  .refine((s) => !s.startsWith("-") && !s.endsWith("-") && !s.includes("--"), "Dashes can't start, end or repeat")
  .refine((s) => !RESERVED_LINK_SLUGS.has(s), "That name is reserved");

export const smartLinkSchema = z.object({
  slug: smartLinkSlugSchema,
  destinationUrl: z.string().max(2048),
  label: z.string().trim().max(80).default(""),
  adultWarning: z.boolean().default(true),
  warningTemplate: z.string().max(40),
  warningTitle: z.string().trim().max(80).optional().nullable(),
  warningMessage: z.string().trim().max(300).optional().nullable(),
  warningButton: z.string().trim().max(40).optional().nullable(),
  showBadge: z.boolean().default(true),
  openInBrowser: z.boolean().default(true),
  domainId: z.string().max(40).nullable().optional(),
  atRoot: z.boolean().default(false),
  enabled: z.boolean().default(true),
});
export type SmartLinkInput = z.input<typeof smartLinkSchema>;
