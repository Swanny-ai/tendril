"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  AtSign,
  ChevronDown,
  GripVertical,
  Image as ImageIcon,
  ImagePlus,
  LayoutList,
  Link2,
  Loader2,
  Palette,
  Plus,
  Sparkles,
  Timer,
  Trash2,
  Type,
  UserRound,
  X,
} from "lucide-react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { shrinkImage } from "@/lib/shrink-image";
import { SocialGlyph, socialMeta } from "@/components/public-page/social";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  blockIconHtml,
  cardAspect,
  defaultIntroSection,
  profileOf,
  profilePatch,
  type Profile,
  NAME_FONTS,
  nameFontsHref,
  LANDING_SOCIALS,
  SIMPLE_ICON_KEYS,
  LINK_ANIMS,
  MAX_SECTIONS,
  newSection,
  MAX_SOCIALS,
  type LandingPage,
  type LandingSection,
} from "@/lib/link-landing";
import { cn } from "@/lib/utils";
import type { SocialNetwork } from "@/lib/validation";
import { uploadLinkImageAction } from "./actions";

const ACCENTS = ["#f472d0", "#49f264", "#1d9bf0", "#e8457c", "#ff7a59", "#e9c46a", "#8f4fd0", "#ffffff"];

/** "2026-10-21T18:00:00.000Z" → value for <input type="datetime-local"> (local time). */
function toLocalInput(iso?: string) {
  const t = Date.parse(iso ?? "");
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Settings for a deep link's profile page ("Template"). */
export function LandingEditor({
  value: p,
  onChange,
  fallbackName,
  selected,
  onSelect,
  styleOpen,
  onStyleOpen,
  step = 2,
}: {
  value: LandingPage;
  onChange: (patch: Partial<LandingPage>) => void;
  fallbackName: string;
  /** The section picked on the phone (highlighted here). */
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  /** The section whose style panel is open. */
  styleOpen: string | null;
  onStyleOpen: (id: string | null) => void;
  /** The step shown in the preview: its sections are the ones edited here. */
  step?: 1 | 2;
}) {
  // Step 1 and Step 2 each have their own sections, cover, name, username and bio.
  const prof = profileOf(p, step);
  const setProf = (patch: Partial<Profile>) => onChange(profilePatch(step, patch));
  const list = step === 1 ? p.introSections : p.sections;
  const setList = (next: LandingSection[]) => onChange(step === 1 ? { introSections: next } : { sections: next });
  const setSection = (id: string, patch: Partial<LandingSection>) => setList(list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setList(next);
  };
  const add = (kind: LandingSection["kind"]) => setList([...list, newSection(kind)]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const unusedNetwork = LANDING_SOCIALS.find((n) => !p.socials.some((s) => s.network === n)) ?? "instagram";

  return (
    <div className="space-y-4">
      {/* Profile */}
      <Group title="Profile" icon={<UserRound />}>
        <ImagePicker
          label="Cover photo"
          url={prof.coverUrl}
          onChange={(coverUrl) => setProf({ coverUrl, coverX: 50, coverY: 50, coverZoom: 1 })}
          shape="wide"
        />
        {prof.coverUrl ? (
          <FrameAdjuster
            title="Adjust cover"
            url={prof.coverUrl}
            aspect="393.6/356.11"
            x={prof.coverX}
            y={prof.coverY}
            zoom={prof.coverZoom}
            onChange={(f) => setProf({ coverX: f.x ?? prof.coverX, coverY: f.y ?? prof.coverY, coverZoom: f.zoom ?? prof.coverZoom })}
          />
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="lp-name">
            <Input id="lp-name" maxLength={60} placeholder="Full name" value={prof.name} onChange={(e) => setProf({ name: e.target.value })} />
          </Field>
          <Field label="Username" htmlFor="lp-handle">
            <Input id="lp-handle" maxLength={60} placeholder="@username" value={prof.handle} onChange={(e) => setProf({ handle: e.target.value })} />
          </Field>
        </div>
        <Field label="Bio" htmlFor="lp-bio">
          <Textarea
            id="lp-bio"
            rows={2}
            maxLength={200}
            placeholder="Describe yourself in a few words"
            value={prof.bio}
            onChange={(e) => setProf({ bio: e.target.value })}
          />
        </Field>
        <Row label="Name style">
          <Segmented
            value={p.nameStyle}
            options={[
              ["wide", "WIDE CAPS"],
              ["normal", "Normal"],
            ]}
            onChange={(nameStyle) => onChange({ nameStyle })}
            label="Name style"
          />
        </Row>
        <NameFontPicker
          value={p.nameFont}
          bold={p.nameBold}
          sample={prof.name || fallbackName}
          onChange={({ font, bold }) => onChange({ ...(font !== undefined ? { nameFont: font } : {}), ...(bold !== undefined ? { nameBold: bold } : {}) })}
        />
        <label className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            Verified badge
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#1d9bf0"
                d="M12 1.5l2.4 1.8 3-.2 1 2.8 2.6 1.6-.7 2.9 1.2 2.7-2.2 2 .1 3-2.9.8-1.6 2.6-2.9-.8L12 22.5l-2.4-1.8-2.9.8-1.6-2.6-2.9-.8.1-3-2.2-2 1.2-2.7-.7-2.9L3.2 5.9l1-2.8 3 .2Z"
              />
              <path d="m8 12.2 2.7 2.7L16.2 9.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <Switch checked={p.verified} onCheckedChange={(verified) => onChange({ verified })} aria-label="Verified badge" />
        </label>
        <label className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            Available now
            <span className="relative flex size-2.5" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-green-500" />
            </span>
          </span>
          <Switch checked={p.availableNow} onCheckedChange={(availableNow) => onChange({ availableNow })} aria-label="Available now" />
        </label>
      </Group>

      {/* Socials */}
      <Group title="Social icons" icon={<AtSign />}>
        {p.socials.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border bg-muted">
              <SocialGlyph network={s.network} size={16} />
            </span>
            <select
              aria-label="Network"
              value={s.network}
              onChange={(e) => onChange({ socials: p.socials.map((x, j) => (j === i ? { ...x, network: e.target.value as SocialNetwork } : x)) })}
              className="h-9 w-32 shrink-0 cursor-pointer rounded-lg border bg-background px-2 text-sm"
            >
              {LANDING_SOCIALS.map((n) => (
                <option key={n} value={n}>
                  {socialMeta(n).label}
                </option>
              ))}
            </select>
            <Input
              aria-label={`${socialMeta(s.network).label} username or link`}
              placeholder="username or link"
              value={s.handle}
              onChange={(e) => onChange({ socials: p.socials.map((x, j) => (j === i ? { ...x, handle: e.target.value } : x)) })}
              className="h-9 min-w-0"
            />
            <IconButton label="Remove social" onClick={() => onChange({ socials: p.socials.filter((_, j) => j !== i) })}>
              <Trash2 />
            </IconButton>
          </div>
        ))}
        {p.socials.length < MAX_SOCIALS ? (
          <Button variant="outline" size="sm" onClick={() => onChange({ socials: [...p.socials, { network: unusedNetwork, handle: "" }] })}>
            <Plus /> Social icon
          </Button>
        ) : null}
      </Group>

      {/* Sections */}
      {step === 1 ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/10 p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Step 1: shown inside Instagram, TikTok, Facebook…</p>
            <p className="text-xs text-muted-foreground">
              {list.length
                ? "Visitors in a social app see this page first; its button opens Step 2. In Safari or Chrome they go straight to Step 2."
                : "Off: add a button to turn Step 1 on. Everyone goes straight to Step 2."}
            </p>
          </div>
          {list.length ? null : (
            <Button size="sm" onClick={() => setList([defaultIntroSection()])}>
              <Plus /> Turn on
            </Button>
          )}
        </div>
      ) : null}
      <Group title={step === 1 ? "Step 1 button" : "Sections"} icon={<LayoutList />}>
        {list.length > 1 ? <p className="text-xs text-muted-foreground">Drag ⠿ to change the order.</p> : null}
        <DndContext
          // Fixed id: dnd-kit otherwise numbers its aria ids with a counter, which differs between server and browser (hydration mismatch).
          id="landing-sections"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => onSelect?.(String(active.id))}
          onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id) return;
            const from = list.findIndex((x) => x.id === active.id);
            const to = list.findIndex((x) => x.id === over.id);
            setList(arrayMove(list, from, to));
          }}
        >
          <SortableContext items={list.map((x) => x.id)} strategy={verticalListSortingStrategy}>
            {list.map((s, i) => (
              <SortableSection
                key={s.id}
                id={s.id}
                onFocusCapture={() => onSelect?.(s.id)}
                className={cn(
                  "scroll-mt-24 space-y-2 rounded-lg border bg-card p-2.5 transition-shadow",
                  s.adult && "border-[var(--persimmon)]/50",
                  selected === s.id && "ring-2 ring-primary",
                )}
              >
                {(handle) => (
                  <>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="-ml-1 grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
                        aria-label={`Reorder ${s.title || "section"}`}
                        {...handle}
                      >
                        <GripVertical className="size-4" />
                      </button>
                      {s.kind === "countdown" ? (
                        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground [&_svg]:size-3.5">
                          <Timer />
                        </span>
                      ) : (
                        <IconPicker
                          value={s.icon ?? (s.kind === "link" ? "auto" : "none")}
                          canAuto={s.kind === "link"}
                          url={s.url}
                          fallback={s.kind === "link" ? s.imageUrl ? <ImageIcon /> : <Link2 /> : <Type />}
                          onChange={(icon) => setSection(s.id, { icon })}
                        />
                      )}
                      <Input
                        aria-label={s.kind === "link" ? "Link title" : s.kind === "text" ? "Text title" : "Countdown title"}
                        maxLength={80}
                        placeholder={s.kind === "link" ? "Title, e.g. My website" : s.kind === "text" ? "Heading" : "50% off ends in"}
                        value={s.title}
                        onChange={(e) => setSection(s.id, { title: e.target.value })}
                        className="h-8"
                      />
                      <IconButton label="Section style" onClick={() => onStyleOpen(styleOpen === s.id ? null : s.id)}>
                        <Palette className={cn((s.style || s.color || s.textColor) && "text-primary")} />
                      </IconButton>
                      <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                        <ArrowUp />
                      </IconButton>
                      <IconButton label="Move down" disabled={i === list.length - 1} onClick={() => move(i, 1)}>
                        <ArrowDown />
                      </IconButton>
                      <IconButton label="Remove section" onClick={() => setList(list.filter((x) => x.id !== s.id))}>
                        <Trash2 />
                      </IconButton>
                    </div>

                    {s.kind === "link" ? (
                      <>
                        <Input
                          aria-label="Link URL"
                          inputMode="url"
                          placeholder="https://example.com"
                          value={s.url ?? ""}
                          onChange={(e) => setSection(s.id, { url: e.target.value })}
                          className="h-8"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <ImagePicker
                            compact
                            label="Photo"
                            url={s.imageUrl ?? ""}
                            onChange={(imageUrl) => setSection(s.id, { imageUrl, imgX: 50, imgY: 50, imgZoom: 1 })}
                            shape="wide"
                          />
                          {s.imageUrl ? (
                            <>
                              <Segmented
                                value={s.size ?? "large"}
                                options={[
                                  ["large", "Full width"],
                                  ["small", "Half"],
                                ]}
                                onChange={(size) => setSection(s.id, { size })}
                                label="Card width"
                              />
                              <Chip on={!!s.highlight} onClick={() => setSection(s.id, { highlight: !s.highlight })}>
                                Glow border
                              </Chip>
                            </>
                          ) : null}
                        </div>
                      </>
                    ) : s.kind === "text" ? (
                      <Textarea
                        aria-label="Text"
                        rows={2}
                        maxLength={500}
                        placeholder="Write something"
                        value={s.body ?? ""}
                        onChange={(e) => setSection(s.id, { body: e.target.value })}
                      />
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <Label className="text-xs font-normal text-muted-foreground" htmlFor={`cd-${s.id}`}>
                          Ends
                        </Label>
                        <Input
                          id={`cd-${s.id}`}
                          type="datetime-local"
                          value={toLocalInput(s.endsAt)}
                          onChange={(e) => {
                            const t = Date.parse(e.target.value);
                            if (Number.isFinite(t)) setSection(s.id, { endsAt: new Date(t).toISOString() });
                          }}
                          className="h-8 w-auto"
                        />
                        <span className="text-xs text-muted-foreground">Then restarts every 24h.</span>
                      </div>
                    )}
                    {s.kind === "link" && s.imageUrl ? (
                      <FrameAdjuster
                        title="Adjust photo"
                        url={s.imageUrl}
                        aspect={cardAspect(s)}
                        x={s.imgX ?? 50}
                        y={s.imgY ?? 50}
                        zoom={s.imgZoom ?? 1}
                        onChange={(f) => setSection(s.id, { imgX: f.x ?? s.imgX, imgY: f.y ?? s.imgY, imgZoom: f.zoom ?? s.imgZoom })}
                        compact
                      />
                    ) : null}
                    {/* Size for every block; links can also animate. */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Size</span>
                      <Segmented
                        value={s.scale ?? "m"}
                        options={[
                          ["s", "S"],
                          ["m", "M"],
                          ["l", "L"],
                        ]}
                        onChange={(scale) => setSection(s.id, { scale })}
                        label="Block size"
                      />
                      <span className="text-xs text-muted-foreground">Text</span>
                      <Segmented
                        value={s.textSize ?? "m"}
                        options={[
                          ["s", "S"],
                          ["m", "M"],
                          ["l", "L"],
                          ["xl", "XL"],
                        ]}
                        onChange={(textSize) => setSection(s.id, { textSize })}
                        label="Text size"
                      />
                      <SectionFontPicker
                        value={s.font ?? ""}
                        bold={s.bold !== false}
                        sample={s.title || "Title"}
                        onChange={(patch) => setSection(s.id, patch)}
                      />
                      {s.kind === "link" ? <AnimPicker value={s.anim ?? "none"} onChange={(anim) => setSection(s.id, { anim })} /> : null}
                    </div>
                    {styleOpen === s.id ? <SectionStyle section={s} onChange={(patch) => setSection(s.id, patch)} /> : null}
                  </>
                )}
              </SortableSection>
            ))}
          </SortableContext>
        </DndContext>
        {step === 1 && list[0]?.kind === "link" && !list[0].url ? <p className="text-xs text-muted-foreground">Leave the link empty to open Step 2.</p> : null}
        {step === 1 ? (
          list.length ? null : (
            <Button variant="outline" size="sm" onClick={() => add("link")}>
              <Plus /> Button
            </Button>
          )
        ) : list.length < MAX_SECTIONS ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => add("link")}>
              <Plus /> Link
            </Button>
            <Button variant="outline" size="sm" onClick={() => add("text")}>
              <Plus /> Text
            </Button>
            <Button variant="outline" size="sm" onClick={() => add("countdown")}>
              <Plus /> Countdown
            </Button>
          </div>
        ) : null}
      </Group>

      {/* Style */}
      <Group title="Style" icon={<Palette />}>
        <Row label="Theme">
          <Segmented
            value={p.theme}
            options={[
              ["dark", "Dark"],
              ["light", "Light"],
            ]}
            onChange={(theme) => onChange({ theme })}
            label="Theme"
          />
        </Row>
        <Row label="Corners">
          <Segmented
            value={p.buttonShape}
            options={[
              ["rounded", "Rounded"],
              ["pill", "Pill"],
              ["square", "Square"],
            ]}
            onChange={(buttonShape) => onChange({ buttonShape })}
            label="Corners"
          />
        </Row>
        <Row label="Font">
          <Segmented
            value={p.font}
            options={[
              ["sans", "Sans"],
              ["serif", "Serif"],
              ["mono", "Mono"],
            ]}
            onChange={(font) => onChange({ font })}
            label="Font"
          />
        </Row>
        <Row label="Link buttons">
          <Segmented
            value={p.btnStyle}
            options={[
              ["glass", "Glass"],
              ["solid", "Solid"],
              ["outline", "Outline"],
            ]}
            onChange={(btnStyle) => onChange({ btnStyle })}
            label="Link button style"
          />
        </Row>
        <Row label="Button color">
          <ColorPick
            value={p.btnColor}
            auto={p.btnStyle === "solid" || p.btnStyle === "outline" ? "Accent" : "Glass"}
            presets={["#ffffff", "#111113", "#f472d0", "#49f264", "#1d9bf0", "#ff7a59"]}
            onChange={(btnColor) => onChange({ btnColor })}
            label="Button color"
          />
        </Row>
        <Row label="Button text">
          <ColorPick value={p.btnText} auto="Auto" presets={["#ffffff", "#111113"]} onChange={(btnText) => onChange({ btnText })} label="Button text color" />
        </Row>
        <Row label="Background">
          <div className="flex items-center gap-1.5">
            <Chip on={!p.bgColor} onClick={() => onChange({ bgColor: "" })}>
              From cover
            </Chip>
            {["#1a0f2e", "#2a0f1f", "#0f1f2a", "#0b0b0c"].map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Background ${c}`}
                aria-pressed={p.bgColor === c}
                onClick={() => onChange({ bgColor: c })}
                className={cn("size-6 rounded-full border border-white/20", p.bgColor === c && "ring-2 ring-primary ring-offset-2 ring-offset-card")}
                style={{ background: c }}
              />
            ))}
            <input
              type="color"
              aria-label="Custom background color"
              value={p.bgColor || "#1a0f2e"}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              className="size-7 cursor-pointer rounded-md border bg-transparent p-0.5"
            />
          </div>
        </Row>
        <Row label="Accent">
          <div className="flex flex-wrap items-center gap-1.5">
            {ACCENTS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Accent ${c}`}
                aria-pressed={p.accent === c}
                onClick={() => onChange({ accent: c })}
                className={cn("size-6 rounded-full border border-white/20", p.accent === c && "ring-2 ring-primary ring-offset-2 ring-offset-card")}
                style={{ background: c }}
              />
            ))}
            <input
              type="color"
              aria-label="Custom accent color"
              value={p.accent}
              onChange={(e) => onChange({ accent: e.target.value })}
              className="size-7 cursor-pointer rounded-md border bg-transparent p-0.5"
            />
          </div>
        </Row>
      </Group>
    </div>
  );
}

