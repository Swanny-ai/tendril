"use client";

import { useMemo, useState } from "react";
import { CalendarClock, ChevronDown, Globe2, MonitorSmartphone, Search, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CountryFlag } from "@/components/country-flag";
import { isDefaultAccess, type LinkAccess, type LinkDevices } from "@/lib/link-access";
import { cn } from "@/lib/utils";

// Every ISO country code with an English name (from the browser), sorted by name.
const COUNTRY_CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(
    " ",
  );

const DEVICES: { value: LinkDevices; label: string }[] = [
  { value: "all", label: "All devices" },
  { value: "mobile", label: "Phones & tablets" },
  { value: "desktop", label: "Computers" },
];

/** ISO date → the value of a datetime-local input, in the browser's time zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

/** "Advanced": who can open the link (bot check, countries, devices) and when. Collapsed by default. */
export function AdvancedAccess({ value, onChange, turnstileReady = true }: { value: LinkAccess; onChange: (v: LinkAccess) => void; turnstileReady?: boolean }) {
  const [open, setOpen] = useState(!isDefaultAccess(value));
  const [query, setQuery] = useState("");
  const names = useMemo(() => {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    return new Map(COUNTRY_CODES.map((c) => [c, dn.of(c) ?? c]));
  }, []);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return COUNTRY_CODES.filter((c) => !value.blockedCountries.includes(c) && (names.get(c)!.toLowerCase().includes(q) || c.toLowerCase() === q))
      .sort((a, b) => names.get(a)!.localeCompare(names.get(b)!))
      .slice(0, 8);
  }, [query, names, value.blockedCountries]);
  const set = (patch: Partial<LinkAccess>) => onChange({ ...value, ...patch });
  const block = (c: string) => {
    set({ blockedCountries: [...value.blockedCountries, c] });
    setQuery("");
  };
  const active = [
    value.botProtection ? "Bot protection" : null,
    value.blockedCountries.length ? `${value.blockedCountries.length} blocked ${value.blockedCountries.length === 1 ? "country" : "countries"}` : null,
    value.devices !== "all" ? DEVICES.find((d) => d.value === value.devices)?.label : null,
    value.startsAt || value.endsAt ? "Scheduled" : null,
  ].filter(Boolean);

  return (
    <Card size="sm">
      <CardContent className="space-y-4">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2.5 text-left">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">
            <SlidersHorizontal />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold">Advanced</span>
            <span className="block truncate text-xs text-muted-foreground">{active.length ? active.join(" · ") : "Blocked countries, devices and schedule"}</span>
          </span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
        </button>

        {open ? (
          <div className="space-y-5 border-t pt-4">
            {/* Bot protection (Cloudflare Turnstile) */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <ShieldCheck className="size-4 text-muted-foreground" aria-hidden /> Cloudflare Bot Protection
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Turnstile</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">Verify visitors are real people before they reach your link.</p>
                {value.botProtection && !turnstileReady ? (
                  <p className="mt-1 text-xs text-[var(--persimmon)]">Add Cloudflare Turnstile keys on the server to turn this on (TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY).</p>
                ) : null}
              </div>
              <Switch checked={value.botProtection} onCheckedChange={(botProtection) => set({ botProtection })} aria-label="Cloudflare bot protection" />
            </div>

            {/* Countries */}
            <div className="space-y-2">
              <Label htmlFor="block-country" className="flex items-center gap-1.5">
                <Globe2 className="size-4 text-muted-foreground" aria-hidden /> Blocked countries
              </Label>
              <p className="text-xs text-muted-foreground">Visitors from these countries see &ldquo;This link isn&apos;t available in your country&rdquo;.</p>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="block-country"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && matches[0]) {
                      e.preventDefault();
                      block(matches[0]);
                    }
                  }}
                  placeholder="Search a country to block"
                  className="pl-9"
                  autoComplete="off"
                />
                {matches.length ? (
                  <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg" role="listbox">
                    {matches.map((c) => (
                      <li key={c}>
                        <button type="button" role="option" aria-selected={false} onClick={() => block(c)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted">
                          <CountryFlag code={c} /> {names.get(c)}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {value.blockedCountries.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {value.blockedCountries.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1.5 rounded-full border bg-muted py-1 pr-1 pl-2.5 text-xs">
                      <CountryFlag code={c} /> {names.get(c) ?? c}
                      <button
                        type="button"
                        onClick={() => set({ blockedCountries: value.blockedCountries.filter((x) => x !== c) })}
                        className="grid size-5 place-items-center rounded-full hover:bg-background"
                        aria-label={`Unblock ${names.get(c) ?? c}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  <button type="button" onClick={() => set({ blockedCountries: [] })} className="px-1 text-xs text-muted-foreground hover:text-foreground">
                    Clear all
                  </button>
                </div>
              ) : null}
            </div>

            {/* Devices */}
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <MonitorSmartphone className="size-4 text-muted-foreground" aria-hidden /> Works on
              </p>
              <div className="grid grid-cols-3 gap-1 rounded-lg border bg-muted p-1 text-sm" role="radiogroup" aria-label="Devices">
                {DEVICES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    role="radio"
                    aria-checked={value.devices === d.value}
                    onClick={() => set({ devices: d.value })}
                    className={cn("rounded-md px-2 py-1.5 font-medium", value.devices === d.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <CalendarClock className="size-4 text-muted-foreground" aria-hidden /> Schedule
              </p>
              <p className="text-xs text-muted-foreground">Leave empty to keep the link on all the time. Times are in your time zone.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="starts-at" className="text-xs font-normal text-muted-foreground">
                    Starts
                  </Label>
                  <Input id="starts-at" type="datetime-local" value={toLocalInput(value.startsAt)} onChange={(e) => set({ startsAt: fromLocalInput(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ends-at" className="text-xs font-normal text-muted-foreground">
                    Ends
                  </Label>
                  <Input id="ends-at" type="datetime-local" value={toLocalInput(value.endsAt)} onChange={(e) => set({ endsAt: fromLocalInput(e.target.value) })} />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
