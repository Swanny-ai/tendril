import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  ExternalLink,
  Gift,
  Globe,
  LayoutTemplate,
  Link2,
  MousePointerClick,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LoopVideo } from "@/components/marketing/loop-video";
import {
  AudienceTabs,
  CountUp,
  EarningsCalculator,
  EscapeDemo,
  Reveal,
  TemplateSwitcher,
} from "@/components/marketing/interactive";
import { SocialGlyph } from "@/components/public-page/social";
import { buttonVariants } from "@/components/ui/button";
import { appHost, brand } from "@/config/brand";
import { PRICES_USD } from "@/lib/plan-rules";
import { LAYOUTS } from "@/templates/link-in-bio";
import { WARNING_TEMPLATES } from "@/warning-templates/templates";

export const metadata: Metadata = {
  title: { absolute: `${brand.name}: ${brand.tagline}` },
  description:
    "Bio pages and smart deep links that open in the real browser, with 18+ warning pages, custom domains and live analytics. Free to start.",
};

// Apps your link is shared from (icons only, from simple-icons).
const APPS = [
  "instagram",
  "tiktok",
  "snapchat",
  "x",
  "threads",
  "facebook",
  "youtube",
  "telegram",
  "discord",
  "twitch",
  "whatsapp",
  "onlyfans",
];

const STEPS = [
  {
    icon: LayoutTemplate,
    title: "Pick a template",
    body: "Start from a ready-made bio page or a deep link. Add your photo, links and colors in a couple of minutes.",
  },
  {
    icon: Link2,
    title: "Drop it in your bio",
    body: "Share one link on Instagram, TikTok, X or anywhere else, on our domain or your own.",
  },
  {
    icon: MousePointerClick,
    title: "Fans land in their browser",
    body: "Visitors leave the app's built-in browser, so logins, saved cards and checkouts just work.",
  },
];

const SHOWCASE = [
  {
    eyebrow: "Editor",
    path: "/edit/template/yourname",
    title: "Build it in minutes, see it as you go",
    body: "Add a link and type its title, drag it into place, try a theme. The phone preview follows every change, and your page is live as soon as it saves.",
    points: [
      "Drag-and-drop ordering",
      "Templates that restyle the whole page",
      "Autosave with a live preview",
    ],
    video: {
      src: "/videos/editor.mp4",
      poster: "/videos/editor-poster.jpg",
      label:
        "Adding a link, reordering links and switching themes in the ViewLink editor",
    },
  },
  {
    eyebrow: "Global dashboard",
    path: "/dashboard",
    title: "Watch your audience arrive",
    body: "Every view across your bio pages and deep links in one place: totals, growth, your best links, a world map, and visitors showing up live.",
    points: [
      "Live activity, refreshed every 5 seconds",
      "Any date range, in your own time zone",
      "One-click CSV export",
    ],
    video: {
      src: "/videos/analytics.mp4",
      poster: "/videos/analytics-poster.jpg",
      label:
        "The ViewLink global dashboard filling in with views, top links, a world map and live visitors",
    },
  },
];

