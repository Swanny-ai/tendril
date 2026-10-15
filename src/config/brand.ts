// Single place for the product name (working name until one is chosen).
export const brand = {
  name: "Tendril",
  tagline: "One link for everything you make.",
  domain: "tendril.app",
} as const;

export const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const appHost = new URL(appUrl).host;
