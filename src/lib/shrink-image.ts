// Shrinks a photo in the browser before it's uploaded: phone photos are often 5-12 MB, more than
// an upload can carry (4 MB). Re-encoded as WebP (JPEG where the browser can't), at most 2000 px
// on the longest side, with the phone's rotation applied. Small files and animated GIFs under the
// limit are sent as they are; if the browser can't read the image, the original is sent.

const SKIP_BELOW = 1.5 * 1024 * 1024;
const LIMIT = 4 * 1024 * 1024;

function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function shrinkImage(file: File, maxSide = 2000): Promise<File> {
  if (file.size <= SKIP_BELOW) return file;
  // GIFs keep their animation when they fit; bigger ones become a still image.
  if (file.type === "image/gif" && file.size <= LIMIT) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    let blob = await encode(canvas, "image/webp", 0.85);
    if (!blob || blob.type !== "image/webp") blob = await encode(canvas, "image/jpeg", 0.85);
    if (!blob) return file;
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.${ext}`, { type: blob.type });
  } catch {
    return file;
  }
}
