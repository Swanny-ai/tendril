import { readImage } from "@/lib/media";

// Serves uploaded images (avatars, cover photos, link images) from storage.
export async function GET(_request: Request, ctx: RouteContext<"/media/[key]">) {
  const { key } = await ctx.params;
  const image = await readImage(key);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(image.body), {
    headers: {
      "Content-Type": image.contentType,
      // Keys are random and never reused, so the file can be cached forever.
      "Cache-Control": "public, max-age=31536000, immutable",
      // Let Netlify's CDN keep a copy so the database is only read once per image.
      "Netlify-CDN-Cache-Control": "public, max-age=31536000, immutable, durable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
