"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Lock, Monitor, ShieldAlert, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { appHost } from "@/config/brand";
import { cn } from "@/lib/utils";
import { templateCopy, WARNING_COPY } from "@/warning-templates/copy";
import { getWarningTemplate, WARNING_TEMPLATES, type WarningTemplate } from "@/warning-templates/templates";
import { WarningScreen } from "@/warning-templates/warning-screen";
import { createSmartLinkAction, updateSmartLinkAction, type LinkActionResult } from "./actions";

export type SmartLinkFormValues = {
  slug: string;
  destinationUrl: string;
  label: string;
  adultWarning: boolean;
  warningTemplate: string;
  warningTitle: string;
  warningMessage: string;
  warningButton: string;
  showBadge: boolean;
  openInBrowser: boolean;
  enabled: boolean;
};

type Limits = { customWarningText: boolean; removeBadge: boolean };

const copy = WARNING_COPY.en;

export function SmartLinkForm({ id, initial, limits }: { id?: string; initial: SmartLinkFormValues; limits: Limits }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [slugCheck, setSlugCheck] = useState<{ value: string; available: boolean; message?: string } | null>(null);
  const set = (patch: Partial<SmartLinkFormValues>) => setV((s) => ({ ...s, ...patch }));

  useEffect(() => {
    if (!v.slug) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/smart-link-slug?s=${encodeURIComponent(v.slug)}${id ? `&id=${id}` : ""}`, { signal: ctrl.signal });
        const json = (await res.json()) as { available: boolean; error?: string };
        setSlugCheck({ value: v.slug, available: json.available, message: json.error });
      } catch {
        /* aborted */
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [v.slug, id]);

  const slugState = !v.slug ? "idle" : slugCheck?.value !== v.slug ? "checking" : slugCheck.available ? "ok" : "bad";
  const template = useMemo(() => getWarningTemplate(v.warningTemplate), [v.warningTemplate]);
  const tCopy = templateCopy(template, "en");
  const host = useMemo(() => {
    try {
      return new URL(/^https?:\/\//.test(v.destinationUrl) ? v.destinationUrl : `https://${v.destinationUrl}`).host.replace(/^www\./, "");
    } catch {
      return "";
    }
  }, [v.destinationUrl]);

  async function save() {
    setSaving(true);
    setErrors({});
    const payload = {
      ...v,
      warningTitle: limits.customWarningText ? v.warningTitle : "",
      warningMessage: limits.customWarningText ? v.warningMessage : "",
      warningButton: limits.customWarningText ? v.warningButton : "",
      showBadge: limits.removeBadge ? v.showBadge : true,
    };
    const res: LinkActionResult = id ? await updateSmartLinkAction(id, payload) : await createSmartLinkAction(payload);
    setSaving(false);
    if (!res.ok) {
      if (res.field) setErrors({ [res.field]: res.error });
      toast.error(res.error);
      return;
    }
    toast.success(id ? "Link saved" : "Link created");
    router.push("/dashboard/links");
    router.refresh();
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Link</CardTitle>
            <CardDescription>Where your short link lives and where it sends people.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Link name</Label>
              <div className="flex items-center overflow-hidden rounded-lg border bg-background focus-within:ring-3 focus-within:ring-ring/50">
                <span className="select-none border-r bg-muted px-3 py-2 text-sm text-muted-foreground">{appHost}/l/</span>
                <Input
                  id="slug"
                  value={v.slug}
                  maxLength={50}
                  autoComplete="off"
                  onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  className="border-0 shadow-none focus-visible:ring-0"
                  aria-invalid={slugState === "bad" || !!errors.slug}
                />
                <span className="px-3" aria-live="polite">
                  {slugState === "checking" ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Checking" /> : null}
                  {slugState === "ok" ? <Check className="size-4 text-[var(--sage-text)]" aria-label="Available" /> : null}
                  {slugState === "bad" ? <X className="size-4 text-destructive" aria-label="Not available" /> : null}
                </span>
              </div>
              <p className={cn("text-sm", slugState === "bad" || errors.slug ? "text-destructive" : "text-muted-foreground")}>
                {errors.slug ?? (slugState === "bad" ? slugCheck?.message : slugState === "ok" ? "Available" : "Letters, numbers and dashes.")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="destinationUrl">Destination URL</Label>
              <Input id="destinationUrl" inputMode="url" placeholder="https://example.com/my-page" value={v.destinationUrl} onChange={(e) => set({ destinationUrl: e.target.value })} aria-invalid={!!errors.destinationUrl} />
              {errors.destinationUrl ? <p className="text-sm text-destructive">{errors.destinationUrl}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="label">Note (only you see this)</Label>
              <Input id="label" maxLength={80} placeholder="e.g. Instagram bio, spring campaign" value={v.label} onChange={(e) => set({ label: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="size-4 text-primary" aria-hidden /> Deep link: open in phone browser
                </CardTitle>
                <CardDescription className="mt-1">
                  When someone taps this link inside Instagram, TikTok or Facebook, it opens in their default browser (Safari on iPhone, Chrome or similar on
                  Android), where they&apos;re signed in and payments work.
                </CardDescription>
              </div>
              <Switch checked={v.openInBrowser} onCheckedChange={(openInBrowser) => set({ openInBrowser })} aria-label="Open in phone browser" />
            </div>
          </CardHeader>
          {v.openInBrowser ? (
            <CardContent>
              <ol className="grid gap-2 text-sm sm:grid-cols-3">
                {(v.adultWarning
                  ? ["Visitor taps your link in the app", "They see your 18+ page right there in the app", "Confirming opens the link in their default browser (Safari on iPhone)"]
                  : ["Visitor taps your link in the app", "Your page shows an “Open in browser” button", "The link opens in their default browser"]
                ).map((step, i) => (
                  <li key={step} className="flex items-start gap-2 rounded-lg border p-3">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-muted-foreground">
                Android opens the browser straight away. On iPhone it works on iOS 17 and later; otherwise visitors get simple steps. Visitors outside apps go
                straight to your link.
              </p>
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-[var(--persimmon-text)]" aria-hidden /> Adult content warning
                </CardTitle>
                <CardDescription className="mt-1">Show an 18+ warning page before sending visitors to your destination. Visitors must confirm their age to continue.</CardDescription>
              </div>
              <Switch checked={v.adultWarning} onCheckedChange={(adultWarning) => set({ adultWarning })} aria-label="Adult content warning" />
            </div>
          </CardHeader>
          {v.adultWarning ? (
            <CardContent className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-medium">Warning page design</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="radiogroup" aria-label="Warning page design">
                  {WARNING_TEMPLATES.map((t) => (
                    <TemplateTile key={t.key} template={t} selected={v.warningTemplate === t.key} onSelect={() => set({ warningTemplate: t.key })} />
                  ))}
                </div>
              </div>

              <div className={cn("space-y-4 rounded-lg border p-4", !limits.customWarningText && "opacity-70")}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Custom wording {limits.customWarningText ? null : <Lock className="ml-1 inline size-3.5" aria-label="Pro" />}</p>
                  {!limits.customWarningText ? (
                    <Link href="/dashboard/billing" className="text-sm text-primary underline-offset-4 hover:underline">
                      Upgrade to customise
                    </Link>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">Leave empty to use the default wording, shown in the visitor&apos;s language (English, Spanish, Portuguese, French, German or Italian).</p>
                <fieldset disabled={!limits.customWarningText} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="warningTitle">Title</Label>
                    <Input id="warningTitle" maxLength={80} placeholder={tCopy.title} value={v.warningTitle} onChange={(e) => set({ warningTitle: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="warningMessage">Message</Label>
                    <Textarea id="warningMessage" rows={2} maxLength={300} placeholder={tCopy.message} value={v.warningMessage} onChange={(e) => set({ warningMessage: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="warningButton">Button</Label>
                    <Input id="warningButton" maxLength={40} placeholder={tCopy.button} value={v.warningButton} onChange={(e) => set({ warningButton: e.target.value })} />
                  </div>
                </fieldset>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <Label htmlFor="badge">&ldquo;Made with&rdquo; badge {limits.removeBadge ? null : <Lock className="ml-1 inline size-3.5" aria-label="Pro" />}</Label>
                  <p className="text-sm text-muted-foreground">Shown small at the bottom of the warning page.</p>
                </div>
                <Switch id="badge" aria-label="Show Made with badge" disabled={!limits.removeBadge} checked={limits.removeBadge ? v.showBadge : true} onCheckedChange={(showBadge) => set({ showBadge })} />
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Visitors will be sent straight to your destination with no warning page.</p>
            </CardContent>
          )}
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={save} disabled={saving || slugState === "bad" || !v.slug || !v.destinationUrl}>
            {saving ? <Loader2 className="animate-spin" /> : null} {id ? "Save link" : "Create link"}
          </Button>
          <Link href="/dashboard/links" className="text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </Link>
          {id ? (
            <label className="ml-auto flex items-center gap-2 text-sm">
              <Switch checked={v.enabled} onCheckedChange={(enabled) => set({ enabled })} aria-label="Link is active" /> Active
            </label>
          ) : null}
        </div>
      </div>

      <div className="xl:sticky xl:top-20 xl:self-start">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Preview</p>
          <div className="flex rounded-lg border p-0.5" role="group" aria-label="Preview size">
            {(["phone", "desktop"] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={device === d}
                onClick={() => setDevice(d)}
                className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm", device === d ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                {d === "phone" ? <Smartphone className="size-4" /> : <Monitor className="size-4" />}
                {d === "phone" ? "Phone" : "Desktop"}
              </button>
            ))}
          </div>
        </div>
        {v.adultWarning ? (
          <div
            aria-label="Warning page preview"
            className={cn(
              "mx-auto overflow-hidden border-[#1c1a24] bg-black shadow-xl",
              device === "phone" ? "h-[640px] w-[320px] rounded-[40px] border-[9px]" : "h-[420px] w-full rounded-xl border-[6px]",
            )}
          >
            <div className={cn("h-full overflow-auto", device === "desktop" && "origin-top-left")}>
              <WarningScreen
                preview
                template={template}
                title={(limits.customWarningText && v.warningTitle) || tCopy.title}
                message={(limits.customWarningText && v.warningMessage) || tCopy.message}
                button={(limits.customWarningText && v.warningButton) || tCopy.button}
                leave={copy.leave}
                destinationLabel={copy.destination}
                destinationHost={host}
                continueHref="#"
                leaveHref="#"
                showBadge={limits.removeBadge ? v.showBadge : true}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-60 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">No warning page: visitors go straight to {host || "your destination"}.</div>
        )}
      </div>
    </div>
  );
}

function TemplateTile({ template: t, selected, onSelect }: { template: WarningTemplate; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={t.name}
      onClick={onSelect}
      className={cn("overflow-hidden rounded-xl border text-left transition-shadow", selected ? "ring-2 ring-primary" : "hover:shadow-md")}
    >
      <div className="flex h-20 items-center justify-center" style={{ background: t.pageBg }}>
        {t.layout === "bigtype" ? (
          <span className="text-2xl font-black" style={{ color: t.accent }}>18+</span>
        ) : (
          <div
            className="flex w-20 flex-col items-center gap-1 px-2 py-2"
            style={{
              background: t.layout === "fullbleed" ? "transparent" : t.cardBg,
              border: t.layout === "fullbleed" ? "none" : `1px solid ${t.cardBorder}`,
              borderRadius: Math.min(t.radius, 8),
            }}
          >
            {t.layout === "split" ? <span className="h-2 w-full rounded-sm" style={{ background: t.accent }} /> : null}
            <span className="h-1 w-8 rounded" style={{ background: t.muted }} />
            <span className="h-2.5 w-12" style={{ background: t.buttonBg, borderRadius: Math.min(t.radius, 6) }} />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-2.5 py-1.5 text-xs font-medium">
        {t.name}
        {selected ? <Check className="size-3.5 text-primary" aria-hidden /> : null}
      </div>
    </button>
  );
}
