import { describe, expect, it } from "vitest";
import { balancesFromStatement, checkStatement } from "../aggregate/statementBalances";
import { parseAccountStatements } from "./index";
import { isCanaraStatement, parseCanara } from "./canara";

/** pdf.js's layout of Canara Bank's ePassbook: invented names and figures. */
const HEADS = "Date   Particulars   Deposits   Withdrawals   Balance";
const front = (opening = "50.00") =>
  `Statement for A/c XXXXXXXXX1234 between 01-Jan-2025 and 13-Nov-2026  Customer Id   XXXXXX01 Name   TEST PERSON Branch Code   100 Product Name   CANARA SB GENERAL IFSC Code   CNRB0000100 ${HEADS} Opening Balance   ${opening} `;
const page1 = [
  // A cheque number of 0, of nothing, and a UPI reference: all three are seen.
  "11-01-2025 REV : SLABWISE NMMB CHARGESDUE DT:01-MAR-23 03-MAR-23 Chq: 0 53.00   103.00",
  "20-01-2025 APY CONTRI FOR(500000000001)01-2025 Chq: 50.00   53.00",
  "08-02-2025 UPI/CR/111111111111/TEST P/HDFC/**ABC- 1@OKHDFCBANK/UPI//HDF1 08/02/2025 14:39:22 Chq: 111111111111 12,000.00   12,053.00",
  "08-02-2025 LOAN INSTALLMENT PAYMENT 100000000001   - TEST PERSON Chq: 0 12,000.00   53.00 page 1",
].join(" ");
const page2 = [
  `${HEADS} 24-03-2026   NEFT CR-ICMS1-LIC OF INDIA DO PUNE 2 PH - Chq: 0 1,43,699.00   1,43,752.00`,
  "04-11-2026 APY CONTRI FOR(500000000001)11-2026 Chq: 50.00   1,43,702.00",
].join(" ");
const text = (opening?: string, closing = "1,43,702.00") => `${front(opening)} ${page1} ${page2} Closing Balance   ${closing} page 2 UNLESS THE CONSTITUENT BRINGS ... CANARA BANK DOES NOT SEEK ANYINFORMATION ... END OF STATEMENT page 3`;

describe("isCanaraStatement", () => {
  it("recognises the ePassbook, and parseAccountStatements reads it as Canara", () => {
    expect(isCanaraStatement(text())).toBe(true);
    expect(isCanaraStatement("UPI/DR/1/CANARA BANK/CNRB/x")).toBe(false);
    const read = parseAccountStatements(text());
    expect(read).toHaveLength(1);
    expect(read![0].ok && read![0].parsed.bank).toBe("Canara");
  });
});

describe("parseCanara", () => {
  const result = parseCanara(text());

  it("reads the period, the account's last 4, and the opening and closing balances", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(result.parsed.accountLast4).toBe("1234");
    expect(result.parsed.statement).toMatchObject({ periodStart: "2025-01-01", periodEnd: "2026-11-13", openingBalance: 50, closingBalance: 143702 });
  });

  it("gives each row its direction from the balance, keeps its narration, and reads across pages", () => {
    if (!result.ok) throw new Error(result.problem);
    const rows = result.parsed.statement.rows;
    expect(rows.map((r) => [r.date, r.amount, r.balance])).toEqual([
      ["2025-01-11", 53, 103],
      ["2025-01-20", -50, 53],
      ["2025-02-08", 12000, 12053],
      ["2025-02-08", -12000, 53],
      ["2026-03-24", 143699, 143752],
      ["2026-11-04", -50, 143702],
    ]);
    expect(rows[4].narration).toBe("NEFT CR-ICMS1-LIC OF INDIA DO PUNE 2 PH -");
    expect(checkStatement(result.parsed.statement)).toEqual({ ok: true });
  });

  it("gives a month-end for every month it covers, the quiet ones carrying the balance on", () => {
    if (!result.ok) throw new Error(result.problem);
    const points = balancesFromStatement(result.parsed.statement).map((p) => [p.date, p.balance]);
    // Jan 2025 to Oct 2026: 22 month-ends between the opening and the closing.
    expect(points).toHaveLength(24);
    expect(points.slice(0, 4)).toEqual([["2024-12-31", 50], ["2025-01-31", 53], ["2025-02-28", 53], ["2025-03-31", 53]]);
    expect(points.slice(-3)).toEqual([["2026-09-30", 143752], ["2026-10-31", 143752], ["2026-11-13", 143702]]);
  });

  it("refuses a statement whose rows don't chain from the opening balance", () => {
    expect(parseCanara(text("60.00"))).toEqual({ ok: false, problem: "row 1's balance doesn't follow from the one before it" });
  });

  it("refuses one cut short before its closing balance", () => {
    expect(parseCanara(`${front()} ${page1}`)).toEqual({ ok: false, problem: "couldn't find the closing balance, so the statement may be cut short" });
  });

  it("is caught by the statement check when the rows don't end on the closing balance", () => {
    const r = parseCanara(text(undefined, "9.00"));
    if (!r.ok) throw new Error(r.problem);
    expect(checkStatement(r.parsed.statement)).toEqual({ ok: false, problem: "the last balance doesn't match the closing balance" });
  });
});
