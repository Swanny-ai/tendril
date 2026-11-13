"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Download, FileArchive, History, Link2, Loader2, RotateCcw, ScanSearch, ShieldCheck, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { extractLinks, mergeLinks, shouldRead, type FoundLink, type LinkPlace } from "@/lib/ig-link-history";
import { cn } from "@/lib/utils";
import { listZip, readZipText } from "@/lib/zip-reader";

type Mine = { address: string; name: string };
type State =
  | { step: "idle" }
  | { step: "reading"; done: number; total: number; file: string }
  | { step: "done"; links: FoundLink[]; files: number; fileName: string }
  | { step: "error"; message: string };

const PLACE_LABEL: Record<LinkPlace, string> = {
  "profile-now": "Bio link now",
  "profile-before": "Old bio link",
  posts: "Posts",
  stories: "Stories",
  other: "Other",
};

const date = (ts: number | null) => (ts ? new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const bare = (url: string) => url.replace(/^https:\/\//, "");

/** The upload, the reading progress and the results. Everything happens in this browser tab. */
export function LinkHistoryScan({ mine, ourHosts }: { mine: Mine[]; ourHosts: string[] }) {
  const [state, setState] = useState<State>({ step: "idle" });
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function scan(file: File) {
    if (!/\.zip$/i.test(file.name)) return setState({ step: "error", message: "Choose the .zip file Instagram sent you." });
    try {
      setState({ step: "reading", done: 0, total: 0, file: file.name });
      const entries = (await listZip(file)).filter((e) => shouldRead(e.name, e.size));
      if (!entries.some((e) => e.name.toLowerCase().includes("personal_information") || e.name.toLowerCase().includes("instagram"))) {
        throw new Error("This zip doesn't look like an Instagram download. Check the steps above and try again.");
      }
      const hits = [];
      for (let i = 0; i < entries.length; i++) {
        setState({ step: "reading", done: i, total: entries.length, file: file.name });
        hits.push(...extractLinks(entries[i].name, await readZipText(file, entries[i])));
      }
      setState({ step: "done", links: mergeLinks(hits), files: entries.length, fileName: file.name });
    } catch (e) {
      setState({ step: "error", message: (e as Error).message || "Couldn't read this file." });
    }
  }

  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (f) void scan(f);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <ScanSearch className="size-6 text-primary" aria-hidden /> IG Link History
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Instagram keeps a record of every link you&apos;ve put on your profile, even ones you deleted. Upload your Instagram download to see them all in one list.
        </p>
      </div>

      {state.step === "done" ? (
        <Results links={state.links} files={state.files} fileName={state.fileName} mine={mine} ourHosts={ourHosts} onReset={() => setState({ step: "idle" })} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Feature icon={History} title="Old and deleted links" text="Every website you had in your bio, and links from your posts and stories." />
            <Feature icon={Link2} title="Yours on ViewLink" text="See which of them are your ViewLink links, and check them in Link Health." />
            <Feature icon={ShieldCheck} title="Stays private" text="The file is read in this browser tab. Nothing is uploaded to ViewLink." />
          </div>

          <details className="group rounded-xl border bg-card p-4 text-sm">
            <summary className="cursor-pointer list-none font-medium">How to get your Instagram download →</summary>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted-foreground">
              <li>In the Instagram app, open your profile → menu → Accounts Center.</li>
              <li>Go to Your information and permissions → Download your information.</li>
              <li>Choose Download or transfer information, then your Instagram account.</li>
              <li>Pick Some of your information and tick Personal information and Your Instagram activity.</li>
              <li>Choose Download to device, Date range: All time, Format: JSON, then Create files.</li>
              <li>Instagram emails you when it&apos;s ready (minutes to a few days). Download the .zip and drop it below.</li>
            </ol>
          </details>

          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              pick(e.dataTransfer.files);
            }}
            disabled={state.step === "reading"}
            className={cn(
              "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
              over ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/40",
            )}
          >
            {state.step === "reading" ? (
              <>
                <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
                <span className="font-medium">Reading {state.file}…</span>
                <span className="text-sm text-muted-foreground" role="status">
                  {state.total ? `${state.done} of ${state.total} files` : "Opening the zip"}
                </span>
              </>
            ) : (
              <>
                <Upload className="size-7 text-primary" aria-hidden />
                <span className="font-medium">Drop your Instagram .zip here</span>
                <span className="text-sm text-muted-foreground">or click to choose a file</span>
              </>
            )}
          </button>
          <input ref={input} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => pick(e.target.files)} />
          {state.step === "error" ? <p className="text-sm text-destructive">{state.message}</p> : null}
        </>
      )}
    </div>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof History; title: string; text: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <Icon className="size-5 text-primary" aria-hidden />
      <p className="mt-2 font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

