import { daysBetween } from "@/lib/aggregate/cardSpend";
import { effectiveDue, expectedProgress, fundingPlan, fundingUnits, monthsLeft, savedOwn, necessitySplit, plannedOf, requiredFor, requiredMonthly, savedOf, standing, targetOf, topGoals, wholeMonthsTo, type GoalStanding } from "@/lib/aggregate/goals";
import { addMonthsUTC } from "@/lib/aggregate/recurring";
import { formatDate, formatShortDate } from "@/lib/format/date";
import { goalColorKey } from "@/lib/format/goalLabels";
import type { ColorKey } from "@/lib/format/colors";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import type { Goal, GoalCategory } from "@/lib/sheets/types";
import { goalOf, pieceColor, plural, inDays, pieceLabel, deriveGoals, type GoalsDerived, type GoalsPageData } from "./views";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const colorOf = (goal: Goal): ColorKey => goalColorKey(goal);

// ---------- The goals table ----------

export interface TableRow {
  id: string;
  /** The top-level goal this row opens when picked. */
  topId: string;
  name: string;
  sub: boolean;
  category: GoalCategory;
  colorKey: ColorKey;
  /** Under the name: the category, and how many sub-goals. */
  note: string;
  need: boolean;
  scale: "Minor" | "Major";
  progress: number;
  expected: number | null;
  savedText: string;
  target: string;
  due: string;
  dueNote: string;
  fixed: boolean;
  perMonth: string;
  perMonthNote: string;
  standing: GoalStanding;
  /** Dimmed: paused, dropped or bought. */
  off: boolean;
  /** A dropped or bought row's own line instead of a bar. */
  settled: string | null;
}

export function tableRows(data: GoalsPageData, today: string): TableRow[] {
  const row = (goal: Goal, sub: boolean, top: Goal): TableRow => {
    const kids = data.goals.filter((g) => g.parentId === goal.id && g.status !== "Dropped");
    const stand = standing(data, goal, today);
    const saved = sub ? savedOwn(data, goal.id) : savedOf(data, goal);
    const target = sub ? goal.amount : targetOf(data, goal);
    const due = effectiveDue(data, goal);
    const planned = sub ? (goal.plannedMonthly ?? 0) : plannedOf(data, goal);
    const needs = sub ? requiredFor(Math.max(0, goal.amount - saved), due, today) : requiredMonthly(data, goal, today);
    const active = goal.status === "Active";
    const settled = goal.status === "Done" ? `paid ${formatShortDate(goal.doneOn as string)}${goal.actualCost !== undefined ? ` · ${goal.actualCost <= goal.amount ? `${formatInr(goal.amount - goal.actualCost)} under` : `${formatInr(goal.actualCost - goal.amount)} over`}` : ""}` : goal.status === "Dropped" ? "released" : null;
    return {
      id: goal.id,
      topId: top.id,
      name: goal.name,
      sub,
      category: goal.category,
      colorKey: sub && !goal.color ? colorOf(top) : colorOf(goal),
      note: sub ? goal.category : `${goal.category}${kids.length ? ` · ${plural(kids.filter((k) => k.status !== "Done").length, "sub-goal")}` : ""}`,
      need: goal.necessity === "Need",
      scale: goal.scale,
      progress: target ? Math.min(1, saved / target) : 0,
      expected: active ? expectedProgress(data, goal, today) : null,
      savedText: goal.status === "Done" && goal.actualCost !== undefined ? formatInr(goal.actualCost) : `${formatInrCompact(saved)} · ${Math.round((target ? Math.min(1, saved / target) : 0) * 100)}%`,
      target: formatInr(goal.status === "Done" ? goal.amount : target),
      due: goal.status === "Done" ? formatShortDate(goal.doneOn as string) : due ? formatDate(due) : "Someday",
      dueNote: !active || !due ? "" : due < today ? "overdue" : `${monthsLeft(due, today) || 1} month${(monthsLeft(due, today) || 1) === 1 ? "" : "s"} left`,
      fixed: goal.dateType === "Fixed" && active,
      perMonth: active && planned ? formatInr(planned) : "–",
      perMonthNote: active ? (needs ? `needs ${formatInr(needs)}` : "nothing needed") : goal.status === "Paused" ? "paused" : "",
      standing: stand,
      off: !active,
      settled,
    };
  };
  const tops = topGoals(data);
  const order: Record<Goal["status"], number> = { Active: 0, Paused: 1, Done: 2, Dropped: 3 };
  return [...tops]
    .sort((a, b) => order[a.status] - order[b.status])
    .flatMap((top) => [row(top, false, top), ...data.goals.filter((g) => g.parentId === top.id).sort((a, b) => order[a.status] - order[b.status]).map((kid) => row(kid, true, top))]);
}

