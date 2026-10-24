import type { MetadataRoute } from "next";
import { appUrl } from "@/config/brand";

// Search engines may index the site and creators' bio pages; the dashboard, APIs and deep link
// steps (which are also marked noindex) stay out.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/edit/", "/onboarding", "/api/", "/l/", "/go/", "/join/", "/verify-email", "/reset-password"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
