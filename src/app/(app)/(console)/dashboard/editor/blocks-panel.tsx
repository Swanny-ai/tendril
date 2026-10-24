"use client";

import { useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlignLeft, ChevronDown, GripVertical, Heading, ImagePlus, Link2, PlaySquare, Plus, ShieldAlert, Timer, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { shrinkImage } from "@/lib/shrink-image";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SOCIAL_LABELS } from "@/components/public-page/social";
import type { PlanName } from "@/lib/plan-rules";
import { cn } from "@/lib/utils";
import { SOCIAL_NETWORKS, type SocialNetwork } from "@/lib/validation";
import { embedSource, youtubeId, youtubeThumbnail } from "@/lib/blocks";
import { createBlockAction, deleteBlockAction, reorderBlocksAction, updateBlockAction, uploadBlockImageAction, type EditorBlock } from "./actions";
import type { Limits } from "./editor";
import { queueSave, runSave, useEditor } from "./store";

const TYPE_META = {
  LINK: { label: "Link", icon: Link2, hint: "A button that opens a URL" },
  HEADER: { label: "Section header", icon: Heading, hint: "A label to group links" },
  TEXT: { label: "Text", icon: AlignLeft, hint: "A short paragraph" },
  SOCIAL_ROW: { label: "Social icons", icon: Users, hint: "A row of profile links" },
  EMBED: { label: "Video or music", icon: PlaySquare, hint: "A YouTube or Spotify player" },
  COUNTDOWN: { label: "Countdown", icon: Timer, hint: "A timer for a sale or launch" },
} as const;

const onError = (m: string) => toast.error(m);

