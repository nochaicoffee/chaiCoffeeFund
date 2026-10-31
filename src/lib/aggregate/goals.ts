import { addMonthsUTC } from "./recurring";
import { daysBetween } from "./cardSpend";
import type { Goal, GoalContribution } from "../sheets/types";

/**
 * What the Goals page shows, worked out from the Goals and GoalContributions tabs (#239). Pure: no Sheets
 * calls, tested against fixtures. The rules are in docs/design/goals.md ("Rules the sample assumes" and "The
 * pick"), and each one is a proposed definition for Prathik to confirm:
 * - A goal is an earmark, not money: nothing here touches net worth. Saved is the set-asides less the
 *   take-backs, never below 0, and is never typed as a total.
 * - One level only: a goal's sub-goals have none. A parent's target is its own part plus its live
 *   sub-goals; a Dropped or Done sub-goal leaves it (its money is released). Saved is rolled up the same way.
 * - Months left is whole months from today to the date, at least 1 while the date is ahead. A date that has
 *   passed has 0 and the goal is overdue.
 * - Required a month is what's left over those months, rounded up to the rupee. An overdue goal owes all of
 *   it now. A parent adds its own part and each sub-goal at its own date.
 * - On track means planned a month is at least required; Behind otherwise; No plan with nothing planned.
 * - Where it should be by now is a straight line from the start date to the target date.
 * - The funding plan serves Fixed dates first, then Needs, then the soonest, then the smaller; each month
 *   every goal first gets what it needs to reach its date, then what's left goes to goals still open.
 */

export interface GoalsData {
  goals: Goal[];
  contributions: GoalContribution[];
}

/** Where a goal stands, worked out and never stored. */
export type GoalStanding = "Funded" | "Overdue" | "Behind" | "On track" | "No plan" | "Someday" | "Paused" | "Done" | "Dropped";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** The sub-goals of a goal. */
export const kidsOf = (data: GoalsData, id: string): Goal[] => data.goals.filter((goal) => goal.parentId === id);

/** The sub-goals that still count towards a parent: not Dropped (money released) and not bought (Done). */
export const liveKids = (data: GoalsData, id: string): Goal[] => kidsOf(data, id).filter((goal) => goal.status === "Active" || goal.status === "Paused");

/** The goals shown on their own: those with no parent. */
export const topGoals = (data: GoalsData): Goal[] => data.goals.filter((goal) => !goal.parentId);

/** Saved in this goal itself: set-asides less take-backs, never below 0. */
export function savedOwn(data: GoalsData, id: string): number {
  return Math.max(0, sum(data.contributions.filter((c) => c.goalId === id).map((c) => (c.kind === "Set-aside" ? c.amount : -c.amount))));
}

/** A goal's target: its own part plus its live sub-goals'. */
export function targetOf(data: GoalsData, goal: Goal): number {
  return goal.amount + sum(liveKids(data, goal.id).map((kid) => kid.amount));
}

/** Saved: its own set-asides plus its live sub-goals'. */
export function savedOf(data: GoalsData, goal: Goal): number {
  return savedOwn(data, goal.id) + sum(liveKids(data, goal.id).map((kid) => savedOwn(data, kid.id)));
}

/** Still to set aside. */
export const leftOf = (data: GoalsData, goal: Goal): number => Math.max(0, targetOf(data, goal) - savedOf(data, goal));

/** What's set aside beyond the target, which a take-back can free. */
export const excessOf = (data: GoalsData, goal: Goal): number => Math.max(0, savedOf(data, goal) - targetOf(data, goal));

/** Saved over target, from 0 to 1: it never shows above 100%. */
export function progressOf(data: GoalsData, goal: Goal): number {
  const target = targetOf(data, goal);
  return target > 0 ? Math.min(1, savedOf(data, goal) / target) : 0;
}

/** Funded: saved at or above the target. Exactly at target counts. */
export const isFunded = (data: GoalsData, goal: Goal): boolean => targetOf(data, goal) > 0 && savedOf(data, goal) >= targetOf(data, goal);

/** The date a goal is due: its own, or the latest of its sub-goals'. */
export function dueOf(data: GoalsData, goal: Goal): string | null {
  if (goal.targetDate) return goal.targetDate;
  const dates = liveKids(data, goal.id).map((kid) => kid.targetDate).filter((date): date is string => Boolean(date));
  return dates.length ? [...dates].sort().at(-1)! : null;
}

