"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, Check, ChevronsUpDown, Copy, Globe, Link2, Loader2, Lock, RotateCcw, ShieldCheck, Smartphone, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { QrCodeButton } from "@/components/qr-code-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { appHost } from "@/config/brand";
import { defaultIntroSection, type LandingPage } from "@/lib/link-landing";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/utils";
import { applyWarningColors, isHexColor, normalizeHex, parseWarningColors, type WarningColorKey, type WarningColors } from "@/warning-templates/colors";
import { templateCopy, WARNING_COPY } from "@/warning-templates/copy";
import { getWarningTemplate, WARNING_TEMPLATES, type WarningTemplate } from "@/warning-templates/templates";
import { WarningScreen } from "@/warning-templates/warning-screen";
import { createSmartLinkAction, updateSmartLinkAction, type LinkActionResult } from "./actions";
import { LandingEditor } from "./landing-editor";
import { LandingPhone } from "./landing-phone";

export type SmartLinkFormValues = {
  slug: string;
  destinationUrl: string;
  label: string;
  adultWarning: boolean;
  warningTemplate: string;
  warningTitle: string;
  warningMessage: string;
  warningButton: string;
  warningColors: WarningColors;
  landingPage: LandingPage;
  showBadge: boolean;
  openInBrowser: boolean;
  domainId: string | null;
  atRoot: boolean;
  enabled: boolean;
};

type Limits = { customWarningText: boolean; removeBadge: boolean };

const copy = WARNING_COPY.en;

/** Internal name for a Root link (visitors never see it; the warning pages use it). */
const rootSlug = () => `root-${Math.random().toString(36).slice(2, 10)}`;

const COLOR_FIELDS: {
  key: WarningColorKey;
  label: string;
  cardOnly?: boolean;
}[] = [
  { key: "pageBg", label: "Background" },
  { key: "cardBg", label: "Card", cardOnly: true },
  { key: "text", label: "Text" },
  { key: "buttonBg", label: "Button" },
  { key: "buttonText", label: "Button text" },
];

/** A solid hex for a template color (gradients use their first stop). */
function solid(t: WarningTemplate, key: WarningColorKey): string {
  const raw = key === "pageBg" ? t.pageBg : key === "cardBg" ? t.cardBg : key === "text" ? t.text : key === "buttonBg" ? t.buttonBg : t.buttonText;
  const hex = raw.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/i)?.[0];
  return hex ? normalizeHex(hex) : t.surface;
}

