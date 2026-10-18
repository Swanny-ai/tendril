// Link-in-bio page templates: a layout plus sample content for previews and empty pages.
// Original layouts and sample art (public/templates/*.jpg); no third-party photos.
import type { BlockData, BlockKind } from "@/lib/blocks";

export const LAYOUTS = ["classic", "modern-card", "spotlight"] as const;
export type LayoutKey = (typeof LAYOUTS)[number];

export const isLayoutKey = (v: unknown): v is LayoutKey => typeof v === "string" && (LAYOUTS as readonly string[]).includes(v);

export type SampleBlock = { type: BlockKind; title?: string; url?: string; data?: BlockData; contentWarning?: boolean };

export type PageTemplate = {
  key: Exclude<LayoutKey, "classic">;
  name: string;
  description: string;
  isNew?: boolean;
  sample: { displayName: string; username: string; tagline: string; bio: string; blocks: SampleBlock[] };
};

const socials = (...networks: string[]): SampleBlock => ({
  type: "SOCIAL_ROW",
  data: { socials: networks.map((network) => ({ network, handle: "yourname" })) },
});
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    key: "spotlight",
    name: "Spotlight Card",
    isNew: true,
    description: "A bold, immersive design with a full-screen photo background, glass buttons, a highlighted featured card and a countdown.",
    sample: {
      displayName: "Mila Vale",
      username: "milavale",
      tagline: "22 · Los Angeles",
      bio: "",
      blocks: [
        socials("instagram", "x", "tiktok", "youtube"),
        { type: "LINK", title: "My exclusive page", url: "https://example.com/vip", contentWarning: true, data: { style: "card", imageUrl: "/templates/card-4.jpg" } },
        { type: "COUNTDOWN", title: "50% off ends in", data: { until: inDays(1) } },
        { type: "LINK", title: "Chat with me", url: "https://example.com/chat" },
      ],
    },
  },
  {
    key: "modern-card",
    name: "Modern Card",
    description: "A bold, hero-led card. A full-width photo fades into your name, details and stacked links, with image cards and video embeds.",
    sample: {
      displayName: "Theo Banks",
      username: "theobanks",
      tagline: "Streams every night · 9pm",
      bio: "",
      blocks: [
        socials("instagram", "tiktok", "youtube", "x"),
        { type: "LINK", title: "YouTube", url: "https://youtube.com" },
        { type: "EMBED", url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ" },
        { type: "LINK", title: "Merch drop", url: "https://example.com/merch", data: { style: "card", imageUrl: "/templates/card-5.jpg" } },
      ],
    },
  },
];

export const getPageTemplate = (key: string) => PAGE_TEMPLATES.find((t) => t.key === key);
