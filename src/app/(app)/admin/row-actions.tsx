import { BadgeCheck, Eye, EyeOff, Power, PowerOff, Trash2 } from "lucide-react";
import { ActionButton } from "./action-button";
import { deleteLinkAction, deletePageAdminAction, toggleLinkAction, togglePagePublishedAction, togglePageVerifiedAction } from "./actions";

// The buttons on a bio page row and on a link row, shared by the lists and the user screen.

export function PageRowActions({ page }: { page: { id: string; username: string; published: boolean; verifiedAt: Date | null } }) {
  const fields = { id: page.id };
  return (
    <div className="flex justify-end gap-1.5">
      <ActionButton action={togglePagePublishedAction} fields={fields} confirm={page.published ? `Take /${page.username} offline?` : undefined}>
        {page.published ? <EyeOff /> : <Eye />} {page.published ? "Take offline" : "Put live"}
      </ActionButton>
      <ActionButton action={togglePageVerifiedAction} fields={fields}>
        <BadgeCheck /> {page.verifiedAt ? "Remove badge" : "Give badge"}
      </ActionButton>
      <ActionButton action={deletePageAdminAction} fields={fields} variant="destructive" confirm={`Delete /${page.username} with its blocks, photos and stats? This can't be undone.`}>
        <Trash2 />
      </ActionButton>
    </div>
  );
}

export function LinkRowActions({ link }: { link: { id: string; slug: string; enabled: boolean } }) {
  const fields = { id: link.id };
  return (
    <div className="flex justify-end gap-1.5">
      <ActionButton action={toggleLinkAction} fields={fields} confirm={link.enabled ? `Turn off ${link.slug}? Visitors will see "This link isn't available".` : undefined}>
        {link.enabled ? <PowerOff /> : <Power />} {link.enabled ? "Turn off" : "Turn on"}
      </ActionButton>
      <ActionButton action={deleteLinkAction} fields={fields} variant="destructive" confirm={`Delete ${link.slug} and its stats? This can't be undone.`}>
        <Trash2 />
      </ActionButton>
    </div>
  );
}