export function SmartLinkForm({
  id,
  initial,
  limits,
  domains = [],
  publicUrl,
  mode = "template",
}: {
  id?: string;
  initial: SmartLinkFormValues;
  limits: Limits;
  domains?: { id: string; hostname: string }[];
  /** The saved link's address (edit only): copy + QR. */
  publicUrl?: string;
  /** "template": Customize template (with the Template page); "classic": Deeplinks (no Template). */
  mode?: "template" | "classic";
}) {
  const listHref = mode === "template" ? "/dashboard/links" : "/dashboard/deeplinks";
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugCheck, setSlugCheck] = useState<{
    value: string;
    available: boolean;
    message?: string;
  } | null>(null);
  const set = (patch: Partial<SmartLinkFormValues>) => setV((s) => ({ ...s, ...patch }));
  const domain = domains.find((d) => d.id === v.domainId);

  useEffect(() => {
    if (!v.slug) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/smart-link-slug?s=${encodeURIComponent(v.slug)}${id ? `&id=${id}` : ""}`, { signal: ctrl.signal });
        const json = (await res.json()) as {
          available: boolean;
          error?: string;
        };
        setSlugCheck({
          value: v.slug,
          available: json.available,
          message: json.error,
        });
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
  const colors = limits.customWarningText ? v.warningColors : {};
  const styled = applyWarningColors(template, colors);
  const tCopy = templateCopy(template, "en");
  const host = useMemo(() => {
    try {
      return new URL(/^https?:\/\//.test(v.destinationUrl) ? v.destinationUrl : `https://${v.destinationUrl}`).host.replace(/^www\./, "");
    } catch {
      return "";
    }
  }, [v.destinationUrl]);
  const address = v.atRoot && domain ? `${domain.hostname}/` : domain ? `${domain.hostname}/${v.slug || "…"}` : `${appHost}/${v.slug || "…"}`;
  const hasCard = template.layout === "card" || template.layout === "split";
  const customColors = Object.keys(v.warningColors).length > 0;
  const lp = v.landingPage;
  const showPage = lp.enabled;
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);
  const setLanding = (patch: Partial<LandingPage>) => set({ landingPage: { ...v.landingPage, ...patch } });
  // Preview: the 18+ popup of a section, and a clock for countdowns (set after mount, so server and client render alike).
  const [popupFor, setPopupFor] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [styleOpen, setStyleOpen] = useState<string | null>(null);
  // Customize template starts on Step 1 (what visitors from Instagram, TikTok... see first).
  const [step, setStep] = useState<1 | 2>(mode === "template" ? 1 : 2);
  const [now, setNow] = useState(0);
  const hasCountdown = lp.enabled && lp.sections.some((s) => s.kind === "countdown");
  useEffect(() => {
    if (!hasCountdown) return;
    const tick = () => setNow(Date.now());
    const t = setInterval(tick, 1000);
    tick();
    return () => clearInterval(t);
  }, [hasCountdown]);

  async function save() {
    setSaving(true);
    setErrors({});
    const payload = {
      ...v,
      warningTitle: limits.customWarningText ? v.warningTitle : "",
      warningMessage: limits.customWarningText ? v.warningMessage : "",
      warningButton: limits.customWarningText ? v.warningButton : "",
      warningColors: limits.customWarningText ? parseWarningColors(v.warningColors) : null,
      showBadge: limits.removeBadge ? v.showBadge : true,
    };
    const res: LinkActionResult = id ? await updateSmartLinkAction(id, payload) : await createSmartLinkAction(payload);
    setSaving(false);
    if (!res.ok) {
      if (res.field) setErrors({ [res.field]: res.error });
      toast.error(res.error);
      return;
    }
    toast.success(id ? "Link saved" : "Link created 🎉");
    if (!id) celebrate();
    router.push(listHref);
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        {/* 1. Address */}
        <Section icon={<Link2 />} title="Link address">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Globe className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <select
                id="domain"
                aria-label="Domain"
                value={v.domainId ?? ""}
                onChange={(e) => {
                  const domainId = e.target.value || null;
                  set({ domainId, atRoot: domainId ? v.atRoot : false });
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
            <div className="flex h-10 shrink-0 rounded-lg border bg-muted p-0.5" role="radiogroup" aria-label="Link type">
              {(["root", "path"] as const).map((mode) => {
                const selected = mode === "root" ? v.atRoot : !v.atRoot;
                const locked = mode === "root" && !v.domainId;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={locked}
                    title={locked ? "Root needs a custom domain" : undefined}
                    onClick={() => set(mode === "root" ? { atRoot: true, slug: v.slug || rootSlug() } : { atRoot: false })}
                    className={cn(
                      "flex-1 rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none",
                      selected ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {mode === "root" ? "Root" : "Path"}
                  </button>
                );
              })}
            </div>
          </div>
          {v.atRoot && domain ? (
            <div className="flex h-10 items-center rounded-lg border bg-muted/60 px-3 text-sm font-medium">https://{domain.hostname}/</div>
          ) : (
            <div className="flex items-center overflow-hidden rounded-lg border bg-background focus-within:ring-3 focus-within:ring-ring/50">
              <span className="max-w-[45%] shrink-0 truncate border-r bg-muted px-3 py-2 text-sm text-muted-foreground select-none">
                {domain ? `${domain.hostname}/` : `${appHost}/`}
              </span>
              <Input
                id="slug"
                aria-label="Link name"
                placeholder="your-path"
                value={v.slug}
                maxLength={50}
                autoComplete="off"
                onChange={(e) =>
                  set({
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  })
                }
                className="border-0 shadow-none focus-visible:ring-0"
                aria-invalid={slugState === "bad" || !!errors.slug}
              />
              <span className="px-3" aria-live="polite">
                {slugState === "checking" ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Checking" /> : null}
                {slugState === "ok" ? <Check className="size-4 text-[var(--sage-text)]" aria-label="Available" /> : null}
                {slugState === "bad" ? <X className="size-4 text-destructive" aria-label="Not available" /> : null}
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
            <p className={cn((!v.atRoot && slugState === "bad") || errors.slug || errors.domainId ? "text-destructive" : "text-muted-foreground")}>
              {errors.domainId ??
                (v.atRoot
                  ? "The whole domain opens this link (it replaces your bio page there)."
                  : (errors.slug ?? (slugState === "bad" ? slugCheck?.message : slugState === "ok" ? "Available" : "Letters, numbers and dashes.")))}
            </p>
            {!domains.length ? (
              <Link href="/dashboard/domains" className="text-primary underline-offset-4 hover:underline">
                Use your own domain
              </Link>
            ) : null}
          </div>
          {publicUrl ? (
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-1.5 pl-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium" data-testid="public-url">
                {publicUrl.replace(/^https?:\/\//, "")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(publicUrl);
                  toast.success("Link copied");
                }}
              >
                <Copy /> Copy
              </Button>
              <QrCodeButton url={publicUrl} filename={`qr-${initial.slug}`} label="QR code" />
            </div>
          ) : null}
        </Section>

        {/* 3. Open in phone browser */}
        <ToggleSection
          icon={<Smartphone />}
          title="Open in phone browser"
          hint="Taps inside Instagram, TikTok or Facebook open in Safari or Chrome, where people are signed in."
          checked={v.openInBrowser}
          onChange={(openInBrowser) => set({ openInBrowser })}
        />

        {/* 4. Template: a profile page shown first (Customize template only) */}
        {mode === "template" ? (
          <ToggleSection
            icon={<UserRound />}
            title="Template"
            hint={lp.enabled ? "Visitors land on your page first." : "Your own page: cover, photo, social icons, photo links, countdown."}
            checked={lp.enabled}
            onChange={(enabled) => {
              // Template and the full-page 18+ check can't both be on: links get their own 18+ popup instead.
              set({
                landingPage: { ...lp, enabled },
                ...(enabled ? { adultWarning: false } : {}),
              });
              setPopupFor(null);
            }}
          >
            {/* The template's settings, inside the Template card: one block each, indented under it. */}
            {lp.enabled ? (
              <div className="border-t pt-4">
                <div className="ml-1 border-l-2 border-primary/30 pl-3 sm:ml-3 sm:pl-5">
                  <LandingEditor
                    value={lp}
                    onChange={setLanding}
                    fallbackName="Name"
                    selected={selectedSection}
                    onSelect={setSelectedSection}
                    styleOpen={styleOpen}
                    onStyleOpen={setStyleOpen}
                    step={step}
                  />
                </div>
              </div>
            ) : null}
          </ToggleSection>
        ) : null}

        {/* 5. 18+ age check (hidden while Template is on: links carry their own 18+ popups) */}
        {lp.enabled ? null : (
          <ToggleSection
            icon={<ShieldCheck />}
            title="18+ age check"
            hint={
              v.adultWarning
                ? "Visitors confirm they're 18 or older before they continue."
                : lp.enabled
                  ? "Off while Template is on. Use the 18+ popup on each link instead."
                  : `Visitors go straight to ${host || "your destination"}.`
            }
            checked={v.adultWarning}
            onChange={(adultWarning) =>
              set({
                adultWarning,
                ...(adultWarning ? { landingPage: { ...lp, enabled: false } } : {}),
              })
            }
          >
            {/* Where the link goes (with Template on, each section has its own link instead). */}
            {!lp.enabled ? (
              <div className="space-y-1.5 border-t pt-4">
                <Label htmlFor="destinationUrl" className="text-sm font-medium">
                  <ArrowUpRight className="size-4 text-primary" aria-hidden /> Destination
                </Label>
                <Input
                  id="destinationUrl"
                  aria-label="Destination URL"
                  inputMode="url"
                  placeholder="https://example.com/my-page"
                  value={v.destinationUrl}
                  onChange={(e) => set({ destinationUrl: e.target.value })}
                  aria-invalid={!!errors.destinationUrl}
                />
                {errors.destinationUrl ? <p className="text-sm text-destructive">{errors.destinationUrl}</p> : null}
              </div>
            ) : null}
            {v.adultWarning ? (
              <div className="space-y-5 border-t pt-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Design</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6" role="radiogroup" aria-label="Age check design">
                    {WARNING_TEMPLATES.map((t) => (
                      <TemplateTile key={t.key} template={t} selected={v.warningTemplate === t.key} onSelect={() => set({ warningTemplate: t.key })} />
                    ))}
                  </div>
                </div>

                <ProBlock
                  title="Colors"
                  locked={!limits.customWarningText}
                  action={
                    customColors && limits.customWarningText ? (
                      <button
                        type="button"
                        onClick={() => set({ warningColors: {} })}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="size-3" aria-hidden /> Reset to design
                      </button>
                    ) : null
                  }
                >
                  <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
                    {COLOR_FIELDS.filter((f) => hasCard || !f.cardOnly).map((f) => (
                      <ColorField
                        key={f.key}
                        label={f.label}
                        value={v.warningColors[f.key]}
                        fallback={solid(template, f.key)}
                        onChange={(c) => {
                          const next = { ...v.warningColors };
                          if (c) next[f.key] = c;
                          else delete next[f.key];
                          set({ warningColors: next });
                        }}
                      />
                    ))}
                  </div>
                </ProBlock>

                <ProBlock title="Wording" locked={!limits.customWarningText} hint="Empty = default wording in the visitor's language.">
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="warningTitle" className="text-xs text-muted-foreground">
                        Title
                      </Label>
                      <Input
                        id="warningTitle"
                        maxLength={80}
                        placeholder={tCopy.title}
                        value={v.warningTitle}
                        onChange={(e) => set({ warningTitle: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="warningMessage" className="text-xs text-muted-foreground">
                        Message
                      </Label>
                      <Textarea
                        id="warningMessage"
                        rows={2}
                        maxLength={300}
                        placeholder={tCopy.message}
                        value={v.warningMessage}
                        onChange={(e) => set({ warningMessage: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="warningButton" className="text-xs text-muted-foreground">
                        Button
                      </Label>
                      <Input
                        id="warningButton"
                        maxLength={40}
                        placeholder={tCopy.button}
                        value={v.warningButton}
                        onChange={(e) => set({ warningButton: e.target.value })}
                      />
                    </div>
                  </div>
                </ProBlock>

                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="badge" className="font-normal">
                    &ldquo;Made with&rdquo; badge {limits.removeBadge ? null : <Lock className="inline size-3.5 text-muted-foreground" aria-label="Pro" />}
                  </Label>
                  <Switch
                    id="badge"
                    aria-label="Show Made with badge"
                    disabled={!limits.removeBadge}
                    checked={limits.removeBadge ? v.showBadge : true}
                    onCheckedChange={(showBadge) => set({ showBadge })}
                  />
                </div>
              </div>
            ) : null}
          </ToggleSection>
        )}

        {/* 5. Note, status, save */}
        <Card size="sm">
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="label">Note</Label>
              <Input
                id="label"
                maxLength={80}
                placeholder="Only you see this, e.g. Instagram bio"
                value={v.label}
                onChange={(e) => set({ label: e.target.value })}
              />
            </div>
            {id ? (
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>
                  <span className="font-medium">Active</span>
                  <span className="block text-xs text-muted-foreground">Off: the link stops working (404).</span>
                </span>
                <Switch checked={v.enabled} onCheckedChange={(enabled) => set({ enabled })} aria-label="Link is active" />
              </label>
            ) : null}
          </CardContent>
        </Card>

        <div
          className="sticky bottom-3 z-20 flex items-center gap-3 rounded-xl border bg-card/95 p-2.5 pl-4 shadow-2xl shadow-black/50 backdrop-blur"
          data-testid="save-bar"
        >
          <p className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:block">
            {id ? dirty ? <span className="text-foreground">You have unsaved changes</span> : "All changes saved" : "Ready when you are"}
          </p>
          <Link href={listHref} className="px-2 text-sm text-muted-foreground hover:text-foreground sm:order-none">
            Cancel
          </Link>
          <Button
            size="lg"
            className="flex-1 sm:flex-none"
            onClick={save}
            disabled={
              saving || (!v.atRoot && slugState === "bad") || !v.slug || (lp.enabled ? !lp.sections.some((x) => x.kind === "link" && x.url) : !v.destinationUrl)
            }
          >
            {saving ? <Loader2 className="animate-spin" /> : null} {id ? "Save link" : "Create link"}
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <div className="mb-3 flex h-8 items-center justify-center gap-3">
          <p className="text-sm font-medium text-muted-foreground">{showPage ? "Live preview · tap to edit" : "Live preview"}</p>
          {showPage ? (
            <div className="flex rounded-lg border bg-muted p-0.5 text-xs" role="tablist" aria-label="Step">
              {([1, 2] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="tab"
                  aria-selected={step === n}
                  onClick={() => {
                    setStep(n);
                    if (n === 1 && !lp.introSections.length) setLanding({ introSections: [defaultIntroSection()] });
                    setSelectedSection(null);
                    setStyleOpen(null);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1 font-medium",
                    step === n ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Step {n}
                </button>
              ))}
            </div>
          ) : null}
          {showPage && popupFor ? (
            <button
              type="button"
              onClick={() => setPopupFor(null)}
              className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Hide 18+ popup
            </button>
          ) : null}
        </div>
        <PhoneMockup
          address={address}
          statusColor={showPage ? (lp.theme === "dark" ? "#ffffff" : "#111113") : v.adultWarning ? styled.text : "#fafafa"}
          background={showPage ? (lp.theme === "dark" ? "#111113" : "#f6f6f7") : v.adultWarning ? styled.pageBg : "#0a0a0a"}
        >
          {showPage ? (
            <LandingPhone
              page={lp}
              onChange={setLanding}
              render={{
                fallbackName: "Name",
                showBadge: limits.removeBadge ? v.showBadge : true,
                now,
                selected: selectedSection,
              }}
              popupFor={popupFor}
              onClosePopup={() => setPopupFor(null)}
              onSelect={setSelectedSection}
              step={step}
              onOpenStyle={(id) => {
                setSelectedSection(id);
                setStyleOpen(id);
                setTimeout(() => document.getElementById(`sec-editor-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
              }}
            />
          ) : v.adultWarning ? (
            <div aria-label="Age check preview" className="flex">
              <WarningScreen
                preview
                template={template}
                colors={colors}
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
          ) : (
            <div aria-label="Direct link preview" className="flex flex-col items-center justify-center gap-4 px-8 text-center text-[#fafafa]">
              <span className="grid size-20 place-items-center rounded-full bg-[var(--sage)]/15 text-[var(--sage-text)]">
                <ArrowUpRight className="size-10" aria-hidden />
              </span>
              <div>
                <p className="text-2xl font-semibold">No age check</p>
                <p className="mt-1.5 text-base text-white/60">
                  Goes straight to <span className="font-medium break-all text-white">{host || "your destination"}</span>
                </p>
              </div>
              {v.openInBrowser ? (
                <p className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/70">Opens in Safari from Instagram &amp; TikTok</p>
              ) : null}
            </div>
          )}
        </PhoneMockup>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2.5">
          <SectionIcon>{icon}</SectionIcon>
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ToggleSection({
  icon,
  title,
  hint,
  checked,
  onChange,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <Card size="sm">
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2.5">
          <SectionIcon>{icon}</SectionIcon>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
          <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function SectionIcon({ children }: { children: ReactNode }) {
  return <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">{children}</span>;
}

function ProBlock({ title, locked, hint, action, children }: { title: string; locked: boolean; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {title}
          {locked ? <Lock className="size-3.5 text-muted-foreground" aria-label="Pro" /> : null}
        </p>
        {locked ? (
          <Link href="/dashboard/billing" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
            Upgrade to customise
          </Link>
        ) : (
          action
        )}
      </div>
      {hint ? <p className="-mt-2 text-xs text-muted-foreground">{hint}</p> : null}
      <fieldset disabled={locked} className={cn(locked && "opacity-60")}>
        {children}
      </fieldset>
    </div>
  );
}

function ColorField({ label, value, fallback, onChange }: { label: string; value?: string; fallback: string; onChange: (v: string | undefined) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const id = `wc-${label.replace(/\s/g, "-").toLowerCase()}`;
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={`${label} color`}
        value={value ?? fallback}
        onChange={(e) => onChange(e.target.value)}
        className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5 disabled:cursor-not-allowed"
      />
      <Label htmlFor={id} className="w-24 shrink-0 text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        aria-label={`${label} hex`}
        value={draft ?? value ?? ""}
        placeholder={fallback}
        maxLength={7}
        spellCheck={false}
        className="h-9 min-w-0 font-mono text-xs uppercase"
        onChange={(e) => {
          const raw = e.target.value.trim();
          const next = raw && !raw.startsWith("#") ? `#${raw}` : raw;
          setDraft(next);
          if (!next) onChange(undefined);
          else if (isHexColor(next)) onChange(normalizeHex(next));
        }}
        onBlur={() => setDraft(null)}
      />
    </div>
  );
}

/** An iPhone-style frame: rounded body, Dynamic Island, status bar, Safari-like address pill. */
function PhoneMockup({ address, statusColor, background, children }: { address: string; statusColor: string; background?: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-[300px] max-w-full rounded-[52px] bg-[#1b1b1d] p-[10px] shadow-2xl ring-1 ring-white/10" data-testid="phone-preview">
      <div className="relative h-[600px] overflow-hidden rounded-[42px]" style={{ background }}>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-11 items-center justify-between px-7 pt-1 text-[13px] font-semibold"
          style={{ color: statusColor }}
        >
          <span>9:41</span>
          <span className="absolute top-2.5 left-1/2 h-[26px] w-[88px] -translate-x-1/2 rounded-full bg-black" aria-hidden />
          <span className="flex items-center gap-1" aria-hidden>
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
              <rect x="0" y="7" width="3" height="4" rx="1" />
              <rect x="4.5" y="5" width="3" height="6" rx="1" />
              <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
              <rect x="13.5" y="0" width="3" height="11" rx="1" />
            </svg>
            <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
              <path d="M7.5 2.2c2 0 3.9.8 5.3 2.1l1-1A8.9 8.9 0 0 0 7.5.8 8.9 8.9 0 0 0 1.2 3.3l1 1a7.5 7.5 0 0 1 5.3-2.1Zm0 3c1.2 0 2.3.4 3.2 1.2l1-1a6 6 0 0 0-8.4 0l1 1c.9-.8 2-1.2 3.2-1.2Zm0 3a1.5 1.5 0 1 0 0 2.9 1.5 1.5 0 0 0 0-2.9Z" />
            </svg>
            <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
              <rect x=".5" y=".5" width="21" height="11" rx="3.5" stroke="currentColor" opacity=".4" />
              <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" />
              <path d="M23 4v4c.8-.3 1.3-1.1 1.3-2S23.8 4.3 23 4Z" fill="currentColor" opacity=".4" />
            </svg>
          </span>
        </div>
        {/* Rendered at a real phone width (~370px) and scaled to fit the frame. */}
        <div className="absolute inset-x-0 top-11 bottom-[68px] overflow-auto [scrollbar-width:none]">
          <div className="flex min-h-full *:flex-1" style={{ zoom: 0.75 }}>
            {children}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-3 bottom-6 z-10 flex h-9 items-center justify-center gap-1.5 rounded-full bg-black/55 px-4 text-xs text-white/90 backdrop-blur-md">
          <Lock className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{address}</span>
        </div>
        <div
          className="pointer-events-none absolute bottom-2 left-1/2 z-10 h-1 w-28 -translate-x-1/2 rounded-full"
          style={{ background: statusColor, opacity: 0.6 }}
          aria-hidden
        />
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
      className={cn(
        "overflow-hidden rounded-lg border text-left transition-shadow",
        selected ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-foreground/20",
      )}
    >
      <div className="flex h-14 items-center justify-center" style={{ background: t.pageBg }}>
        {t.layout === "bigtype" ? (
          <span className="text-lg font-black" style={{ color: t.accent }}>
            18+
          </span>
        ) : (
          <div
            className="flex w-14 flex-col items-center gap-1 px-1.5 py-1.5"
            style={{
              background: t.layout === "fullbleed" ? "transparent" : t.cardBg,
              border: t.layout === "fullbleed" ? "none" : `1px solid ${t.cardBorder}`,
              borderRadius: Math.min(t.radius, 6),
            }}
          >
            {t.layout === "split" ? <span className="h-1.5 w-full rounded-sm" style={{ background: t.accent }} /> : null}
            <span className="h-1 w-6 rounded" style={{ background: t.muted }} />
            <span
              className="h-2 w-9"
              style={{
                background: t.buttonBg,
                borderRadius: Math.min(t.radius, 4),
              }}
            />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-1 px-2 py-1 text-[11px] font-medium">
        <span className="truncate">{t.name}</span>
        {selected ? <Check className="size-3 shrink-0 text-primary" aria-hidden /> : null}
      </div>
    </button>
  );
}
