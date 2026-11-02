import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearable, clearableToUnset, isoDate, nonEmptyString, nonNegativeNumber, onePaidFrom, rowRules } from "./validation";
import { GOAL_CATEGORIES, GOAL_COLORS, GOAL_DATE_TYPES, GOAL_NECESSITIES, GOAL_SCALES, GOAL_STATUSES, type Goal } from "./types";

/** A goal's fields. The repository reads column types from a plain object, so the rules across fields are added below. */
const goalFields = z.object({
  name: nonEmptyString,
  parentId: nonEmptyString.optional(),
  category: z.enum(GOAL_CATEGORIES),
  necessity: z.enum(GOAL_NECESSITIES),
  scale: z.enum(GOAL_SCALES),
  amount: nonNegativeNumber,
  targetDate: isoDate.optional(),
  dateType: z.enum(GOAL_DATE_TYPES).optional(),
  startDate: isoDate,
  plannedMonthly: nonNegativeNumber.optional(),
  status: z.enum(GOAL_STATUSES),
  doneOn: isoDate.optional(),
  actualCost: nonNegativeNumber.optional(),
  paidFromAccountId: nonEmptyString.optional(),
  paidFromCardId: nonEmptyString.optional(),
  color: z.enum(GOAL_COLORS).optional(),
  link: nonEmptyString.optional(),
  notes: nonEmptyString.optional(),
});

type GoalRow = Omit<Goal, "id">;

/**
 * The rules across fields, one list used both ways: `refine` for a create or row schema (every broken rule,
 * each at its field), and `checkGoal` for the repository, which runs on the whole row after an update is merged
 * over the stored one. An optional text or date is "" in a merged row, so set-ness is read by truthiness. The rules
 * that need other rows (the parent exists and is top-level, a take-back can't exceed what's saved, a parent isn't
 * bought while a sub-goal is open) live in lib/goals/goalWrites.ts.
 */
const rules = rowRules<GoalRow>([
  { path: "paidFromCardId", message: "Pay it from a card or a bank account, not both", broken: (row) => Boolean(row.paidFromAccountId && row.paidFromCardId) },
  { path: "targetDate", message: "A Fixed date needs a date", broken: (row) => row.dateType === "Fixed" && !row.targetDate },
  { path: "doneOn", message: "A bought goal needs the day it was bought", broken: (row) => row.status === "Done" && !row.doneOn },
  { path: "doneOn", message: "A goal that hasn't been bought has no bought-on day: clear it, or mark it bought", broken: (row) => row.status !== "Done" && Boolean(row.doneOn) },
  { path: "actualCost", message: "A goal that hasn't been bought has no cost yet", broken: (row) => row.status !== "Done" && row.actualCost !== undefined },
  { path: "link", message: "The link must start with http:// or https://", broken: (row) => Boolean(row.link) && !/^https?:\/\/\S+$/.test(row.link as string) },
]);

/** The same rules on a whole row. */
export const checkGoal = rules.check;

export const createGoalSchema = goalFields.superRefine(rules.refine);

/** A partial update, merged over the stored row. "" clears an optional field (the date, the plan, where it was paid from, the colour). Setting a card or an account clears the other. */
export const updateGoalSchema = goalFields
  .partial()
  .extend({
    parentId: clearable(nonEmptyString).optional(),
    targetDate: clearable(isoDate).optional(),
    dateType: clearableToUnset(z.enum(GOAL_DATE_TYPES)).optional(),
    plannedMonthly: clearableToUnset(nonNegativeNumber).optional(),
    doneOn: clearable(isoDate).optional(),
    actualCost: clearableToUnset(nonNegativeNumber).optional(),
    paidFromAccountId: clearable(nonEmptyString).optional(),
    paidFromCardId: clearable(nonEmptyString).optional(),
    color: clearableToUnset(z.enum(GOAL_COLORS)).optional(),
    link: clearable(nonEmptyString).optional(),
    notes: clearable(nonEmptyString).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.paidFromAccountId && value.paidFromCardId) ctx.addIssue({ code: "custom", path: ["paidFromCardId"], message: "Pay it from a card or a bank account, not both" });
  })
  .transform(onePaidFrom);

/** A row as read back from the Sheet: a valid create, plus its id. */
export const goalRowSchema = goalFields.extend({ id: nonEmptyString }).superRefine(rules.refine);

/** The Goals tab's columns, in order. */
export const GOAL_COLUMNS: (keyof Goal)[] = [
  "id",
  "name",
  "parentId",
  "category",
  "necessity",
  "scale",
  "amount",
  "targetDate",
  "dateType",
  "startDate",
  "plannedMonthly",
  "status",
  "doneOn",
  "actualCost",
  "paidFromAccountId",
  "paidFromCardId",
  "color",
  "link",
  "notes",
];

export const goalsRepository = createRepository<Goal>({
  sheetName: "Goals",
  columns: GOAL_COLUMNS,
  dateColumns: ["targetDate", "startDate", "doneOn"],
  schema: goalRowSchema,
  check: checkGoal,
});
