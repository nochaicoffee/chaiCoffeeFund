import { GOAL_CATEGORIES, GOAL_COLORS, GOAL_CONTRIBUTION_KINDS, GOAL_DATE_TYPES, GOAL_NECESSITIES, GOAL_SCALES, type Goal, type GoalCategory, type GoalColor, type GoalContribution, type GoalDateType, type GoalNecessity, type GoalScale } from "../sheets/types";
import { FieldReader, readPaidFrom, type FormFields, type FormResult } from "./fields";

/**
 * The Goals forms (#243), as designed in design/goals/ (GoalsForms, GoalsForms2): Add and Edit goal and sub-goal, Set aside and Take back, and
 * Mark bought. Each one's fields read into the input its write expects (lib/goals/goalWrites.ts), or plain-word errors by field. The wording
 * here is the source of truth for the forms' messages. Where a goal was paid from is one value, "account:<id>" or "card:<id>", as on the other forms.
 */

type Known = { accountIds: string[]; cardIds: string[] };

/** A goal as the Add and Edit forms send it: everything but its id and status. */
export type GoalFormInput = Omit<Goal, "id" | "status" | "doneOn" | "actualCost" | "paidFromAccountId" | "paidFromCardId">;

/** Add goal, Add sub-goal (it carries a `parentId`), or Edit goal. */
export function readGoalForm(fields: FormFields, parentIds: readonly string[]): FormResult<GoalFormInput> {
  const f = new FieldReader(fields);
  const name = f.text("name", "Name the goal");
  const category = f.choice<GoalCategory>("category", GOAL_CATEGORIES, "Choose a category");
  const necessity = f.choice<GoalNecessity>("necessity", GOAL_NECESSITIES, "Is it a Need or a Want?");
  const scale = f.choice<GoalScale>("scale", GOAL_SCALES, "Is it a Minor or a Major goal?");
  const amount = f.amount("amount", { required: "Enter what it costs, like 85,000", label: "amount" });
  if (amount !== undefined && amount <= 0) f.fail("amount", "Enter an amount above ₹0");
  const targetDate = f.date("targetDate");
  const dateTypeText = f.raw("dateType").trim();
  const dateType = dateTypeText === "" ? undefined : f.choice<GoalDateType>("dateType", GOAL_DATE_TYPES, "Choose Fixed or Flexible");
  if (dateType === "Fixed" && !targetDate) f.fail("targetDate", "A Fixed date needs a date");
  const startDate = f.date("startDate", "Enter when saving began");
  const plannedMonthly = f.amount("plannedMonthly", { label: "planned amount" });
  const colorText = f.raw("color").trim();
  const color = colorText === "" ? undefined : f.choice<GoalColor>("color", GOAL_COLORS, "Choose a colour from the list");
  const link = f.text("link");
  if (link !== undefined && !/^https?:\/\/\S+$/.test(link)) f.fail("link", "Enter a link that starts with http:// or https://");
  const parentId = f.text("parentId");
  if (parentId !== undefined && !parentIds.includes(parentId)) f.fail("parentId", "Choose the goal this is a part of");
  if (!f.ok || !name || !category || !necessity || !scale || amount === undefined || !startDate) return { ok: false, errors: f.errors };
  const optional = { parentId, targetDate, dateType: targetDate ? (dateType ?? "Flexible") : undefined, plannedMonthly: plannedMonthly || undefined, color, link, notes: f.text("notes") };
  return f.result({ name, category, necessity, scale, amount, startDate, ...Object.fromEntries(Object.entries(optional).filter(([, value]) => value !== undefined)) } as GoalFormInput);
}

/** Edit goal's patch: a blank optional box clears it ("" is how an update clears a field). The goal's parent isn't changed from the form. */
export function goalEditPatch(input: GoalFormInput): Partial<Omit<Goal, "id">> {
  return {
    name: input.name,
    category: input.category,
    necessity: input.necessity,
    scale: input.scale,
    amount: input.amount,
    startDate: input.startDate,
    targetDate: input.targetDate ?? "",
    dateType: input.dateType ?? ("" as unknown as undefined),
    plannedMonthly: input.plannedMonthly ?? ("" as unknown as undefined),
    color: input.color ?? ("" as unknown as undefined),
    link: input.link ?? "",
    notes: input.notes ?? "",
  };
}

/** What Set aside and Take back send. */
export type EntryFormInput = Omit<GoalContribution, "id">;

/** Set aside or Take back (`kind` comes with the form). A take-back's ceiling is the write's to check: it needs what's saved. */
export function readEntryForm(fields: FormFields, known: { goalIds: readonly string[]; accountIds: readonly string[] }): FormResult<EntryFormInput> {
  const f = new FieldReader(fields);
  const goalId = f.choice("goalId", known.goalIds, "Choose the goal");
  const kind = f.choice("kind", GOAL_CONTRIBUTION_KINDS, "Choose whether to set aside or take back");
  const amount = f.amount("amount", { required: "Enter an amount, like 15,000", label: "amount" });
  if (amount !== undefined && amount <= 0) f.fail("amount", "Enter an amount above ₹0");
  const date = f.date("date", "Enter the day");
  const accountText = f.raw("accountId").trim();
  const accountId = accountText === "" ? undefined : f.choice("accountId", known.accountIds, "Choose an account from the list");
  const note = f.text("note");
  if (!f.ok || !goalId || !kind || amount === undefined || !date) return { ok: false, errors: f.errors };
  return f.result({ goalId, kind, amount, date, ...(accountId !== undefined && { accountId }), ...(note !== undefined && { note }) });
}

export interface BoughtFormInput {
  goalId: string;
  doneOn: string;
  actualCost: number;
  paidFromAccountId?: string;
  paidFromCardId?: string;
}

/** Mark bought: what it really cost, the day, and where it was paid from. */
export function readBoughtForm(fields: FormFields, known: Known & { goalIds: readonly string[] }): FormResult<BoughtFormInput> {
  const f = new FieldReader(fields);
  const goalId = f.choice("goalId", known.goalIds, "Choose the goal");
  const actualCost = f.amount("actualCost", { required: "Enter what it cost", label: "cost" });
  const doneOn = f.date("doneOn", "Enter the day you bought it");
  const paid = readPaidFrom(f, "paidFrom", known);
  if (!f.ok || !goalId || actualCost === undefined || !doneOn) return { ok: false, errors: f.errors };
  return f.result({ goalId, doneOn, actualCost, ...paid });
}