// ---------- Coming up ----------

export interface ComingUpRow {
  key: string;
  topId: string;
  name: string;
  colorKey: ColorKey;
  category: GoalCategory;
  line: string;
  date: string;
  dateNote: string;
  fixed: boolean;
  risk: boolean;
}

export function comingUpView(data: GoalsPageData, today: string, n = 5, d: GoalsDerived = deriveGoals(data, today)): ComingUpRow[] {
  return d.pieces
    .filter((p) => !p.paused && p.due && p.left > 0)
    .sort((a, b) => (a.due as string).localeCompare(b.due as string) || a.name.localeCompare(b.name))
    .slice(0, n)
    .map((p) => ({
      key: p.key,
      topId: p.topId,
      name: pieceLabel(p.name),
      colorKey: pieceColor(data, p),
      category: goalOf(data, p.goalId)!.category,
      line: `${formatInr(p.left)} to go · ${p.planned ? `plan ${formatInr(p.planned)}` : "no plan"} of ${formatInr(p.required)} a month`,
      date: formatShortDate(p.due as string),
      dateNote: inDays(daysBetween(today, p.due as string)),
      fixed: p.dateType === "Fixed",
      risk: p.dateType === "Fixed" && p.planned < p.required,
    }));
}

// ---------- This month ----------

export interface MonthRow {
  key: string;
  topId: string;
  name: string;
  colorKey: ColorKey;
  category: GoalCategory;
  note: string;
  planned: number;
  done: number;
  /** done as a share of planned, 0 to 1. */
  share: number;
  state: "done" | "extra" | "short" | "notyet";
  stateText: string;
  /** What "Set aside" would record: what's left of the plan. */
  remaining: number;
  lastOn: string | null;
}

export interface MonthView {
  month: string;
  planned: number;
  counted: number;
  extra: number;
  todoCount: number;
  daysLeft: number;
  rows: MonthRow[];
}

