import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { linkFromEditPath } from "@/lib/edit-paths";
import { requireAccount } from "@/lib/session";
import { LinkEditScreen } from "../../dashboard/links/link-edit-screen";

export const instant = false;
export const metadata: Metadata = { title: "Edit deep link" };

export default async function EditLinkPage(props: { params: Promise<{ target: string[] }> }) {
  const { userId } = await requireAccount();
  const { target } = await props.params;
  const link = await linkFromEditPath(userId, target);
  if (!link) notFound();
  return <LinkEditScreen userId={userId} link={link} />;
}
