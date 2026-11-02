import { z } from "zod";
import { GOAL_STATUSES } from "../sheets/types";

/**
 * What a Goals toast's Undo takes back, as the token the browser holds. It comes from the browser, so it's read strictly and the writes it asks
 * for still go through the entity's schemas. A delete carries what was removed, so it can be put back.
 */
const scalar = z.union([z.string(), z.number()]);
/** The fields an edit sets, and so the only ones its Undo may put back (never a goal's status or parent). */
export const EDITABLE_GOAL_FIELDS = ["name", "category", "necessity", "scale", "amount", "startDate", "targetDate", "dateType", "plannedMonthly", "color", "link", "notes"] as const;
const goalUndoSchema = z.discriminatedUnion("undo", [
  z.object({ undo: z.literal("add"), goalId: z.string().min(1) }),
  z.object({ undo: z.literal("entry"), entryId: z.string().min(1), moved: z.array(z.string().min(1)).max(40).optional() }),
  z.object({ undo: z.literal("status"), changes: z.array(z.object({ id: z.string().min(1), was: z.enum(GOAL_STATUSES) })).min(1).max(20) }),
  z.object({ undo: z.literal("edit"), goalId: z.string().min(1), previous: z.partialRecord(z.enum(EDITABLE_GOAL_FIELDS), scalar) }),
  z.object({ undo: z.literal("delete"), goals: z.array(z.record(z.string(), z.unknown())).min(1).max(40), contributions: z.array(z.record(z.string(), z.unknown())).max(500) }),
]);

export type GoalUndo = z.infer<typeof goalUndoSchema>;

export const goalUndoToken = (undo: GoalUndo): string => JSON.stringify(undo);

export function parseGoalUndo(token: string): GoalUndo | null {
  try {
    const parsed = goalUndoSchema.safeParse(JSON.parse(token));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
