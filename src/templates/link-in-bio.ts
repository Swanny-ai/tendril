// Link-in-bio page templates: a layout plus sample content for previews and empty pages.
// Original layouts and sample art (public/templates/*.jpg); no third-party photos.
import type { BlockData, BlockKind } from "@/lib/blocks";

export const LAYOUTS = ["classic", "simple-stack", "modern-card", "spotlight", "pro-card", "personal-card"] as const;
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
    key: "pro-card",
    name: "Pro Card",
    isNew: true,
    description: "A professional multi-link card. A photo header with a bold spaced-out name, then a featured card and a two-column gallery of image links.",
    sample: {
      displayName: "Kai Rivers",
      username: "kairivers",
      tagline: "Coach · Code KAI for 20% off",
      bio: "",
      blocks: [
        socials("instagram", "tiktok", "youtube", "x"),
        { type: "LINK", title: "12-Week Strength Plan", url: "https://example.com/plan", data: { style: "card", imageUrl: "/templates/card-1.jpg" } },
        { type: "LINK", title: "Meal Guide", url: "https://example.com/meals", data: { style: "card", imageUrl: "/templates/card-2.jpg" } },
        { type: "LINK", title: "1:1 Coaching", url: "https://example.com/coaching", data: { style: "card", imageUrl: "/templates/card-3.jpg" } },
        { type: "LINK", title: "Shop my gear", url: "https://example.com/shop" },
      ],
    },
  },
  {
    key: "personal-card",
    name: "Personal Card",
    description: "One striking 3D card that tilts with a holographic shine. Your photo, name and title, plus a call-to-action button.",
    sample: {
      displayName: "Noa Laurent",
      username: "noa",
      tagline: "Photographer",
      bio: "",
      blocks: [
        { type: "LINK", title: "Get in touch", url: "mailto:hello@example.com" },
        { type: "LINK", title: "Portfolio", url: "https://example.com/portfolio" },
      ],
    },
  },
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
  {
    key: "simple-stack",
    name: "Simple Stack",
    description: "A clean, modern link page. Soft rounded buttons, image cards, media embeds and a calm light theme.",
    sample: {
      displayName: "Ari Moon",
      username: "arimoon",
      tagline: "Musician",
      bio: "New single out now.",
      blocks: [
        socials("instagram", "tiktok", "youtube", "spotify"),
        { type: "EMBED", url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ" },
        { type: "LINK", title: "Listen on Spotify", url: "https://open.spotify.com" },
        { type: "LINK", title: "Tour dates", url: "https://example.com/tour", data: { style: "card", imageUrl: "/templates/card-6.jpg" } },
      ],
    },
  },
];

export const getPageTemplate = (key: string) => PAGE_TEMPLATES.find((t) => t.key === key);
