import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Check, Gauge, PencilRuler, ShieldAlert, Smartphone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LoopVideo } from "@/components/marketing/loop-video";
import { buttonVariants } from "@/components/ui/button";
import { appHost, brand } from "@/config/brand";
import { PRICES_USD } from "@/lib/plan-rules";

export const metadata: Metadata = {
  title: { absolute: `${brand.name}: ${brand.tagline}` },
  description: "A fast, good-looking link-in-bio page with honest analytics and per-link content warnings. Free to start.",
};

// Product videos live in public/videos and are rendered from video/scenes (see video/render.mjs).
const SHOWCASE = [
  {
    eyebrow: "Editor",
    path: "/dashboard/editor",
    title: "Build it in minutes, see it as you go",
    body: "Add a link and type its title, drag it into place, try a theme. The phone preview follows every change, and your page is live as soon as it saves.",
    points: ["Drag-and-drop ordering", "Themes that restyle the whole page", "Autosave with a live preview"],
    video: { src: "/videos/editor.mp4", poster: "/videos/editor-poster.jpg", label: "Adding a link, reordering links and switching themes in the Tendril editor" },
  },
  {
    eyebrow: "Global dashboard",
    path: "/dashboard",
    title: "Watch your audience arrive",
    body: "Every view across your bio page and smart links in one place: totals, growth, your best links, a world map, and visitors showing up live.",
    points: ["Live activity, refreshed every 5 seconds", "Any date range, in your own time zone", "One-click CSV export"],
    video: { src: "/videos/analytics.mp4", poster: "/videos/analytics-poster.jpg", label: "The Tendril global dashboard filling in with views, top links, a world map and live visitors" },
  },
];

const FEATURES = [
  { icon: PencilRuler, title: "An editor you can see", body: "Drag links into order, pick a theme, and watch a live phone preview update as you type. Changes go live on save." },
  { icon: BarChart3, title: "Analytics that answer questions", body: "Views, clicks and click-through rate for every link, plus where visitors come from, without cookies or creepy tracking." },
  { icon: ShieldAlert, title: "Content warnings per link", body: "Put a short confirmation screen in front of any link that needs one. Everything else on your page stays one tap away." },
  { icon: Smartphone, title: "Friendly inside social apps", body: "Visitors arriving from Instagram, TikTok or Facebook get a clear tip for opening your page in their real browser." },
  { icon: Gauge, title: "Fast by default", body: "Pages are rendered on the server, cached, and ship almost no JavaScript, so they load quickly on any connection." },
];

