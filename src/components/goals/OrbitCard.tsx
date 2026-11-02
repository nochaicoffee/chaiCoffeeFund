"use client";

import { useState } from "react";
import { ALL, type GoalSideView, type PlanetView, type SideView, type SkyView } from "@/app/goals/views";
import { MAX_RING_MONTHS, OVERDUE_RING, SKY_SIZE, SOMEDAY_RING, ringRadius } from "@/lib/aggregate/goalsOrbit";
import { colorGradient } from "@/lib/format/colors";
import { GOAL_CATEGORY_COLOR } from "@/lib/format/goalLabels";
import { CloseIcon, MenuAction, RowMenu } from "../RowMenu";
import { CheckIcon, PlusIcon } from "../cards/forms/icons";
import { GOAL_CATEGORIES } from "@/lib/sheets/types";
import { WidgetCard } from "../shell/WidgetCard";
import { ActionButton, useGoalsForms } from "./forms/GoalsForms";
import { CardBar, ColorCard, GoalIcon, GoalTile, FixedPill, NeedBadge, ProgressBar, ScaleBadge, StandingPill } from "./parts";

const GOAL_CATEGORY_KEY = Object.fromEntries(Object.entries(GOAL_CATEGORY_COLOR).map(([category, color]) => [category, color.toLowerCase()])) as Record<(typeof GOAL_CATEGORIES)[number], Lowercase<(typeof GOAL_CATEGORY_COLOR)[keyof typeof GOAL_CATEGORY_COLOR]>>;

