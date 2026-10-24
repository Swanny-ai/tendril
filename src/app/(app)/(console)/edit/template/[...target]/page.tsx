import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentPage } from "@/lib/current-page";
import { pageFromEditPath } from "@/lib/edit-paths";
import { requireAccount } from "@/lib/session";
import { EditorScreen } from "../../../dashboard/editor/editor-screen";

export const instant = false;
export const metadata: Metadata = { title: "Edit page" };

export default async function EditTemplatePage(props: { params: Promise<{ target: string[] }> }) {
  const { userId } = await requireAccount();
  const { target } = await props.params;
  const page = await pageFromEditPath(userId, target);
  if (!page) notFound();
  // The editor saves to the remembered page: make sure it's this one first.
  const current = await getCurrentPage(userId);
  if (current?.id !== page.id) {
    redirect(`/api/edit-page?${new URLSearchParams({ id: page.id, next: `/edit/template/${target.join("/")}` })}`);
  }
  return <EditorScreen userId={userId} page={page} />;
}
