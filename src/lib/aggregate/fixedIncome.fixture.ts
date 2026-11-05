import type { FixedDeposit } from "../sheets/types";

/** His seven deposits as his FD app shows them (7.75%, interest added, no bank and no maturity amount). Plain numbers, as in epf.fixture.ts. */
const ROWS: Array<[string, string, string, number]> = [
  ["2026-03-13", "2027-09-14", "13 Mar", 15000],
  ["2026-04-01", "2027-10-02", "1 Apr", 15000],
  ["2026-05-02", "2027-11-03", "2 May", 15000],
  ["2026-07-01", "2028-01-02", "1 Jul", 15000],
  ["2026-08-26", "2028-08-26", "26 Aug", 30000],
  ["2026-10-05", "2028-10-05", "5 Oct", 15000],
  ["2026-11-01", "2028-05-02", "1 Nov", 15000],
];

export const HIS_DEPOSITS: FixedDeposit[] = ROWS.map(([startDate, maturityDate, label, principalAmount], i) => ({
  id: `fd-${i + 1}`,
  name: `₹${principalAmount.toLocaleString("en-IN")} FD · ${label}`,
  principalAmount,
  interestRate: 7.75,
  compoundingType: "Cumulative",
  startDate,
  maturityDate,
  status: "Active",
}));
