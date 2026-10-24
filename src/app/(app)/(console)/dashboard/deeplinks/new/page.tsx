import type { Metadata } from "next";
import { NewLinkScreen } from "../../links/new-link-screen";

export const instant = false;
export const metadata: Metadata = { title: "New deep link" };

export default function NewDeeplinkPage() {
  return <NewLinkScreen mode="classic" />;
}
