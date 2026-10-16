// Parses MAIL_FROM values like `Tendril <hello@example.com>` or `hello@example.com`. Pure.
export function parseMailFrom(value: string | undefined, fallbackName: string): { name: string; email: string } | null {
  if (!value) return null;
  const v = value.trim();
  const angled = v.match(/^\s*"?([^"<]*?)"?\s*<([^<>\s]+@[^<>\s]+)>\s*$/);
  if (angled) return { name: angled[1].trim() || fallbackName, email: angled[2] };
  if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v)) return { name: fallbackName, email: v };
  return null;
}
