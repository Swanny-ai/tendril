import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// Image storage for avatars, cover photos and link images.
// On Netlify: Netlify Blobs (the server's disk is read-only there), served by /media/<key>.
// Locally: public/uploads, served as static files.

export const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const onNetlify = () => Boolean(process.env.NETLIFY_BLOBS_CONTEXT || process.env.NETLIFY === "true" || process.env.NETLIFY_SITE_ID);

async function store() {
  const { getStore } = await import("@netlify/blobs");
  return getStore("media");
}

export type ImageCheck = { ok: true; ext: string } | { ok: false; error: string };

export function checkImage(file: unknown): ImageCheck {
  if (!(file instanceof File)) return { ok: false, error: "Choose an image." };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { ok: false, error: "Use a JPG, PNG, WebP or GIF image." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Images must be 4 MB or smaller." };
  return { ok: true, ext };
}

/** Saves an uploaded image and returns its public URL. `prefix` groups files by owner. */
export async function saveImage(prefix: string, file: File, ext: string): Promise<string> {
  const name = `${prefix}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
  const bytes = await file.arrayBuffer();
  if (onNetlify()) {
    await (await store()).set(name, bytes, { metadata: { contentType: file.type } });
    return `/media/${name}`;
  }
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(bytes));
  return `/uploads/${name}`;
}

/** Reads a stored image for /media/<key>. */
export async function readImage(key: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  if (!/^[a-z0-9]+-[a-f0-9]{16}\.(jpg|png|webp|gif)$/i.test(key)) return null;
  if (onNetlify()) {
    try {
      const res = await (await store()).getWithMetadata(key, { type: "arrayBuffer" });
      if (!res) return null;
      return { body: res.data, contentType: String(res.metadata?.contentType ?? "application/octet-stream") };
    } catch (e) {
      console.error("media read failed", key, e);
      return null;
    }
  }
  try {
    const buf = await fs.readFile(path.join(process.cwd(), "public", "uploads", key));
    const ext = key.split(".").pop()!.toLowerCase();
    const type = Object.entries(IMAGE_TYPES).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
    return { body: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, contentType: type };
  } catch {
    return null;
  }
}
