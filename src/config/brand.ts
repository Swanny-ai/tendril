// Single place for the product name (ViewLink, viewlink.me).
export const brand = {
  name: "ViewLink",
  tagline: "One link for everything you make.",
  domain: "viewlink.me",
} as const;

export const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const appHost = new URL(appUrl).host;