const FAQ = [
  ["Is it really free?", "Yes. The free plan covers a full page with up to 12 blocks, four themes, content warnings and 30 days of analytics. Pro adds more when you need it."],
  ["Do my visitors get tracked?", "We count views and clicks without cookies. Visitors are identified by a hash that changes every day and can't be traced back to an IP address."],
  ["What does a content warning do?", "When someone taps a link you've marked, they see a short notice and choose to continue or go back. You can see how many continue in your analytics."],
  ["Can I cancel Pro anytime?", "Yes. Cancel from the billing page and you keep Pro until the end of the period. Nothing on your page is deleted when you downgrade."],
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="flex items-center gap-1 text-sm">
            <a href="#features" className="hidden rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground sm:block">Features</a>
            <a href="#pricing" className="hidden rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground sm:block">Pricing</a>
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>Sign in</Link>
            <Link href="/signup" className={buttonVariants()}>Get started</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_80%_10%,color-mix(in_oklch,var(--persimmon)_18%,transparent),transparent),radial-gradient(50%_50%_at_10%_30%,color-mix(in_oklch,var(--plum)_16%,transparent),transparent)]" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
            <div>
              <p className="mb-4 inline-flex rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">Link in bio, done properly</p>
              <h1 className="text-4xl leading-[1.05] font-semibold sm:text-6xl">
                One link for <span className="text-[var(--plum)]">everything</span> you make.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Build a page for your work in minutes, share it everywhere, and see exactly which links people tap.
              </p>
              <form action="/signup" className="mt-8 flex max-w-md flex-col gap-2 sm:flex-row">
                <label htmlFor="claim" className="sr-only">Choose your username</label>
                <div className="flex flex-1 items-center overflow-hidden rounded-xl border bg-card focus-within:ring-3 focus-within:ring-ring/50">
                  <span className="pl-3 text-sm text-muted-foreground">{appHost}/</span>
                  <input id="claim" name="u" placeholder="yourname" maxLength={30} pattern="[a-zA-Z0-9_.]{3,30}" className="h-11 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none" />
                </div>
                <button type="submit" className={buttonVariants({ size: "lg", className: "h-11 px-5" })}>Claim your page</button>
              </form>
              <p className="mt-3 text-sm text-muted-foreground">Free forever plan. No card needed.</p>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <div aria-hidden className="absolute -inset-8 -z-10 rounded-full bg-[var(--plum)]/25 blur-3xl" />
                <div className="h-[612px] w-[290px] overflow-hidden rounded-[44px] border-[9px] border-[#1c1a24] bg-[#1c1a24] shadow-2xl">
                  <LoopVideo
                    eager
                    src="/videos/hero.mp4"
                    poster="/videos/hero-poster.jpg"
                    width={390}
                    height={844}
                    label="A Tendril page building itself, a visitor tapping a link, confirming an 18+ warning and reaching the destination"
                    className="h-full overflow-hidden rounded-[35px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="showcase-title" className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <h2 id="showcase-title" className="max-w-2xl text-3xl font-semibold sm:text-4xl">See it in action</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">Real screens from the product, not mockups of mockups.</p>
            <div className="mt-12 space-y-20">
              {SHOWCASE.map((s, i) => (
                <div key={s.title} className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
                  <div className={i % 2 ? "lg:order-2" : undefined}>
                    <p className="text-sm font-semibold tracking-wide text-[var(--plum)] uppercase">{s.eyebrow}</p>
                    <h3 className="mt-2 text-2xl font-semibold sm:text-3xl">{s.title}</h3>
                    <p className="mt-3 leading-relaxed text-muted-foreground">{s.body}</p>
                    <ul className="mt-5 space-y-2">
                      {s.points.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 size-4 shrink-0 text-[var(--sage)]" aria-hidden /> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="overflow-hidden rounded-2xl border bg-card shadow-xl ring-1 ring-black/5">
                    <div aria-hidden className="flex items-center gap-1.5 border-b bg-muted/60 px-4 py-2.5">
                      <span className="size-2.5 rounded-full bg-[#f2643d]/70" />
                      <span className="size-2.5 rounded-full bg-[#d9a425]/70" />
                      <span className="size-2.5 rounded-full bg-[#4e8b6b]/70" />
                      <span className="ml-3 truncate text-xs text-muted-foreground">{appHost}{s.path}</span>
                    </div>
                    <LoopVideo {...s.video} width={1280} height={800} className="aspect-[8/5]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="border-t bg-card/50">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-3xl font-semibold">Everything a creator page needs</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">No clutter. The parts that matter, built to be quick for you and your visitors.</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border bg-card p-6">
                  <f.icon className="size-6 text-[var(--plum)]" aria-hidden />
                  <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t">
          <div className="mx-auto max-w-4xl px-4 py-16">
            <h2 className="text-center text-3xl font-semibold">Simple pricing</h2>
            <p className="mt-2 text-center text-muted-foreground">Start free. Upgrade when your page grows.</p>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <PlanCard name="Free" price="$0" note="forever" cta="Start free" features={["Up to 12 blocks", "4 themes", "Content warnings", "Views, clicks and CTR (30 days)"]} />
              <PlanCard
                highlight
                name="Pro"
                price={`$${PRICES_USD.monthly}`}
                note={`per month, or $${PRICES_USD.yearly}/year`}
                cta="Go Pro"
                features={["Verified blue badge", "Unlimited blocks", "All themes plus custom colors and fonts", "Remove the \"Made with\" badge", "Custom warning text", "Custom domains", "Referrers, countries, devices", "A year of analytics"]}
              />
            </div>
          </div>
        </section>

        <section className="border-t bg-card/50">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-3xl font-semibold">Questions</h2>
            <div className="mt-6 divide-y rounded-2xl border bg-card">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group p-5">
                  <summary className="cursor-pointer list-none font-medium marker:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {q}
                      <span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>+</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground">
          <Logo className="text-base" />
          <p>© {brand.name}. Made for people who make things.</p>
        </div>
      </footer>
    </div>
  );
}

function PlanCard({ name, price, note, features, cta, highlight = false }: { name: string; price: string; note: string; features: string[]; cta: string; highlight?: boolean }) {
  return (
    <div className={`flex flex-col rounded-2xl border bg-card p-7 ${highlight ? "border-[var(--plum)] shadow-lg ring-1 ring-[var(--plum)]/30" : ""}`}>
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="mt-3">
        <span className="font-heading text-4xl font-semibold">{price}</span> <span className="text-sm text-muted-foreground">{note}</span>
      </p>
      <ul className="mt-6 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-[var(--sage)]" aria-hidden /> {f}
          </li>
        ))}
      </ul>
      <Link href="/signup" className={buttonVariants({ variant: highlight ? "default" : "outline", size: "lg", className: "mt-7" })}>
        {cta}
      </Link>
    </div>
  );
}
