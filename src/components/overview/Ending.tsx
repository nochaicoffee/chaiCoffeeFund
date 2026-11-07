"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DayGroup, EndingView, EventItem, WarningItem } from "@/app/overview/endingView";
import { formatDayDate } from "@/lib/format/date";

const DOT = { red: "bg-negative", amber: "bg-warning", info: "bg-muted" } as const;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const utc = (date: string) => Date.parse(`${date}T00:00:00Z`);

/**
 * The end of the page (docs/design/overview.md, OvT1): Coming up and Keep in mind as a Timeline, with a toggle to the same things as a Calendar.
 * The Timeline leads with what needs a look now (no day of its own), then each day with its events; an event that a warning belongs to says so.
 * The Calendar is the window's month grid with a panel for the picked day, and the warnings with no day beside it. On a phone the Calendar is a
 * list of the days that have something.
 */
export function Ending({ view }: { view: EndingView }) {
  const [mode, setMode] = useState<"timeline" | "calendar">("timeline");
  const empty = view.now.length === 0 && view.days.length === 0;
  return (
    <section aria-label="Coming up and keep in mind" className="flex flex-col gap-4 rounded-[26px] bg-fill p-5 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.04em] text-muted uppercase">At the end</div>
          <h2 className="mt-1 text-[22px] font-extrabold md:text-[28px]">Coming up, and what to keep in mind</h2>
          <p className="mt-1 text-[13px] font-semibold text-muted">{view.total === 0 ? "Nothing to keep in mind." : `${view.total} ${view.total === 1 ? "thing" : "things"} to keep in mind`} · {view.out} out and {view.in} in over the next 30 days</p>
        </div>
        <div role="group" aria-label="View" className="inline-flex gap-1 rounded-full bg-surface p-1 shadow-[var(--soft-shadow)]">
          {(["timeline", "calendar"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`min-h-9 rounded-full px-4 text-[13px] font-extrabold focus-visible:outline-2 focus-visible:outline-accent ${mode === m ? "bg-ink text-on-ink" : "text-fg hover:bg-fill"}`}>
              {m === "timeline" ? "Timeline" : "Calendar"}
            </button>
          ))}
        </div>
      </div>
      {empty ? <p className="rounded-[18px] bg-surface p-4 text-sm font-semibold text-muted">Nothing is dated in the next 30 days, and nothing needs a look.</p> : mode === "timeline" ? <Timeline view={view} /> : <Calendar view={view} />}
    </section>
  );
}

function Warning({ w }: { w: WarningItem }) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-surface-line bg-surface px-3.5 py-2.5 shadow-[var(--soft-shadow)]" style={w.tone === "red" ? { boxShadow: "inset 3px 0 0 var(--negative)" } : undefined}>
      <i aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${DOT[w.tone]}`} />
      <div className="min-w-0 flex-1">
        <b className="block text-[13.5px] font-extrabold">{w.text}</b>
        <small className="block text-xs font-semibold text-muted">{w.detail}</small>
      </div>
      <span className="hidden shrink-0 rounded-full bg-fill px-2.5 py-0.5 text-[11px] font-extrabold sm:inline">{w.page}</span>
      <Link href={w.href} className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-extrabold text-on-ink focus-visible:outline-2 focus-visible:outline-accent">{w.act}</Link>
    </div>
  );
}

function Event({ e }: { e: EventItem }) {
  const day = Number(e.date.slice(8, 10));
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(e.date.slice(5, 7)) - 1];
  return (
    <div className={`flex items-center gap-3 rounded-[16px] border border-surface-line bg-surface px-3.5 py-2.5 shadow-[var(--soft-shadow)] ${e.cash ? "" : "opacity-75"}`} style={e.warning?.tone === "red" ? { boxShadow: "inset 3px 0 0 var(--negative)" } : undefined}>
      <span className="grid w-11 shrink-0 justify-items-center rounded-[12px] bg-fill py-1.5 leading-none"><b className="text-[17px] font-extrabold">{day}</b><small className="text-[10px] font-extrabold tracking-[0.04em] text-muted uppercase">{month}</small></span>
      <div className="min-w-0 flex-1">
        <b className="block text-[13.5px] font-extrabold">{e.label}</b>
        <small className="block text-xs font-semibold text-muted">{e.sub}</small>
      </div>
      {e.warning && <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold ${e.warning.tone === "red" ? "bg-negative-tint text-negative" : "bg-warning-tint text-warning-text"}`}>needs a look</span>}
      <b className={`shrink-0 text-[15px] font-extrabold tabular-nums ${e.arrives ? "text-positive" : ""}`}>{e.amount}</b>
    </div>
  );
}

