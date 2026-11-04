import { GOAL_CATEGORIES, GOAL_COLORS, GOAL_CONTRIBUTION_KINDS, GOAL_DATE_TYPES, GOAL_NECESSITIES, GOAL_SCALES, type Goal, type GoalCategory, type GoalColor, type GoalContribution, type GoalDateType, type GoalNecessity, type GoalScale } from "../sheets/types";
import { formatInr } from "../format/money";
import { FieldReader, readPaidFrom, type FormFields, type FormResult } from "./fields";

/**
 * The Goals forms (#243), as designed in design/goals/ (GoalsForms, GoalsForms2): Add and Edit goal and sub-goal, Set aside and Take back, and
 * Mark bought. Each one's fields read into the input its write expects (lib/goals/goalWrites.ts), or plain-word errors by field. The wording
 * here is the source of truth for the forms' messages. Where a goal was paid from is one value, "account:<id>" or "card:<id>", as on the other forms.
 */

type Known = { accountIds: string[]; cardIds: string[] };

/** A goal as the Add and Edit forms send it: everything but its id and status. */
export type GoalFormInput = Omit<Goal, "id" | "status" | "doneOn" | "actualCost" | "paidFromAccountId" | "paidFromCardId"> & {
  /** Its parts, from the form's Parts section: an empty list for a goal with none. */
  parts: PartFormInput[];
};

/** One row of the Parts section: a piece of the goal with its own cost and date, and what the goal's pot has given it. */
export interface PartFormInput {
  /** Set for a part that already exists. */
  id?: string;
  name: string;
  amount: number;
  necessity: GoalNecessity;
  targetDate?: string;
  given: number;
}

/**
 * The Parts section's rows. The form sends them as one JSON field (`parts`) of text boxes as typed, each read the way a form field is, so a
 * row's errors read like the rest of the form's. Null with the first plain-words problem, or the rows.
 */
export function readPartsField(raw: string): { parts: PartFormInput[]; error: null } | { parts: null; error: string } {
  let rows: unknown;
  try {
    rows = raw.trim() === "" ? [] : JSON.parse(raw);
  } catch {
    return { parts: null, error: "The parts couldn't be read: close this and open it again" };
  }
  if (!Array.isArray(rows) || rows.length > 30) return { parts: null, error: rows instanceof Array ? "A goal can have up to 30 parts" : "The parts couldn't be read: close this and open it again" };
  const parts: PartFormInput[] = [];
  for (const [index, row] of rows.entries()) {
    const f = new FieldReader(typeof row === "object" && row !== null ? (row as FormFields) : {});
    const label = f.raw("name").trim() || `Part ${index + 1}`;
    const name = f.text("name", `Name part ${index + 1}, or remove it`);
    const amount = f.amount("amount", { required: `Enter what ${label} costs`, label: "cost" });
    if (amount !== undefined && amount <= 0) f.fail("amount", `Enter a cost above ₹0 for ${label}`);
    const necessity = f.choice<GoalNecessity>("necessity", GOAL_NECESSITIES, `Is ${label} a Need or a Want?`);
    const targetDate = f.date("targetDate");
    const given = f.raw("given").trim() === "" ? 0 : f.amount("given", { label: "share" });
    if (amount !== undefined && given !== undefined && given > amount) f.fail("given", `${label} costs ${formatInr(amount)}, so it can't be given more`);
    const id = f.text("id");
    if (!f.ok || !name || amount === undefined || !necessity || given === undefined) return { parts: null, error: Object.values(f.errors)[0] as string };
    parts.push({ ...(id && { id }), name, amount, necessity, ...(targetDate && { targetDate }), given });
  }
  return { parts, error: null };
}