export function BlocksPanel({ limits, plan }: { limits: Limits; plan: PlanName }) {
  const blocks = useEditor((s) => s.blocks);
  const setBlocks = useEditor((s) => s.setBlocks);
  const [openId, setOpenId] = useState<string | null>(null);
  const atLimit = blocks.length >= limits.maxBlocks;
  const label = (id: string | number) => {
    const b = blocks.find((x) => x.id === id);
    return b ? b.title || TYPE_META[b.type].label : "block";
  };
  const pos = (id: string | number) => blocks.findIndex((x) => x.id === id) + 1;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function add(type: EditorBlock["type"]) {
    await runSave(async () => {
      const res = await createBlockAction(type);
      if (res.ok && res.data) {
        setBlocks([...useEditor.getState().blocks, res.data]);
        setOpenId(res.data.id);
      }
      return res;
    }, onError);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const current = useEditor.getState().blocks;
    const from = current.findIndex((b) => b.id === active.id);
    const to = current.findIndex((b) => b.id === over.id);
    const next = arrayMove(current, from, to).map((b, i) => ({ ...b, position: i }));
    setBlocks(next);
    void runSave(() => reorderBlocksAction(next.map((b) => b.id)), onError);
  }

  function remove(block: EditorBlock) {
    const before = useEditor.getState().blocks;
    setBlocks(before.filter((b) => b.id !== block.id).map((b, i) => ({ ...b, position: i })));
    // Delete after a short grace period so "Undo" can cancel it.
    let undone = false;
    const timer = setTimeout(() => {
      if (!undone) void runSave(() => deleteBlockAction(block.id), onError);
    }, 5000);
    toast(`Deleted "${block.title || TYPE_META[block.type].label}"`, {
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          clearTimeout(timer);
          setBlocks(before);
        },
      },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {blocks.length} / {limits.maxBlocks >= 200 ? "∞" : limits.maxBlocks} blocks
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button disabled={atLimit} />}>
            <Plus /> Add block
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {(Object.keys(TYPE_META) as EditorBlock["type"][]).map((t) => {
              const M = TYPE_META[t];
              return (
                <DropdownMenuItem key={t} onClick={() => void add(t)}>
                  <M.icon />
                  <div>
                    <div className="font-medium">{M.label}</div>
                    <div className="text-xs text-muted-foreground">{M.hint}</div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {atLimit && plan === "FREE" ? (
        <p className="rounded-lg border border-[var(--persimmon)]/40 bg-[var(--persimmon)]/10 px-3 py-2 text-sm">
          You&apos;ve reached the {limits.maxBlocks}-block limit on Free.{" "}
          <Link href="/dashboard/billing" className="font-medium underline underline-offset-4">
            Upgrade to Pro
          </Link>{" "}
          for unlimited blocks.
        </p>
      ) : null}

      {blocks.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          Your page is empty. Add your first link to get started.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            announcements: {
              onDragStart: ({ active }) => `Picked up ${label(active.id)}.`,
              onDragOver: ({ active, over }) => (over ? `${label(active.id)} is now at position ${pos(over.id)} of ${blocks.length}.` : undefined),
              onDragEnd: ({ active, over }) => (over ? `Moved ${label(active.id)} to position ${pos(over.id)}.` : `Dropped ${label(active.id)}.`),
              onDragCancel: ({ active }) => `Cancelled moving ${label(active.id)}.`,
            },
          }}
        >
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2.5" aria-label="Blocks">
              {blocks.map((b, i) => (
                <SortableBlock
                  key={b.id}
                  block={b}
                  hiddenByPlan={i >= limits.maxBlocks}
                  open={openId === b.id}
                  onToggle={() => setOpenId(openId === b.id ? null : b.id)}
                  onRemove={() => remove(b)}
                  canCustomWarning={limits.customWarningText}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableBlock({
  block,
  open,
  onToggle,
  onRemove,
  hiddenByPlan,
  canCustomWarning,
}: {
  block: EditorBlock;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
  hiddenByPlan: boolean;
  canCustomWarning: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const patchBlock = useEditor((s) => s.patchBlock);
  const M = TYPE_META[block.type];

  function save(patch: Partial<EditorBlock> & { data?: EditorBlock["data"] }, immediate = false) {
    patchBlock(block.id, patch);
    const payload = { ...patch } as Record<string, unknown>;
    delete payload.position;
    const run = async () => {
      const res = await updateBlockAction(block.id, payload);
      if (res.ok && res.data && patch.url !== undefined) patchBlock(block.id, { url: res.data.url });
      return res;
    };
    if (immediate) void runSave(run, onError);
    else queueSave(`block:${block.id}:${Object.keys(payload).join(",")}`, run, onError);
  }

  const summary =
    block.type === "LINK"
      ? block.url ?? "No URL yet"
      : block.type === "TEXT"
        ? block.data.text ?? ""
        : block.type === "SOCIAL_ROW"
          ? `${block.data.socials?.length ?? 0} profiles`
          : block.type === "EMBED"
            ? block.url ?? "No video yet"
            : block.type === "COUNTDOWN" && block.data.until
              ? `Ends ${new Date(block.data.until).toLocaleString()}`
              : "";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("rounded-xl border bg-card shadow-xs", isDragging && "z-10 shadow-lg ring-2 ring-ring/40", !block.enabled && "opacity-70")}
    >
      <div className="flex items-center gap-2 p-2.5">
        <button
          type="button"
          className="cursor-grab touch-none rounded-md p-1.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label={`Reorder ${block.title || M.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <M.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left" aria-expanded={open}>
          <div className="flex items-center gap-2 truncate text-sm font-medium">
            {block.title || M.label}
            {block.contentWarning ? <ShieldAlert className="size-3.5 text-[var(--persimmon)]" aria-label="Has content warning" /> : null}
          </div>
          {summary ? <div className="truncate text-xs text-muted-foreground">{summary}</div> : null}
          {hiddenByPlan ? <div className="text-xs text-destructive">Hidden: over your plan&apos;s block limit</div> : null}
        </button>
        <Switch checked={block.enabled} onCheckedChange={(v) => save({ enabled: v }, true)} aria-label={block.enabled ? "Hide block" : "Show block"} />
        <Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label={open ? "Collapse" : "Expand"}>
          <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
        </Button>
      </div>

      {open ? (
        <div className="space-y-4 border-t p-4">
          {block.type === "LINK" || block.type === "HEADER" || block.type === "EMBED" || block.type === "COUNTDOWN" ? (
            <div className="space-y-1.5">
              <Label htmlFor={`title-${block.id}`}>{block.type === "LINK" ? "Title" : block.type === "HEADER" ? "Heading" : block.type === "EMBED" ? "Caption (optional)" : "Label"}</Label>
              <Input id={`title-${block.id}`} value={block.title} maxLength={100} onChange={(e) => save({ title: e.target.value })} />
            </div>
          ) : null}

          {block.type === "LINK" ? (
            <>
              <UrlField block={block} onSave={(url) => save({ url }, true)} />
              <ImageCardEditor block={block} onSave={(data) => save({ data: { ...block.data, ...data } }, true)} />
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor={`cw-${block.id}`}>Content warning</Label>
                    <p className="text-sm text-muted-foreground">Visitors confirm before they continue to this link.</p>
                  </div>
                  <Switch id={`cw-${block.id}`} aria-label="Content warning" checked={block.contentWarning} onCheckedChange={(v) => save({ contentWarning: v }, true)} />
                </div>
                {block.contentWarning ? (
                  <div className="space-y-1.5">
                    <Label htmlFor={`cwt-${block.id}`}>Warning text {canCustomWarning ? "" : "(Pro)"}</Label>
                    <Textarea
                      id={`cwt-${block.id}`}
                      rows={2}
                      maxLength={200}
                      disabled={!canCustomWarning}
                      placeholder="This link may contain sensitive content. Continue?"
                      value={block.contentWarningText ?? ""}
                      onChange={(e) => save({ contentWarningText: e.target.value })}
                    />
                    {!canCustomWarning ? (
                      <p className="text-xs text-muted-foreground">
                        Free pages use the default text.{" "}
                        <Link href="/dashboard/billing" className="text-primary underline-offset-4 hover:underline">
                          Upgrade
                        </Link>{" "}
                        to write your own.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {block.type === "TEXT" ? (
            <div className="space-y-1.5">
              <Label htmlFor={`text-${block.id}`}>Text</Label>
              <Textarea
                id={`text-${block.id}`}
                rows={3}
                maxLength={500}
                value={block.data.text ?? ""}
                onChange={(e) => save({ data: { ...block.data, text: e.target.value } })}
              />
            </div>
          ) : null}

          {block.type === "EMBED" ? <UrlField block={block} embed onSave={(url) => save({ url }, true)} /> : null}

          {block.type === "COUNTDOWN" ? <CountdownEditor block={block} onSave={(until) => save({ data: { ...block.data, until } }, true)} /> : null}

          {block.type === "SOCIAL_ROW" ? <SocialEditor block={block} onSave={(socials) => save({ data: { ...block.data, socials } })} /> : null}

          <div className="flex justify-end">
            <Button variant="destructive" size="sm" onClick={onRemove}>
              <Trash2 /> Delete block
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function UrlField({ block, onSave, embed = false }: { block: EditorBlock; onSave: (url: string) => void; embed?: boolean }) {
  const [value, setValue] = useState(block.url ?? "");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`url-${block.id}`}>{embed ? "YouTube or Spotify link" : "URL"}</Label>
      <Input
        id={`url-${block.id}`}
        value={value}
        inputMode="url"
        aria-label={embed ? "Video or music link" : "Destination URL"}
        placeholder={embed ? "https://www.youtube.com/watch?v=..." : "https://"}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value.trim() !== (block.url ?? "")) onSave(value.trim());
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      {embed ? (
        <p className="text-xs text-muted-foreground">
          {value && !embedSource(value) ? "That isn’t a YouTube or Spotify link yet." : "Paste a YouTube video or Short, or a Spotify track, album or playlist."}
        </p>
      ) : !block.url ? (
        <p className="text-xs text-muted-foreground">Links without a URL stay hidden on your page.</p>
      ) : null}
    </div>
  );
}

function SocialEditor({ block, onSave }: { block: EditorBlock; onSave: (s: { network: string; handle: string }[]) => void }) {
  const socials = block.data.socials ?? [];
  const [network, setNetwork] = useState<SocialNetwork>("instagram");
  const [handle, setHandle] = useState("");

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {socials.map((s, i) => (
          <li key={`${s.network}-${i}`} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <span className="w-24 shrink-0 font-medium">{SOCIAL_LABELS[s.network as SocialNetwork] ?? s.network}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.handle}</span>
            <Button variant="ghost" size="icon-xs" aria-label={`Remove ${s.network}`} onClick={() => onSave(socials.filter((_, j) => j !== i))}>
              <X />
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!handle.trim() || socials.length >= 12) return;
          onSave([...socials, { network, handle: handle.trim() }]);
          setHandle("");
        }}
      >
        <Select value={network} onValueChange={(v) => setNetwork(v as SocialNetwork)}>
          <SelectTrigger className="w-36" aria-label="Network">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOCIAL_NETWORKS.map((n) => (
              <SelectItem key={n} value={n}>
                {SOCIAL_LABELS[n]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input className="min-w-40 flex-1" placeholder={network === "email" ? "you@example.com" : "@handle"} value={handle} onChange={(e) => setHandle(e.target.value)} aria-label="Handle" />
        <Button type="submit" variant="outline" disabled={!handle.trim()}>
          Add
        </Button>
      </form>
    </div>
  );
}

function ImageCardEditor({ block, onSave }: { block: EditorBlock; onSave: (data: { imageUrl?: string; style?: "button" | "card" }) => void }) {
  const [busy, setBusy] = useState(false);
  const card = (block.data.style ?? (youtubeId(block.url) ? "card" : "button")) === "card";
  const cover = youtubeThumbnail(block.url);
  const picture = block.data.imageUrl || cover;
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor={`card-${block.id}`}>Show as image card</Label>
          <p className="text-sm text-muted-foreground">
            {cover && !block.data.imageUrl ? "Using the video's cover. Upload an image to replace it." : "A picture with the title, used by the photo templates."}
          </p>
        </div>
        <Switch id={`card-${block.id}`} aria-label="Show as image card" checked={card} onCheckedChange={(v) => onSave({ style: v ? "card" : "button" })} />
      </div>
      {card ? (
        <div className="flex items-center gap-3">
          {picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picture} alt="" className="size-16 rounded-lg border object-cover" />
          ) : (
            <div className="grid size-16 place-items-center rounded-lg border border-dashed text-muted-foreground">
              <ImagePlus className="size-5" />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <label className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted", busy && "pointer-events-none opacity-60")}>
              <ImagePlus className="size-4" /> {block.data.imageUrl ? "Replace image" : "Upload image"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                aria-label="Link image"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setBusy(true);
                  const form = new FormData();
                  form.append("file", await shrinkImage(file));
                  const res = await uploadBlockImageAction(form);
                  setBusy(false);
                  if (!res.ok || !res.data) {
                    toast.error(res.ok ? "Upload failed" : res.error);
                    return;
                  }
                  onSave({ imageUrl: res.data.url });
                }}
              />
            </label>
            {block.data.imageUrl ? (
              <Button variant="ghost" size="sm" onClick={() => onSave({ imageUrl: "" })}>
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toLocalInput(iso: string | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CountdownEditor({ block, onSave }: { block: EditorBlock; onSave: (until: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`until-${block.id}`}>Ends at</Label>
      <Input
        id={`until-${block.id}`}
        type="datetime-local"
        defaultValue={toLocalInput(block.data.until)}
        onChange={(e) => {
          const d = new Date(e.target.value);
          if (!Number.isNaN(d.getTime())) onSave(d.toISOString());
        }}
      />
      <p className="text-xs text-muted-foreground">In your local time. Visitors see the time left, then “Ended”.</p>
    </div>
  );
}