function Timeline({ view }: { view: EndingView }) {
  return (
    <div className="relative flex flex-col gap-5 pl-6 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-0.5 before:bg-divider">
      {view.now.length > 0 && (
        <div>
          <Heading title="Needs a look now" note={`${view.now.length} ${view.now.length === 1 ? "thing" : "things"} with no day of their own`} danger />
          <div className="grid gap-2 lg:grid-cols-2">{view.now.map((w) => <Warning key={w.id} w={w} />)}</div>
        </div>
      )}
      {view.days.map((d) => (
        <div key={d.date}>
          <Heading title={d.heading} note={d.relative} />
          <div className="grid gap-2">{d.events.map((e) => <Event key={e.id} e={e} />)}</div>
        </div>
      ))}
    </div>
  );
}

function Heading({ title, note, danger = false }: { title: string; note: string; danger?: boolean }) {
  return (
    <div className="relative mb-2 flex items-baseline gap-2.5">
      <i aria-hidden="true" className={`absolute top-1 -left-6 size-3.5 rounded-full border-[3px] bg-surface ${danger ? "border-negative" : "border-ink"}`} />
      <b className="text-[15px] font-extrabold">{title}</b>
      <small className="text-xs font-semibold text-muted">{note}</small>
    </div>
  );
}

/** The grid of weeks (Monday first) from the week of the window's first day to the week of its last. */
function weeks(view: EndingView): string[][] {
  const first = utc(view.today);
  const start = first - ((new Date(first).getUTCDay() + 6) % 7) * 86_400_000;
  const end = utc(view.until);
  const out: string[][] = [];
  for (let t = start; t <= end + 6 * 86_400_000 && out.length < 8; t += 7 * 86_400_000) {
    const row = Array.from({ length: 7 }, (_, i) => iso(t + i * 86_400_000));
    if (row[0] > view.until) break;
    out.push(row);
  }
  return out;
}

function Calendar({ view }: { view: EndingView }) {
  const [pick, setPick] = useState(view.today);
  const byDate = useMemo(() => new Map(view.days.map((d) => [d.date, d])), [view.days]);
  const grid = useMemo(() => weeks(view), [view]);
  const day: DayGroup | undefined = byDate.get(pick);
  const withEvents = view.days;
  return (
    <>
      <div className="grid gap-5 max-md:hidden md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div>
          <div className="mb-1.5 grid grid-cols-7 gap-1.5 px-1 text-[11px] font-extrabold tracking-[0.05em] text-muted uppercase">{WEEKDAYS.map((d) => <span key={d} className="text-center">{d}</span>)}</div>
          <div className="grid grid-cols-7 gap-1.5">
            {grid.flat().map((date) => {
              const outside = date < view.today || date > view.until;
              const g = byDate.get(date);
              return (
                <button key={date} type="button" disabled={outside} aria-pressed={pick === date} aria-label={`${formatDayDate(date)}${g ? `, ${g.events.length} ${g.events.length === 1 ? "thing" : "things"}` : ""}`} onClick={() => setPick(date)} className={`flex min-h-[84px] flex-col gap-1.5 rounded-[14px] border p-2 text-left transition-shadow focus-visible:outline-2 focus-visible:outline-accent ${outside ? "border-dashed border-divider opacity-40" : "border-surface-line bg-surface hover:-translate-y-px"} ${pick === date ? "ring-2 ring-ink" : ""}`}>
                  <b className={`grid min-w-6 place-items-center rounded-full px-1.5 text-[12.5px] font-extrabold ${date === view.today ? "bg-ink text-on-ink" : ""}`}>{Number(date.slice(8, 10))}</b>
                  {g && (
                    <>
                      <span className="flex flex-wrap gap-1">{g.events.slice(0, 4).map((e) => <i key={e.id} className={`size-2.5 rounded-full ${e.arrives ? "bg-positive" : "bg-negative"} ${e.warning ? "ring-2 ring-warning/60" : ""}`} />)}</span>
                      <small className="mt-auto text-[10.5px] font-bold text-muted">{g.events.length === 1 ? g.events[0].amount : `${g.events.length} things`}</small>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between px-1"><b className="text-[17px] font-extrabold">{formatDayDate(pick)}</b><small className="text-xs font-semibold text-muted">{day?.relative ?? ""}</small></div>
          {day ? day.events.map((e) => <Event key={e.id} e={e} />) : <p className="rounded-[14px] border border-dashed border-divider bg-surface p-3.5 text-[13px] font-semibold text-muted">Nothing dated on this day.</p>}
          <NowList view={view} />
        </div>
      </div>
      <div className="flex flex-col gap-4 md:hidden">
        {view.now.length > 0 && <NowList view={view} />}
        {withEvents.map((d) => (
          <div key={d.date}><Heading title={d.heading} note={d.relative} /><div className="grid gap-2">{d.events.map((e) => <Event key={e.id} e={e} />)}</div></div>
        ))}
      </div>
    </>
  );
}

function NowList({ view }: { view: EndingView }) {
  if (view.now.length === 0) return null;
  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-divider pt-3.5">
      <div className="flex items-baseline justify-between"><b className="text-sm font-extrabold">No day of their own</b><small className="text-xs font-semibold text-muted">{view.now.length} {view.now.length === 1 ? "thing" : "things"}</small></div>
      {view.now.map((w) => <Warning key={w.id} w={w} />)}
    </div>
  );
}
