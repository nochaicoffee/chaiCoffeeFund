import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearable, isoDate, nonEmptyString, positiveNumber } from "./validation";
import { GOAL_CONTRIBUTION_KINDS, type GoalContribution } from "./types";

const contributionFields = z.object({
  goalId: nonEmptyString,
  date: isoDate,
  amount: positiveNumber,
  kind: z.enum(GOAL_CONTRIBUTION_KINDS),
  accountId: nonEmptyString.optional(),
  note: nonEmptyString.optional(),
});

/** What was set aside or taken back, against which goal. Whether a take-back exceeds what's saved needs the other rows, so it's checked in lib/goals/goalWrites.ts. */
export const createGoalContributionSchema = contributionFields;

/** A partial update, merged over the stored row. "" clears the account or the note. */
export const updateGoalContributionSchema = contributionFields.partial().extend({
  accountId: clearable(nonEmptyString).optional(),
  note: clearable(nonEmptyString).optional(),
});

/** A row as read back from the Sheet: a valid create, plus its id. */
export const goalContributionRowSchema = contributionFields.extend({ id: nonEmptyString });

/** The GoalContributions tab's columns, in order. */
export const GOAL_CONTRIBUTION_COLUMNS: (keyof GoalContribution)[] = ["id", "goalId", "date", "amount", "kind", "accountId", "note"];

export const goalContributionsRepository = createRepository<GoalContribution>({
  sheetName: "GoalContributions",
  columns: GOAL_CONTRIBUTION_COLUMNS,
  dateColumns: ["date"],
  schema: goalContributionRowSchema,
});
