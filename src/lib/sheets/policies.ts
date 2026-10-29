import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearable, isoDate, nonEmptyString, nonNegativeNumber, onePaidFrom } from "./validation";
import { POLICY_COLORS, POLICY_KINDS, POLICY_STATUSES, type Policy } from "./types";

/** A policy's fields. The repository reads column types from a plain object, so the rules across fields are added below. */
const policyFields = z.object({
  name: nonEmptyString,
  kind: z.enum(POLICY_KINDS),
  insurer: nonEmptyString,
  policyNumber: nonEmptyString.optional(),
  covers: nonEmptyString,
  coversDetail: nonEmptyString.optional(),
  sumInsured: nonNegativeNumber,
  status: z.enum(POLICY_STATUSES),
  endedOn: isoDate.optional(),
  color: z.enum(POLICY_COLORS).optional(),
  paidFromAccountId: nonEmptyString.optional(),
  paidFromCardId: nonEmptyString.optional(),
  addOns: nonEmptyString.optional(),
  claimsPhone: nonEmptyString.optional(),
  documentUrl: nonEmptyString.optional(),
  notes: nonEmptyString.optional(),
});

type PolicyRow = Omit<Policy, "id">;

/**
 * The rules across fields, one list used both ways: `refine` for a create or row schema (every broken
 * rule, each at its field), and `checkPolicy` for the repository, which runs on the whole row after an
 * update is merged over the stored one. An optional field is "" in a merged row, so set-ness is read by
 * truthiness, never `!== undefined`.
 */
const policyRules: { path: keyof PolicyRow; message: string; broken: (row: PolicyRow) => boolean }[] = [
  { path: "paidFromCardId", message: "Pay it from a card or a bank account, not both", broken: (row) => Boolean(row.paidFromAccountId && row.paidFromCardId) },
  { path: "endedOn", message: "An active policy hasn't ended: clear the date, or cancel it", broken: (row) => row.status === "Active" && Boolean(row.endedOn) },
  // Only a motor policy can have no cover figure (third party only has no IDV).
  { path: "sumInsured", message: "Enter the cover: only a motor policy can have none", broken: (row) => row.kind !== "Motor" && row.sumInsured === 0 },
  { path: "documentUrl", message: "The document link must start with http:// or https://", broken: (row) => Boolean(row.documentUrl) && !/^https?:\/\/\S+$/.test(row.documentUrl as string) },
];

/** The same rules on a whole row. */
export const checkPolicy = (row: PolicyRow): string | null => policyRules.find((rule) => rule.broken(row))?.message ?? null;

function refinePolicy(row: PolicyRow, ctx: z.RefinementCtx) {
  for (const rule of policyRules) if (rule.broken(row)) ctx.addIssue({ code: "custom", path: [rule.path], message: rule.message });
}

export const createPolicySchema = policyFields.superRefine(refinePolicy);

/**
 * A partial update, merged over the stored row. "" clears an optional field: the cancelled-on
 * date when a policy restarts, or where it's paid from. Setting a card or an account clears the other.
 */
export const updatePolicySchema = policyFields
  .partial()
  .extend({
    policyNumber: clearable(nonEmptyString).optional(),
    coversDetail: clearable(nonEmptyString).optional(),
    endedOn: clearable(isoDate).optional(),
    paidFromAccountId: clearable(nonEmptyString).optional(),
    paidFromCardId: clearable(nonEmptyString).optional(),
    addOns: clearable(nonEmptyString).optional(),
    claimsPhone: clearable(nonEmptyString).optional(),
    documentUrl: clearable(nonEmptyString).optional(),
    notes: clearable(nonEmptyString).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.paidFromAccountId && value.paidFromCardId) ctx.addIssue({ code: "custom", path: ["paidFromCardId"], message: "Pay it from a card or a bank account, not both" });
  })
  .transform(onePaidFrom)
  // Restarting a policy means it hasn't ended: setting it Active clears the cancelled-on date.
  .transform((value) => (value.status === "Active" && value.endedOn === undefined ? { ...value, endedOn: "" } : value));

/** A row as read back from the Sheet: a valid create, plus its id. */
export const policyRowSchema = policyFields.extend({ id: nonEmptyString }).superRefine(refinePolicy);

/** The Policies tab's columns, in order. */
export const POLICY_COLUMNS: (keyof Policy)[] = [
  "id",
  "name",
  "kind",
  "insurer",
  "policyNumber",
  "covers",
  "coversDetail",
  "sumInsured",
  "status",
  "endedOn",
  "color",
  "paidFromAccountId",
  "paidFromCardId",
  "addOns",
  "claimsPhone",
  "documentUrl",
  "notes",
];

export const policiesRepository = createRepository<Policy>({
  sheetName: "Policies",
  columns: POLICY_COLUMNS,
  dateColumns: ["endedOn"],
  schema: policyRowSchema,
  check: checkPolicy,
});