const FAQ = [
  [
    "Is it really free?",
    "Yes. The free plan covers a full bio page, deep links, 18+ warning pages and 30 days of analytics. Pro adds custom domains, more templates and longer history.",
  ],
  [
    'What does "opens in the real browser" mean?',
    "Apps like Instagram and TikTok open links in their own built-in browser, where saved passwords and payment autofill often don't work. ViewLink links hand visitors over to Safari or Chrome instead.",
  ],
  [
    "Can I use my own domain?",
    "Yes, on Pro. Add yourname.com, point one DNS record at us, and choose whether a page or link lives at the root or at a path. HTTPS is set up for you.",
  ],
  [
    "What does an 18+ warning page do?",
    "Visitors see a short age confirmation before the link opens. Pick from a set of designs, and see in your analytics how many continue.",
  ],
  [
    "Do my visitors get tracked?",
    "We count views and clicks without cookies. Visitors are identified by a hash that changes every day and can't be traced back to an IP address.",
  ],
  [
    "Can I cancel Pro anytime?",
    "Yes. Cancel from the billing page and you keep Pro until the end of the period. Nothing on your page is deleted when you downgrade.",
  ],
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Floating pill navbar */}
      <header className="sticky top-3 z-30 px-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between rounded-full border bg-card/80 py-2 pr-2 pl-4 shadow-lg backdrop-blur">
          <Logo />
          <nav className="flex items-center gap-1 text-sm">
            <a
              href="#how"
              className="hidden rounded-full px-3 py-2 text-muted-foreground hover:text-foreground md:block"
            >
              How it works
            </a>
            <a
              href="#features"
              className="hidden rounded-full px-3 py-2 text-muted-foreground hover:text-foreground md:block"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="hidden rounded-full px-3 py-2 text-muted-foreground hover:text-foreground md:block"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="hidden rounded-full px-3 py-2 text-muted-foreground hover:text-foreground md:block"
            >
              FAQ
            </a>
            <Link
              href="/login"
              className={buttonVariants({
                variant: "ghost",
                className: "rounded-full",
              })}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className={buttonVariants({ className: "rounded-full px-4" })}
            >
              Start for free
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative -mt-16 overflow-hidden pt-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.045)_1px,transparent_1px)] [mask-image:radial-gradient(70%_60%_at_50%_30%,#000,transparent)] bg-[size:56px_56px]" />
            <div className="absolute -top-40 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-[var(--plum)]/15 blur-[120px]" />
          </div>
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-12 md:grid-cols-[1.05fr_0.95fr] md:pt-24">
            <div className="min-w-0">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-[var(--plum)] shadow-[0_0_8px_var(--plum)]" />{" "}
                Link in bio + smart deep links
              </p>
              <h1 className="text-4xl leading-[1.02] font-semibold tracking-tight sm:text-6xl">
                One link for{" "}
                <span className="text-[var(--plum)]">everything</span>
                <br />
                you make.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                A bio page your fans love, and links that open in their real
                browser, so logins, saved cards and checkouts actually work.
              </p>
              <form action="/signup" className="mt-8 max-w-md">
                <label htmlFor="claim" className="sr-only">
                  Choose your username
                </label>
                <div className="flex items-center gap-1 rounded-full border bg-card p-1.5 pl-4 shadow-lg focus-within:ring-3 focus-within:ring-ring/40">
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {appHost}/
                  </span>
                  <input
                    id="claim"
                    name="u"
                    placeholder="yourname"
                    maxLength={30}
                    pattern="[a-zA-Z0-9_.]{3,30}"
                    className="h-10 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    className={buttonVariants({
                      className: "h-10 shrink-0 rounded-full px-4 sm:px-5",
                    })}
                  >
                    Claim your page
                  </button>
                </div>
              </form>
              <ul className="mt-4 flex max-w-md flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border bg-card/60 px-4 py-2.5 text-xs text-muted-foreground">
                {[
                  "Free forever plan",
                  "No card needed",
                  "Your own domain on Pro",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check
                      className="size-3.5 text-[var(--plum)]"
                      aria-hidden
                    />{" "}
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center gap-3 text-muted-foreground">
                <span className="text-xs">Works from</span>
                <span className="flex items-center gap-2.5">
                  {APPS.slice(0, 7).map((a) => (
                    <SocialGlyph key={a} network={a} size={16} />
                  ))}
                  <span className="text-xs">+ more</span>
                </span>
              </div>
            </div>

            {/* Phone with floating cards */}
            <div className="relative mx-auto h-[600px] w-full max-w-[460px]">
              <div
                aria-hidden
                className="absolute top-1/2 left-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--plum)]/20 blur-3xl"
              />
              <div className="absolute top-20 -left-6 z-10 hidden w-32 -rotate-[8deg] overflow-hidden rounded-3xl border-4 border-[#262626] shadow-2xl sm:block">
                <Image
                  src="/templates/spotlight.jpg"
                  alt=""
                  width={288}
                  height={512}
                  className="h-auto w-full"
                />
              </div>
              <div className="absolute top-0 left-1/2 h-[580px] w-[270px] -translate-x-1/2 overflow-hidden rounded-[44px] border-[9px] border-[#262626] bg-[#262626] shadow-2xl">
                <LoopVideo
                  eager
                  src="/videos/hero.mp4"
                  poster="/videos/hero-poster.jpg"
                  width={390}
                  height={844}
                  label="A ViewLink page building itself, a visitor tapping a link, confirming an 18+ warning and reaching the destination"
                  className="h-full overflow-hidden rounded-[35px]"
                />
              </div>
              <div
                aria-hidden
                className="vl-float absolute top-24 right-0 flex items-center gap-2.5 rounded-2xl border bg-card/90 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur"
              >
                <span className="grid size-8 place-items-center rounded-full bg-[var(--plum)] text-[#0a0a0a]">
                  <ExternalLink className="size-4" />
                </span>
                <span>
                  <span className="block font-semibold">Opened in Safari</span>
                  <span className="text-muted-foreground">from Instagram</span>
                </span>
              </div>
              <div
                aria-hidden
                style={{ animationDelay: "-1.6s" }}
                className="vl-float absolute right-2 bottom-28 flex items-center gap-2.5 rounded-2xl border bg-card/90 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur"
              >
                <span className="relative grid size-8 place-items-center rounded-full bg-secondary">
                  <Radio className="size-4 text-[var(--plum)]" />
                </span>
                <span>
                  <span className="block font-semibold">Live visitors</span>
                  <span className="text-muted-foreground">
                    Mobile · {appHost}/you
                  </span>
                </span>
              </div>
              <div
                aria-hidden
                style={{ animationDelay: "-3.2s" }}
                className="vl-float absolute bottom-12 left-2 hidden items-center gap-2 rounded-2xl border bg-card/90 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur sm:flex"
              >
                <ShieldCheck className="size-4 text-[var(--plum)]" />
                <span className="font-semibold">18+ check passed</span>
              </div>
            </div>
          </div>
        </section>

        {/* Scrolling app strip */}
        <section
          aria-label="Apps your link works from"
          className="border-y bg-card/40 py-5"
        >
          <p className="mb-4 text-center text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Your link works from every app
          </p>
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
            <div className="vl-marquee flex w-max gap-10">
              {[...APPS, ...APPS].map((a, i) => (
                <span
                  key={`${a}-${i}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  aria-hidden={i >= APPS.length}
                >
                  <SocialGlyph network={a} size={20} />
                  <span className="capitalize">
                    {a === "x"
                      ? "X"
                      : a === "onlyfans"
                        ? "OnlyFans"
                        : a === "tiktok"
                          ? "TikTok"
                          : a === "youtube"
                            ? "YouTube"
                            : a === "whatsapp"
                              ? "WhatsApp"
                              : a}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20">
          <p className="text-sm font-semibold tracking-[0.2em] text-[var(--plum)] uppercase">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
            Three steps.{" "}
            <span className="text-muted-foreground">No lost clicks.</span>
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 120}>
                <div className="relative h-full overflow-hidden rounded-3xl border bg-card p-6 transition-transform duration-300 hover:-translate-y-1">
                  <span
                    aria-hidden
                    data-n={`0${i + 1}`}
                    className="absolute -top-4 right-3 font-heading text-8xl font-bold text-white/[.04] before:content-[attr(data-n)]"
                  />
                  <span className="grid size-11 place-items-center rounded-2xl bg-[var(--plum)]/12 text-[var(--plum)]">
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <p className="mt-5 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    Step 0{i + 1}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* What fans see */}
        <section className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <Reveal>
              <p className="text-sm font-semibold tracking-[0.2em] text-[var(--plum)] uppercase">
                What your fans see
              </p>
              <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
                From a tap in the app to a paid checkout.
              </h2>
            </Reveal>
            <div className="mt-10">
              <EscapeDemo />
            </div>
          </div>
        </section>

        {/* Numbers */}
        <section
          aria-label="ViewLink in numbers"
          className="border-y bg-card/40"
        >
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 text-center md:grid-cols-4">
            {[
              { n: LAYOUTS.length, s: "", label: "Page templates" },
              {
                n: WARNING_TEMPLATES.length,
                s: "",
                label: "18+ warning designs",
              },
              { n: APPS.length, s: "+", label: "Apps your link opens from" },
              { n: 35, s: "%", label: "Top affiliate rate" },
            ].map((x) => (
              <div key={x.label}>
                <p className="font-heading text-4xl font-semibold text-[var(--plum)] sm:text-5xl">
                  <CountUp to={x.n} suffix={x.s} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{x.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature bento */}
        <section id="features" className="scroll-mt-24 border-t bg-card/30">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <p className="text-sm font-semibold tracking-[0.2em] text-[var(--plum)] uppercase">
              Features
            </p>
            <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
              More than a link in bio. A page that sells.
            </h2>
            <div className="mt-10 grid auto-rows-[minmax(220px,auto)] gap-4 md:grid-cols-6">
              <Tile
                className="md:col-span-4"
                icon={ExternalLink}
                eyebrow="Deep links"
                title="Leaves the in-app browser for you"
              >
                Instagram, TikTok and Facebook open links inside their own
                browser, where autofill and saved logins break. ViewLink hands
                visitors over to Safari or Chrome.
                <div
                  aria-hidden
                  className="mt-5 flex flex-wrap items-center gap-2 text-xs"
                >
                  <span className="flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1.5">
                    <SocialGlyph network="instagram" size={14} /> In-app browser
                  </span>
                  <ArrowRight className="size-4 text-[var(--plum)]" />
                  <span className="flex items-center gap-1.5 rounded-full bg-[var(--plum)] px-3 py-1.5 font-semibold text-[#0a0a0a]">
                    <Globe className="size-3.5" /> Real browser
                  </span>
                  <ArrowRight className="size-4 text-[var(--plum)]" />
                  <span className="rounded-full border bg-secondary px-3 py-1.5">
                    Checkout works
                  </span>
                </div>
              </Tile>
              <Tile
                className="md:col-span-2"
                icon={ShieldCheck}
                eyebrow="18+ pages"
                title="Age checks that look good"
              >
                Put a short confirmation in front of any link, in the design you
                like. See how many continue.
              </Tile>
              <Tile
                className="md:col-span-2"
                icon={LayoutTemplate}
                eyebrow="Templates"
                title="Pages that look made for you"
              >
                <div aria-hidden className="mt-4 flex gap-2">
                  {["pro-card", "spotlight", "modern-card"].map((t) => (
                    <Image
                      key={t}
                      src={`/templates/${t}.jpg`}
                      alt=""
                      width={120}
                      height={213}
                      className="h-28 w-auto rounded-xl border object-cover"
                    />
                  ))}
                </div>
              </Tile>
              <Tile
                className="md:col-span-2"
                icon={Globe}
                eyebrow="Custom domains"
                title="yourname.com, not ours"
              >
                Put pages and links on your own domain, at the root or at a
                path. HTTPS is automatic.
              </Tile>
              <Tile
                className="md:col-span-2"
                icon={Gift}
                eyebrow="Affiliate"
                title="Earn up to 35%"
              >
                Invite other creators and earn a share of every payment they
                make, for as long as they stay.
              </Tile>
              <Tile
                className="md:col-span-6"
                icon={BarChart3}
                eyebrow="Analytics"
                title="See every view, click and country, live"
              >
                Totals and growth, your top links, a world map and visitors
                arriving in real time, for each page and each link.
                <div
                  aria-hidden
                  className="mt-6 grid items-end gap-6 sm:grid-cols-[auto_1fr]"
                >
                  <div className="flex gap-6">
                    {[
                      ["Views", "12.4k"],
                      ["Clicks", "5.1k"],
                      ["Opened in browser", "92%"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs">{k}</p>
                        <p className="font-heading text-2xl font-semibold text-foreground">
                          {v}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex h-20 items-end gap-1.5">
                    {[
                      18, 26, 22, 34, 30, 42, 38, 51, 47, 60, 56, 72, 66, 80,
                      76, 92,
                    ].map((h, i) => (
                      <span
                        key={i}
                        className="flex-1 rounded-t-md bg-gradient-to-t from-[var(--plum)]/30 to-[var(--plum)]"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </Tile>
            </div>
          </div>
        </section>

        {/* Template switcher */}
        <section className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <Reveal>
              <TemplateSwitcher />
            </Reveal>
          </div>
        </section>

        {/* Product videos */}
        <section aria-labelledby="showcase-title" className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <h2
              id="showcase-title"
              className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl"
            >
              See it in action
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Real screens from the product.
            </p>
            <div className="mt-12 space-y-20">
              {SHOWCASE.map((s, i) => (
                <Reveal
                  key={s.title}
                  className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14"
                >
                  <div className={i % 2 ? "lg:order-2" : undefined}>
                    <p className="text-sm font-semibold tracking-[0.2em] text-[var(--plum)] uppercase">
                      {s.eyebrow}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold sm:text-3xl">
                      {s.title}
                    </h3>
                    <p className="mt-3 leading-relaxed text-muted-foreground">
                      {s.body}
                    </p>
                    <ul className="mt-5 space-y-2">
                      {s.points.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-sm">
                          <Check
                            className="mt-0.5 size-4 shrink-0 text-[var(--plum)]"
                            aria-hidden
                          />{" "}
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl">
                    <div
                      aria-hidden
                      className="flex items-center gap-1.5 border-b bg-muted px-4 py-2.5"
                    >
                      <span className="size-2.5 rounded-full bg-[#f85863]/80" />
                      <span className="size-2.5 rounded-full bg-[#f4a124]/80" />
                      <span className="size-2.5 rounded-full bg-[#49f264]/80" />
                      <span className="ml-3 truncate text-xs text-muted-foreground">
                        {appHost}
                        {s.path}
                      </span>
                    </div>
                    <LoopVideo
                      {...s.video}
                      width={1280}
                      height={800}
                      className="aspect-[8/5]"
                    />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="overflow-x-clip border-t bg-card/30">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <Reveal>
              <h2 className="mb-8 text-center text-3xl font-semibold tracking-tight sm:text-5xl">
                Made for everyone who shares a link
              </h2>
              <AudienceTabs />
            </Reveal>
          </div>
        </section>

        {/* Affiliate calculator */}
        <section className="border-t">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2">
            <Reveal>
              <p className="text-sm font-semibold tracking-[0.2em] text-[var(--plum)] uppercase">
                Affiliate program
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
                Share ViewLink. Get paid every month.
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground">
                Invite creators with your link and earn 25% of every payment
                they make, rising to 35% as you bring in more. Move the slider
                to see what you could earn.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <EarningsCalculator monthlyUsd={PRICES_USD.monthly} />
            </Reveal>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 border-t">
          <div className="mx-auto max-w-4xl px-4 py-20">
            <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-5xl">
              Simple pricing
            </h2>
            <p className="mt-2 text-center text-muted-foreground">
              Start free. Upgrade when your page grows.
            </p>
            <Reveal className="mt-10 grid gap-5 md:grid-cols-2">
              <PlanCard
                name="Free"
                price="$0"
                note="forever"
                cta="Start free"
                features={[
                  "A full bio page",
                  "Deep links that open in the real browser",
                  "18+ warning pages",
                  "Views, clicks and CTR (30 days)",
                ]}
              />
              <PlanCard
                highlight
                name="Pro"
                price={`$${PRICES_USD.monthly}`}
                note={`per month, or $${PRICES_USD.yearly}/year`}
                cta="Go Pro"
                features={[
                  "Verified badge",
                  "Unlimited blocks and pages",
                  "All templates plus custom colors and fonts",
                  'Remove the "Made with" badge',
                  "Custom warning text",
                  "Custom domains",
                  "Referrers, countries, devices",
                  "A year of analytics",
                ]}
              />
            </Reveal>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 border-t bg-card/30">
          <div className="mx-auto max-w-3xl px-4 py-20">
            <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-5xl">
              Questions
            </h2>
            <div className="mt-8 space-y-3">
              {FAQ.map(([q, a]) => (
                <details
                  key={q}
                  className="group rounded-2xl border bg-card p-5 open:border-[var(--plum)]/50"
                >
                  <summary className="cursor-pointer list-none font-medium marker:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {q}
                      <span
                        className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground transition-transform group-open:rotate-45"
                        aria-hidden
                      >
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="px-4 py-20">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border bg-gradient-to-br from-[#16351c] via-[#151b12] to-[#151515] px-6 py-14 text-center">
            <div
              aria-hidden
              className="absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-[var(--plum)]/25 blur-3xl"
            />
            <h2 className="relative text-3xl font-semibold tracking-tight sm:text-5xl">
              Your link, everywhere. Ready in minutes.
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-muted-foreground">
              Claim your page now and share it today. It&apos;s free to start.
            </p>
            <Link
              href="/signup"
              className={buttonVariants({
                size: "lg",
                className: "relative mt-8 h-12 rounded-full px-7 text-base",
              })}
            >
              Start for free <ArrowRight className="size-4" />
            </Link>
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

function Tile({
  className,
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  className?: string;
  icon: typeof Globe;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-3xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--plum)]/50 hover:shadow-[0_20px_50px_-25px_var(--plum)] ${className ?? ""}`}
    >
      <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-[var(--plum)] uppercase">
        <Icon className="size-4" aria-hidden /> {eyebrow}
      </p>
      <h3 className="mt-3 text-xl font-semibold">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  note,
  features,
  cta,
  highlight = false,
}: {
  name: string;
  price: string;
  note: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-3xl border bg-card p-7 ${highlight ? "border-[var(--plum)] shadow-[0_0_60px_-20px_var(--plum)]" : ""}`}
    >
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="mt-3">
        <span className="font-heading text-4xl font-semibold">{price}</span>{" "}
        <span className="text-sm text-muted-foreground">{note}</span>
      </p>
      <ul className="mt-6 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check
              className="mt-0.5 size-4 shrink-0 text-[var(--plum)]"
              aria-hidden
            />{" "}
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={buttonVariants({
          variant: highlight ? "default" : "outline",
          size: "lg",
          className: "mt-7 rounded-full",
        })}
      >
        {cta}
      </Link>
    </div>
  );
}
