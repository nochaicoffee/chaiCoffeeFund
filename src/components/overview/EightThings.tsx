"use client";

import Link from "next/link";
import { useState } from "react";
import { INSIGHT_TAGS, type Insight, type InsightTag, type InsightVis } from "@/app/overview/insights";
import { RingTexture, RIPPLE_BASE, whiteSheen } from "../RingTexture";

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
const TAG_STYLE: Record<InsightTag, string> = {
  cash: "bg-[oklch(0.93_0.04_250)] text-[oklch(0.4_0.12_250)]",
  debt: "bg-[oklch(0.94_0.05_55)] text-[oklch(0.45_0.12_55)]",
  risk: "bg-[oklch(0.94_0.04_20)] text-[oklch(0.46_0.15_22)]",
  growth: "bg-[oklch(0.94_0.05_150)] text-[oklch(0.4_0.11_150)]",
  habits: "bg-[oklch(0.94_0.04_310)] text-[oklch(0.44_0.13_310)]",
};
/** The rings ripple outward under the pointer, as on the Cards heatmap (#104). */
const RIPPLE = `${RIPPLE_BASE} group-hover/thing:scale-[1.18] group-focus-within/thing:scale-[1.18]`;
const SHEEN = whiteSheen("90% 0%", 0.18);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * Eight things worth knowing about your money (docs/design/overview.md, OvT1): a card for each thing noticed, filterable by area, each with a
 * picture of the measure and a flip to how it is worked out. Measures from your own records, never advice. The count at the left lists the areas:
 * click one to filter to it. A card lifts under the pointer, its rings ripple, and it fades to its working-out and back.
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
    <section aria-label="Things noticed" className="relative isolate flex flex-col gap-5 overflow-clip card-edge card-lift rounded-[26px] p-5 text-on-card md:p-8" style={{ background: "linear-gradient(140deg, var(--card-violet-from), var(--card-violet-to))" }}>
      <RingTexture width={1200} height={700} dx={40} dy={40} first={60} step={30} stroke="var(--rings-light)" opacity={0.08} sheen={SHEEN} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold tracking-[0.06em] uppercase label-face opacity-80">Things I noticed</div>
          <h2 className="mt-1 text-[22px] leading-tight font-extrabold md:text-[30px]">{heading}</h2>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by area">
          {(["all", ...INSIGHT_TAGS] as const).filter((t) => t === "all" || count(t) > 0).map((t) => (
            <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(t)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-[var(--btn-radius,calc(infinity*1px))] btn-edge px-4 text-[13px] font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-on-card ${tag === t ? "bg-on-card text-[var(--on-card-inverse,var(--ink))]" : "bg-on-card-fill hover:bg-[var(--on-card-hover,color-mix(in_oklab,#fff_25%,transparent))]"}`}>
              {t === "all" ? "All" : cap(t)}
              <small className="text-[11px] opacity-70">{count(t)}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="relative isolate flex flex-col gap-3 overflow-clip rounded-card bg-on-card-fill p-5">
          <RingTexture width={380} height={420} dx={10} dy={19} first={45} step={26} stroke="var(--rings-light)" opacity={0.1} />
          <div className="text-xs font-extrabold tracking-[0.06em] uppercase label-face opacity-80">What I noticed</div>
          <div className="text-[64px] leading-none font-extrabold">{items.length}<small className="ml-2 text-xl font-bold opacity-80">{items.length === 1 ? "thing" : "things"}</small></div>
          <p className="text-sm font-semibold opacity-90">in your numbers today.{starred > 0 ? ` ${WORDS[starred] ?? starred} ${starred === 1 ? "is" : "are"} worth acting on, the rest are worth knowing.` : " All are worth knowing."}</p>
          <ul className="mt-auto flex flex-col gap-1.5 text-[11px] font-extrabold tracking-[0.05em] uppercase label-face">
            {INSIGHT_TAGS.filter((t) => count(t) > 0).map((t) => (
              <li key={t}>
                <button type="button" aria-pressed={tag === t} aria-label={`${cap(t)}: ${count(t)}`} onClick={() => setTag(tag === t ? "all" : t)} className={`flex w-full cursor-pointer items-center justify-between rounded-[var(--btn-radius,calc(infinity*1px))] btn-edge px-3 py-1 text-[11px] font-extrabold tracking-[0.05em] uppercase label-face motion-safe:transition-[background,color,translate] motion-safe:duration-200 hover:translate-x-0.5 focus-visible:outline-2 focus-visible:outline-on-card ${tag === t ? "bg-on-card text-[var(--on-card-inverse,var(--ink))]" : "bg-on-card-fill hover:bg-[var(--on-card-hover,color-mix(in_oklab,#fff_25%,transparent))]"}`}><span>{t}</span><span>{count(t)}</span></button>
              </li>
            ))}
          </ul>
          <p className="border-t border-on-card-fill pt-2 text-[11.5px] font-semibold opacity-80">Each one is worked out from your own figures, and says how. They&apos;re measures, never advice.</p>
        </div>
        {shown.map((i) => (
          <article key={i.key} className={`group/thing relative isolate flex min-h-[290px] flex-col gap-3 overflow-clip rounded-card bg-surface p-5 text-fg shadow-[var(--card-shadow)] motion-safe:transition-[translate,box-shadow] motion-safe:duration-200 hover:-translate-y-0.5 hover:shadow-[var(--lift-shadow)] ${i.star ? "ring-2 ring-[oklch(0.8_0.15_85)]" : ""}`}>
            <RingTexture width={380} height={290} dx={10} dy={19} first={45} step={26} stroke="var(--rings-ink)" opacity={0.07} ringsClassName={RIPPLE} />
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full badge-edge px-2.5 py-0.5 text-[11px] font-extrabold tracking-[0.04em] uppercase label-face ${TAG_STYLE[i.tag]}`}>{i.tag}</span>
              {i.star && <span className="rounded-full badge-edge badge-face bg-[oklch(0.94_0.06_150)] px-2.5 py-0.5 text-[11px] font-extrabold text-[oklch(0.4_0.11_150)]">worth acting on</span>}
            </div>
            <div key={String(flipped.has(i.key))} className="flex flex-1 flex-col gap-3 motion-safe:animate-tip-in">
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
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
              <button type="button" aria-pressed={flipped.has(i.key)} onClick={() => flip(i.key)} className="text-[13px] font-extrabold text-accent-text underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent">{flipped.has(i.key) ? "Back" : "How it's worked out"}</button>
              <Link href={i.href} className="rounded-full btn-edge bg-fill px-3.5 py-1.5 text-xs font-extrabold focus-visible:outline-2 focus-visible:outline-accent">{i.act}</Link>
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
