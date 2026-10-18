import type { Metadata } from "next";
import { Bricolage_Grotesque, Fraunces, Inter } from "next/font/google";
import { appUrl, brand } from "@/config/brand";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const bricolage = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], display: "swap" });
const fraunces = Fraunces({ variable: "--font-serif", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: `${brand.name}: ${brand.tagline}`, template: `%s · ${brand.name}` },
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
