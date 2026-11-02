"use client";

import type { ReactNode } from "react";
import { ALL } from "@/app/goals/views";
import type { AffordView, ComingUpRow, EntryCard, FinishedRow, MonthView, NeedsWantsView, StairView, TableRow } from "@/app/goals/widgetsView";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { WidgetCard } from "../shell/WidgetCard";
import { ActionButton, useGoalsForms } from "./forms/GoalsForms";
import { FixedPill, GoalTile, NeedBadge, ProgressBar, ScaleBadge, StandingPill } from "./parts";

const dim = (pick: string, topId: string) => (pick !== ALL && pick !== topId ? "opacity-40" : "");

/** Goals (the table): every goal with its sub-goals inside, the line on a bar is where saving should be by now. */
export function GoalsTableCard({ rows, pick, onPick }: { rows: TableRow[]; pick: string; onPick: (id: string) => void }) {
  const cols = "grid-cols-[minmax(0,2.5fr)_0.8fr_0.8fr_minmax(0,1.9fr)_1fr_1.1fr_1.2fr_1fr]";
  return (
    <WidgetCard label="Goals" title="Goals" note="sub-goals sit inside their goal · the line on a bar is where saving should be by now" gap="gap-2">
      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          <div className={`grid ${cols} gap-3 pb-2 text-[11px] font-extrabold tracking-[0.04em] text-muted uppercase`}>
            <span>Goal</span>
            <span>Why</span>
            <span>Horizon</span>
            <span>Set aside</span>
            <span className="text-right">Target</span>
            <span>Due</span>
            <span>Per month</span>
            <span>Standing</span>
          </div>
          {rows.map((r) => (
            <div key={r.id} className={`grid ${cols} items-center gap-3 border-t border-divider py-2.5 ${r.off ? "opacity-60" : ""} ${dim(pick, r.topId)} ${r.sub ? "" : ""}`}>
              <button type="button" onClick={() => onPick(r.topId)} className={`flex min-w-0 items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-accent ${r.sub ? "pl-6" : ""}`}>
                <GoalTile category={r.category} colorKey={r.colorKey} size={r.sub ? 28 : 34} off={r.off} />
                <span className="min-w-0">
                  <b className={`block truncate text-[13px] font-extrabold ${r.standing === "Dropped" ? "line-through" : ""}`}>{r.name}</b>
                  <small className="block truncate text-[11px] font-semibold text-muted">{r.note}</small>
                </span>
              </button>
              <span>
                <NeedBadge need={r.need} />
              </span>
              <span>
                <ScaleBadge scale={r.scale} />
              </span>
              <span className="min-w-0">
                {r.settled ? <span className="text-[11.5px] font-semibold text-muted">{r.settled}</span> : <ProgressBar progress={r.progress} expected={r.expected} colorKey={r.colorKey} />}
                {!r.settled && <small className="mt-1 block text-[11px] font-semibold text-muted">{r.savedText}</small>}
                {r.settled && r.standing === "Done" && <small className="block text-[11px] font-semibold text-muted">{r.savedText}</small>}
              </span>
              <b className="text-right text-[13px] font-extrabold tabular-nums">{r.target}</b>
              <span>
                <b className="block text-[13px] font-extrabold">{r.due}</b>
                <small className="block text-[11px] font-semibold text-muted">
                  {r.fixed && (
                    <>
                      <FixedPill />{" "}
                    </>
                  )}
                  {r.dueNote}
                </small>
              </span>
              <span>
                <b className="block text-[13px] font-extrabold tabular-nums">{r.perMonth}</b>
                <small className="block text-[11px] font-semibold text-muted">{r.perMonthNote}</small>
              </span>
              <span>
                <StandingPill standing={r.standing} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}

/** Coming up: the next dates, soonest first; a Fixed date short of its plan is marked. */
export function ComingUpCard({ rows, pick, onPick }: { rows: ComingUpRow[]; pick: string; onPick: (id: string) => void }) {
  return (
    <WidgetCard label="Coming up" title="Coming up" note="the next dates, soonest first" gap="gap-1.5">
      {rows.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-10 text-sm font-semibold text-muted">No dates ahead.</p>
      ) : (
        <ul className="flex flex-1 flex-col">
          {rows.map((r) => (
            <li key={r.key} className={`border-t border-divider first:border-t-0 ${dim(pick, r.topId)}`}>
              <button type="button" onClick={() => onPick(r.topId)} className={`flex w-full items-center gap-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-accent ${r.risk ? "-mx-2 rounded-[12px] border-l-[3px] border-negative bg-negative-tint px-3" : ""}`}>
                <GoalTile category={r.category} colorKey={r.colorKey} size={32} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13px] font-extrabold">{r.name}</b>
                  <small className="block truncate text-[11px] font-semibold text-muted">{r.line}</small>
                </span>
                <span className="shrink-0 text-right">
                  <b className="block text-[13px] font-extrabold">{r.date}</b>
                  <small className="block text-[11px] font-semibold text-muted">
                    {r.fixed && <b className="font-extrabold text-negative">Fixed · </b>}
                    {r.dateNote}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

/** This month: what each piece planned against what's done, a bar split by goal, and a button for what's left. */
export function MonthCard({ view }: { view: MonthView }) {
  const { open } = useGoalsForms();
  if (view.rows.length === 0) return null;
  return (
    <WidgetCard label="This month" title="This month" note="what you planned to set aside, and what's done" gap="gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[34px] leading-[1.05] font-extrabold tracking-tight">
            {formatInr(view.counted)}
            <small className="ml-2 text-sm font-bold text-muted">of {formatInr(view.planned)} planned</small>
          </div>
          <div className="mt-1.5 text-xs font-semibold text-muted">
            {view.planned ? Math.round((view.counted / view.planned) * 100) : 0}% of the month&apos;s plan · {view.todoCount} still to do · {view.daysLeft} days left
          </div>
        </div>
        {view.todoCount > 0 && <ActionButton tone="ink" label={`Set aside all ${view.todoCount} remaining`} onClick={() => open({ kind: "set-aside" })} />}
      </div>
      <div className="flex h-[22px] gap-0.5 overflow-hidden rounded-full bg-fill" role="img" aria-label={`${formatInr(view.counted)} of ${formatInr(view.planned)} set aside`}>
        {view.rows.filter((r) => r.planned > 0).map((r) => (
          <span key={r.key} className="relative" style={{ width: `${(r.planned / view.planned) * 100}%`, background: `color-mix(in oklch, var(--card-${r.colorKey}) 18%, transparent)` }}>
            <span className="absolute inset-y-0 left-0" style={{ width: `${r.share * 100}%`, background: `var(--card-${r.colorKey})` }} />
          </span>
        ))}
      </div>
      <ul>
        {view.rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[minmax(0,1.6fr)_auto_minmax(0,1.4fr)_auto] items-center gap-4 border-t border-divider py-2.5 max-md:grid-cols-[minmax(0,1fr)_auto]">
            <span className="flex min-w-0 items-center gap-3">
              <GoalTile category={r.category} colorKey={r.colorKey} size={32} />
              <span className="min-w-0">
                <b className="block truncate text-[13px] font-extrabold">{r.name}</b>
                <small className="block truncate text-[11px] font-semibold text-muted">{r.note}</small>
              </span>
            </span>
            <span className="text-right max-md:hidden">
              <b className="block text-[13px] font-extrabold tabular-nums">{formatInr(r.planned)}</b>
              <small className="block text-[11px] font-semibold text-muted">planned</small>
            </span>
            <span className="max-md:hidden">
              <ProgressBar progress={r.share} expected={null} colorKey={r.colorKey} />
              <small className="mt-1 block text-[11px] font-semibold text-muted">{r.done ? `${formatInr(r.done)}${r.lastOn ? ` on ${r.lastOn.slice(8).replace(/^0/, "")}` : ""}` : "nothing this month"}</small>
            </span>
            <span className="flex items-center justify-end gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${r.state === "done" || r.state === "extra" ? "bg-accent-tint text-accent-text" : r.state === "short" ? "bg-warning-tint text-warning-text" : "bg-fill text-muted"}`}>{r.stateText}</span>
              {r.remaining > 0 && <ActionButton label={`Set aside ${formatInrCompact(r.remaining)}`} onClick={() => open({ kind: "set-aside", goalId: r.key.replace(/#own$/, ""), amount: r.remaining })} />}
            </span>
          </li>
        ))}
      </ul>
      {view.extra > 0 && <p className="text-xs font-medium text-muted">{formatInr(view.extra)} went in over a plan this month. Planned amounts come from each goal&apos;s &quot;planned a month&quot;; the buttons record a set-aside for the day you press them.</p>}
    </WidgetCard>
  );
}

const Meter = ({ value, max, left, color }: { value: number; max: number; left: number; color: string }) => (
  <div className="relative h-3.5 rounded-full bg-fill">
    <i className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
    <b className="absolute -top-1 -bottom-1 w-0.5 rounded bg-ink" style={{ left: `${Math.min(100, (left / max) * 100)}%` }} />
  </div>
);

/** What your money allows: income less obligations (labelled as not a true surplus), against what's planned and what each schedule needs. */
export function AffordCard({ view }: { view: AffordView }) {
  const max = Math.max(view.required, view.leftAmount, view.planned, 1) * 1.08;
  const kv = (name: string, value: string) => (
    <div className="flex items-center justify-between border-t border-divider py-2 text-[13px] font-semibold first:border-t-0">
      <span className="text-muted">{name}</span>
      <b className="font-extrabold tabular-nums">{value}</b>
    </div>
  );
  return (
    <WidgetCard label="What your money allows" title="What your money allows" note="income less obligations, not a true surplus" gap="gap-4">
      <div className="flex flex-col gap-1.5">
        <Meter value={view.planned} max={max} left={view.leftAmount} color="linear-gradient(90deg, color-mix(in oklch, var(--card-emerald) 80%, white), var(--card-emerald))" />
        <span className="flex justify-between text-[11.5px] font-bold text-muted">
          <span>planned {formatInr(view.planned)}</span>
          <span>left {view.left}</span>
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <Meter value={view.required} max={max} left={view.leftAmount} color="linear-gradient(90deg, color-mix(in oklch, var(--card-ruby) 80%, white), var(--card-ruby))" />
        <span className="text-[11.5px] font-bold text-muted">each on its own schedule {formatInr(view.required)}</span>
      </div>
      <div>
        {kv("Income", view.income)}
        {kv("Obligations (EMIs, subscriptions, card bills)", `−${view.obligations}`)}
        {kv("Left after obligations", view.left)}
      </div>
      <p className="text-xs font-medium text-muted">{view.note}</p>
    </WidgetCard>
  );
}

/** The staircase: the money that must be set aside by each date, against what a month puts aside. */
export function StairCard({ view }: { view: StairView | null }) {
  if (!view) return null;
  const W = 1000;
  const H = 260;
  const x = (m: number) => (m / view.months) * W;
  const y = (v: number) => H - (v / view.total) * H * 0.97;
  let d = `M0 ${y(0)}`;
  for (const step of view.steps) d += ` H${x(step.month)} V${y(step.run)}`;
  d += ` H${W}`;
  const line = (points: { month: number; cum: number }[]) => points.map((p, i) => `${i ? "L" : "M"}${x(p.month)} ${y(Math.min(p.cum, view.total))}`).join(" ");
  return (
    <WidgetCard label="The staircase" title="The staircase" note="the money that must be set aside by each date, against what a monthly amount puts aside" gap="gap-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="text-[28px] leading-[1.05] font-extrabold tracking-tight">
          {formatInr(view.total)}
          <small className="ml-2 text-sm font-bold text-muted">still to set aside, in all</small>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-bold">
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-[3px] bg-negative" /> Needed by each date (steps)</span>
          {view.planned > 0 && <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-[3px] bg-accent" /> Your plan, {formatInr(view.planned)} a month</span>}
          {view.minimumBudget && <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-[3px] bg-ink" /> Just enough, {formatInr(view.minimumBudget)} a month</span>}
        </div>
      </div>
      <div className="relative ml-12 mb-6">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[260px] w-full overflow-visible" role="img" aria-label={`${formatInr(view.total)} needed in steps by each date, against what a monthly amount puts aside`}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={0} x2={W} y1={y(view.total * f)} y2={y(view.total * f)} stroke="var(--divider)" strokeDasharray="4 5" />
          ))}
          <path d={`${d} V${H} H0 Z`} fill="color-mix(in oklch, var(--negative) 9%, transparent)" />
          <path d={d} fill="none" stroke="var(--negative)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          {view.planned > 0 && <path d={line(view.plan)} fill="none" stroke="var(--accent)" strokeWidth="3" vectorEffect="non-scaling-stroke" />}
          {view.minimum.length > 0 && <path d={line(view.minimum)} fill="none" stroke="var(--ink)" strokeWidth="3" vectorEffect="non-scaling-stroke" />}
        </svg>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <span key={f} className="absolute -left-12 w-10 text-right text-[10px] font-bold text-muted" style={{ top: `calc(${(1 - 0.97 * f) * 100}% - 7px)` }}>
            {f ? formatInrCompact(view.total * f) : "₹0"}
          </span>
        ))}
        {view.labels.map((label) => (
          <span key={label.month} className="absolute top-[calc(100%+6px)] -translate-x-1/2 text-[10px] font-extrabold tracking-[0.04em] text-muted uppercase" style={{ left: `${(label.month / view.months) * 100}%` }}>
            {label.text}
          </span>
        ))}
      </div>
    </WidgetCard>
  );
}

const Split = ({ a, b, ca, cb }: { a: number; b: number; ca: string; cb: string }) => (
  <div className="flex h-3 overflow-hidden rounded-full bg-fill">
    <span style={{ width: `${(a / Math.max(1, a + b)) * 100}%`, background: ca }} />
    <span style={{ width: `${(b / Math.max(1, a + b)) * 100}%`, background: cb }} />
  </div>
);

/** Needs and wants: by what each part is for, how long, and by category. */
export function NeedsWantsCard({ view }: { view: NeedsWantsView }) {
  const pc = (n: number) => `${Math.round((n / Math.max(1, view.total)) * 100)}%`;
  const top = Math.max(1, ...view.categories.map((c) => c.amount));
  return (
    <WidgetCard label="Needs and wants" title="Needs and wants" note="by what each part is for, and for how long" gap="gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[13px] font-extrabold"><span>Why</span><span className="text-xs font-semibold text-muted">{formatInr(view.total)} in all</span></div>
        <Split a={view.need} b={view.want} ca="var(--negative)" cb="oklch(0.5 0.1 258)" />
        <div className="flex justify-between text-xs font-bold"><span>Needs {formatInr(view.need)} <span className="text-muted">· {pc(view.need)}</span></span><span>Wants {formatInr(view.want)}</span></div>
      </div>
      <div className="flex flex-col gap-1.5">
        <b className="text-[13px] font-extrabold">How long</b>
        <Split a={view.minor} b={view.major} ca="var(--muted)" cb="var(--ink)" />
        <div className="flex justify-between text-xs font-bold"><span>Minor {formatInr(view.minor)}</span><span>Major {formatInr(view.major)} <span className="text-muted">· {pc(view.major)}</span></span></div>
      </div>
      <div className="flex flex-col gap-2">
        <b className="text-[13px] font-extrabold">By category</b>
        {view.categories.map((c) => (
          <div key={c.category} className="grid grid-cols-[86px_minmax(0,1fr)_70px] items-center gap-2.5 text-xs font-bold">
            <span>{c.category}</span>
            <span className="h-2 rounded-full bg-fill"><i className="block h-full rounded-full" style={{ width: `${(c.amount / top) * 100}%`, background: `var(--card-${c.colorKey})` }} /></span>
            <span className="text-right tabular-nums">{formatInrCompact(c.amount)}</span>
          </div>
        ))}
      </div>
      <p className="text-xs font-medium text-muted">Minor is short-term, Major a long-term commitment. You pick it per goal.</p>
    </WidgetCard>
  );
}

/** Set aside lately: the latest entries, a take-back in red. */
export function SetAsidesCard({ rows, onPick }: { rows: EntryCard[]; onPick: (id: string) => void }) {
  return (
    <WidgetCard label="Set aside lately" title="Set aside lately" note="the latest entries" gap="gap-1.5">
      {rows.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-10 text-sm font-semibold text-muted">Nothing set aside yet.</p>
      ) : (
        <ul className="flex flex-1 flex-col">
          {rows.map((r) => (
            <li key={r.id} className="border-t border-divider first:border-t-0">
              <button type="button" onClick={() => onPick(r.topId)} className="flex w-full items-center gap-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-accent">
                <GoalTile category={r.category} colorKey={r.colorKey} size={30} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13px] font-extrabold">{r.name}</b>
                  <small className="block truncate text-[11px] font-semibold text-muted">{r.note}</small>
                </span>
                <span className="shrink-0 text-right">
                  <b className={`block text-[13px] font-extrabold tabular-nums ${r.take ? "text-negative" : ""}`}>{r.amount}</b>
                  <small className="block text-[11px] font-semibold text-muted">{r.date}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

/** Finished: what each bought goal cost against its estimate. */
export function FinishedCard({ rows }: { rows: FinishedRow[] }) {
  if (rows.length === 0) return null;
  const body: ReactNode = rows.map((r) => (
    <div key={r.id} className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <GoalTile category={r.category} colorKey={r.colorKey} size={36} />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[13px] font-extrabold">{r.name}</b>
          <small className="block text-[11px] font-semibold text-muted">{r.note}</small>
        </span>
        <span className="text-right">
          <b className="block text-[13px] font-extrabold tabular-nums">{r.cost}</b>
          <small className="block text-[11px] font-semibold text-muted">{r.estimate}</small>
        </span>
      </div>
      <div className={`rounded-[14px] px-3.5 py-3 text-[13px] font-bold ${r.under ? "bg-accent-tint text-accent-text" : "bg-warning-tint text-warning-text"}`}>{r.verdict}</div>
    </div>
  ));
  return (
    <WidgetCard label="Finished" title="Finished" note="estimate against what it cost" gap="gap-4">
      {body}
      <p className="text-xs font-medium text-muted">What you&apos;d set aside is released back to you: nothing is left in a bought goal.</p>
    </WidgetCard>
  );
}
