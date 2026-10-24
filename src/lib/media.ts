import "server-only";
import crypto from "node:crypto";
import sharp from "sharp";
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

/** Longest side of a stored photo; larger uploads are scaled down. */
const MAX_SIDE = 1600;

/**
 * Photos are re-encoded as WebP (max 1600 px, quality 80, phone rotation applied, metadata
 * dropped) so pages load fast. GIFs are kept as they are, so animations still play. If the
 * image can't be read, or WebP would be bigger, the original is kept.
 */
export async function optimizeImage(file: File, ext: string): Promise<{ bytes: Uint8Array<ArrayBuffer>; contentType: string; ext: string }> {
  const original = new Uint8Array(await file.arrayBuffer());
  if (ext === "gif") return { bytes: original, contentType: file.type, ext };
  try {
    const webp = await sharp(original)
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
    if (webp.length < original.length || ext !== "webp") return { bytes: Uint8Array.from(webp), contentType: "image/webp", ext: "webp" };
  } catch {
    // Not a readable image for sharp: store it unchanged.
  }
  return { bytes: original, contentType: file.type, ext };
}

/** Saves an uploaded image for a page (optimized, see above) and returns its public URL. */
export async function saveImage(pageId: string, file: File, ext: string): Promise<string> {
  const img = await optimizeImage(file, ext);
  const key = `${pageId}-${crypto.randomBytes(8).toString("hex")}.${img.ext}`;
  await db.media.create({ data: { key, pageId, contentType: img.contentType, bytes: img.bytes } });
  return `/media/${key}`;
}

/** Reads a stored image for /media/<key>. */
export async function readImage(key: string): Promise<{ body: Uint8Array; contentType: string } | null> {
  if (!KEY.test(key)) return null;
  const row = await db.media.findUnique({ where: { key }, select: { bytes: true, contentType: true } });
  return row ? { body: row.bytes, contentType: row.contentType } : null;
}