export function monthView(data: GoalsPageData, today: string, d: GoalsDerived = deriveGoals(data, today)): MonthView {
  const month = today.slice(0, 7);
  const rows = d.pieces
    .filter((p) => !p.paused)
    .map((p): MonthRow => {
      const entries = data.contributions.filter((c) => c.goalId === p.goalId && c.date.startsWith(month));
      const done = Math.max(0, sum(entries.map((c) => (c.kind === "Set-aside" ? c.amount : -c.amount))));
      const state: MonthRow["state"] = done >= p.planned && p.planned > 0 ? (done > p.planned ? "extra" : "done") : done > 0 ? "short" : "notyet";
      return {
        key: p.key,
        topId: p.topId,
        name: pieceLabel(p.name),
        colorKey: pieceColor(data, p),
        category: goalOf(data, p.goalId)!.category,
        note: `${p.necessity}${p.due ? ` · due ${formatShortDate(p.due)}` : ""}`,
        planned: p.planned,
        done,
        share: p.planned ? Math.min(1, done / p.planned) : 0,
        state,
        stateText: state === "extra" ? `${formatInr(done - p.planned)} extra` : state === "done" ? "Done" : state === "short" ? `${formatInr(p.planned - done)} short` : "Not yet",
        remaining: Math.max(0, p.planned - done),
        lastOn: entries.length ? entries.map((c) => c.date).sort().at(-1)! : null,
      };
    })
    .filter((r) => r.planned > 0 || r.done > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  const nextMonth = addMonthsUTC(`${month}-01`, 1);
  return {
    month,
    planned: sum(rows.map((r) => r.planned)),
    counted: sum(rows.map((r) => Math.min(r.done, r.planned))),
    extra: sum(rows.map((r) => Math.max(0, r.done - r.planned))),
    todoCount: rows.filter((r) => r.done < r.planned).length,
    daysLeft: daysBetween(today, nextMonth),
    rows,
  };
}

// ---------- What your money allows ----------

export interface AffordView {
  income: string;
  obligations: string;
  left: string;
  planned: number;
  required: number;
  minimum: number | null;
  leftAmount: number;
  note: string;
}

export function affordView(data: GoalsPageData, today: string, d: GoalsDerived = deriveGoals(data, today)): AffordView {
  const { requiredTotal: required, plannedTotal: planned, minimumMonthly: minimum } = d.totals;
  const left = data.income - data.obligations;
  return {
    income: formatInr(data.income),
    obligations: formatInr(data.obligations),
    left: formatInr(left),
    planned,
    required,
    minimum,
    leftAmount: left,
    note: `${formatInr(planned)} planned is ${left > 0 ? Math.round((planned / left) * 100) : 0}% of what's left.${minimum ? ` Funded in order, ${formatInr(minimum)} is enough.` : ""}`,
  };
}

// ---------- The staircase ----------

export interface StairView {
  months: number;
  total: number;
  /** The steps: by this month, this much must be set aside in all. */
  steps: { month: number; run: number; name: string; due: string }[];
  plan: { month: number; cum: number }[];
  minimum: { month: number; cum: number }[];
  planned: number;
  minimumBudget: number | null;
  labels: { month: number; text: string }[];
}

/** The staircase shows at least this many months, and more when a date is further out. */
const MIN_HORIZON = 34;

export function stairView(data: GoalsPageData, today: string, d: GoalsDerived = deriveGoals(data, today)): StairView | null {
  const units = fundingUnits(data).filter((u) => u.due && u.left > 0 && (u.due as string) >= today);
  if (units.length === 0) return null;
  const total = sum(units.map((u) => u.left));
  const due = units.map((u) => ({ u, month: Math.max(1, wholeMonthsTo(u.due as string, today)) })).sort((a, b) => a.month - b.month);
  const HORIZON = Math.max(MIN_HORIZON, Math.ceil((due.at(-1)?.month ?? 0) / 6) * 6 + 2);
  let run = 0;
  const steps = due.map(({ u, month }) => ({ month, run: (run += u.left), name: u.name, due: u.due as string }));
  const cumulative = (budget: number) => {
    const plan = fundingPlan(fundingUnits(data), budget, today, HORIZON);
    let cum = 0;
    return [{ month: 0, cum: 0 }, ...plan.months.map((m) => ({ month: m.month, cum: (cum += m.spent) }))];
  };
  const planned = d.totals.plannedTotal;
  const minimum = d.totals.minimumMonthly;
  return {
    months: HORIZON,
    total,
    steps,
    plan: cumulative(planned),
    minimum: minimum ? cumulative(minimum) : [],
    planned,
    minimumBudget: minimum,
    labels: Array.from({ length: Math.floor((HORIZON - 2) / 6) + 1 }, (_, i) => i * 6).map((month) => ({ month, text: month === 0 ? "Now" : formatShortMonth(addMonthsUTC(today, month)) })),
  };
}

const formatShortMonth = (iso: string) => `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(iso.slice(5, 7)) - 1]} ${iso.slice(2, 4)}`;

// ---------- Needs and wants ----------

export interface NeedsWantsView {
  total: number;
  need: number;
  want: number;
  minor: number;
  major: number;
  categories: { category: GoalCategory; colorKey: ColorKey; amount: number }[];
}

export function needsWantsView(data: GoalsPageData): NeedsWantsView {
  const active = topGoals(data).filter((g) => g.status === "Active");
  const splits = active.map((g) => necessitySplit(data, g));
  const total = sum(active.map((g) => targetOf(data, g)));
  const major = sum(active.filter((g) => g.scale === "Major").map((g) => targetOf(data, g)));
  const byCategory = new Map<GoalCategory, { colorKey: ColorKey; amount: number }>();
  for (const g of active) byCategory.set(g.category, { colorKey: colorOf(g), amount: (byCategory.get(g.category)?.amount ?? 0) + targetOf(data, g) });
  return { total, need: sum(splits.map((s) => s.need)), want: sum(splits.map((s) => s.want)), minor: total - major, major, categories: [...byCategory].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.amount - a.amount) };
}

