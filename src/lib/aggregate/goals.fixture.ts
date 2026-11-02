import type { Goal, GoalContribution } from "../sheets/types";
import type { GoalsData } from "./goals";
import { demoGoalsData } from "../demo/goalsDemo";

/** The sample the design boards use (design/goals/generator/lib.mjs), shared by the Goals tests: a car with sub-goals, an iPad, a fixed-date fridge, a trip, a course, a paused camera, a bought pair of headphones. Today is 2026-10-29. */
export const TODAY = "2026-10-29";

export const goal = (g: Partial<Goal> & Pick<Goal, "id" | "name" | "amount">): Goal => ({
  category: "Other",
  necessity: "Want",
  scale: "Minor",
  startDate: "2026-01-01",
  status: "Active",
  ...g,
});
let n = 0;
export const set = (goalId: string, amount: number, date = "2026-09-05", extra: Partial<GoalContribution> = {}): GoalContribution => ({ id: `c${++n}`, goalId, date, amount, kind: "Set-aside", ...extra });
export const take = (goalId: string, amount: number): GoalContribution => set(goalId, amount, "2026-10-01", { kind: "Take-back" });
export const monthly = (goalId: string, from: string, count: number, each: number, extra: Partial<GoalContribution> = {}) =>
  Array.from({ length: count }, (_, i) => set(goalId, each, new Date(Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1 + i, 5)).toISOString().slice(0, 10), extra));

/** The sample the design boards use (design/goals/generator/lib.mjs): a car with sub-goals, an iPad, a fixed-date fridge, a trip, a course, a paused camera, a bought pair of headphones. */
export const sample = (): GoalsData => {
  const { goals, contributions } = demoGoalsData(TODAY);
  return { goals, contributions };
};