function Results({ links, files, fileName, mine, ourHosts, onReset }: { links: FoundLink[]; files: number; fileName: string; mine: Mine[]; ourHosts: string[]; onReset: () => void }) {
  const mineOf = (l: FoundLink) => mine.find((m) => bare(l.url).toLowerCase() === m.address) ?? null;
  const isOurs = (l: FoundLink) => ourHosts.includes(l.host);
  const bio = links.filter((l) => l.places.includes("profile-now") || l.places.includes("profile-before"));
  const old = links.filter((l) => !l.places.includes("profile-now") && l.places.includes("profile-before"));
  const yours = links.filter((l) => mineOf(l));

  const csv = () => {
    const rows = [["Link", "Where", "First seen", "Last seen", "Times", "On ViewLink"], ...links.map((l) => [l.url, l.places.map((p) => PLACE_LABEL[p]).join(" + "), date(l.firstSeen), date(l.lastSeen), String(l.count), mineOf(l) ? "Yes" : "No"])];
    const text = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = "instagram-link-history.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Links found" value={links.length} />
        <Stat label="Bio links" value={bio.length} />
        <Stat label="Old bio links" value={old.length} />
        <Stat label="Yours on ViewLink" value={yours.length} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileArchive className="size-3.5" aria-hidden /> {fileName} · {files} files read in this browser, nothing uploaded
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={csv} disabled={!links.length}>
            <Download /> Download CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={onReset}>
            <RotateCcw /> Scan another file
          </Button>
        </div>
      </div>

      {links.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No outside links in this download. Make sure it includes Personal information and is in JSON format.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="link-history">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4 font-medium">Link</th>
                  <th className="py-2 pr-4 font-medium">Where</th>
                  <th className="py-2 pr-4 font-medium">First seen</th>
                  <th className="py-2 pr-4 font-medium">Last seen</th>
                  <th className="py-2 text-right font-medium">Times</th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => {
                  const m = mineOf(l);
                  return (
                    <tr key={l.url} className="border-b align-top last:border-0">
                      <td className="max-w-[340px] py-2.5 pr-4">
                        <a href={l.url} target="_blank" rel="noreferrer noopener" className="block truncate font-medium hover:underline" title={l.url}>
                          {bare(l.url)}
                        </a>
                        {m ? (
                          <span className="mt-1 inline-flex items-center gap-2 text-xs">
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">Yours · {m.name}</span>
                            <Link href="/dashboard/link-health" className="text-muted-foreground hover:text-foreground hover:underline">
                              Check health
                            </Link>
                          </span>
                        ) : isOurs(l) ? (
                          <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">ViewLink address, not in your account now</span>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="flex flex-wrap gap-1">
                          {l.places.map((p) => (
                            <span key={p} className={cn("rounded-full px-2 py-0.5 text-xs whitespace-nowrap", p === "profile-now" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                              {PLACE_LABEL[p]}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">{date(l.firstSeen)}</td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">{date(l.lastSeen)}</td>
                      <td className="py-2.5 text-right tabular-nums">{l.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">
        Dates come from your download: when a bio link was changed, or when the post or story was made. Links Instagram didn&apos;t date show “—”.{" "}
        <Link href="/dashboard/link-health" className={buttonVariants({ variant: "link", size: "sm" })}>
          Open Link Health
        </Link>
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
