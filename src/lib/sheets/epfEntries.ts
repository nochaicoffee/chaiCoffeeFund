import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearable, isoDate, nonEmptyString, nonNegativeNumber, rowRules } from "./validation";
import { EPF_ENTRY_KINDS, EPF_ENTRY_SOURCES, type EpfEntry } from "./types";

/** A wage month, "2026-09". */
const wageMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Enter the wage month as YYYY-MM");

/**
 * One credit (a Contribution), a year's Interest, or an Opening balance (ADR 0011). The balance is worked out from these and never
 * stored. Amounts are in rupees, for each share (employee, employer, pension).
 */
const epfEntryFields = z.object({
  epfAccountId: nonEmptyString,
  kind: z.enum(EPF_ENTRY_KINDS),
  date: isoDate,
  wageMonth: wageMonth.optional(),
  employee: nonNegativeNumber,
  employer: nonNegativeNumber,
  pension: nonNegativeNumber,
  source: z.enum(EPF_ENTRY_SOURCES),
});

type EntryRow = Omit<EpfEntry, "id">;

const entryRules = rowRules<EntryRow>([
  { path: "wageMonth", message: "A credit needs the wage month it is for", broken: (row) => row.kind === "Contribution" && !row.wageMonth },
  { path: "wageMonth", message: "Only a credit has a wage month", broken: (row) => row.kind !== "Contribution" && Boolean(row.wageMonth) },
  // ISO dates and months sort as text, so this is a date comparison: a credit can't arrive before its wage month began.
  { path: "date", message: "A credit can't arrive before its wage month", broken: (row) => row.kind === "Contribution" && Boolean(row.wageMonth) && row.date < `${row.wageMonth}-01` },
  // The year's interest is credited on 31 March, which is also what the interest rule assumes.
  { path: "date", message: "A year's interest is credited on 31 March", broken: (row) => row.kind === "Interest" && !row.date.endsWith("-03-31") },
  { path: "employee", message: "Enter an amount: a credit of nothing records nothing", broken: (row) => row.kind !== "Opening" && row.employee + row.employer + row.pension === 0 },
]);

/** The same rules on a whole row, which the repository runs on each new row and on the row after an update is merged over the stored one. */
export const checkEpfEntry = entryRules.check;

/**
 * What a form or the API may write. A row is always `Typed` here: `Passbook` means "read from an EPFO passbook", which only the import
 * (through the repository) may say, so a typed number can't pass itself off as confirmed. The source can't be changed by an update either.
 */
export const createEpfEntrySchema = epfEntryFields.extend({ source: z.literal("Typed").default("Typed") }).superRefine(entryRules.refine);

/** A partial update, merged over the stored row. "" clears the wage month. */
export const updateEpfEntrySchema = epfEntryFields.omit({ source: true }).partial().extend({ wageMonth: clearable(wageMonth).optional() });

/** A row as read back from the Sheet: a valid create, plus its id. */
export const epfEntryRowSchema = epfEntryFields.extend({ id: nonEmptyString }).superRefine(entryRules.refine);

/** The EpfEntries tab's columns, in order. */
export const EPF_ENTRY_COLUMNS: (keyof EpfEntry)[] = ["id", "epfAccountId", "kind", "date", "wageMonth", "employee", "employer", "pension", "source"];

export const epfEntriesRepository = createRepository<EpfEntry>({
  sheetName: "EpfEntries",
  columns: EPF_ENTRY_COLUMNS,
  dateColumns: ["date"],
  schema: epfEntryRowSchema,
  check: checkEpfEntry,
});
