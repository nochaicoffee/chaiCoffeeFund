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

/**
 * Funded: saved at or above the target, exactly at target counting. A goal with parts is funded only when every piece is covered (each part holds
 * its cost and what isn't given to a part covers the goal's own part): money that is set aside on the goal but not given to a part covers nothing yet.
 */
export function isFunded(data: GoalsData, goal: Goal): boolean {
  const target = targetOf(data, goal);
  if (target <= 0) return false;
  const kids = liveKids(data, goal.id);
  if (kids.length === 0) return savedOf(data, goal) >= target;
  return savedOwn(data, goal.id) >= goal.amount && kids.every((kid) => savedOwn(data, kid.id) >= kid.amount);
}

/** The date a goal is due: the latest of its own date and its live sub-goals' (a parent is due when its last piece is). Null when none has one. */
export function dueOf(data: GoalsData, goal: Goal): string | null {
  const dates = [goal.targetDate, ...liveKids(data, goal.id).map((kid) => kid.targetDate)].filter((date): date is string => Boolean(date));
  return dates.length ? [...dates].sort().at(-1)! : null;
}

/**
 * The date a piece is funded to: its own, or for a sub-goal without one its parent's (the funding plan and the sky already treat it so), or for a
 * parent the latest of its own and its sub-goals'. Standing, what it needs a month and the pace line all read this, so one piece gets one answer.
 */
export function effectiveDue(data: GoalsData, goal: Goal): string | null {
  if (goal.targetDate) return goal.targetDate;
  const parent = goal.parentId ? data.goals.find((g) => g.id === goal.parentId) : undefined;
  return dueOf(data, parent ?? goal);
}

/** Whole months from today to a date, counting a month only once its day has arrived. 0 when the date is today or past. */
export function wholeMonthsTo(date: string, today: string): number {
  if (date <= today) return 0;
  // Start from the difference in calendar months, then settle on the last month whose day has arrived (month ends clamp, as addMonthsUTC does).
  let months = (Number(date.slice(0, 4)) - Number(today.slice(0, 4))) * 12 + Number(date.slice(5, 7)) - Number(today.slice(5, 7));
  // Landing in the date's own month, the day either has arrived or hasn't: at most one step back (and never a step on, which could pass year 9999).
  if (months > 0 && addMonthsUTC(today, months) > date) months--;
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
  return requiredFor(Math.max(0, goal.amount - savedOwn(data, goal.id)), effectiveDue(data, goal), today);
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
  const due = effectiveDue(data, goal);
  if (due && due < today) return "Overdue";
  if (!due) return "Someday";
  const planned = plannedOf(data, goal);
  if (!planned) return "No plan";
  return planned >= requiredMonthly(data, goal, today) ? "On track" : "Behind";
}

