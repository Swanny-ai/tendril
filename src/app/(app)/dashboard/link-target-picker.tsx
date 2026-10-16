"use client";

import { ChevronsUpDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export type DomainOption = { id: string; hostname: string };

/**
 * Domain + Root/Path choice for a bio page or deep link: the Tendril domain or a connected
 * custom domain, at a path or (custom domains only) at the domain's root.
 */
export function LinkTargetPicker({
  id,
  appHost,
  domains,
  domainId,
  atRoot,
  onChange,
}: {
  id: string;
  appHost: string;
  domains: DomainOption[];
  domainId: string | null;
  atRoot: boolean;
  onChange: (value: { domainId: string | null; atRoot: boolean }) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative min-w-48 flex-1">
        <Globe className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <select
          id={id}
          aria-label="Domain"
          value={domainId ?? ""}
          onChange={(e) => {
            const next = e.target.value || null;
            onChange({ domainId: next, atRoot: next ? atRoot : false });
          }}
          className="h-10 w-full cursor-pointer appearance-none rounded-lg border bg-background pr-9 pl-9 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">{appHost}</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.hostname}
            </option>
          ))}
        </select>
        <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex rounded-lg border bg-muted p-0.5" role="radiogroup" aria-label="Link type">
        {(["root", "path"] as const).map((mode) => {
          const selected = mode === "root" ? atRoot : !atRoot;
          const locked = mode === "root" && !domainId;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={locked}
              title={locked ? "Root needs a custom domain" : undefined}
              onClick={() => onChange({ domainId, atRoot: mode === "root" })}
              className={cn(
                "rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                selected ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode === "root" ? "Root" : "Path"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
