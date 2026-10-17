"use client";

import { create } from "zustand";
import type { ThemeOverrides } from "@/themes/presets";
import type { EditorBlock } from "./actions";

export type EditorProfile = {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  heroUrl: string | null;
  tagline: string;
  /** The @username shown on the page (empty = the page's username) and whether it shows. */
  handle: string;
  showHandle: boolean;
  /** Granted by the site owner; the creator can only show or hide it. */
  verified: boolean;
  showVerified: boolean;
  seoTitle: string;
  seoDescription: string;
  published: boolean;
};

export type EditorTheme = { themeKey: string; overrides: ThemeOverrides; showBadge: boolean; warningTemplate: string | null; openInBrowser: boolean; layout: string };

type SaveState = "idle" | "saving" | "saved" | "error";

type EditorState = {
  username: string;
  profile: EditorProfile;
  theme: EditorTheme;
  blocks: EditorBlock[];
  pending: number;
  saveState: SaveState;
  setProfile: (patch: Partial<EditorProfile>) => void;
  setTheme: (patch: Partial<EditorTheme>) => void;
  setBlocks: (blocks: EditorBlock[]) => void;
  patchBlock: (id: string, patch: Partial<EditorBlock>) => void;
  beginSave: () => void;
  endSave: (ok: boolean) => void;
};

export const useEditor = create<EditorState>((set) => ({
  username: "",
  profile: { displayName: "", bio: "", avatarUrl: null, heroUrl: null, tagline: "", handle: "", showHandle: true, verified: false, showVerified: true, seoTitle: "", seoDescription: "", published: true },
  theme: { themeKey: "paper", overrides: {}, showBadge: true, warningTemplate: null, openInBrowser: true, layout: "classic" },
  blocks: [],
  pending: 0,
  saveState: "idle",
  setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
  setTheme: (patch) => set((s) => ({ theme: { ...s.theme, ...patch } })),
  setBlocks: (blocks) => set({ blocks }),
  patchBlock: (id, patch) => set((s) => ({ blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
  beginSave: () => set((s) => ({ pending: s.pending + 1, saveState: "saving" })),
  endSave: (ok) =>
    set((s) => {
      const pending = Math.max(0, s.pending - 1);
      return { pending, saveState: !ok ? "error" : pending ? "saving" : "saved" };
    }),
}));

// ---- Debounced autosave, one timer per key (e.g. "block:abc", "profile") ----
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function queueSave(key: string, run: () => Promise<{ ok: boolean; error?: string }>, onError: (msg: string) => void, delay = 700) {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  else useEditor.getState().beginSave(); // show "Saving…" from the moment a change is queued
  timers.set(
    key,
    setTimeout(async () => {
      timers.delete(key);
      await runSave(run, onError, true);
    }, delay),
  );
}

export async function runSave(run: () => Promise<{ ok: boolean; error?: string }>, onError: (msg: string) => void, alreadyCounted = false) {
  const { beginSave, endSave } = useEditor.getState();
  if (!alreadyCounted) beginSave();
  try {
    const res = await run();
    if (!res.ok) onError(res.error ?? "Couldn't save");
    endSave(res.ok);
  } catch {
    onError("You seem to be offline. Changes will save when you retry.");
    endSave(false);
  }
}

export function hasPendingSaves() {
  return timers.size > 0 || useEditor.getState().pending > 0;
}