/** Add goal, Add sub-goal (it carries a `parentId`), or Edit goal. */
export function readGoalForm(fields: FormFields, parentIds: readonly string[], opts: { allowZeroAmount?: boolean } = {}): FormResult<GoalFormInput> {
  const f = new FieldReader(fields);
  const name = f.text("name", "Name the goal");
  const category = f.choice<GoalCategory>("category", GOAL_CATEGORIES, "Choose a category");
  const necessity = f.choice<GoalNecessity>("necessity", GOAL_NECESSITIES, "Is it a Need or a Want?");
  const scale = f.choice<GoalScale>("scale", GOAL_SCALES, "Is it a Minor or a Major goal?");
  const partsRead = readPartsField(f.raw("parts"));
  if (partsRead.error !== null) f.fail("parts", partsRead.error);
  const parts = partsRead.parts ?? [];
  const amount = f.amount("amount", { required: "Enter what it costs, like 85,000", label: "amount" });
  // A goal with parts can stand at ₹0: its parts hold the cost (the write checks that).
  if (amount !== undefined && (opts.allowZeroAmount || parts.length > 0 ? amount < 0 : amount <= 0)) f.fail("amount", "Enter an amount above ₹0");
  const targetDate = f.date("targetDate");
  const dateTypeText = f.raw("dateType").trim();
  const dateType = dateTypeText === "" ? undefined : f.choice<GoalDateType>("dateType", GOAL_DATE_TYPES, "Choose Fixed or Flexible");
  if (dateType === "Fixed" && !targetDate) f.fail("targetDate", "A Fixed date needs a date");
  const startDate = f.date("startDate", "Enter when saving began");
  if (startDate && targetDate && startDate > targetDate) f.fail("startDate", "Saving can't begin after the date it's for");
  const plannedMonthly = f.amount("plannedMonthly", { label: "planned amount" });
  const colorText = f.raw("color").trim();
  const color = colorText === "" ? undefined : f.choice<GoalColor>("color", GOAL_COLORS, "Choose a colour from the list");
  const link = f.text("link");
  if (link !== undefined && !/^https?:\/\/\S+$/.test(link)) f.fail("link", "Enter a link that starts with http:// or https://");
  const parentId = f.text("parentId");
  if (parentId !== undefined && !parentIds.includes(parentId)) f.fail("parentId", "Choose the goal this is a part of");
  if (!f.ok || !name || !category || !necessity || !scale || amount === undefined || !startDate) return { ok: false, errors: f.errors };
  const optional = { parentId, targetDate, dateType: targetDate ? (dateType ?? "Flexible") : undefined, plannedMonthly: plannedMonthly || undefined, color, link, notes: f.text("notes") };
  return f.result({ name, category, necessity, scale, amount, startDate, parts, ...Object.fromEntries(Object.entries(optional).filter(([, value]) => value !== undefined)) } as GoalFormInput);
}

/** Edit goal's patch: a blank optional box clears it ("" is how an update clears a field). The goal's parent isn't changed from the form. */
export function goalEditPatch(input: Omit<GoalFormInput, "parts">): Partial<Omit<Goal, "id">> {
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
  /** For a part: how much of the cost came out of its goal's money. */
  fromGoal?: number;
}

/** Mark bought: what it really cost, the day, where it was paid from and, for a part, how much of it came out of its goal's money. */
export function readBoughtForm(fields: FormFields, known: Known & { goalIds: readonly string[] }): FormResult<BoughtFormInput> {
  const f = new FieldReader(fields);
  const goalId = f.choice("goalId", known.goalIds, "Choose the goal");
  const actualCost = f.amount("actualCost", { required: "Enter what it cost", label: "cost" });
  const doneOn = f.date("doneOn", "Enter the day you bought it");
  const paid = readPaidFrom(f, "paidFrom", known);
  const fromGoal = f.raw("fromGoal").trim() === "" ? undefined : f.amount("fromGoal", { label: "amount" });
  if (fromGoal !== undefined && actualCost !== undefined && fromGoal > actualCost) f.fail("fromGoal", "That's more than it cost");
  if (!f.ok || !goalId || actualCost === undefined || !doneOn) return { ok: false, errors: f.errors };
  return f.result({ goalId, doneOn, actualCost, ...paid, ...(fromGoal !== undefined && { fromGoal }) });
}
