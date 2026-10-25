// Single place for the product name (ViewLink, viewlink.me).
export const brand = {
  name: "ViewLink",
  tagline: "One link for everything you make.",
  domain: "viewlink.me",
  /** Where people reach us (legal pages, refunds). */
  supportEmail: "support@viewlink.me",
} as const;

// The live site is always https://<brand.domain>; previews and local dev use NEXT_PUBLIC_APP_URL.
export const appUrl = (
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? `https://${brand.domain}` : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
).replace(/\/$/, "");
export const appHost = new URL(appUrl).host;
