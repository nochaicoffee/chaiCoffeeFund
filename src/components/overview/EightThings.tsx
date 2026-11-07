"use client";

import Link from "next/link";
import { useState } from "react";
import { INSIGHT_TAGS, type Insight, type InsightTag, type InsightVis } from "@/app/overview/insights";

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
const TAG_STYLE: Record<InsightTag, string> = {
  cash: "bg-[oklch(0.93_0.04_250)] text-[oklch(0.4_0.12_250)]",
  debt: "bg-[oklch(0.94_0.05_55)] text-[oklch(0.45_0.12_55)]",
  risk: "bg-[oklch(0.94_0.04_20)] text-[oklch(0.46_0.15_22)]",
  growth: "bg-[oklch(0.94_0.05_150)] text-[oklch(0.4_0.11_150)]",
  habits: "bg-[oklch(0.94_0.04_310)] text-[oklch(0.44_0.13_310)]",
};
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * Eight things worth knowing about your money (docs/design/overview.md, OvT1): a card for each thing noticed, filterable by area, each with a
 * picture of the measure and a flip to how it is worked out. Measures from your own records, never advice.
 */
export function EightThings({ items }: { items: Insight[] }) {
  const [tag, setTag] = useState<InsightTag | "all">("all");
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  if (items.length === 0) return null;
  const shown = tag === "all" ? items : items.filter((i) => i.tag === tag);
  const count = (t: InsightTag | "all") => (t === "all" ? items.length : items.filter((i) => i.tag === t).length);
  const starred = items.filter((i) => i.star).length;
  const heading = `${items.length <= 8 ? WORDS[items.length] : items.length} ${items.length === 1 ? "thing" : "things"} worth knowing about your money`;
  const flip = (key: string) => setFlipped((s) => { const next = new Set(s); if (!next.delete(key)) next.add(key); return next; });

  return (
    <section aria-label="Things noticed" className="flex flex-col gap-5 rounded-[26px] p-5 text-on-card md:p-8" style={{ background: "linear-gradient(140deg, var(--card-violet-from), var(--card-violet-to))" }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold tracking-[0.06em] uppercase opacity-80">Things I noticed</div>
          <h2 className="mt-1 text-[22px] leading-tight font-extrabold md:text-[30px]">{heading}</h2>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by area">
          {(["all", ...INSIGHT_TAGS] as const).filter((t) => t === "all" || count(t) > 0).map((t) => (
            <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(t)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-on-card ${tag === t ? "bg-on-card text-ink" : "bg-on-card-fill hover:bg-white/25"}`}>
              {t === "all" ? "All" : cap(t)}
              <small className="text-[11px] opacity-70">{count(t)}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-[22px] bg-on-card-fill p-5">
          <div className="text-xs font-extrabold tracking-[0.06em] uppercase opacity-80">What I noticed</div>
          <div className="text-[64px] leading-none font-extrabold">{items.length}<small className="ml-2 text-xl font-bold opacity-80">{items.length === 1 ? "thing" : "things"}</small></div>
          <p className="text-sm font-semibold opacity-90">in your numbers today.{starred > 0 ? ` ${WORDS[starred] ?? starred} ${starred === 1 ? "is" : "are"} worth acting on, the rest are worth knowing.` : " All are worth knowing."}</p>
          <ul className="mt-auto flex flex-col gap-1.5 text-[11px] font-extrabold tracking-[0.05em] uppercase">
            {INSIGHT_TAGS.filter((t) => count(t) > 0).map((t) => (
              <li key={t} className="flex items-center justify-between rounded-full bg-on-card-fill px-3 py-1"><span>{t}</span><span>{count(t)}</span></li>
            ))}
          </ul>
          <p className="border-t border-on-card-fill pt-2 text-[11.5px] font-semibold opacity-80">Each one is worked out from your own figures, and says how. They&apos;re measures, never advice.</p>
        </div>
        {shown.map((i) => (
          <article key={i.key} className={`flex min-h-[290px] flex-col gap-3 rounded-[22px] bg-surface p-5 text-fg shadow-[var(--card-shadow)] ${i.star ? "ring-2 ring-[oklch(0.8_0.15_85)]" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-[0.04em] uppercase ${TAG_STYLE[i.tag]}`}>{i.tag}</span>
              {i.star && <span className="rounded-full bg-[oklch(0.94_0.06_150)] px-2.5 py-0.5 text-[11px] font-extrabold text-[oklch(0.4_0.11_150)]">worth acting on</span>}
            </div>
            {flipped.has(i.key) ? (
              <>
                <h3 className="text-[15px] font-extrabold">How it&apos;s worked out</h3>
                <ol className="list-decimal space-y-1.5 pl-5 text-[13px] font-semibold text-muted">{i.how.map((line, k) => <li key={k}>{line}</li>)}</ol>
              </>
            ) : (
              <>
                <h3 className="text-[17px] leading-snug font-extrabold text-balance">{i.title}</h3>
                <p className="text-[13px] font-semibold text-muted">{i.body}</p>
                <div className="mt-auto"><Vis vis={i.vis} /></div>
              </>
            )}
            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
              <button type="button" aria-pressed={flipped.has(i.key)} onClick={() => flip(i.key)} className="text-[13px] font-extrabold text-accent-text underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent">{flipped.has(i.key) ? "Back" : "How it's worked out"}</button>
              <Link href={i.href} className="rounded-full bg-fill px-3.5 py-1.5 text-xs font-extrabold focus-visible:outline-2 focus-visible:outline-accent">{i.act}</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Vis({ vis }: { vis: InsightVis }) {
  if (vis.kind === "line") {
    const lo = Math.min(...vis.points), hi = Math.max(...vis.points), n = vis.points.length - 1;
    const pts = vis.points.map((v, i) => `${(i / n) * 300},${52 - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * 44}`);
    const [mx, my] = pts[vis.mark].split(",").map(Number);
    return (
      <div className="flex flex-col gap-1" aria-label={vis.caption} role="img">
        <svg viewBox="0 0 300 60" className="h-14 w-full"><polyline points={pts.join(" ")} fill="none" stroke="var(--card-sapphire)" strokeWidth={2.4} strokeLinejoin="round" /><circle cx={mx} cy={my} r={4.5} fill="var(--card-amber)" /></svg>
        <small className="text-[11.5px] font-semibold text-muted">{vis.caption}</small>
      </div>
    );
  }
  const max = Math.max(...vis.rows.map((r) => r.value), 1);
  return (
    <div className="flex flex-col gap-1.5">
      {vis.rows.map((r) => (
        <div key={r.label} className="flex flex-col gap-0.5">
          <small className="text-[11.5px] font-semibold text-muted">{r.label}</small>
          <div className="h-[22px] rounded-md bg-fill"><div className="flex h-full min-w-[3.2rem] items-center rounded-md px-2 text-[11px] font-extrabold text-white" style={{ width: `${Math.max(12, (r.value / max) * 100)}%`, background: `var(--card-${r.colorKey})` }}>{r.text}</div></div>
        </div>
      ))}
      {vis.foot && <small className="text-[11px] font-semibold text-muted">{vis.foot}</small>}
    </div>
  );
}
