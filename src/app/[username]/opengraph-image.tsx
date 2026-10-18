import { ImageResponse } from "next/og";
import { getPublicPage } from "@/lib/pages";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Profile picture and name";

export default async function OpenGraphImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const page = await getPublicPage(username.toLowerCase());
  const name = page?.displayName || `@${username}`;
  const bio = page?.bio ?? "";
  const solid = (v: string | undefined, fallback: string) => (v && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback);
  const bg = page ? page.theme.background : "#151515";
  const text = solid(page?.theme.text, "#ffffff");
  const accent = solid(page?.theme.buttonBg, "#49f264");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: bg, color: text }}>
        <div style={{ display: "flex", width: 120, height: 120, borderRadius: 999, background: accent, marginBottom: 36 }} />
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>{name}</div>
        {bio ? <div style={{ fontSize: 34, marginTop: 20, opacity: 0.8, maxWidth: 900 }}>{bio}</div> : null}
      </div>
    ),
    size,
  );
}
