"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { switchPageAction } from "./pages-actions";

type PageItem = { id: string; username: string; displayName: string; layout: string };

/** Pick which of your pages the dashboard edits, or start a new one. */
export function PageSwitcher({ pages, currentId }: { pages: PageItem[]; currentId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const current = pages.find((p) => p.id === currentId) ?? pages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="max-w-56" aria-label={`Editing page /${current.username}. Switch page`} />}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        <span className="truncate">/{current.username}</span>
        <ChevronsUpDown className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Your pages ({pages.length})</DropdownMenuLabel>
          {pages.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() =>
                p.id !== currentId &&
                start(async () => {
                  const res = await switchPageAction(p.id);
                  if (!res.ok) toast.error(res.error);
                  router.refresh();
                })
              }
            >
              {p.id === currentId ? <Check /> : <span className="size-4" />}
              <div className="min-w-0">
                <div className="truncate font-medium">/{p.username}</div>
                {p.displayName ? <div className="truncate text-xs text-muted-foreground">{p.displayName}</div> : null}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/dashboard/templates" />}>
          <Plus /> New page from a template
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
