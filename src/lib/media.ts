import "server-only";
import crypto from "node:crypto";
import { db } from "@/lib/db";

// Image storage for avatars, cover photos and link images, kept in Postgres and served by
// /media/<key>. This works the same locally and on serverless hosts (whose disks are
// read-only), and needs no extra service. Images are small (max 4 MB) and CDN-cached.

export const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export type ImageCheck = { ok: true; ext: string } | { ok: false; error: string };

export function checkImage(file: unknown): ImageCheck {
  if (!(file instanceof File)) return { ok: false, error: "Choose an image." };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { ok: false, error: "Use a JPG, PNG, WebP or GIF image." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Images must be 4 MB or smaller." };
  return { ok: true, ext };
}

const KEY = /^[a-z0-9]+-[a-f0-9]{16}\.(jpg|png|webp|gif)$/i;

/** Saves an uploaded image for a page and returns its public URL. */
export async function saveImage(pageId: string, file: File, ext: string): Promise<string> {
  const key = `${pageId}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
  await db.media.create({ data: { key, pageId, contentType: file.type, bytes: new Uint8Array(await file.arrayBuffer()) } });
  return `/media/${key}`;
}

/** Reads a stored image for /media/<key>. */
export async function readImage(key: string): Promise<{ body: Uint8Array; contentType: string } | null> {
  if (!KEY.test(key)) return null;
  const row = await db.media.findUnique({ where: { key }, select: { bytes: true, contentType: true } });
  return row ? { body: row.bytes, contentType: row.contentType } : null;
}
