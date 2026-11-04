import type { SentencePart } from "@/app/cards/summarySentence";
import type { GreetingRowData } from "@/components/shell/GreetingParts";
import {
  dueOf,
  effectiveDue,
  excessOf,
  expectedProgress,
  kidsOf,
  freePot,
  isFunded,
  isPotMove,
  leftOf,
  liveKids,
  monthsLeft,
  ownCovered,
  partsInOrder,
  plannedOf,
  progressOf,
  requiredMonthly,
  savedOf,
  savedOwn,
  standing,
  targetOf,
  topGoals,
  totals,
  type GoalStanding,
  type GoalsData,
  type GoalsTotals,
} from "@/lib/aggregate/goals";
import { MAX_RING_MONTHS, OVERDUE_RING, SOMEDAY_RING, placePlanets, planetRadius, ringOf, skyPieces, type SkyPiece } from "@/lib/aggregate/goalsOrbit";
import { formatDate, formatShortDate } from "@/lib/format/date";
import { inDays } from "@/lib/goals/attention";
import { goalColorKey } from "@/lib/format/goalLabels";
import type { ColorKey } from "@/lib/format/colors";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import type { Goal, GoalCategory } from "@/lib/sheets/types";

/** The pick that means every goal, as on the other dashboards. */
export const ALL = "all";

/** What most of the page reads: the totals and the sky's pieces, worked out once per request instead of once per card. */
export interface GoalsDerived {
  totals: GoalsTotals;
  pieces: SkyPiece[];
}

export const deriveGoals = (data: GoalsData, today: string): GoalsDerived => ({ totals: totals(data, today), pieces: skyPieces(data, today) });

