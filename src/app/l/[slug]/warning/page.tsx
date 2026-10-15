import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after, connection } from "next/server";
import { getSmartLink, recordSmartLinkEvent } from "@/lib/smart-links";
import { pickLang, templateCopy } from "@/warning-templates/copy";
import { getWarningTemplate } from "@/warning-templates/templates";
import { WarningScreen } from "@/warning-templates/warning-screen";

export const instant = false;
export const metadata: Metadata = { title: "Adults only", robots: { index: false, follow: false } };

export default async function SmartLinkWarningPage(props: PageProps<"/l/[slug]/warning">) {
  await connection();
  const { slug } = await props.params;
  const link = await getSmartLink(slug);
  if (!link || !link.adultWarning) notFound();

  const h = new Headers(await headers());
  const lang = pickLang(h.get("accept-language"));
  const template = getWarningTemplate(link.warningTemplate);
  const copy = templateCopy(template, lang);
  after(() => recordSmartLinkEvent(h, link.id, "view").catch(() => {}));

  let host = "";
  try {
    host = new URL(link.destinationUrl).host.replace(/^www\./, "");
  } catch {
    /* ignore */
  }

  return (
    <main className="flex min-h-svh flex-1">
      <WarningScreen
        lang={lang}
        template={template}
        title={link.warningTitle || copy.title}
        message={link.warningMessage || copy.message}
        button={link.warningButton || copy.button}
        leave={copy.leave}
        destinationLabel={copy.destination}
        destinationHost={host}
        continueHref={`/l/${slug}?ok=1`}
        leaveHref={`/l/${slug}/left`}
        showBadge={link.showBadge}
      />
    </main>
  );
}
