import type { Metadata } from "next";
import { NewLinkScreen } from "../new-link-screen";

export const instant = false;
export const metadata: Metadata = { title: "New template page" };

export default function NewTemplateLinkPage() {
  return <NewLinkScreen mode="template" />;
}