/** Whole months from today to a date, counting a month only once its day has arrived. 0 when the date is today or past. */
export function wholeMonthsTo(date: string, today: string): number {
  let months = 0;
  while (addMonthsUTC(today, months + 1) <= date) months++;
  return months;
}

/** Months left to spend: at least 1 while the date is ahead, 0 on the day itself and once it has passed. */
export function monthsLeft(date: string, today: string): number {
  return date <= today ? 0 : Math.max(1, wholeMonthsTo(date, today));
}

/** What a piece still to be saved needs each month: left over the months left (at least 1, so an overdue piece owes it all now), rounded up to the rupee. */
export function requiredFor(left: number, date: string | null, today: string): number {
  if (left <= 0 || !date) return 0;
  return Math.ceil(left / Math.max(1, monthsLeft(date, today)));
}

/** A goal's own part needs this a month (a sub-goal's, or a parent's part that isn't itemised). */
function requiredOwn(data: GoalsData, goal: Goal, today: string): number {
  return requiredFor(Math.max(0, goal.amount - savedOwn(data, goal.id)), goal.targetDate ?? dueOf(data, goal), today);
}

/** What a goal needs each month: a goal with sub-goals adds its own part and each live sub-goal at its own date. */
export function requiredMonthly(data: GoalsData, goal: Goal, today: string): number {
  const kids = liveKids(data, goal.id).filter((kid) => kid.status === "Active");
  if (!kidsOf(data, goal.id).length) return requiredOwn(data, goal, today);
  return requiredOwn(data, goal, today) + sum(kids.map((kid) => requiredFor(Math.max(0, kid.amount - savedOwn(data, kid.id)), kid.targetDate ?? dueOf(data, goal), today)));
}

/** What is planned a month for a goal and its live sub-goals. */
export const plannedOf = (data: GoalsData, goal: Goal): number => (goal.plannedMonthly ?? 0) + sum(liveKids(data, goal.id).filter((kid) => kid.status === "Active").map((kid) => kid.plannedMonthly ?? 0));

/** Where a goal stands. Funded outranks everything but its status; an overdue goal is overdue whatever its plan says. */
export function standing(data: GoalsData, goal: Goal, today: string): GoalStanding {
  if (goal.status !== "Active") return goal.status;
  if (isFunded(data, goal)) return "Funded";
  const due = dueOf(data, goal);
  if (due && due < today) return "Overdue";
  if (!due) return "Someday";
  const planned = plannedOf(data, goal);
  if (!planned) return "No plan";
  return planned >= requiredMonthly(data, goal, today) ? "On track" : "Behind";
}

/** Where saving should be by now, from 0 to 1: a straight line from the start date to the target date. Null with no date. */
export function expectedProgress(data: GoalsData, goal: Goal, today: string): number | null {
  const due = dueOf(data, goal);
  if (!due) return null;
  const span = daysBetween(goal.startDate, due);
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, daysBetween(goal.startDate, today) / span));
}

/** A parent's target split into what's a Need and what's a Want: its own part by its own label, each sub-goal by its own. */
export function necessitySplit(data: GoalsData, goal: Goal): { need: number; want: number } {
  const parts = [{ necessity: goal.necessity, amount: goal.amount }, ...liveKids(data, goal.id).map((kid) => ({ necessity: kid.necessity, amount: kid.amount }))];
  const need = sum(parts.filter((part) => part.necessity === "Need").map((part) => part.amount));
  return { need, want: sum(parts.map((part) => part.amount)) - need };
}

// --- The funding plan ---

/** A unit that gets funded: a goal with no sub-goals, a parent's own part, or a sub-goal. */
export interface FundingUnit {
  /** The goal it belongs to; a parent's own part carries the parent's id. */
  id: string;
  /** The top-level goal it sits under. */
  topId: string;
  name: string;
  necessity: Goal["necessity"];
  dateType: "Fixed" | "Flexible";
  due: string | null;
  /** Still to set aside. */
  left: number;
  /** True for a parent's own part, which shares its id with the parent. */
  own: boolean;
}

