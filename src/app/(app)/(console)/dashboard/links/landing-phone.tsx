"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  LANDING_CSS,
  landingHtml,
  MAX_SECTIONS,
  newSection,
  profileOf,
  profilePatch,
  type Profile,
  type LandingPage,
  type LandingRenderInput,
  type LandingSection,
} from "@/lib/link-landing";
import { uploadLinkImageAction } from "./actions";
import { dragFrame } from "./landing-editor";

type Editing = { key: string; rect: DOMRect };

/**
 * The profile page inside the phone preview, editable in place: click the name, username, bio or a
 * section's text to type over it, drag the cover or a photo card to move the photo, click a section
 * to jump to its settings.
 */
export function LandingPhone({
  page: p,
  onChange,
  render,
  popupFor,
  onClosePopup,
  onSelect,
  onOpenStyle,
  step = 2,
}: {
  page: LandingPage;
  onChange: (patch: Partial<LandingPage>) => void;
  render: Omit<LandingRenderInput, "page" | "preview">;
  popupFor: string | null;
  onClosePopup: () => void;
  onSelect: (id: string | null) => void;
  onOpenStyle: (id: string) => void;
  step?: 1 | 2;
}) {
  // Step 1 and Step 2 each have their own sections, cover, name, username and bio.
  const prof = profileOf(p, step);
  const setProf = (patch: Partial<Profile>) => onChange(profilePatch(step, patch));
  const list = step === 1 ? p.introSections : p.sections;
  const setList = (next: LandingSection[]) => onChange(step === 1 ? { introSections: next } : { sections: next });
  const drag = useRef<{ key: string; x: number; y: number; cx: number; cy: number; w: number; h: number; zoom: number; moved: boolean } | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<"cover" | "photo">("photo");

  async function upload(f: File) {
    const fd = new FormData();
    fd.set("file", f);
    try {
      const res = await uploadLinkImageAction(fd);
      if (!res.ok) return toast.error(res.error);
      if (uploadFor.current === "cover") setProf({ coverUrl: res.url, coverX: 50, coverY: 50, coverZoom: 1 });
      else {
        const s = newSection("link", { imageUrl: res.url, title: "", imgX: 50, imgY: 50, imgZoom: 1 });
        setList([...list, s]);
        onSelect(s.id);
      }
    } catch {
      toast.error("Upload failed. Try a smaller image (max 4 MB).");
    }
  }

  /** Toolbar buttons and "Add a section" on the phone. */
  function act(action: string) {
    const [verb, id] = action.split(":");
    const i = list.findIndex((s) => s.id === id);
    if (verb === "style") return onOpenStyle(id);
    // Cover arrows: move the photo up or down in its frame (up shows more of the bottom).
    if (verb === "cover") return setProf({ coverY: Math.min(100, Math.max(0, prof.coverY + (id === "up" ? 8 : -8))) });
    if (verb === "del") {
      onSelect(null);
      return setList(list.filter((s) => s.id !== id));
    }
    if (verb === "dup" && i >= 0 && list.length < MAX_SECTIONS) {
      const copy = { ...list[i], id: Math.random().toString(36).slice(2, 10) };
      onSelect(copy.id);
      return setList([...list.slice(0, i + 1), copy, ...list.slice(i + 1)]);
    }
    if ((verb === "up" && i > 0) || (verb === "down" && i >= 0 && i < list.length - 1)) {
      const next = [...list];
      const j = verb === "up" ? i - 1 : i + 1;
      [next[i], next[j]] = [next[j], next[i]];
      return setList(next);
    }
  }
  function add(kind: string) {
    // The cover can always be added (on Step 1 too); Step 1 itself holds only one button.
    if (kind === "cover") {
      uploadFor.current = "cover";
      return file.current?.click();
    }
    if (step === 1 && (list.length >= 1 || kind !== "link")) return;
    if (kind === "photo") {
      uploadFor.current = "photo";
      return file.current?.click();
    }
    if (list.length >= MAX_SECTIONS) return toast.error(`Up to ${MAX_SECTIONS} sections.`);
    const s = newSection(kind as LandingSection["kind"]);
    setList([...list, s]);
    onSelect(s.id);
    setTimeout(() => document.getElementById(`sec-editor-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  const setSection = (id: string, patch: Partial<LandingSection>) => setList(list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const valueOf = (key: string) => {
    if (key === "name" || key === "handle" || key === "bio") return prof[key];
    const [, id, field] = key.split(":");
    const s = list.find((x) => x.id === id);
    return (field === "body" ? s?.body : s?.title) ?? "";
  };
  const setValue = (key: string, value: string) => {
    if (key === "name" || key === "handle" || key === "bio")
      return setProf(key === "name" ? { name: value } : key === "handle" ? { handle: value } : { bio: value });
    const [, id, field] = key.split(":");
    setSection(id, field === "body" ? { body: value } : { title: value });
  };

  // The text box floats over the page and follows its text when anything scrolls.
  const root = useRef<HTMLDivElement>(null);
  const editingKey = editing?.key;
  useEffect(() => {
    if (!editingKey) return;
    const follow = () => {
      const el = root.current?.querySelector<HTMLElement>(`[data-edit="${CSS.escape(editingKey)}"]`);
      if (el) setEditing({ key: editingKey, rect: el.getBoundingClientRect() });
      else setEditing(null);
    };
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [editingKey]);

  return (
    <div
      ref={root}
      aria-label="Profile page preview"
      className="flex touch-pan-y"
      onPointerDown={(e) => {
        if (popupFor) return;
        const target = e.target as Element;
        const frameEl = target.closest<HTMLElement>("[data-drag]");
        if (!frameEl) return;
        const key = frameEl.dataset.drag!;
        const box = (key === "cover" ? frameEl : frameEl.parentElement!).getBoundingClientRect();
        const s = key.startsWith("sec:") ? list.find((x) => x.id === key.slice(4)) : null;
        drag.current = {
          key,
          x: e.clientX,
          y: e.clientY,
          cx: s ? (s.imgX ?? 50) : prof.coverX,
          cy: s ? (s.imgY ?? 50) : prof.coverY,
          zoom: s ? (s.imgZoom ?? 1) : prof.coverZoom,
          w: box.width,
          h: box.height,
          moved: false,
        };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) return;
        // Capture only once it's a real drag, so plain taps still reach the text under the finger.
        if (!d.moved) e.currentTarget.setPointerCapture(e.pointerId);
        d.moved = true;
        const f = dragFrame(d, e.clientX, e.clientY, d.zoom);
        if (d.key === "cover") setProf({ coverX: f.x, coverY: f.y });
        else setSection(d.key.slice(4), { imgX: f.x, imgY: f.y });
      }}
      onPointerUp={() => {
        // A drag that moved isn't a click.
        if (drag.current?.moved) setTimeout(() => (drag.current = null));
        else drag.current = null;
      }}
      onClick={(e) => {
        if (drag.current?.moved) return;
        if (popupFor) return onClosePopup();
        const target = e.target as Element;
        const action = target.closest<HTMLElement>("[data-act]")?.dataset.act;
        if (action) return act(action);
        const adding = target.closest<HTMLElement>("[data-add]")?.dataset.add;
        if (adding) return add(adding);
        const sec = target.closest<HTMLElement>("[data-sec]")?.dataset.sec;
        if (sec) {
          onSelect(sec);
          document.getElementById(`sec-editor-${sec}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        const el = target.closest<HTMLElement>("[data-edit]");
        if (el) setEditing({ key: el.dataset.edit!, rect: el.getBoundingClientRect() });
      }}
    >
      <style>{LANDING_CSS}</style>
      <div className="flex w-full" dangerouslySetInnerHTML={{ __html: landingHtml({ ...render, page: p, preview: true, popupFor, step }) }} />
      <input
        ref={file}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      {editing
        ? createPortal(
            <InlineText
              key={editing.key}
              rect={editing.rect}
              multiline={editing.key === "bio" || editing.key.endsWith(":body")}
              value={valueOf(editing.key)}
              onChange={(v) => setValue(editing.key, v)}
              onDone={() => setEditing(null)}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

function InlineText({
  rect,
  value,
  multiline,
  onChange,
  onDone,
}: {
  rect: DOMRect;
  value: string;
  multiline: boolean;
  onChange: (v: string) => void;
  onDone: () => void;
}) {
  const width = Math.max(rect.width + 24, 200);
  const style = {
    position: "fixed" as const,
    zIndex: 100,
    left: Math.max(8, rect.left + rect.width / 2 - width / 2),
    top: rect.top + rect.height / 2 - (multiline ? 36 : 18),
    width,
  };
  const cls = "rounded-lg border border-primary bg-[#111113]/95 px-3 py-2 text-sm text-white shadow-2xl ring-4 ring-primary/25 outline-none backdrop-blur";
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" || (e.key === "Enter" && !multiline)) {
      e.preventDefault();
      onDone();
    }
  };
  return multiline ? (
    <textarea
      autoFocus
      rows={3}
      aria-label="Edit text"
      style={style}
      className={cls}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onDone}
      onKeyDown={keys}
    />
  ) : (
    <input
      autoFocus
      aria-label="Edit text"
      style={style}
      className={cls}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onDone}
      onKeyDown={keys}
    />
  );
}
