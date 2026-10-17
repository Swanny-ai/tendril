import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after, connection } from "next/server";
import { getSmartLink, recordSmartLinkEvent } from "@/lib/smart-links";
import { pickLang, WARNING_COPY } from "@/warning-templates/copy";
import { getWarningTemplate } from "@/warning-templates/templates";

export const instant = false;
// The tab shows only the brand (no "Adults only · …" or similar).
export const metadata: Metadata = { title: { absolute: brand.name }, robots: { index: false, follow: false } };

export default async function SmartLinkLeftPage(props: PageProps<"/l/[slug]/left">) {
  await connection();
  const { slug } = await props.params;
  const link = await getSmartLink(slug);
  if (!link) notFound();
  const h = new Headers(await headers());
  const copy = WARNING_COPY[pickLang(h.get("accept-language"))];
  after(() => recordSmartLinkEvent(h, link.id, "leave").catch(() => {}));
  const t = getWarningTemplate(link.warningTemplate);
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center px-5 text-center" style={{ background: t.pageBg, color: t.text }}>
      <div>
        <h1 className="text-2xl font-semibold">{copy.leftTitle}</h1>
        <p className="mt-2" style={{ color: t.muted }}>
          {copy.leftMessage}
        </p>
      </div>
    </main>
  );
}