/** Every active piece that still needs money. */
export function fundingUnits(data: GoalsData): FundingUnit[] {
  return topGoals(data)
    .filter((goal) => goal.status === "Active")
    .flatMap((goal): FundingUnit[] => {
      const kids = liveKids(data, goal.id).filter((kid) => kid.status === "Active");
      const base = { topId: goal.id, necessity: goal.necessity, dateType: goal.dateType ?? ("Flexible" as const) };
      const parentDue = dueOf(data, goal);
      if (!kidsOf(data, goal.id).length) return [{ ...base, id: goal.id, name: goal.name, due: goal.targetDate ?? null, left: Math.max(0, goal.amount - savedOwn(data, goal.id)), own: false }];
      return [
        ...(goal.amount > 0 ? [{ ...base, id: goal.id, name: goal.name, due: goal.targetDate ?? parentDue, left: Math.max(0, goal.amount - savedOwn(data, goal.id)), own: true }] : []),
        ...kids.map((kid) => ({ topId: goal.id, id: kid.id, name: kid.name, necessity: kid.necessity, dateType: kid.dateType ?? ("Flexible" as const), due: kid.targetDate ?? parentDue, left: Math.max(0, kid.amount - savedOwn(data, kid.id)), own: false })),
      ];
    });
}

/** Fixed dates first, then Needs, then the soonest date (no date last), then the smaller amount left. Stable whatever order the goals were entered in. */
export function fundingOrder(units: FundingUnit[]): FundingUnit[] {
  return [...units].sort(
    (a, b) =>
      (a.dateType === "Fixed" ? 0 : 1) - (b.dateType === "Fixed" ? 0 : 1) ||
      (a.necessity === "Need" ? 0 : 1) - (b.necessity === "Need" ? 0 : 1) ||
      (a.due ?? "9999").localeCompare(b.due ?? "9999") ||
      a.left - b.left ||
      `${a.id}:${a.own}`.localeCompare(`${b.id}:${b.own}`),
  );
}

export interface FundingMonth {
  /** 1 is the first month from today. */
  month: number;
  /** The day that month ends on, a month after today for month 1. */
  day: string;
  /** What each unit gets this month, keyed by `unitKey`. */
  give: Record<string, number>;
  spent: number;
}

export interface FundingPlan {
  order: FundingUnit[];
  /** The month each unit is funded in, by `unitKey`; a unit that never finishes within the horizon has none. */
  done: Record<string, number>;
  months: FundingMonth[];
  /** What's still unfunded after the horizon, by `unitKey`. */
  left: Record<string, number>;
}

export const unitKey = (unit: Pick<FundingUnit, "id" | "own">): string => (unit.own ? `${unit.id}#own` : unit.id);

/**
 * Month by month, in funding order: pass 1 gives each unit at most what it needs this month to reach its date (what's left over the
 * months left), pass 2 hands whatever is left to the units still open, in the same order. Every rupee of `budget` each month is
 * either given or reported as unspent, and a unit gets nothing once it's funded.
 */
export function fundingPlan(units: FundingUnit[], budget: number, today: string, horizon = 48): FundingPlan {
  const order = fundingOrder(units);
  const left = Object.fromEntries(order.map((unit) => [unitKey(unit), unit.left]));
  const done: Record<string, number> = {};
  const months: FundingMonth[] = [];
  for (const unit of order) if (!unit.left) done[unitKey(unit)] = 0;
  for (let month = 1; month <= horizon; month++) {
    let pool = budget;
    const give: Record<string, number> = {};
    for (const unit of order) {
      const key = unitKey(unit);
      if (!left[key] || !unit.due) continue;
      const monthsToGo = Math.max(1, wholeMonthsTo(unit.due, today) - (month - 1));
      const amount = Math.min(pool, Math.min(left[key], Math.ceil(left[key] / monthsToGo)));
      if (amount > 0) give[key] = (give[key] ?? 0) + amount;
      pool -= amount;
      left[key] -= amount;
    }
    for (const unit of order) {
      const key = unitKey(unit);
      if (!pool) break;
      if (!left[key]) continue;
      const amount = Math.min(pool, left[key]);
      give[key] = (give[key] ?? 0) + amount;
      pool -= amount;
      left[key] -= amount;
    }
    for (const unit of order) if (!left[unitKey(unit)] && done[unitKey(unit)] === undefined) done[unitKey(unit)] = month;
    months.push({ month, day: addMonthsUTC(today, month), give, spent: budget - pool });
    if (order.every((unit) => !left[unitKey(unit)])) break;
  }
  return { order, done, months, left };
}

