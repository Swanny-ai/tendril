import type { Metadata } from "next";
import { LinksList } from "./links-list";

export const instant = false;
export const metadata: Metadata = { title: "Customize template" };

export default function TemplateLinksPage() {
  return <LinksList mode="template" />;
}
