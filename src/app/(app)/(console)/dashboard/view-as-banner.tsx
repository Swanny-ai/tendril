import { Eye, LogOut } from "lucide-react";
import { stopViewAsAction } from "../../admin/view-as-actions";

/** Shown on every dashboard screen while an admin is viewing someone's account. */
export function ViewAsBanner({ email }: { email: string }) {
  return (
    <div role="status" className="sticky top-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2.5 text-sm md:px-8">
      <Eye className="size-4 shrink-0 text-amber-400" aria-hidden />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">Viewing as {email}</span>
        <span className="text-muted-foreground"> · view only, nothing can be changed</span>
      </p>
      <form action={stopViewAsAction}>
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400">
          <LogOut className="size-3.5" aria-hidden /> Exit
        </button>
      </form>
    </div>
  );
}
