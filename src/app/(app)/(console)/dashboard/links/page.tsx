import type { Metadata } from "next";
import { LinksList } from "./links-list";

export const instant = false;
export const metadata: Metadata = { title: "Two-Steps (Escape Meta Bot)" };

export default function TemplateLinksPage() {
  return <LinksList mode="template" />;
}