type Frame = { x?: number; y?: number; zoom?: number };

/** A fixed frame (same shape as on the page): drag the photo to move it, slider to zoom. */
function FrameAdjuster({
  title,
  url,
  aspect,
  x,
  y,
  zoom,
  onChange,
  compact,
}: {
  title: string;
  url: string;
  aspect: string;
  x: number;
  y: number;
  zoom: number;
  onChange: (f: Frame) => void;
  compact?: boolean;
}) {
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; w: number; h: number } | null>(null);
  return (
    <div className={cn("flex gap-3 rounded-lg border bg-background/40 p-2.5", compact ? "items-center" : "flex-col p-3 sm:flex-row sm:items-center")}>
      <div
        role="img"
        aria-label={`${title}. Drag to move.`}
        className={cn(
          "relative shrink-0 cursor-grab touch-none overflow-hidden rounded-lg ring-1 ring-white/15 select-none active:cursor-grabbing",
          compact ? "w-24" : "w-44",
        )}
        style={{ aspectRatio: aspect }}
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, cx: x, cy: y, w: r.width, h: r.height };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) onChange(dragFrame(d, e.clientX, e.clientY, zoom));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-no-repeat"
          style={{ backgroundImage: `url('${url}')`, backgroundPosition: `${x}% ${y}%`, transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%` }}
        />
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="border-[0.5px] border-white/40" />
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">Drag the photo here or on the phone.</p>
        </div>
        <label className="flex items-center gap-3 text-xs text-muted-foreground">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            aria-label={`${title} zoom`}
            onChange={(e) => onChange({ zoom: Number(e.target.value) })}
            className="min-w-0 flex-1 accent-[var(--primary)]"
          />
          <span className="w-9 text-right tabular-nums">{zoom.toFixed(1)}×</span>
        </label>
        <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => onChange({ x: 50, y: 50, zoom: 1 })}>
          Reset position
        </button>
      </div>
    </div>
  );
}

/** New focus point after dragging a photo by (clientX, clientY) from where the drag started. */
export function dragFrame(d: { x: number; y: number; cx: number; cy: number; w: number; h: number }, clientX: number, clientY: number, zoom: number): Frame {
  const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
  // Dragging right shows more of the left side, like moving a photo in a frame.
  const k = 100 / zoom;
  return { x: clamp(d.cx - ((clientX - d.x) / d.w) * k), y: clamp(d.cy - ((clientY - d.y) / d.h) * k) };
}

/** A section's own look: style (plain links), color and text color. */
function SectionStyle({ section: s, onChange }: { section: LandingSection; onChange: (patch: Partial<LandingSection>) => void }) {
  const plainLink = s.kind === "link" && !s.imageUrl;
  return (
    <div className="space-y-2 rounded-lg bg-muted/50 p-2.5">
      {plainLink ? (
        <Row label="Look">
          <Segmented
            value={s.style ?? ""}
            options={[
              ["", "Page"],
              ["glass", "Glass"],
              ["solid", "Solid"],
              ["outline", "Outline"],
            ]}
            onChange={(style) => onChange({ style })}
            label="Section look"
          />
        </Row>
      ) : null}
      <Row label={s.kind === "link" ? (plainLink ? "Color" : "Border") : "Background"}>
        <ColorPick
          value={s.color ?? ""}
          auto="Page"
          presets={["#ffffff", "#111113", "#f472d0", "#49f264", "#1d9bf0", "#ff7a59"]}
          onChange={(color) => onChange({ color })}
          label="Section color"
        />
      </Row>
      <Row label="Text">
        <ColorPick
          value={s.textColor ?? ""}
          auto="Page"
          presets={["#ffffff", "#111113"]}
          onChange={(textColor) => onChange({ textColor })}
          label="Section text color"
        />
      </Row>
    </div>
  );
}

function ColorPick({
  value,
  auto,
  presets,
  onChange,
  label,
}: {
  value: string;
  auto: string;
  presets: string[];
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip on={!value} onClick={() => onChange("")}>
        {auto}
      </Chip>
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`${label} ${c}`}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className={cn("size-6 rounded-full border border-white/20", value === c && "ring-2 ring-primary ring-offset-2 ring-offset-card")}
          style={{ background: c }}
        />
      ))}
      <input
        type="color"
        aria-label={`Custom ${label.toLowerCase()}`}
        value={value || "#ffffff"}
        onChange={(e) => onChange(e.target.value)}
        className="size-7 cursor-pointer rounded-md border bg-transparent p-0.5"
      />
    </div>
  );
}

/** Font of the name: tiles that show the name in each font (all fonts load once for the dashboard). */
function NameFontPicker({
  value,
  bold,
  sample,
  onChange,
}: {
  value: string;
  bold: boolean;
  sample: string;
  onChange: (patch: { font?: string; bold?: boolean }) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Name font</p>
        <WeightToggle bold={bold} onChange={(b) => onChange({ bold: b })} />
      </div>
      <FontGrid value={value} bold={bold} sample={sample} onPick={(font) => onChange({ font })} label="Name font" />
    </div>
  );
}

/** Bold / Regular switch for a font choice. */
function WeightToggle({ bold, onChange }: { bold: boolean; onChange: (bold: boolean) => void }) {
  return (
    <Segmented
      value={bold ? "bold" : "regular"}
      options={[
        ["bold", "Bold"],
        ["regular", "Regular"],
      ]}
      onChange={(v) => onChange(v === "bold")}
      label="Font weight"
    />
  );
}

/** Tiles showing a sample text in every font (fonts load once for the dashboard). */
function FontGrid({
  value,
  bold,
  sample,
  onPick,
  label,
  cols = "grid-cols-2 sm:grid-cols-4",
}: {
  value: string;
  bold: boolean;
  sample: string;
  onPick: (key: string) => void;
  label: string;
  cols?: string;
}) {
  const keys = Object.keys(NAME_FONTS);
  return (
    <>
      <link rel="stylesheet" href={nameFontsHref(keys)} />
      <div className={cn("grid gap-1.5", cols)} role="radiogroup" aria-label={label}>
        {["", ...keys].map((k) => {
          const f = k ? NAME_FONTS[k] : null;
          return (
            <button
              key={k || "page"}
              type="button"
              role="radio"
              aria-checked={value === k}
              aria-label={f ? f.label : "Page font"}
              onClick={() => onPick(k)}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border px-2 transition-colors",
                value === k ? "border-primary bg-primary/10" : "bg-background/40 hover:border-foreground/30",
              )}
            >
              <span
                className="w-full truncate text-center text-base leading-tight"
                style={{ ...(f ? { fontFamily: `'${f.family}', ${f.fallback}` } : {}), fontWeight: bold ? (f ? f.weight : 800) : 400 }}
              >
                {sample}
              </span>
              <span className="text-[10px] text-muted-foreground">{f ? f.label : "Page font"}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Per-section title font: a chip that opens the weight switch and the font tiles. */
function SectionFontPicker({
  value,
  bold,
  sample,
  onChange,
}: {
  value: string;
  bold: boolean;
  sample: string;
  onChange: (patch: { font?: string; bold?: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);
  const f = value ? NAME_FONTS[value] : null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`Title font: ${f ? f.label : "Page font"}`}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
              f || !bold ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          />
        }
      >
        <span style={f ? { fontFamily: `'${f.family}', ${f.fallback}` } : undefined} className="text-sm leading-none">
          Aa
        </span>
        {f ? f.label : "Font"}
        <ChevronDown className="size-3 opacity-60" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2 p-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-xs font-medium text-muted-foreground">Title font</p>
          <WeightToggle bold={bold} onChange={(b) => onChange({ bold: b })} />
        </div>
        <div className="max-h-72 overflow-y-auto pr-1">
          <FontGrid value={value} bold={bold} sample={sample} onPick={(font) => onChange({ font })} label="Title font" cols="grid-cols-2" />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** One block of template settings, styled like the other setting cards. */
/** A section card that can be dragged by its handle to change the order. */
function SortableSection({
  id,
  className,
  onFocusCapture,
  children,
}: {
  id: string;
  className: string;
  onFocusCapture: () => void;
  children: (handle: Record<string, unknown>) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      id={`sec-editor-${id}`}
      onFocusCapture={onFocusCapture}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(className, isDragging && "relative z-10 shadow-xl ring-2 ring-primary/50")}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

/** Icon picker: "Auto" (from the link's site), none, simple icons and network logos (same SVGs as the page). */
function IconPicker({
  value,
  canAuto,
  url,
  fallback,
  onChange,
}: {
  value: string;
  canAuto: boolean;
  url?: string;
  /** Shown in the button when the block has no icon. */
  fallback: ReactNode;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = [...(canAuto ? ["auto"] : []), "none", ...SIMPLE_ICON_KEYS, ...LANDING_SOCIALS];
  const preview = (key: string) => {
    const html = blockIconHtml(key, url, 16);
    return html ? <span className="grid place-items-center" dangerouslySetInnerHTML={{ __html: html }} /> : null;
  };
  const current = preview(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`Icon: ${value}`}
            title="Choose an icon"
            className={cn(
              "group relative grid size-8 shrink-0 place-items-center rounded-md border transition-colors [&_svg]:size-4",
              current ? "border-primary/60 bg-primary/10 text-foreground" : "border-dashed bg-muted text-muted-foreground hover:text-foreground",
            )}
          />
        }
      >
        {current ?? fallback}
        <ChevronDown className="absolute -right-1 -bottom-1 !size-3 rounded-full bg-background text-muted-foreground ring-1 ring-border" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Icon left of the text</p>
        <div className="grid grid-cols-6 gap-1" role="radiogroup" aria-label="Icon">
          {options.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={value === key}
              title={key === "auto" ? "Auto (from the link)" : key === "none" ? "No icon" : key}
              onClick={() => {
                onChange(key);
                setOpen(false);
              }}
              className={cn(
                "grid h-10 place-items-center rounded-lg border text-[10px] font-semibold transition-colors",
                value === key ? "border-primary bg-primary/10 text-foreground" : "border-transparent bg-muted/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {key === "auto" ? "Auto" : key === "none" ? <X className="size-4" aria-hidden /> : preview(key)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const ANIM_LABELS: Record<NonNullable<LandingSection["anim"]>, string> = {
  none: "None",
  pulse: "Pulse",
  shake: "Shake",
  glow: "Glow",
  bounce: "Bounce",
  shine: "Shine",
};

/** Animation picker: a chip that opens a grid of live previews. */
function AnimPicker({ value, onChange }: { value: NonNullable<LandingSection["anim"]>; onChange: (v: NonNullable<LandingSection["anim"]>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`Animation: ${ANIM_LABELS[value]}`}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
              value === "none" ? "text-muted-foreground hover:text-foreground" : "border-primary bg-primary/15 text-primary",
            )}
          />
        }
      >
        <Sparkles className="size-3.5" aria-hidden />
        {value === "none" ? "Animation" : ANIM_LABELS[value]}
        <ChevronDown className="size-3 opacity-60" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Animation</p>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Animation">
          {LINK_ANIMS.map((an) => (
            <button
              key={an}
              type="button"
              role="radio"
              aria-checked={value === an}
              onClick={() => {
                onChange(an);
                setOpen(false);
              }}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-2 text-[11px] font-medium transition-colors",
                value === an ? "border-primary bg-primary/10 text-foreground" : "border-transparent bg-muted/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {/* A tiny button playing the animation (classes from LANDING_CSS). */}
              <span
                className={cn("relative block h-4 w-12 overflow-hidden rounded-full bg-[#f472d0]", an !== "none" && `a-${an}`)}
                style={{ "--accent": "#f472d0" } as React.CSSProperties}
                aria-hidden
              />
              {ANIM_LABELS[an]}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Group({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">{icon}</span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ImagePicker({
  label,
  url,
  onChange,
  shape,
  compact,
}: {
  label: string;
  url: string;
  onChange: (url: string) => void;
  shape: "wide" | "round";
  compact?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", await shrinkImage(file));
      const res = await uploadLinkImageAction(fd);
      if (res.ok) onChange(res.url);
      else toast.error(res.error);
    } catch {
      toast.error("Upload failed. Please try another photo.");
    } finally {
      setBusy(false);
    }
  }
  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void upload(f);
        e.target.value = "";
      }}
    />
  );
  const thumb = (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      aria-label={`Upload ${label.toLowerCase()}`}
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden border bg-background bg-cover bg-center text-muted-foreground",
        shape === "wide" ? (compact ? "h-8 w-12 rounded-md" : "h-12 w-20 rounded-md") : "size-12 rounded-full",
      )}
      style={url ? { backgroundImage: `url('${url}')` } : undefined}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : url ? null : <ImagePlus className="size-4" />}
    </button>
  );
  if (compact)
    return (
      <div className="flex items-center gap-1.5">
        {thumb}
        {url ? (
          <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => onChange("")}>
            Remove photo
          </button>
        ) : (
          <button type="button" className="text-xs text-primary hover:underline" onClick={() => ref.current?.click()}>
            Add photo
          </button>
        )}
        {input}
      </div>
    );
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background/40 p-2">
      {thumb}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex gap-3 text-xs">
          <button type="button" className="text-primary hover:underline" onClick={() => ref.current?.click()}>
            {url ? "Change" : "Upload"}
          </button>
          {url ? (
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => onChange("")}>
              Remove
            </button>
          ) : null}
        </div>
      </div>
      {input}
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Chip({ on, onClick, tone, label, children }: { on: boolean; onClick: () => void; tone?: "warn"; label?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        on
          ? tone === "warn"
            ? "border-[var(--persimmon)] bg-[var(--persimmon)]/15 text-[var(--persimmon-text)]"
            : "border-primary bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="flex rounded-lg border bg-muted p-0.5 text-xs" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "rounded-md px-2.5 py-1 font-medium whitespace-nowrap",
            value === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}
