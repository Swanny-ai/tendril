"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Briefcase,
  Check,
  Crown,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Unlink,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SocialGlyph } from "@/components/public-page/social";
import { GOALS, PLATFORMS, ROLES, type GoalKey, type OnboardingAnswers, type PlatformKey, type RoleKey } from "@/lib/onboarding";
import { PLAN_LABEL, PLAN_LIMITS, PLAN_PRICES_USD, type PaidPlan } from "@/lib/plan-rules";
import { cn } from "@/lib/utils";
import { saveOnboardingAction } from "./actions";

const ROLE_LOOK: Record<RoleKey, { icon: LucideIcon; tile: string }> = {
  creator: { icon: Sparkles, tile: "from-[#49f264] to-[#16a34a]" },
  business: { icon: Briefcase, tile: "from-[#fb923c] to-[#ea580c]" },
  agency: { icon: Users, tile: "from-[#c084fc] to-[#7c3aed]" },
  personal: { icon: User, tile: "from-[#60a5fa] to-[#2563eb]" },
};

const GOAL_LOOK: Record<GoalKey, { icon: LucideIcon; tile: string }> = {
  bio: { icon: Link2, tile: "from-[#49f264] to-[#16a34a]" },
  deeplinks: { icon: ExternalLink, tile: "from-[#60a5fa] to-[#2563eb]" },
  twosteps: { icon: Unlink, tile: "from-[#c084fc] to-[#7c3aed]" },
  age: { icon: ShieldCheck, tile: "from-[#fb7185] to-[#e11d48]" },
  domain: { icon: Globe, tile: "from-[#fb923c] to-[#ea580c]" },
  analytics: { icon: BarChart3, tile: "from-[#facc15] to-[#ca8a04]" },
};

const PAID: PaidPlan[] = ["PRO", "BUSINESS", "AGENCY"];
const STEPS = 4;

