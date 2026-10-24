import type { Metadata } from "next";
import { Bricolage_Grotesque, Fraunces, Inter } from "next/font/google";
import { appUrl, brand } from "@/config/brand";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const bricolage = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], display: "swap" });
const fraunces = Fraunces({ variable: "--font-serif", subsets: ["latin"], display: "swap" });

const description =
  "Bio pages and smart deep links that open in the real browser, with 18+ warning pages, custom domains and live analytics. Free to start.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: `${brand.name}: ${brand.tagline}`, template: `%s · ${brand.name}` },
  description,
  applicationName: brand.name,
  keywords: ["link in bio", "bio page", "deep link", "open in browser", "Instagram link", "TikTok link", "18+ warning page", "link shortener", "creator links"],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  openGraph: { type: "website", siteName: brand.name, url: appUrl, title: `${brand.name}: ${brand.tagline}`, description },
  twitter: { card: "summary_large_image", title: `${brand.name}: ${brand.tagline}`, description },
  // Search Console / Bing Webmaster Tools ownership codes, set in the hosting environment.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
