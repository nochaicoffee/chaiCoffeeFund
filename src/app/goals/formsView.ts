import { dueOf, kidsOf, leftOf, savedOf, savedOwn, targetOf, topGoals } from "@/lib/aggregate/goals";
import type { ColorKey } from "@/lib/format/colors";
import { goalColorKey } from "@/lib/format/goalLabels";
import type { Goal, GoalCategory, GoalColor, GoalNecessity, GoalScale, GoalStatus } from "@/lib/sheets/types";
import type { GoalsPageData } from "./views";

/**
 * What the Goals forms start from (docs/design/goals.md, GoalsForms and GoalsForms2), as plain data for the client: each goal as a form needs it, and
 * the accounts and cards a set-aside or a purchase can name. Built from the same data as the page, so the forms and the page agree on what a goal is.
 */
export interface FormGoal {
  id: string;
  name: string;
  /** The top-level goal this is part of, or null for one that stands alone. */
  parentId: string | null;
  parentName: string | null;
  status: GoalStatus;
  category: GoalCategory;
  necessity: GoalNecessity;
  scale: GoalScale;
  colorKey: ColorKey;
  color: GoalColor | null;
  /** Its own part and what's set aside in it alone. */
  amount: number;
  saved: number;
  /** Its total (own part and live sub-goals), and what's saved and still to go across them. */
  target: number;
  totalSaved: number;
  left: number;
  targetDate: string | null;
  dueDate: string | null;
  dateType: "Fixed" | "Flexible";
  startDate: string;
  plannedMonthly: number | null;
  link: string | null;
  notes: string | null;
  /** Whether it has sub-goals, and whether any is still open (a goal can't be bought while one is). */
  hasKids: boolean;
  openKids: number;
}

export interface GoalsFormsData {
  today: string;
  /** Sample data: every form is disabled, because nothing may reach the Sheet. */
  demo: boolean;
  goals: FormGoal[];
  accounts: { id: string; name: string }[];
  cards: { id: string; name: string; color: ColorKey }[];
}

export function goalsFormsData(data: GoalsPageData, today: string, demo: boolean): GoalsFormsData {
  const tops = topGoals(data);
  const formGoal = (goal: Goal): FormGoal => {
    const parent = goal.parentId ? data.goals.find((g) => g.id === goal.parentId) : undefined;
    const kids = kidsOf(data, goal.id);
    return {
      id: goal.id,
      name: goal.name,
      parentId: goal.parentId ?? null,
      parentName: parent?.name ?? null,
      status: goal.status,
      category: goal.category,
      necessity: goal.necessity,
      scale: goal.scale,
      colorKey: goal.color ? goalColorKey(goal) : goalColorKey(parent ?? goal),
      color: goal.color ?? null,
      amount: goal.amount,
      saved: savedOwn(data, goal.id),
      target: targetOf(data, goal),
      totalSaved: savedOf(data, goal),
      left: leftOf(data, goal),
      targetDate: goal.targetDate ?? null,
      dueDate: dueOf(data, goal),
      dateType: goal.dateType ?? "Flexible",
      startDate: goal.startDate,
      plannedMonthly: goal.plannedMonthly ?? null,
      link: goal.link ?? null,
      notes: goal.notes ?? null,
      hasKids: kids.length > 0,
      openKids: kids.filter((k) => k.status === "Active" || k.status === "Paused").length,
    };
  };
  return { today, demo, goals: [...tops.flatMap((t) => [t, ...data.goals.filter((g) => g.parentId === t.id)])].map(formGoal), accounts: data.accounts, cards: data.cards };
}