/** The four sign-up steps: who you are, what you want, where your audience is, then the plans. */
export function OnboardingFlow({ firstName }: { firstName: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>({ role: null, goals: [], platforms: {} });
  const [billing, setBilling] = useState<"month" | "year">("month");
  const [plan, setPlan] = useState<PaidPlan>("BUSINESS");
  const [saving, startSaving] = useTransition();

  const toggleGoal = (g: GoalKey) => setAnswers((a) => ({ ...a, goals: a.goals.includes(g) ? a.goals.filter((x) => x !== g) : [...a.goals, g] }));
  const togglePlatform = (p: PlatformKey) =>
    setAnswers((a) => {
      const next = { ...a.platforms };
      if (p in next) delete next[p];
      else next[p] = "";
      return { ...a, platforms: next };
    });
  const picked = Object.keys(answers.platforms) as PlatformKey[];

  // Answers are saved when leaving step 3 (or skipping), so the plans step is the last thing shown.
  const saveThen = (next: () => void) =>
    startSaving(async () => {
      try {
        await saveOnboardingAction(answers);
      } catch {
        /* never block the new account on this */
      }
      next();
    });
  const finish = (to: string) => {
    router.push(to);
    router.refresh();
  };

  return (
    <div className="relative flex min-h-svh flex-col bg-[#0a0a0a] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,rgba(73,242,100,.14),transparent)]" />
      <header className="relative flex items-center justify-between px-5 pt-6 sm:px-8">
        <Logo />
        {step < STEPS ? (
          <button type="button" onClick={() => saveThen(() => setStep(STEPS))} className="text-sm text-white/50 hover:text-white">
            Skip
          </button>
        ) : null}
      </header>

      <main className={cn("relative mx-auto w-full flex-1 px-5 pt-8 pb-36 sm:pt-12", step === 3 || step === 4 ? "max-w-5xl" : "max-w-xl")}>
        {/* Progress */}
        <div className={cn(step === 3 || step === 4 ? "mx-auto max-w-xl" : "")}>
          <div className="grid grid-cols-4 gap-2" aria-hidden>
            {Array.from({ length: STEPS }, (_, i) => (
              <span key={i} className={cn("h-1 rounded-full transition-colors", i < step ? "bg-gradient-to-r from-[#49f264] to-[#a3f7b0]" : "bg-white/10")} />
            ))}
          </div>
          <p className="mt-3 text-[11px] font-semibold tracking-[0.2em] text-white/45 uppercase">
            Step {step} of {STEPS}
          </p>
        </div>

        {step === 1 ? (
          <section className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{firstName ? `Welcome, ${firstName}! ` : ""}Which fits you best?</h1>
            <div className="mt-7 space-y-3" role="radiogroup" aria-label="Which fits you best">
              {ROLES.map((r) => {
                const L = ROLE_LOOK[r.key];
                const on = answers.role === r.key;
                return (
                  <Choice key={r.key} role="radio" checked={on} onClick={() => setAnswers((a) => ({ ...a, role: r.key }))} icon={L.icon} tile={L.tile} title={r.title} hint={r.hint} />
                );
              })}
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">What brings you here?</h1>
            <p className="mt-2 text-white/60">Pick as many as you like.</p>
            <div className="mt-7 space-y-3" role="group" aria-label="What brings you here">
              {GOALS.map((g) => {
                const L = GOAL_LOOK[g.key];
                return <Choice key={g.key} role="checkbox" checked={answers.goals.includes(g.key)} onClick={() => toggleGoal(g.key)} icon={L.icon} tile={L.tile} title={g.title} hint={g.hint} />;
              })}
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Where do people find you?</h1>
              <p className="mt-2 text-white/60">Pick your platforms. Your links will be built around them.</p>
              <div className="mt-7 grid grid-cols-3 gap-3 sm:grid-cols-5" role="group" aria-label="Your platforms">
                {PLATFORMS.map((p) => {
                  const on = p.key in answers.platforms;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => togglePlatform(p.key)}
                      className={cn(
                        "relative flex aspect-square flex-col items-center justify-center gap-2.5 rounded-2xl border bg-white/[0.04] text-xs font-semibold transition",
                        on ? "border-[#49f264] bg-[#49f264]/10 shadow-[0_0_24px_-8px_#49f264]" : "border-white/10 hover:border-white/25 hover:bg-white/[0.07]",
                      )}
                    >
                      {on ? <Check className="absolute top-2 right-2 size-3.5 text-[#49f264]" aria-hidden /> : null}
                      <span className="grid size-10 place-items-center rounded-full bg-white/10">
                        {p.key === "fanvue" ? (
                          <span aria-hidden className="inline-block size-5 bg-[#49f264] [mask:url(/brands/fanvue-mark.png)_center/contain_no-repeat]" />
                        ) : (
                          <SocialGlyph network={p.key} size={20} />
                        )}
                      </span>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <aside className="h-fit rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[11px] font-semibold tracking-[0.2em] text-white/50 uppercase">
                Your handles <span className="tracking-normal normal-case">(optional)</span>
              </p>
              {picked.length ? (
                <div className="mt-4 space-y-2.5">
                  {picked.map((k) => (
                    <label key={k} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 focus-within:border-[#49f264]/60">
                      <span className="w-20 shrink-0 text-xs text-white/60">{PLATFORMS.find((p) => p.key === k)?.label}</span>
                      <span className="text-white/40">@</span>
                      <input
                        value={answers.platforms[k] ?? ""}
                        onChange={(e) => setAnswers((a) => ({ ...a, platforms: { ...a.platforms, [k]: e.target.value } }))}
                        placeholder="yourname"
                        maxLength={60}
                        aria-label={`Your ${PLATFORMS.find((p) => p.key === k)?.label} handle`}
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/25"
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mt-6 mb-4 text-center text-sm text-white/50">Tap a platform to add it here.</p>
              )}
            </aside>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="mt-6">
            <div className="mx-auto max-w-xl text-center">
              <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-[#49f264]/15 text-[#49f264]">
                <Crown className="size-6" aria-hidden />
              </span>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">You&apos;re all set. Pick your plan</h1>
              <p className="mt-2 text-white/60">Your account starts with a free Pro trial. Choose a plan to keep everything when it ends, or continue for free.</p>
              <div className="mx-auto mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1 text-sm" role="radiogroup" aria-label="Billing">
                {(["month", "year"] as const).map((i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={billing === i}
                    onClick={() => setBilling(i)}
                    className={cn("rounded-full px-4 py-1.5 font-medium transition", billing === i ? "bg-white text-black" : "text-white/60 hover:text-white")}
                  >
                    {i === "month" ? "Monthly" : "Yearly"}
                    {i === "year" ? <span className={cn("ml-1.5 text-xs", billing === i ? "text-[#16a34a]" : "text-[#49f264]")}>2 months free</span> : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3" role="radiogroup" aria-label="Plans">
              {PAID.map((p) => {
                const price = PLAN_PRICES_USD[p];
                const limits = PLAN_LIMITS[p];
                const on = plan === p;
                const popular = p === "BUSINESS";
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPlan(p)}
                    className={cn(
                      "relative rounded-3xl border p-5 text-left transition",
                      on ? "border-[#49f264] bg-[#49f264]/[0.08] shadow-[0_0_40px_-14px_#49f264]" : "border-white/10 bg-white/[0.04] hover:border-white/25",
                    )}
                  >
                    {popular ? (
                      <span className="absolute -top-3 right-4 rounded-full bg-[#49f264] px-2.5 py-0.5 text-[11px] font-bold text-black">Most popular</span>
                    ) : null}
                    <span className="flex items-center justify-between">
                      <span className="text-lg font-semibold">{PLAN_LABEL[p]}</span>
                      <span className={cn("grid size-5 place-items-center rounded-full border", on ? "border-[#49f264] bg-[#49f264] text-black" : "border-white/30")}>
                        {on ? <Check className="size-3" aria-hidden /> : null}
                      </span>
                    </span>
                    <span className="mt-3 block">
                      <span className="text-3xl font-bold">${billing === "year" ? Math.round((price.yearly / 12) * 100) / 100 : price.monthly}</span>
                      <span className="text-sm text-white/50"> / month</span>
                    </span>
                    <span className="block text-xs text-white/45">{billing === "year" ? `$${price.yearly} billed yearly` : "Billed monthly"}</span>
                    <ul className="mt-4 space-y-1.5 text-sm text-white/75">
                      {[
                        `${limits.maxSmartLinks} deeplinks & Two-Steps`,
                        `${limits.maxPages} bio pages`,
                        `${limits.customDomains} custom domain${Number(limits.customDomains) === 1 ? "" : "s"}`,
                        "Full analytics & 18+ pages",
                      ].map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <Check className="size-3.5 shrink-0 text-[#49f264]" aria-hidden /> {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>

      {/* Bottom bar: back + continue */}
      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[#0a0a0a]/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-5 py-4">
          {step > 1 && step < STEPS ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="flex items-center gap-1 px-2 text-sm text-white/60 hover:text-white">
              <ArrowLeft className="size-4" aria-hidden /> Back
            </button>
          ) : null}
          {step < 3 ? (
            <ContinueButton disabled={step === 1 ? !answers.role : answers.goals.length === 0} onClick={() => setStep((s) => s + 1)} />
          ) : step === 3 ? (
            <ContinueButton busy={saving} onClick={() => saveThen(() => setStep(4))} />
          ) : (
            <div className="flex w-full flex-col gap-2">
              <ContinueButton label={`Continue with ${PLAN_LABEL[plan]}`} onClick={() => finish(`/dashboard/billing?plan=${plan}&interval=${billing}`)} />
              <button type="button" onClick={() => finish("/dashboard?welcome=1")} className="py-1 text-sm text-white/55 hover:text-white">
                Continue for free
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

function Choice({
  role,
  checked,
  onClick,
  icon: Icon,
  tile,
  title,
  hint,
}: {
  role: "radio" | "checkbox";
  checked: boolean;
  onClick: () => void;
  icon: LucideIcon;
  tile: string;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-3xl border p-2.5 pr-5 text-left transition",
        checked ? "border-[#49f264] bg-[#49f264]/[0.08] shadow-[0_0_30px_-12px_#49f264]" : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]",
      )}
    >
      <span className={cn("grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", tile)}>
        <Icon className="size-8" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-white/55">{hint}</span>
        <span className="block text-xl font-semibold">{title}</span>
      </span>
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", checked ? "border-[#49f264] bg-[#49f264] text-black" : "border-white/25")}>
        {checked ? <Check className="size-3.5" aria-hidden /> : null}
      </span>
    </button>
  );
}

function ContinueButton({ onClick, disabled = false, busy = false, label = "Continue" }: { onClick: () => void; disabled?: boolean; busy?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-[#49f264] px-6 py-3.5 text-base font-semibold text-black shadow-[0_10px_30px_-10px_#49f264] transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40 disabled:shadow-none"
    >
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {label} {busy ? null : <ArrowRight className="size-4" aria-hidden />}
    </button>
  );
}