// ---------- Set aside lately and Finished ----------

export interface EntryCard {
  id: string;
  topId: string;
  name: string;
  colorKey: ColorKey;
  category: GoalCategory;
  note: string;
  amount: string;
  date: string;
  take: boolean;
}

export function setAsidesView(data: GoalsPageData, today: string, n = 7): EntryCard[] {
  return [...data.contributions]
    .filter((c) => c.date <= today && goalOf(data, c.goalId))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id)))
    .slice(0, n)
    .map((c) => {
      const goal = goalOf(data, c.goalId)!;
      const top = goal.parentId ? (goalOf(data, goal.parentId) ?? goal) : goal;
      return { id: c.id, topId: top.id, name: goal.name, colorKey: goal.color ? colorOf(goal) : colorOf(top), category: goal.category, note: c.kind === "Take-back" ? (c.note ?? "Taken back") : c.accountId ? `from ${data.accounts.find((a) => a.id === c.accountId)?.name ?? "an account"}` : "no account named", amount: `${c.kind === "Take-back" ? "−" : "+"}${formatInr(c.amount)}`, date: formatShortDate(c.date), take: c.kind === "Take-back" };
    });
}

export interface FinishedRow {
  id: string;
  name: string;
  colorKey: ColorKey;
  category: GoalCategory;
  note: string;
  cost: string;
  estimate: string;
  verdict: string;
  under: boolean;
}

export function finishedView(data: GoalsPageData): FinishedRow[] {
  return data.goals
    .filter((g) => g.status === "Done" && g.actualCost !== undefined)
    .sort((a, b) => ((b.doneOn as string) < (a.doneOn as string) ? -1 : 1))
    .map((g) => {
      const diff = g.amount - (g.actualCost as number);
      const paid = g.paidFromAccountId ? data.accounts.find((a) => a.id === g.paidFromAccountId)?.name : undefined;
      return { id: g.id, name: g.name, colorKey: colorOf(g), category: g.category, note: `bought ${formatShortDate(g.doneOn as string)}${paid ? ` · paid from ${paid}` : g.paidFromCardId ? " · paid on a card" : ""}`, cost: formatInr(g.actualCost as number), estimate: `of ${formatInr(g.amount)}`, verdict: diff >= 0 ? `Came in ${formatInr(diff)} under the estimate` : `Came in ${formatInr(-diff)} over the estimate`, under: diff >= 0 };
    });
}

export interface GoalsWidgets {
  table: TableRow[];
  comingUp: ComingUpRow[];
  month: MonthView;
  afford: AffordView;
  stair: StairView | null;
  needsWants: NeedsWantsView;
  setAsides: EntryCard[];
  finished: FinishedRow[];
}

export function goalsWidgets(data: GoalsPageData, today: string, d: GoalsDerived = deriveGoals(data, today)): GoalsWidgets {
  return { table: tableRows(data, today), comingUp: comingUpView(data, today, 5, d), month: monthView(data, today, d), afford: affordView(data, today, d), stair: stairView(data, today, d), needsWants: needsWantsView(data), setAsides: setAsidesView(data, today), finished: finishedView(data) };
}

