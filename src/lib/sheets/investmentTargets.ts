import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { nonEmptyString, rowRules } from "./validation";
import { INVESTMENT_TARGET_KINDS, INVESTMENT_TARGET_NAMES, LIMIT_NAMES, TARGET_NAMES, type InvestmentTarget } from "./types";

/**
 * A target or a limit he sets on what he holds: one row per name (docs/design/investments.md). The Sheet's `name` dropdown holds all eight
 * names; the rule below keeps a Target to the four buckets and a Limit to the four limits. Only ever compared with his holdings, never suggested.
 */
const targetFields = z.object({
  kind: z.enum(INVESTMENT_TARGET_KINDS),
  name: z.enum(INVESTMENT_TARGET_NAMES),
  percent: z.number().min(0, "A share can't be below 0%").max(100, "A share can't be above 100%"),
});

/** One row per kind and name: a second would leave two numbers for the same target. `except` is the row being changed. */
export function targetConflict(all: InvestmentTarget[], row: Pick<InvestmentTarget, "kind" | "name">, except?: string): string | null {
  const same = all.find((t) => t.id !== except && t.kind === row.kind && t.name === row.name);
  return same ? `${row.name} already has its ${row.kind.toLowerCase()} set (${same.percent}%). Change that one instead.` : null;
}

const targetRules = rowRules<Omit<InvestmentTarget, "id">>([
  // A share typed with a percent sign (35%) is stored as 0.35: read as 0.35% it would be a hundredfold error with nothing to say so. 0 stays allowed.
  { path: "percent", message: "Enter the share as a number from 1 to 100 (35 for 35%), not as 35% or 0.35", broken: (row) => row.percent > 0 && row.percent < 1 },
  { path: "name", message: `A target is set on ${TARGET_NAMES.join(", ")}`, broken: (row) => row.kind === "Target" && !(TARGET_NAMES as readonly string[]).includes(row.name) },
  { path: "name", message: `A limit is one of ${LIMIT_NAMES.join(", ")}`, broken: (row) => row.kind === "Limit" && !(LIMIT_NAMES as readonly string[]).includes(row.name) },
]);

export const createInvestmentTargetSchema = targetFields.superRefine(targetRules.refine);

/** A partial update is merged over the stored row and checked whole (the repository's `check`). */
export const updateInvestmentTargetSchema = targetFields.partial();

/** A row as read back from the Sheet: a valid create, plus its id. */
export const investmentTargetRowSchema = targetFields.extend({ id: nonEmptyString }).superRefine(targetRules.refine);

/** The InvestmentTargets tab's columns, in order. The tab is created by `/api/dev/sheet-columns?tab=InvestmentTargets`. */
export const INVESTMENT_TARGET_COLUMNS: (keyof InvestmentTarget)[] = ["id", "kind", "name", "percent"];

export const investmentTargetsRepository = createRepository<InvestmentTarget>({
  sheetName: "InvestmentTargets",
  columns: INVESTMENT_TARGET_COLUMNS,
  schema: investmentTargetRowSchema,
  check: targetRules.check,
});
