"use client";

import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { PlanName } from "@/lib/plan-rules";
import { cn } from "@/lib/utils";
import { contrastRatio, resolveTheme, THEME_PRESETS, type FontKey, type ThemeOverrides } from "@/themes/presets";
import { setThemeAction, setOpenInBrowserAction, setWarningTemplateAction } from "./actions";
import { WARNING_TEMPLATES } from "@/warning-templates/templates";
import type { Limits } from "./editor";
import { queueSave, runSave, useEditor, type EditorTheme } from "./store";

const FONTS: { key: FontKey; label: string }[] = [
  { key: "sans", label: "Clean sans" },
  { key: "display", label: "Friendly display" },
  { key: "serif", label: "Editorial serif" },
  { key: "mono", label: "Monospace" },
];

export function ThemePanel({ plan, limits }: { plan: PlanName; limits: Limits }) {
  const theme = useEditor((s) => s.theme);
  const setTheme = useEditor((s) => s.setTheme);

  function change(patch: Partial<EditorTheme>) {
    setTheme(patch);
    queueSave(
      "theme",
      () => {
        const t = useEditor.getState().theme;
        return setThemeAction({ themeKey: t.themeKey, overrides: limits.customTheme ? t.overrides : {}, showBadge: t.showBadge });
      },
      (m) => toast.error(m),
      300,
    );
  }

  const resolved = resolveTheme(theme.themeKey, theme.overrides, limits.customTheme);
  const solidBg = /^#[0-9a-f]{6}$/i.test(resolved.background) ? resolved.background : null;
  const lowContrast = solidBg && contrastRatio(resolved.text, solidBg) < 4.5;

  function setOverride(k: keyof ThemeOverrides, v: string | undefined) {
    const next = { ...theme.overrides } as Record<string, string | undefined>;
    if (v === undefined) delete next[k];
    else next[k] = v;
    change({ overrides: next as ThemeOverrides });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Pick a look. Pro themes are marked with a lock.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {THEME_PRESETS.map((p) => {
              const locked = p.pro && plan !== "PRO";
              const active = theme.themeKey === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  disabled={locked}
                  onClick={() => change({ themeKey: p.key })}
                  aria-pressed={active}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border text-left transition-shadow",
                    active ? "ring-2 ring-primary" : "hover:shadow-md",
                    locked && "cursor-not-allowed opacity-60",
                  )}
                >
                  <div className="flex h-24 flex-col items-center justify-center gap-1.5 px-3" style={{ background: p.tokens.background }}>
                    {[0, 1].map((i) => (
                      <span
                        key={i}
                        className="block h-3.5 w-full"
                        style={{
                          background: p.tokens.buttonBg,
                          border: `1.5px solid ${p.tokens.buttonBorder}`,
                          borderRadius: Math.min(p.tokens.radius, 10),
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-2 text-sm font-medium">
                    {p.name}
                    {locked ? <Lock className="size-3.5 text-muted-foreground" aria-label="Pro" /> : null}
                    {active ? <Check className="size-4 text-primary" aria-label="Selected" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Customize {!limits.customTheme ? <Lock className="size-4 text-muted-foreground" /> : null}
          </CardTitle>
          <CardDescription>
            {limits.customTheme ? (
              "Fine-tune colors and type on top of your theme."
            ) : (
              <>
                Custom colors, fonts and removing the badge are part of Pro.{" "}
                <Link href="/dashboard/billing" className="text-primary underline-offset-4 hover:underline">
                  Upgrade
                </Link>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className={cn("space-y-4", !limits.customTheme && "pointer-events-none opacity-50")} aria-disabled={!limits.customTheme}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField label="Background" value={theme.overrides.background} fallback={solidBg ?? "#ffffff"} onChange={(v) => setOverride("background", v)} />
            <ColorField label="Text" value={theme.overrides.text} fallback={resolved.text} onChange={(v) => setOverride("text", v)} />
            <ColorField label="Button" value={theme.overrides.buttonBg} fallback={/^#/.test(resolved.buttonBg) ? resolved.buttonBg : "#ffffff"} onChange={(v) => setOverride("buttonBg", v)} />
            <ColorField label="Button text" value={theme.overrides.buttonText} fallback={resolved.buttonText} onChange={(v) => setOverride("buttonText", v)} />
          </div>
          {lowContrast ? <p className="text-sm text-destructive">Text may be hard to read on this background.</p> : null}
          <div className="space-y-1.5">
            <Label>Font</Label>
            <Select value={theme.overrides.font ?? "preset"} onValueChange={(v) => setOverride("font", v === "preset" ? undefined : (v as string))}>
              <SelectTrigger className="w-56" aria-label="Font">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preset">Theme default</SelectItem>
                {FONTS.map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="badge">Show &ldquo;Made with&rdquo; badge</Label>
              <p className="text-sm text-muted-foreground">Displayed at the bottom of your page.</p>
            </div>
            <Switch id="badge" aria-label="Show Made with badge" checked={theme.showBadge} onCheckedChange={(v) => change({ showBadge: v })} />
          </div>
          {Object.keys(theme.overrides).length ? (
            <Button variant="ghost" size="sm" onClick={() => change({ overrides: {} })}>
              Reset customizations
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Deep links: open in phone browser</CardTitle>
              <CardDescription className="mt-1">
                When visitors tap your links inside Instagram, TikTok or Facebook, open them in their default browser (Chrome or Safari) instead of the
                app&apos;s built-in one.
              </CardDescription>
            </div>
            <Switch
              aria-label="Open links in phone browser"
              checked={theme.openInBrowser}
              onCheckedChange={(v) => {
                useEditor.getState().setTheme({ openInBrowser: v });
                void runSave(() => setOpenInBrowserAction(v), (m) => toast.error(m));
              }}
            />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content-warning page style</CardTitle>
          <CardDescription>The 18+ page visitors see before links you&apos;ve marked with a content warning.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={theme.warningTemplate ?? "theme"}
            onValueChange={(value) => {
              const key = value === "theme" ? null : (value as string);
              useEditor.getState().setTheme({ warningTemplate: key });
              void runSave(() => setWarningTemplateAction(key), (m) => toast.error(m));
            }}
          >
            <SelectTrigger className="w-64" aria-label="Content-warning page style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="theme">Match my page theme</SelectItem>
              {WARNING_TEMPLATES.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">More designs and a live preview are on the Smart links page.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ColorField({ label, value, fallback, onChange }: { label: string; value?: string; fallback: string; onChange: (v: string | undefined) => void }) {
  const id = `color-${label.replace(/\s/g, "-").toLowerCase()}`;
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="color"
        value={value ?? fallback}
        onChange={(e) => onChange(e.target.value)}
        className="size-10 cursor-pointer rounded-lg border bg-transparent p-1"
      />
      <div className="min-w-0">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{value ?? "Theme default"}</p>
      </div>
      {value ? (
        <button type="button" className="ml-auto text-xs text-muted-foreground hover:text-foreground" onClick={() => onChange(undefined)}>
          Reset
        </button>
      ) : null}
    </div>
  );
}