/** What the Goals page reads: the two tabs, and what the money-side cards need from the rest of the app. */
export interface GoalsPageData extends GoalsData {
  /** For the earmark check and where a set-aside sat. */
  accounts: { id: string; name: string }[];
  /** The cards a goal can be paid on (for Mark bought). */
  cards: { id: string; name: string; color: ColorKey }[];
  /** Each account's latest balance, for the earmark check; an account with none isn't in it. */
  balances: Record<string, number>;
  /** Monthly income and the month's obligations (Overview's figures): "income less obligations" is labelled as not a true surplus. */
  income: number;
  obligations: number;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export { inDays };
const dateIn = (today: string, date: string) => (date.slice(0, 4) === today.slice(0, 4) ? formatShortDate(date) : formatDate(date));
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export const goalOf = (data: GoalsPageData, id: string): Goal | undefined => data.goals.find((goal) => goal.id === id);
const colorOf = (goal: Goal): ColorKey => goalColorKey(goal);
const pct = (share: number) => `${Math.round(share * 100)}%`;

/** The goals the page shows in the sky and the picks: open, top-level ones, in the order of their first piece (the sky's own order). */
export function pickIds(data: GoalsPageData, today: string, d: GoalsDerived = deriveGoals(data, today)): string[] {
  const seen: string[] = [];
  for (const piece of d.pieces) if (!seen.includes(piece.topId)) seen.push(piece.topId);
  return [ALL, ...seen];
}

// ---------- The greeting ----------

export type GoalsPoint = "saved" | "target" | "required" | "minimum" | "planned" | "next";
export type GoalsGreetingCards = Partial<Record<GoalsPoint, { title: string; total: string; rows: GreetingRowData[]; note?: string }>>;

const live = (data: GoalsPageData) => topGoals(data).filter((goal) => goal.status === "Active");

export function summarySentence(data: GoalsPageData, today: string, d: GoalsDerived = deriveGoals(data, today)): SentencePart[] {
  const open = topGoals(data).filter((goal) => goal.status === "Active" || goal.status === "Paused");
  if (open.length === 0) return [{ text: "Nothing is set aside yet. Add a goal, and this page shows how far each is, what it takes a month, and what to fund first." }];
  const t = d.totals;
  const active = live(data);
  if (active.length === 0) return [{ text: `${plural(open.length, "goal")} ${open.length === 1 ? "is" : "are"} paused, with ` }, { text: formatInrCompact(sum(open.map((g) => savedOf(data, g)))), strong: true, point: "saved" }, { text: " set aside. Resume one to bring it back into the plan." }];
  const allFunded = active.every((goal) => isFunded(data, goal));
  const parts: SentencePart[] = [{ text: `You're saving for ${plural(t.goals, "goal")}, and ` }, { text: formatInrCompact(t.saved), strong: true, point: "saved" }, { text: " of the " }, { text: formatInrCompact(t.target), strong: true, point: "target" }, { text: " is set aside." }];
  if (allFunded) return [{ text: "Every goal is funded. " }, { text: formatInrCompact(t.saved), strong: true, point: "saved" }, { text: ` is set aside for ${plural(t.goals, "goal")}: mark each one bought when you buy it, and its money is released.` }];
  if (t.requiredTotal > 0) {
    parts.push({ text: " Paying each on its own schedule takes " }, { text: formatInr(t.requiredTotal), strong: true, point: "required" }, { text: " a month" });
    if (t.minimumMonthly !== null && t.minimumMonthly > 0 && t.minimumMonthly < t.requiredTotal) parts.push({ text: ", but " }, { text: formatInr(t.minimumMonthly), strong: true, point: "minimum" }, { text: " would hit every date if they're funded in order" });
    else if (t.minimumMonthly === null) parts.push({ text: ", and a date has already passed" });
    parts.push(t.plannedTotal > 0 ? { text: ", and you plan " } : { text: ". You haven't planned a monthly amount yet." });
    if (t.plannedTotal > 0) parts.push({ text: formatInr(t.plannedTotal), strong: true, point: "planned" }, { text: "." });
  }
  if (t.next) {
    const left = leftOf(data, t.next);
    parts.push({ text: " " }, { text: t.next.name, strong: true, point: "next" }, { text: ` is next, due ${dateIn(today, dueOf(data, t.next)!)}${left > 0 ? ` with ${formatInr(left)} still to set aside` : ""}.` });
  }
  return parts;
}

export function greetingView(data: GoalsPageData, today: string, d: GoalsDerived = deriveGoals(data, today)): GoalsGreetingCards {
  // Only the figures the sentence actually carries get a card, so the two always agree (a funded page names one figure, a goal that needs no more than its plan skips the 'funded in order' one).
  const used = new Set(summarySentence(data, today, d).map((part) => part.point));
  return Object.fromEntries(Object.entries(allCards(data, today, d)).filter(([point]) => used.has(point))) as GoalsGreetingCards;
}

function allCards(data: GoalsPageData, today: string, d: GoalsDerived): GoalsGreetingCards {
  const t = d.totals;
  const active = live(data);
  if (active.length === 0) return data.goals.length ? { saved: { title: "Set aside so far", total: formatInr(sum(topGoals(data).map((g) => savedOf(data, g)))), rows: topGoals(data).map((g) => ({ key: g.id, name: g.name, colorKey: colorOf(g), amount: formatInr(savedOf(data, g)) })), note: "Not new money: it's already in your accounts" } } : {};
  const byGoal = (amount: (g: Goal) => number, note?: (g: Goal) => string | undefined): GreetingRowData[] => active.map((g) => ({ key: g.id, name: g.name, colorKey: colorOf(g), amount: formatInr(amount(g)), note: note?.(g) }));
  const cards: GoalsGreetingCards = {
    saved: { title: "Set aside so far", total: formatInr(t.saved), rows: byGoal((g) => savedOf(data, g), (g) => pct(progressOf(data, g))), note: `${pct(t.target ? t.saved / t.target : 0)} of ${formatInr(t.target)}. Not new money: it's already in your accounts` },
    target: { title: "All goals add up to", total: formatInr(t.target), rows: byGoal((g) => targetOf(data, g)), note: "A goal's total is its own part plus its parts. Dropped and bought parts aren't counted" },
  };
  if (t.requiredTotal > 0) cards.required = { title: "Each on its own schedule", total: `${formatInr(t.requiredTotal)} a month`, rows: byGoal((g) => requiredMonthly(data, g, today)), note: "What's left to save over the whole months left, for every goal at once. It falls as goals finish" };
  if (t.minimumMonthly) cards.minimum = { title: "Funded in order", total: `${formatInr(t.minimumMonthly)} a month`, rows: [], note: "Enough to hit every date if money goes to Fixed dates first, then Needs, then the soonest, then the smaller. Rounded up to ₹500" };
  if (t.plannedTotal > 0) {
    const left = data.income - data.obligations;
    cards.planned = {
      title: "What you plan",
      total: `${formatInr(t.plannedTotal)} a month`,
      rows: [
        { key: "income", name: "Income", colorKey: "emerald", amount: formatInr(data.income) },
        { key: "obligations", name: "Obligations", colorKey: "ruby", amount: `−${formatInr(data.obligations)}` },
        { key: "left", name: "Left after obligations", colorKey: "onyx", amount: formatInr(left) },
      ],
      note: "Income less obligations, not a true surplus: UPI and cash spending aren't tracked",
    };
  }
  if (t.next) {
    const due = dueOf(data, t.next)!;
    cards.next = {
      title: `${t.next.name} · due ${dateIn(today, due)}`,
      total: formatInr(leftOf(data, t.next)),
      rows: [
        { key: "saved", name: "Set aside", colorKey: colorOf(t.next), amount: formatInr(savedOf(data, t.next)) },
        { key: "target", name: "Target", colorKey: colorOf(t.next), amount: formatInr(targetOf(data, t.next)) },
        { key: "planned", name: "You plan a month", colorKey: colorOf(t.next), amount: formatInr(plannedOf(data, t.next)) },
        { key: "needs", name: "It needs a month", colorKey: colorOf(t.next), amount: formatInr(requiredMonthly(data, t.next, today)) },
      ],
      note: t.next.dateType === "Fixed" ? "A Fixed date: it can't slip, so it's served first" : undefined,
    };
  }
  return cards;
}

// ---------- The sky ----------

export interface PlanetView {
  key: string;
  /** How its name is shown: the rest of a parent reads 'Car upgrade · the rest'. */
  label: string;
  topId: string;
  name: string;
  colorKey: ColorKey;
  category: GoalCategory;
  /** The planet's radius before the sky's scale. */
  radius: number;
  progress: number;
  /** "+₹3k": what's set aside beyond the amount. */
  over: string | null;
  fixed: boolean;
  late: boolean;
  paused: boolean;
  /** The ring, in months (0 overdue, 99 someday), and where it sits round it. */
  ring: number;
  angle: number;
  /** Whether its name goes above it, for want of room below. */
  nameAbove: boolean;
  /** Under the name: "₹17k to go · Dec 20". */
  note: string;
  tip: { head: string; need: boolean; total: string; detail: string; rows: { name: string; amount: string }[] };
  /** Its parts, which go round it like moons when it's picked (empty for a goal with none). */
  moons: PartLine[];
}

/** A part of a goal as the moons, the side panel and the table list it: what it costs, what the pot has put in it and where it stands. The goal's own part (what isn't itemised) has no `goalId`. */
export interface PartLine {
  /** 1, 2, 3 ...: the number on its moon, in the order money fills them (the goal's own part last). */
  n: number;
  key: string;
  /** The part's goal id, or null for the goal's own part. */
  goalId: string | null;
  name: string;
  colorKey: ColorKey;
  category: GoalCategory;
  need: boolean;
  /** "Need · due Jan 10": the second line. */
  note: string;
  due: string | null;
  amount: number;
  saved: number;
  /** Covered, from 0 to 1. */
  share: number;
  covered: boolean;
  /** "covered", "₹5k of ₹1.5L" or "not reached yet". */
  text: string;
  progress: number;
  expected: number | null;
  savedText: string;
  left: string;
  standing: "On track" | "Behind" | "No plan" | "Funded" | "Paused";
}

/** A part that's been bought or dropped: it has left its goal's total, but it stays visible under the goal so it can be found, reopened or deleted. */
export interface SettledPart {
  key: string;
  goalId: string;
  name: string;
  colorKey: ColorKey;
  category: GoalCategory;
  state: "bought" | "dropped";
  /** "bought Oct 26 · paid from HDFC" or goal.status === "Dropped" ? "dropped with the goal" : "dropped · its money went back to the goal". */
  line: string;
  /** What it cost (bought) or would have cost (dropped). */
  amount: string;
}

export interface SkyView {
  planets: PlanetView[];
  sun: { saved: string; of: string; empty: boolean; done: boolean };
  /** The rings that have a label, in months. */
  rings: number[];
  hasOverdue: boolean;
  hasSomeday: boolean;
}

/** A piece's name as it's printed: the part of a goal that isn't itemised reads 'Car upgrade · the rest'. */
export const pieceLabel = (name: string) => name.replace(/: the rest$/, " · the rest");

/** A piece draws in its own colour if it was given one, otherwise in its goal's: a part follows its goal. */
export const pieceColor = (data: GoalsPageData, piece: SkyPiece): ColorKey => {
  const own = goalOf(data, piece.goalId);
  return colorOf(own?.color ? own : goalOf(data, piece.topId)!);
};

/** A goal's parts in the order money fills them (its own part, what isn't itemised, last), with what the pot covers of each. Empty for a goal with no parts. */
export function partLines(data: GoalsPageData, goal: Goal, today: string, d: GoalsDerived): PartLine[] {
  if (liveKids(data, goal.id).length === 0) return [];
  const pieces = new Map(d.pieces.filter((p) => p.topId === goal.id).map((p) => [p.key, p]));
  // Parts aren't planned one by one (the goal has the plan), so a part that isn't covered yet reads the goal's own standing.
  const goalStanding = standing(data, goal, today);
  const partStanding: PartLine["standing"] = goalStanding === "On track" ? "On track" : goalStanding === "Behind" || goalStanding === "Overdue" ? "Behind" : "No plan";
  const make = (n: number, g: Goal, own: boolean): PartLine => {
    const piece = pieces.get(own ? `${g.id}#own` : g.id);
    const saved = own ? ownCovered(data, g) : savedOwn(data, g.id);
    const amount = g.amount;
    const share = amount > 0 ? Math.min(1, saved / amount) : 0;
    const due = piece?.due ?? effectiveDue(data, g);
    const paused = piece?.paused ?? false;
    const name = own ? `${goal.name} · the rest` : g.name;
    return {
      n,
      key: own ? `${g.id}#own` : g.id,
      goalId: own ? null : g.id,
      name,
      colorKey: pieceColor(data, { goalId: g.id, topId: goal.id } as SkyPiece),
      category: g.category,
      need: g.necessity === "Need",
      note: `${g.necessity}${due ? ` · due ${formatShortDate(due)}` : " · someday"}${g.dateType === "Fixed" ? " · Fixed" : ""}`,
      due,
      amount,
      saved,
      share,
      covered: amount > 0 && saved >= amount,
      text: share >= 1 ? "covered" : saved > 0 ? `${formatInrCompact(saved)} of ${formatInrCompact(amount)}` : "not reached yet",
      progress: share,
      expected: expectedProgress(data, g, today),
      savedText: `${formatInrCompact(saved)} of ${formatInrCompact(amount)}`,
      left: formatInr(Math.max(0, amount - saved)),
      standing: paused ? "Paused" : saved >= amount ? "Funded" : partStanding,
    };
  };
  const kids = partsInOrder(data, goal);
  return [...kids.map((kid, index) => make(index + 1, kid, false)), ...(goal.amount > 0 ? [make(kids.length + 1, goal, true)] : [])];
}

/** A goal's parts that are bought or dropped, bought first and the latest on top. */
export function settledParts(data: GoalsPageData, goal: Goal): SettledPart[] {
  return kidsOf(data, goal.id)
    .filter((kid) => kid.status === "Done" || kid.status === "Dropped")
    .sort((a, b) => (a.status === b.status ? (b.doneOn ?? "").localeCompare(a.doneOn ?? "") || a.name.localeCompare(b.name) : a.status === "Done" ? -1 : 1))
    .map((kid): SettledPart => {
      const paid = kid.paidFromAccountId ? data.accounts.find((a) => a.id === kid.paidFromAccountId)?.name : undefined;
      const bought = kid.status === "Done";
      return {
        key: kid.id,
        goalId: kid.id,
        name: kid.name,
        colorKey: pieceColor(data, { goalId: kid.id, topId: goal.id } as SkyPiece),
        category: kid.category,
        state: bought ? "bought" : "dropped",
        line: bought ? `bought ${formatShortDate(kid.doneOn as string)}${paid ? ` · paid from ${paid}` : kid.paidFromCardId ? " · paid on a card" : ""}` : goal.status === "Dropped" ? "dropped with the goal" : "dropped · its money went back to the goal",
        amount: formatInr(bought ? (kid.actualCost ?? kid.amount) : kid.amount),
      };
    });
}

/** The sky: one planet per main goal, on the ring of its last date. Its parts go round it as moons when it's picked. */
export function skyView(data: GoalsPageData, today: string, d: GoalsDerived = deriveGoals(data, today)): SkyView {
  const pieces = d.pieces;
  const open = topGoals(data).filter((goal) => goal.status === "Active" || goal.status === "Paused");
  const active = open.filter((goal) => goal.status === "Active");
  const saved = sum(active.map((goal) => savedOf(data, goal)));
  const target = sum(active.map((goal) => targetOf(data, goal)));
  const goals = pickIds(data, today, d).filter((id) => id !== ALL).map((id) => goalOf(data, id) as Goal);
  const radii = goals.map((goal) => planetRadius(targetOf(data, goal)));
  const rings = goals.map((goal) => ringOf(dueOf(data, goal), goal.status === "Paused", today));
  const angles = placePlanets(goals.map((_, index) => ({ ring: rings[index], radius: radii[index] })));
  const planets = goals.map((goal, index): PlanetView => {
    const mine = pieces.filter((p) => p.topId === goal.id);
    const total = targetOf(data, goal);
    const held = savedOf(data, goal);
    const left = leftOf(data, goal);
    const due = dueOf(data, goal);
    const paused = goal.status === "Paused";
    const ring = rings[index];
    const progress = total > 0 ? Math.min(1, held / total) : 0;
    const over = held - total;
    const late = ring === OVERDUE_RING && left > 0;
    const moons = partLines(data, goal, today, d);
    return {
      key: goal.id,
      topId: goal.id,
      name: goal.name,
      label: goal.name,
      colorKey: colorOf(goal),
      category: goal.category,
      radius: radii[index],
      progress,
      over: over > 0 ? `+${formatInrCompact(over)}` : null,
      fixed: mine.some((p) => p.dateType === "Fixed") && !paused,
      late,
      paused,
      ring,
      angle: angles[index].angle,
      nameAbove: angles[index].nameAbove,
      note: paused ? `paused · ${formatInrCompact(left)} to go` : isFunded(data, goal) ? "funded" : `${formatInrCompact(left)} to go${due ? ` · ${formatShortDate(due)}` : ""}`,
      tip: {
        head: goal.name,
        need: goal.necessity === "Need",
        total: `${formatInr(held)} of ${formatInr(total)}`,
        detail: due ? `due ${formatDate(due)}` : "no date",
        rows: [
          ...(moons.length ? [{ name: "Parts", amount: `${moons.filter((m) => m.covered).length} of ${moons.length} covered` }] : []),
          { name: "Planned a month", amount: plannedOf(data, goal) && !paused ? formatInr(plannedOf(data, goal)) : "none" },
          { name: "Needed a month", amount: !paused && requiredMonthly(data, goal, today) ? formatInr(requiredMonthly(data, goal, today)) : "–" },
          { name: "Left to set aside", amount: formatInr(left) },
        ],
      },
      moons,
    };
  });
  return {
    planets,
    sun: { saved: formatInrCompact(saved), of: target > 0 ? `of ${formatInrCompact(target)} · ${pct(saved / target)}` : "no goals yet", empty: open.length === 0, done: active.length > 0 && active.every((goal) => isFunded(data, goal)) },
    rings: [1, 3, 6, 12, 24, MAX_RING_MONTHS],
    hasOverdue: rings.includes(OVERDUE_RING),
    hasSomeday: rings.includes(SOMEDAY_RING),
  };
}

// ---------- The side of the sky ----------

export interface BandRow {
  title: string;
  count: string;
  colors: ColorKey[];
  togo: string;
  perMonth: string;
}

export interface StatCardView {
  kind: string;
  topId: string;
  name: string;
  colorKey: ColorKey;
  category: GoalCategory;
  togo: string;
  line: string;
  progress: number;
  expected: number | null;
  savedText: string;
  planText: string;
}

export interface EntryRow {
  id: string;
  kind: "Set-aside" | "Take-back";
  amount: string;
  date: string;
  note: string;
}

export interface GoalSideView {
  id: string;
  name: string;
  category: GoalCategory;
  colorKey: ColorKey;
  need: boolean;
  scale: "Minor" | "Major";
  fixed: boolean;
  status: Goal["status"];
  standing: GoalStanding;
  big: string;
  bigNote: string;
  dueLine: string;
  progress: number;
  expected: number | null;
  savedText: string;
  pctText: string;
  facts: { name: string; value: string }[];
  /** Its parts (empty for a goal with none), and what's in its pot that no part has been given. */
  parts: PartLine[];
  /** Its parts that were bought or dropped. */
  settled: SettledPart[];
  pot: { free: string; note: string } | null;
  entries: EntryRow[];
  hasKids: boolean;
}

export interface SideView {
  bands: BandRow[];
  closest: StatCardView | null;
  furthest: StatCardView | null;
}

const BANDS: { title: string; test: (ring: number) => boolean }[] = [
  { title: "Within 3 months", test: (ring) => ring <= 3 && ring !== SOMEDAY_RING },
  { title: "3 to 12 months", test: (ring) => ring > 3 && ring <= 12 },
  { title: "1 to 2 years", test: (ring) => ring > 12 && ring <= 24 },
  { title: "Further out", test: (ring) => ring > 24 && ring !== SOMEDAY_RING },
];

export function sideView(data: GoalsPageData, today: string, d: GoalsDerived = deriveGoals(data, today)): SideView {
  const pieces = d.pieces.filter((p) => !p.paused);
  const bands = BANDS.map(({ title, test }): BandRow => {
    const inBand = pieces.filter((p) => test(p.ring));
    return { title, count: inBand.length ? plural(inBand.length, "piece") : "nothing yet", colors: inBand.map((p) => pieceColor(data, p)), togo: formatInr(sum(inBand.map((p) => p.left))), perMonth: sum(inBand.map((p) => p.required)) ? `${formatInr(sum(inBand.map((p) => p.required)))} a month` : "–" };
  });
  const open = pieces.filter((p) => p.left > 0 && p.due);
  const card = (kind: string, piece: SkyPiece | undefined, line: (p: SkyPiece) => string): StatCardView | null => {
    if (!piece) return null;
    const goal = goalOf(data, piece.goalId)!;
    const exp = expectedProgress(data, goal, today);
    return { kind, topId: piece.topId, name: piece.name, colorKey: pieceColor(data, piece), category: goal.category, togo: formatInr(piece.left), line: line(piece), progress: piece.amount ? Math.min(1, piece.saved / piece.amount) : 0, expected: exp, savedText: `${formatInrCompact(piece.saved)} of ${formatInrCompact(piece.amount)}`, planText: `${piece.planned ? `${formatInr(piece.planned)} planned · ` : "no plan · "}needs ${formatInr(piece.required)}` };
  };
  const closest = [...open].sort((a, b) => a.ring - b.ring || (a.due as string).localeCompare(b.due as string))[0];
  const furthest = [...open].sort((a, b) => b.left - a.left)[0];
  return {
    bands,
    closest: card("Closest", closest, (p) => `${formatShortDate(p.due as string)} · ${p.dateType === "Fixed" ? "Fixed, " : ""}${p.ring === OVERDUE_RING ? "overdue" : `${monthsLeft(p.due as string, today) || 1} month${(monthsLeft(p.due as string, today) || 1) === 1 ? "" : "s"} left`}`),
    furthest: card("Furthest to go", furthest, (p) => `${formatInr(p.amount)} in all · ${pct(p.amount ? p.saved / p.amount : 0)} saved · due ${formatShortDate(p.due as string)}`),
  };
}

export function goalSideView(data: GoalsPageData, goal: Goal, today: string, d: GoalsDerived = deriveGoals(data, today)): GoalSideView {
  const saved = savedOf(data, goal);
  const target = targetOf(data, goal);
  const due = dueOf(data, goal);
  const paused = goal.status === "Paused";
  const planned = plannedOf(data, goal);
  const needs = requiredMonthly(data, goal, today);
  const left = leftOf(data, goal);
  const stand = standing(data, goal, today);
  const facts = paused ? [] : [{ name: "You plan a month", value: planned ? formatInr(planned) : "nothing" }, { name: "It needs a month", value: needs ? formatInr(needs) : "–" }, ...(planned && needs && planned < needs ? [{ name: "Short of what it needs", value: `${formatInr(needs - planned)} a month` }] : [])];
  const parts = partLines(data, goal, today, d);
  const entryIds = new Set([goal.id]);
  // What moved between the pot and a part only changed hands, so it isn't listed as money set aside or taken back.
  const entries = data.contributions
    .filter((c) => entryIds.has(c.goalId) && !isPotMove(c))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 4)
    .map((c): EntryRow => ({ id: c.id, kind: c.kind, amount: `${c.kind === "Take-back" ? "−" : "+"}${formatInr(c.amount)}`, date: formatShortDate(c.date), note: c.accountId ? `from ${data.accounts.find((a) => a.id === c.accountId)?.name ?? "an account"}${c.note ? ` · ${c.note}` : ""}` : c.note || "no account named" }));
  const free = freePot(data, goal);
  return {
    id: goal.id,
    name: goal.name,
    category: goal.category,
    colorKey: colorOf(goal),
    need: goal.necessity === "Need",
    scale: goal.scale,
    fixed: goal.dateType === "Fixed",
    status: goal.status,
    standing: stand,
    big: paused ? formatInr(saved) : formatInr(left),
    bigNote: paused ? "set aside · paused" : isFunded(data, goal) ? "funded" : left === 0 ? "set aside, not all given to parts" : "to set aside",
    dueLine: paused ? "No date. Resume it to bring it back into the plan." : due ? `by ${dateIn(today, due)} · ${due < today ? "overdue" : `${(monthsLeft(due, today) || 1)} month${(monthsLeft(due, today) || 1) === 1 ? "" : "s"} left`}` : "someday",
    progress: progressOf(data, goal),
    expected: paused ? null : expectedProgress(data, goal, today),
    savedText: `${formatInr(saved)} of ${formatInr(target)}`,
    pctText: pct(progressOf(data, goal)),
    facts: excessOf(data, goal) > 0 ? [{ name: "More than it needs", value: formatInr(excessOf(data, goal)) }, ...facts] : facts,
    hasKids: parts.length > 0,
    settled: settledParts(data, goal),
    parts,
    pot: parts.length ? { free: formatInr(free), note: free <= 0 ? "Everything set aside is given to a part." : free > goal.amount ? "More than its own part needs: give some to a part in Edit, or take it back." : "Covers its own part, the last one." } : null,
    entries,
  };
}

export function goalSides(data: GoalsPageData, today: string, d: GoalsDerived = deriveGoals(data, today)): Record<string, GoalSideView> {
  const out: Record<string, GoalSideView> = {};
  for (const id of pickIds(data, today, d)) {
    if (id === ALL) continue;
    const goal = goalOf(data, id);
    if (goal) out[id] = goalSideView(data, goal, today, d);
  }
  return out;
}