/** Where saving should be by now, from 0 to 1: a straight line from the start date to the target date. Null with no date. */
export function expectedProgress(data: GoalsData, goal: Goal, today: string): number | null {
  const due = effectiveDue(data, goal);
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

// --- A goal's pot and its parts ---

/**
 * A goal with parts is one pot (Prathik, 2026-11-03: "a sub-goal is part of its main goal"). Everything is set aside on the goal itself; he
 * then gives each part its share by hand, which moves money from the goal's own set-asides to the part's. So what a goal holds (`savedOwn`) is the
 * free pot that covers its own part (the rest of the car that isn't itemised) and anything left over, and each part holds what it was given.
 * Nothing about saved, funded or earmarks changed to make this true: the parts' totals and the account earmarks are the same ledger as before.
 */

/** What's in a goal's pot and not given to a part: the money its own part is covered by. */
export const freePot = (data: GoalsData, goal: Goal): number => savedOwn(data, goal.id);

/** What a move between a goal's pot and a part writes in the entries' notes, so the lists of entries can leave the moves out (the money didn't come or go, it only changed hands). */
export const moveNotes = {
  given: (part: string) => `Given to ${part}`,
  from: (main: string) => `Moved from ${main}'s unassigned money`,
  back: (main: string) => `Moved back to ${main}'s unassigned money`,
  backFrom: (part: string) => `Moved back from ${part}`,
};
const MOVE_NOTE = /^(Given to |From the pot of |Back to the pot of |Back from |Moved from |Moved back )/;
export const isPotMove = (entry: GoalContribution): boolean => MOVE_NOTE.test(entry.note ?? "");

/** What the free pot covers of a goal's own part. */
export const ownCovered = (data: GoalsData, goal: Goal): number => Math.min(freePot(data, goal), goal.amount);

/** Free pot beyond the goal's own part: set aside, but not covering anything yet. */
export const potSpare = (data: GoalsData, goal: Goal): number => Math.max(0, freePot(data, goal) - goal.amount);

/** What a part needs in order to be filled in order. */
export interface FillPart {
  id: string;
  /** Its cost. */
  amount: number;
  /** What it already holds. */
  saved: number;
  necessity: Goal["necessity"];
  dateType?: "Fixed" | "Flexible";
  due: string | null;
}

/**
 * Hands `money` to the parts in funding order (Fixed dates, then Needs, then the soonest, then the smaller), each up to what it still lacks, and
 * returns what each is given (only parts that get something are in it). Whatever the parts can't take is left in the pot. Pass every part's
 * `saved` as 0 and the whole pot as `money` for a fresh fill.
 */
export function fillInOrder(parts: FillPart[], money: number): Record<string, number> {
  const byId = new Map(parts.map((part) => [part.id, part]));
  const order = fundingOrder(parts.map((part) => ({ id: part.id, topId: "", name: part.id, necessity: part.necessity, dateType: part.dateType ?? "Flexible", due: part.due, left: part.amount, own: false })));
  const given: Record<string, number> = {};
  let left = Math.max(0, money);
  for (const unit of order) {
    const part = byId.get(unit.id) as FillPart;
    const give = Math.min(left, Math.max(0, part.amount - part.saved));
    if (give > 0) given[part.id] = give;
    left -= give;
  }
  return given;
}

/** A goal's live parts in the order money fills them: Fixed dates, then Needs, then the soonest, then the smaller. */
export function partsInOrder(data: GoalsData, goal: Goal): Goal[] {
  const kids = liveKids(data, goal.id);
  const rank = new Map(fundingOrder(kids.map((kid) => ({ id: kid.id, topId: goal.id, name: kid.name, necessity: kid.necessity, dateType: kid.dateType ?? "Flexible", due: effectiveDue(data, kid), left: kid.amount, own: false }))).map((unit, index) => [unit.id, index]));
  return [...kids].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
}

/** A goal's live parts as `fillInOrder` reads them. */
export function fillPartsOf(data: GoalsData, goal: Goal): FillPart[] {
  return liveKids(data, goal.id).map((kid) => ({ id: kid.id, amount: kid.amount, saved: savedOwn(data, kid.id), necessity: kid.necessity, dateType: kid.dateType, due: kid.targetDate ?? dueOf(data, goal) }));
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

/** How many months a plan runs: long enough to reach the latest date (so a goal five years out can finish on schedule), and at least four years. */
export function horizonFor(units: FundingUnit[], today: string): number {
  const latest = Math.max(0, ...units.filter((unit) => unit.due && unit.left > 0).map((unit) => wholeMonthsTo(unit.due as string, today)));
  return Math.max(48, latest + 2);
}

/**
 * Month by month, in funding order: pass 1 gives each unit at most what it needs this month to reach its date (what's left over the
 * months left), pass 2 hands whatever is left to the units still open, in the same order. Every rupee of `budget` each month is
 * either given or reported as unspent, and a unit gets nothing once it's funded.
 */
export function fundingPlan(units: FundingUnit[], budget: number, today: string, horizon = horizonFor(units, today)): FundingPlan {
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

/**
 * What's set aside against each account (set-asides less take-backs). Contributions with no account aren't in it, and a
 * goal that's been bought or dropped holds nothing: its money is released, so it stops being earmarked without a take-back
 * being recorded (which keeps Reopen and Restore a status change and nothing else).
 */
export function earmarksByAccount(data: GoalsData): Record<string, number> {
  const held = new Set(data.goals.filter((goal) => goal.status === "Active" || goal.status === "Paused").map((goal) => goal.id));
  const earmarks: Record<string, number> = {};
  for (const c of data.contributions) if (c.accountId && held.has(c.goalId)) earmarks[c.accountId] = (earmarks[c.accountId] ?? 0) + (c.kind === "Set-aside" ? c.amount : -c.amount);
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

/** What's planned a month across every active goal and active sub-goal (a sub-goal under a paused or dropped parent isn't planned for). */
export function plannedTotal(data: GoalsData): number {
  return sum(data.goals.filter((goal) => goal.status === "Active" && !(goal.parentId && data.goals.find((p) => p.id === goal.parentId)?.status !== "Active")).map((goal) => goal.plannedMonthly ?? 0));
}

/** Sub-goals whose parent isn't in the Goals tab (a parent deleted by hand in the Sheet): they're in no total, so the page says so. */
export function orphanGoals(data: GoalsData): Goal[] {
  const ids = new Set(data.goals.map((goal) => goal.id));
  return data.goals.filter((goal) => goal.parentId && !ids.has(goal.parentId));
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
    plannedTotal: plannedTotal(data),
    minimumMonthly: minimumBudget(units, today),
    next: dated.sort((a, b) => dueOf(data, a)!.localeCompare(dueOf(data, b)!) || a.name.localeCompare(b.name))[0] ?? null,
  };
}