const small = { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const UndoIcon = () => (
  <svg {...small}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </svg>
);
const PencilIcon = () => (
  <svg {...small}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);
const PauseIcon = () => (
  <svg {...small}>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

/** The sky is drawn on a 780-unit square and scaled to fit, so a ring's radius and a planet's size are shares of its width. */
const S = SKY_SIZE;
const C = S / 2;
const pos = (r: number, angle: number) => ({ x: C + r * Math.cos((angle * Math.PI) / 180), y: C + r * Math.sin((angle * Math.PI) / 180) });
const pc = (n: number) => `${(n / S) * 100}%`;

/** A fixed scatter of stars, the same every time. */
const STARS = Array.from({ length: 70 }, (_, i) => ({ left: ((i * 2654435761) % 1000) / 10, top: ((i * 40503 + 977) % 1000) / 10, big: i % 3 === 0, opacity: 0.25 + (i % 5) * 0.12 }));

function Planet({ planet, pick, onPick }: { planet: PlanetView; pick: string; onPick: (id: string) => void }) {
  const r = ringRadius(planet.ring);
  const { x, y } = pos(r, planet.angle);
  const d = planet.radius * 2 + 12;
  const dim = pick !== ALL && pick !== planet.topId;
  return (
    <span className={`group/p absolute z-[2] hover:z-30 focus-within:z-30 motion-safe:transition-opacity ${dim ? "opacity-20" : ""} ${pick === planet.topId ? "drop-shadow-[0_0_14px_oklch(1_0_0/0.55)]" : ""}`} style={{ left: pc(x), top: pc(y), width: pc(d), minWidth: 26, aspectRatio: "1", transform: "translate(-50%, -50%)" }}>
      <button type="button" onClick={() => onPick(planet.topId)} aria-pressed={pick === planet.topId} aria-label={`${planet.name}: ${planet.note}`} className={`relative block h-full w-full rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${planet.progress >= 1 ? "shadow-[0_0_22px_oklch(1_0_0/0.5)]" : ""} ${planet.late ? "shadow-[0_0_24px_oklch(0.7_0.2_25/0.6)]" : ""} ${planet.paused ? "opacity-55" : ""}`} style={{ background: `conic-gradient(${planet.late ? "oklch(0.78 0.17 25)" : "white"} ${Math.min(1, planet.progress) * 360}deg, oklch(1 0 0 / 0.2) 0)` }}>
        <span className="absolute inset-[6%] flex items-center justify-center overflow-hidden rounded-full text-on-card" style={{ background: colorGradient(planet.colorKey, 150), boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.25)" }}>
          <GoalIcon category={planet.category} size={Math.max(12, Math.round(planet.radius * 0.9))} />
        </span>
      </button>
      {planet.fixed && <span aria-hidden="true" className="absolute -top-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-negative text-[9px] font-black text-white">!</span>}
      {planet.over && <span className="absolute -top-1.5 left-[calc(100%-6px)] rounded-full bg-[oklch(0.88_0.17_140)] px-1.5 py-0.5 text-[10px] font-extrabold whitespace-nowrap text-[oklch(0.2_0.05_150)]">{planet.over}</span>}
      <span aria-hidden="true" className={`pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-center whitespace-nowrap text-white [text-shadow:0_1px_6px_oklch(0_0_0/0.7)] md:block ${planet.nameAbove ? "bottom-[calc(100%+3px)]" : "top-[calc(100%+3px)]"}`}>
        <b className="block text-[11.5px] font-extrabold">{planet.label}</b>
        <small className="block text-[10px] font-semibold opacity-80">{planet.note}</small>
      </span>
      <span role="tooltip" className="pointer-events-none invisible absolute top-[calc(100%+8px)] left-1/2 z-40 w-[230px] -translate-x-1/2 opacity-0 group-focus-within/p:visible group-focus-within/p:opacity-100 group-hover/p:visible group-hover/p:opacity-100 motion-safe:transition-opacity">
        <span className="block rounded-[14px] border border-[var(--tip-line)] bg-[var(--tip-surface)] p-3 text-left text-[var(--tip-fg)] shadow-[var(--tip-shadow)]">
          <span className="flex items-center justify-between gap-2 text-[11px] font-extrabold tracking-[0.04em] text-[var(--tip-muted)] uppercase">
            <span>{planet.tip.head}</span>
            <NeedBadge need={planet.tip.need} />
          </span>
          <b className="mt-1 block text-lg font-extrabold tabular-nums">{planet.tip.total}</b>
          <span className="block text-[11.5px] font-semibold text-[var(--tip-muted)]">{planet.tip.detail}</span>
          <span className="mt-2 flex flex-col gap-1 border-t border-[var(--tip-line)] pt-2">
            {planet.tip.rows.map((row) => (
              <span key={row.name} className="flex items-center gap-2 text-xs font-semibold">
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                <b className="font-extrabold tabular-nums">{row.amount}</b>
              </span>
            ))}
          </span>
        </span>
      </span>
    </span>
  );
}

function Sky({ sky, pick, onPick }: { sky: SkyView; pick: string; onPick: (id: string) => void }) {
  const rings = sky.rings;
  const label = (months: number) => (months < 12 ? `${months} mo` : months === MAX_RING_MONTHS ? "3 yr+" : `${months / 12} yr`);
  return (
    <div className="relative aspect-square w-full overflow-visible rounded-[30px] text-white" style={{ background: "radial-gradient(circle at 50% 50%, oklch(0.27 0.07 262), oklch(0.12 0.035 268) 75%)", boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.14)" }}>
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-[inherit]">
        {STARS.map((star, i) => (
          <i key={i} className="absolute rounded-full bg-white" style={{ left: `${star.left}%`, top: `${star.top}%`, width: star.big ? 2 : 1, height: star.big ? 2 : 1, opacity: star.opacity }} />
        ))}
      </div>
      <svg aria-hidden="true" viewBox={`0 0 ${S} ${S}`} className="absolute inset-0 h-full w-full">
        {rings.map((m) => (
          <circle key={m} cx={C} cy={C} r={ringRadius(m)} fill="none" stroke="oklch(1 0 0 / .16)" strokeDasharray="2 6" />
        ))}
        {sky.hasOverdue && <circle cx={C} cy={C} r={ringRadius(OVERDUE_RING)} fill="none" stroke="oklch(0.7 0.18 25 / .6)" strokeDasharray="4 5" />}
        {sky.hasSomeday && <circle cx={C} cy={C} r={ringRadius(SOMEDAY_RING)} fill="none" stroke="oklch(1 0 0 / .16)" strokeDasharray="2 6" />}
      </svg>
      {[6, 12, 24, 36, ...(sky.rings.length ? [1, 3] : [])].map((m) => (
        <span key={m} aria-hidden="true" className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.17_0.04_265)] px-2 text-[10px] font-extrabold tracking-[0.05em] text-white/50 uppercase ${m === 1 || m === 3 ? "max-md:hidden" : ""}`} style={{ left: "50%", top: pc(C - ringRadius(m)) }}>
          {label(m)}
        </span>
      ))}
      {sky.hasOverdue && (
        <span aria-hidden="true" className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.3_0.1_20)] px-2 text-[10px] font-extrabold tracking-[0.05em] text-[oklch(0.88_0.1_25)] uppercase" style={{ left: "50%", top: pc(C - ringRadius(OVERDUE_RING)) }}>
          overdue
        </span>
      )}
      {sky.hasSomeday && (
        <span aria-hidden="true" className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.17_0.04_265)] px-2 text-[10px] font-extrabold tracking-[0.05em] text-white/50 uppercase" style={{ left: "50%", top: pc(C + ringRadius(SOMEDAY_RING)) }}>
          someday
        </span>
      )}
      <div className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center ${sky.sun.empty ? "" : ""}`} style={{ left: "50%", top: "50%", width: pc(156), aspectRatio: "1", background: sky.sun.empty ? "radial-gradient(circle at 35% 30%, oklch(0.5 0.03 262), oklch(0.28 0.03 262) 70%)" : "radial-gradient(circle at 35% 30%, oklch(0.78 0.16 150), oklch(0.42 0.11 155) 70%)", boxShadow: sky.sun.done ? "0 0 80px oklch(0.85 0.18 140 / .55), inset 0 1px 0 oklch(1 0 0/.3)" : "0 0 60px oklch(0.8 0.17 140 / .35), inset 0 1px 0 oklch(1 0 0/.3)" }}>
        <span className="text-[10px] font-extrabold tracking-[0.05em] uppercase opacity-75 max-md:text-[8px]">{sky.sun.done ? "Funded" : "Set aside"}</span>
        <b className="text-[clamp(18px,3.9vw,30px)] leading-[1.05] font-extrabold tracking-tight">{sky.sun.saved}</b>
        <small className="text-[11.5px] font-bold opacity-85 max-md:text-[9px]">{sky.sun.of}</small>
      </div>
      {sky.planets.map((planet) => (
        <Planet key={planet.key} planet={planet} pick={pick} onPick={onPick} />
      ))}
      <div className="absolute top-4 left-5 hidden items-center gap-4 text-[11px] font-bold text-white/60 md:flex">
        <span className="flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-white" /> the arc is what&apos;s set aside
        </span>
        <span>! Fixed date</span>
        <span>bigger planet, bigger amount</span>
      </div>
    </div>
  );
}

function SideAll({ side, onPick }: { side: SideView; onPick: (id: string) => void }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <b className="text-[15px] font-extrabold">How far out</b>
        <span className="text-xs font-medium text-muted">Each ring is a distance in months from today. The date picks the ring, so a goal moves inward as it nears. Pick a planet to open its goal.</span>
      </div>
      <div>
        {side.bands.map((band) => (
          <div key={band.title} className="grid grid-cols-[1.3fr_1fr_1fr] items-center gap-3 border-b border-divider py-3 last:border-b-0">
            <div>
              <b className="block text-[13px] font-extrabold">{band.title}</b>
              <small className="block text-[11px] font-semibold text-muted">{band.count}</small>
            </div>
            <div className="flex flex-wrap gap-1">
              {band.colors.map((color, i) => (
                <i key={i} className="h-3 w-3 rounded-full" style={{ background: `var(--card-${color})` }} />
              ))}
            </div>
            <div className="text-right">
              <b className="block text-[13px] font-extrabold tabular-nums">{band.togo}</b>
              <small className="block text-[11px] font-semibold text-muted">{band.perMonth}</small>
            </div>
          </div>
        ))}
      </div>
      {[side.closest, side.furthest].map(
        (card) =>
          card && (
            <ColorCard key={card.kind} colorKey={card.colorKey} className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold tracking-[0.05em] uppercase opacity-80">{card.kind}</span>
                <GoalTile category={card.category} colorKey={card.colorKey} size={30} />
              </div>
              <div className="mt-auto">
                <button type="button" onClick={() => onPick(card.topId)} className="block text-left text-lg font-extrabold hover:underline focus-visible:outline-2 focus-visible:outline-white">
                  {card.name}
                </button>
                <div className="mt-1 text-[26px] leading-[1.1] font-extrabold tracking-tight">
                  {card.togo}
                  <small className="ml-1.5 text-[13px] font-bold opacity-80">to go</small>
                </div>
                <div className="mt-1 text-xs font-semibold opacity-85">{card.line}</div>
              </div>
              <div>
                <CardBar progress={card.progress} expected={card.expected} height={8} />
                <div className="mt-1.5 flex justify-between text-[11.5px] font-bold opacity-90">
                  <span>{card.savedText}</span>
                  <span>{card.planText}</span>
                </div>
              </div>
            </ColorCard>
          ),
      )}
    </>
  );
}

function SideGoal({ view }: { view: GoalSideView }) {
  const { open } = useGoalsForms();
  const paused = view.status === "Paused";
  const done = view.status === "Done";
  const dropped = view.status === "Dropped";
  return (
    <>
      <ColorCard colorKey={view.colorKey}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2.5">
            <GoalTile category={view.category} colorKey={view.colorKey} size={40} />
            <span>
              <b className="block text-[19px] leading-tight font-extrabold">{view.name}</b>
              <span className="text-xs font-semibold opacity-85">
                {view.category}
                {view.hasKids ? " · with sub-goals" : ""}
              </span>
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            {view.fixed && <FixedPill />}
            <NeedBadge need={view.need} />
            <ScaleBadge scale={view.scale} />
          </span>
        </div>
        <div>
          <div className="text-[34px] leading-[1.1] font-extrabold tracking-tight">
            {view.big}
            <small className="ml-1.5 text-[13px] font-bold opacity-80">{view.bigNote}</small>
          </div>
          <div className="mt-1 text-[12.5px] font-semibold opacity-90">{view.dueLine}</div>
        </div>
        <div>
          <CardBar progress={view.progress} expected={view.expected} />
          <div className="mt-1.5 flex justify-between text-xs font-bold">
            <span>{view.savedText}</span>
            <span>{view.pctText}</span>
          </div>
        </div>
        {view.facts.map((fact) => (
          <div key={fact.name} className="flex items-center justify-between border-t border-white/15 pt-2 text-[13px] font-semibold">
            <span className="opacity-85">{fact.name}</span>
            <b className="font-extrabold tabular-nums">{fact.value}</b>
          </div>
        ))}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          {paused ? <ActionButton label="Resume" onClick={() => open({ kind: "resume", goalId: view.id })} /> : done ? <ActionButton label="Reopen" onClick={() => open({ kind: "reopen", goalId: view.id })} /> : dropped ? <ActionButton label="Restore" onClick={() => open({ kind: "restore", goalId: view.id })} /> : <ActionButton label="Set aside" onClick={() => open({ kind: "set-aside", goalId: view.id })} />}
          {!done && !dropped && <ActionButton label="+ Add sub-goal" tone="ghost" onClick={() => open({ kind: "add-sub-goal", goalId: view.id })} />}
          <span className="text-fg">
            <RowMenu triggerLabel={`More for ${view.name}`} menuLabel={`${view.name} actions`}>
              <MenuAction icon={<PlusIcon />} label="Set aside" onSelect={() => open({ kind: "set-aside", goalId: view.id })} disabledReason={done || dropped ? "Reopen or restore it first" : undefined} />
              <MenuAction icon={<UndoIcon />} label="Take back" onSelect={() => open({ kind: "take-back", goalId: view.id })} />
              <MenuAction icon={<PencilIcon />} label="Edit" onSelect={() => open({ kind: "edit", goalId: view.id })} />
              <MenuAction icon={<PauseIcon />} label={paused ? "Resume" : "Pause"} onSelect={() => open({ kind: paused ? "resume" : "pause", goalId: view.id })} />
              <MenuAction icon={<CheckIcon />} label={done ? "Reopen" : "Mark bought"} onSelect={() => open({ kind: done ? "reopen" : "bought", goalId: view.id })} />
              <MenuAction icon={<CloseIcon />} label={dropped ? "Restore" : "Drop"} onSelect={() => open({ kind: dropped ? "restore" : "drop", goalId: view.id })} />
              <MenuAction icon={<CloseIcon />} label="Delete" danger onSelect={() => open({ kind: "delete", goalId: view.id })} />
            </RowMenu>
          </span>
        </div>
      </ColorCard>
      <div className="flex min-h-0 flex-1 flex-col gap-1 rounded-[20px] bg-fill px-4 py-3.5">
        <b className="mb-1 text-sm font-extrabold">{view.pieces.length ? "Its pieces" : "Set aside lately"}</b>
        {view.pieces.length
          ? view.pieces.map((piece) => (
              <div key={piece.key} className="grid flex-1 grid-cols-[28px_minmax(0,1.1fr)_minmax(0,1fr)_auto] items-center gap-3 border-b border-divider py-1.5 last:border-b-0 max-md:grid-cols-[28px_minmax(0,1fr)_auto]">
                <GoalTile category={piece.category} colorKey={piece.colorKey} size={28} />
                <div className="min-w-0">
                  <b className="block truncate text-[13px] font-extrabold">{piece.name}</b>
                  <small className="block text-[11px] font-semibold text-muted">{piece.note}</small>
                </div>
                <div className="max-md:hidden">
                  <ProgressBar progress={piece.progress} expected={piece.expected} colorKey={piece.colorKey} height={7} />
                  <span className="mt-1 block text-[11px] font-semibold text-muted">{piece.savedText}</span>
                </div>
                <div className="text-right">
                  <b className="block text-[13px] font-extrabold tabular-nums">{piece.left}</b>
                  <StandingPill standing={piece.standing} small />
                </div>
              </div>
            ))
          : view.entries.length
            ? view.entries.map((entry) => (
                <div key={entry.id} className="grid flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-divider py-1.5 last:border-b-0">
                  <div className="min-w-0">
                    <b className="block text-[13px] font-extrabold">{entry.kind === "Take-back" ? "Taken back" : "Set aside"}</b>
                    <small className="block truncate text-[11px] font-semibold text-muted">{entry.note}</small>
                  </div>
                  <div className="text-right">
                    <b className={`block text-[13px] font-extrabold tabular-nums ${entry.kind === "Take-back" ? "text-negative" : ""}`}>{entry.amount}</b>
                    <small className="block text-[11px] font-semibold text-muted">{entry.date}</small>
                  </div>
                </div>
              ))
            : <p className="flex flex-1 items-center justify-center text-sm font-semibold text-muted">Nothing set aside yet.</p>}
      </div>
    </>
  );
}

/** How many planets the phone's list shows before "Show all". */
const LIST_SHOWN = 6;

/** On a phone the planets carry no names, so they're listed under the sky: tap a row to open its goal. */
function PlanetList({ planets, pick, onPick }: { planets: PlanetView[]; pick: string; onPick: (id: string) => void }) {
  const [all, setAll] = useState(false);
  if (planets.length === 0) return null;
  const shown = all || planets.length <= LIST_SHOWN ? planets : planets.slice(0, LIST_SHOWN);
  return (
    <ul className="flex flex-col md:hidden" aria-label="Every planet">
      {shown.map((planet) => (
        <li key={planet.key} className={`border-t border-divider first:border-t-0 ${pick !== ALL && pick !== planet.topId ? "opacity-40" : ""}`}>
          <button type="button" onClick={() => onPick(planet.topId)} className="flex min-h-12 w-full items-center gap-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-accent">
            <GoalTile category={planet.category} colorKey={planet.colorKey} size={30} off={planet.paused} />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[13px] font-extrabold">{planet.label}</b>
              <small className="block text-[11px] font-semibold text-muted">{planet.note}</small>
            </span>
            {planet.fixed && <FixedPill />}
          </button>
        </li>
      ))}
      {shown.length < planets.length && (
        <li className="border-t border-divider pt-2">
          <button type="button" onClick={() => setAll(true)} className="min-h-10 text-xs font-extrabold text-accent-text focus-visible:outline-2 focus-visible:outline-accent">
            Show all {planets.length}
          </button>
        </li>
      )}
    </ul>
  );
}

/** The first visit: nothing is invented, six kinds to start from. */
function EmptySide() {
  const { open } = useGoalsForms();
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <b className="text-[17px] font-extrabold">Nothing to save for yet</b>
        <span className="max-w-[520px] text-[13px] font-medium text-muted">A goal is a sum of money you&apos;re setting aside for something: a fridge, a trip, a course. Start from a kind, then fill in the amount and the date. It never adds to your net worth: the money stays in your accounts.</span>
      </div>
      <div className="flex flex-col gap-2">
        {GOAL_CATEGORIES.map((category) => (
          <div key={category} className="flex items-center gap-3 rounded-[16px] bg-fill px-3.5 py-2.5">
            <GoalTile category={category} colorKey={GOAL_CATEGORY_KEY[category]} size={38} />
            <b className="flex-1 text-sm font-extrabold">{category}</b>
            <ActionButton label="+ Add" onClick={() => open({ kind: "add-goal", category })} />
          </div>
        ))}
      </div>
    </>
  );
}

/** The Orbit card (docs/design/goals.md, "The pick"): the sky, and beside it the overview or the picked goal. */
export function OrbitCard({ sky, side, goalSides, pick, onPick: choose }: { sky: SkyView; side: SideView; goalSides: Record<string, GoalSideView>; pick: string; onPick: (id: string) => void }) {
  const goalView = pick === ALL ? null : (goalSides[pick] ?? null);
  const empty = sky.sun.empty;
  // On a phone the side sits under the sky and the list of planets, out of sight of the tap: bring it into view after a pick.
  const onPick = (id: string) => {
    choose(id);
    if (id !== ALL && window.matchMedia("(max-width: 767px)").matches) requestAnimationFrame(() => document.getElementById("orbit-side")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  return (
    <WidgetCard
      label="Your goals in orbit"
      title="Your goals in orbit"
      note="the nearer its date, the closer to the middle · pick a planet to open its goal"
      right={
        <button type="button" onClick={() => onPick(ALL)} aria-pressed={pick === ALL} className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-extrabold focus-visible:outline-2 focus-visible:outline-accent ${pick === ALL ? "bg-ink text-on-ink" : "bg-fill hover:bg-fill-strong"}`}>
          All goals
        </button>
      }
      gap="gap-4"
    >
      <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-6 xl:grid-cols-[minmax(0,780px)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <Sky sky={sky} pick={pick} onPick={onPick} />
          <PlanetList planets={sky.planets} pick={pick} onPick={onPick} />
        </div>
        <div id="orbit-side" className="flex min-w-0 scroll-mt-4 flex-col gap-3.5">{empty ? <EmptySide /> : goalView ? <SideGoal view={goalView} /> : <SideAll side={side} onPick={onPick} />}</div>
      </div>
    </WidgetCard>
  );
}