/** Whether a plan funds every dated unit by its date: a unit finishes in a month no later than its months left (at least 1). A date that has already passed can't be hit. */
export function hitsEveryDate(plan: FundingPlan, today: string): boolean {
  return plan.order.every((unit) => {
    if (!unit.due || !unit.left) return true;
    if (unit.due < today) return false;
    const month = plan.done[unitKey(unit)];
    return month !== undefined && month <= Math.max(1, wholeMonthsTo(unit.due, today));
  });
}

/** The step the monthly amount is rounded up to: ₹27,000, not ₹26,812. */
export const BUDGET_STEP = 500;

/** The smallest monthly amount, in whole steps, that funds every dated unit by its date; null when no amount can (a unit is already overdue). */
export function minimumBudget(units: FundingUnit[], today: string, step = BUDGET_STEP): number | null {
  const dated = units.filter((unit) => unit.left > 0 && unit.due);
  if (!dated.length) return 0;
  const upper = Math.ceil(sum(dated.map((unit) => unit.left)) / step) * step;
  if (!hitsEveryDate(fundingPlan(units, upper, today), today)) return null;
  let low = 1;
  let high = upper / step;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (hitsEveryDate(fundingPlan(units, mid * step, today), today)) high = mid;
    else low = mid + 1;
  }
  return low * step;
}

// --- Earmarks ---

/** What's set aside against each account (set-asides less take-backs). Contributions with no account aren't in it. */
export function earmarksByAccount(contributions: GoalContribution[]): Record<string, number> {
  const earmarks: Record<string, number> = {};
  for (const c of contributions) if (c.accountId) earmarks[c.accountId] = (earmarks[c.accountId] ?? 0) + (c.kind === "Set-aside" ? c.amount : -c.amount);
  return earmarks;
}

export interface EarmarkProblem {
  accountId: string;
  earmarked: number;
  balance: number;
  /** earmarked less balance: what the account can't cover. */
  over: number;
}

/** The accounts whose earmarks pass their latest balance. An account with no balance known isn't checked (nothing to compare with). */
export function earmarkProblems(earmarks: Record<string, number>, balances: Record<string, number>): EarmarkProblem[] {
  return Object.entries(earmarks)
    .filter(([accountId, earmarked]) => accountId in balances && earmarked > balances[accountId])
    .map(([accountId, earmarked]) => ({ accountId, earmarked, balance: balances[accountId], over: earmarked - balances[accountId] }))
    .sort((a, b) => b.over - a.over);
}

// --- The page's totals ---

export interface GoalsTotals {
  /** Active goals with no parent. */
  goals: number;
  saved: number;
  target: number;
  /** Every piece on its own schedule, a month. */
  requiredTotal: number;
  /** What's planned a month across the active goals. */
  plannedTotal: number;
  /** The smallest monthly amount that funds every date when it goes in funding order. */
  minimumMonthly: number | null;
  /** The active top-level goal due soonest, or null. */
  next: Goal | null;
}

export function totals(data: GoalsData, today: string): GoalsTotals {
  const active = topGoals(data).filter((goal) => goal.status === "Active");
  const units = fundingUnits(data);
  const dated = active.filter((goal) => dueOf(data, goal) && dueOf(data, goal)! >= today && !isFunded(data, goal));
  return {
    goals: active.length,
    saved: sum(active.map((goal) => savedOf(data, goal))),
    target: sum(active.map((goal) => targetOf(data, goal))),
    requiredTotal: sum(units.map((unit) => requiredFor(unit.left, unit.due, today))),
    plannedTotal: sum(data.goals.filter((goal) => goal.status === "Active" && !(goal.parentId && data.goals.find((p) => p.id === goal.parentId)?.status !== "Active")).map((goal) => goal.plannedMonthly ?? 0)),
    minimumMonthly: minimumBudget(units, today),
    next: dated.sort((a, b) => dueOf(data, a)!.localeCompare(dueOf(data, b)!) || a.name.localeCompare(b.name))[0] ?? null,
  };
}
