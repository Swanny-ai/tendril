import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after, connection } from "next/server";
import { ShieldAlert } from "lucide-react";
import { DeepLinkFallback } from "@/components/deep-link-fallback";
import { appUrl } from "@/config/brand";
import { recordWarningView } from "@/lib/analytics/record";
import { inAppDeepLink } from "@/lib/deeplink";
import { getRedirectTarget } from "@/lib/pages";
import { pickLang, templateCopy } from "@/warning-templates/copy";
import { getWarningTemplate } from "@/warning-templates/templates";
import { WarningScreen } from "@/warning-templates/warning-screen";

export const instant = false;
export const metadata: Metadata = { title: "Before you continue", robots: { index: false, follow: false } };

const DEFAULT_WARNING = "This link may contain sensitive content. Do you want to continue?";

export default async function WarningPage(props: PageProps<"/go/[blockId]/warning">) {
  await connection();
  const { blockId } = await props.params;
  const target = await getRedirectTarget(blockId);
  if (!target || !target.contentWarning) notFound();

  const h = new Headers(await headers());
  after(() => recordWarningView({ headers: h }, target.pageId, target.blockId).catch(() => {}));

  // Inside Instagram/TikTok/...: confirming opens the destination in the default browser.
  const deepLink = target.openInBrowser ? inAppDeepLink(h.get("user-agent") ?? "", `${appUrl}/go/${target.blockId}?ok=1`) : null;
  const continueHref = deepLink ?? `/go/${target.blockId}?ok=1`;
  const fallback = deepLink ? <DeepLinkFallback stayHref={`/go/${target.blockId}?ok=1`} /> : null;

  const t = target.theme;
  const name = target.displayName || `@${target.username}`;
  let host = "";
  try {
    host = new URL(target.url).host.replace(/^www\./, "");
  } catch {
    /* ignore */
  }

  // The creator picked an 18+ template for their page's content warnings.
  if (target.warningTemplate) {
    const lang = pickLang(h.get("accept-language"));
    const template = getWarningTemplate(target.warningTemplate);
    const copy = templateCopy(template, lang);
    return (
      <main className="flex min-h-svh flex-1">
        <WarningScreen
          lang={lang}
          template={template}
          ownerName={`A link from ${name}`}
          title={copy.title}
          message={target.contentWarningText || copy.message}
          button={copy.button}
          leave={copy.leave}
          destinationLabel={copy.destination}
          destinationHost={host}
          continueHref={continueHref}
          leaveHref={`/${target.username}`}
          showBadge={false}
        />
        {fallback}
      </main>
    );
  }

  return (
    <main className="flex min-h-svh flex-1 items-center justify-center px-5 py-10" style={{ background: t.background, color: t.text }}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/5 p-7 text-center shadow-xl backdrop-blur-sm" style={{ borderColor: `${t.muted}44` }}>
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full" style={{ background: t.buttonBg, color: t.buttonText, border: `1.5px solid ${t.buttonBorder}` }}>
          <ShieldAlert className="size-7" aria-hidden />
        </div>
        <p className="text-sm font-medium" style={{ color: t.muted }}>
          A link from {name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Before you continue</h1>
        <p className="mt-3 leading-relaxed">{target.contentWarningText || DEFAULT_WARNING}</p>
        {host ? (
          <p className="mt-3 text-sm" style={{ color: t.muted }}>
            You&apos;ll be taken to <span className="font-medium">{host}</span>
          </p>
        ) : null}
        <div className="mt-7 flex flex-col gap-3">
          <a
            href={continueHref}
            rel="nofollow"
            className="flex min-h-12 items-center justify-center px-5 py-3 font-semibold"
            style={{ background: t.buttonBg, color: t.buttonText, border: `1.5px solid ${t.buttonBorder}`, borderRadius: t.radius }}
          >
            Continue
          </a>
          <a href={`/${target.username}`} className="flex min-h-12 items-center justify-center px-5 py-3 font-medium underline-offset-4 hover:underline" style={{ color: t.text }}>
            Go back
          </a>
        </div>
      </div>
      {fallback}
    </main>
  );
}
