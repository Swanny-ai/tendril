// Blocks every new page starts with. Templates replace them while they're still untouched.
export const STARTER_BLOCKS = [
  { type: "HEADER", title: "Welcome to my page", url: null },
  { type: "LINK", title: "My first link", url: "https://example.com" },
] as const;

/** True when a page only has the untouched starter blocks (or nothing at all). */
export function isStarterPage(blocks: { type: string; title: string; url: string | null }[]): boolean {
  if (blocks.length === 0) return true;
  if (blocks.length !== STARTER_BLOCKS.length) return false;
  return STARTER_BLOCKS.every((s, i) => blocks[i].type === s.type && blocks[i].title === s.title && (blocks[i].url ?? null) === s.url);
}
