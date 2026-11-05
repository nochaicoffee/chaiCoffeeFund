import type { EpfEntry } from "../sheets/types";

/**
 * His EPFO passbooks (FY 2023-24 to FY 2026-27) as plain numbers: one row for each credit (wage month, the day it was
 * credited, the employee share; the employer's is the same every month and his pension share is 0). Never the PDFs: a
 * real passbook carries the UAN and date of birth.
 */
const CREDITS: Array<[string, string, number]> = [
  ["2024-01", "2024-02-01", 8482], ["2024-02", "2024-03-01", 11952],
  ["2024-03", "2024-04-01", 11952], ["2024-04", "2024-05-01", 11952], ["2024-05", "2024-06-01", 11952], ["2024-06", "2024-07-01", 11952],
  ["2024-07", "2024-08-01", 12456], ["2024-08", "2024-09-01", 12456], ["2024-09", "2024-10-01", 12456], ["2024-10", "2024-11-01", 12456],
  ["2024-11", "2024-12-01", 12456], ["2024-12", "2025-01-01", 12456], ["2025-01", "2025-02-01", 12456], ["2025-02", "2025-03-01", 12456],
  ["2025-03", "2025-04-01", 12456], ["2025-04", "2025-05-01", 12456], ["2025-05", "2025-06-01", 12456], ["2025-06", "2025-07-01", 12456],
  ["2025-07", "2025-08-01", 14323], ["2025-08", "2025-09-01", 14323], ["2025-09", "2025-10-01", 14323], ["2025-10", "2025-11-01", 14323],
  ["2025-11", "2025-12-01", 14323], ["2025-12", "2026-01-01", 14323], ["2026-01", "2026-02-01", 14323], ["2026-02", "2026-03-01", 14323],
  ["2026-03", "2026-04-01", 14323], ["2026-04", "2026-05-01", 14323], ["2026-05", "2026-06-01", 14323], ["2026-06", "2026-07-26", 14323],
  ["2026-07", "2026-08-18", 19654], ["2026-08", "2026-09-17", 19654], ["2026-09", "2026-10-18", 19654],
];
/** The interest EPFO credited to each share on 31 March. */
const INTEREST: Array<[string, number]> = [["2024-03-31", 58], ["2025-03-31", 7211], ["2026-03-31", 20462]];

export const ACCOUNT_ID = "epf-1";
export const credit = (id: string, wageMonth: string, date: string, each: number, source: EpfEntry["source"] = "Passbook"): EpfEntry => ({
  id, epfAccountId: ACCOUNT_ID, kind: "Contribution", date, wageMonth, employee: each, employer: each, pension: 0, source,
});
export const interestEntry = (id: string, date: string, each: number): EpfEntry => ({
  id, epfAccountId: ACCOUNT_ID, kind: "Interest", date, employee: each, employer: each, pension: 0, source: "Passbook",
});

/** Every credit and every year's interest in his four passbooks. */
export const HIS_ENTRIES: EpfEntry[] = [
  ...CREDITS.map(([wage, date, each], i) => credit(`c${i}`, wage, date, each)),
  ...INTEREST.map(([date, each], i) => interestEntry(`i${i}`, date, each)),
];
