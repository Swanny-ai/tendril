import type { Metadata } from "next";
import { LinksList } from "../links/links-list";

export const instant = false;
export const metadata: Metadata = { title: "Deeplinks" };

export default function DeeplinksPage() {
  return <LinksList mode="classic" />;
}
