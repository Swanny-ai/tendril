"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, CloudOff, Eye, Loader2, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { PublicPage, type RenderPage } from "@/components/public-page/public-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PLAN_LIMITS, PlanName } from "@/lib/plan-rules";
import { cn } from "@/lib/utils";
import { resolveTheme } from "@/themes/presets";
import type { EditorBlock } from "./actions";
import { BlocksPanel } from "./blocks-panel";
import { ProfilePanel } from "./profile-panel";
import { hasPendingSaves, useEditor, type EditorProfile, type EditorTheme } from "./store";
import { ThemePanel } from "./theme-panel";

export type Limits = (typeof PLAN_LIMITS)[PlanName];

type Initial = { username: string; profile: EditorProfile; theme: EditorTheme; blocks: EditorBlock[] };

export function Editor({ initial, plan, limits, publicUrl }: { initial: Initial; plan: PlanName; limits: Limits; publicUrl: string }) {
  // Hydrate the store once from server data.
  useState(() => {
    useEditor.setState({ ...initial, pending: 0, saveState: "idle" });
    return true;
  });
  const params = useSearchParams();
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    if (params.get("welcome")) toast.success("Your page is live! Start by editing your links.");
  }, [params]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingSaves()) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Editor</h1>
          <p className="text-sm text-muted-foreground">Changes save automatically and go live right away.</p>
        </div>
        <div className="flex items-center gap-2">
          <SaveIndicator />
          <div className="flex rounded-lg border p-0.5 lg:hidden" role="tablist" aria-label="Editor view">
            {(["edit", "preview"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={mobileView === v}
                onClick={() => setMobileView(v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                  mobileView === v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {v === "edit" ? <PencilLine className="size-4" /> : <Eye className="size-4" />}
                {v === "edit" ? "Edit" : "Preview"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className={cn(mobileView === "preview" && "hidden lg:block")}>
          <Tabs defaultValue="blocks">
            <TabsList className="mb-4">
              <TabsTrigger value="blocks">Blocks</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="theme">Theme</TabsTrigger>
            </TabsList>
            <TabsContent value="blocks">
              <BlocksPanel limits={limits} plan={plan} />
            </TabsContent>
            <TabsContent value="profile">
              <ProfilePanel />
            </TabsContent>
            <TabsContent value="theme">
              <ThemePanel plan={plan} limits={limits} />
            </TabsContent>
          </Tabs>
        </div>
        <div className={cn("lg:block", mobileView === "edit" && "hidden")}>
          <div className="lg:sticky lg:top-20">
            <PhonePreview plan={plan} limits={limits} publicUrl={publicUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveIndicator() {
  const state = useEditor((s) => s.saveState);
  if (state === "idle") return null;
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        state === "error" && "border-destructive/40 text-destructive",
      )}
    >
      {state === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : null}
      {state === "saved" ? <Check className="size-3.5 text-[var(--sage)]" /> : null}
      {state === "error" ? <CloudOff className="size-3.5" /> : null}
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Not saved"}
    </span>
  );
}

function PhonePreview({ limits, publicUrl }: { plan: PlanName; limits: Limits; publicUrl: string }) {
  const username = useEditor((s) => s.username);
  const profile = useEditor((s) => s.profile);
  const theme = useEditor((s) => s.theme);
  const blocks = useEditor((s) => s.blocks);

  const page: RenderPage = useMemo(() => {
    const visible = [...blocks]
      .sort((a, b) => a.position - b.position)
      .slice(0, limits.maxBlocks)
      .filter((b) => b.enabled && (b.type !== "LINK" || !!b.url));
    return {
      username,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      heroUrl: profile.heroUrl,
      tagline: profile.tagline,
      verified: profile.verified && profile.showVerified,
      layout: theme.layout,
      showBadge: limits.removeBadge ? theme.showBadge : true,
      theme: resolveTheme(theme.themeKey, theme.overrides, limits.customTheme),
      blocks: visible,
    };
  }, [username, profile, theme, blocks, limits]);

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative h-[720px] w-[360px] overflow-hidden rounded-[44px] border-[10px] border-[#1c1a24] bg-black shadow-xl"
        aria-label="Live preview of your page"
      >
        <div className="absolute top-2 left-1/2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#1c1a24]" />
        <div className="h-full overflow-y-auto">
          <PublicPage page={page} preview />
        </div>
      </div>
      <a href={publicUrl} target="_blank" rel="noreferrer" className="mt-3 text-sm text-primary hover:underline">
        Open live page ↗
      </a>
      {!profile.published ? <p className="mt-1 text-sm text-destructive">Your page is hidden from visitors.</p> : null}
    </div>
  );
}
