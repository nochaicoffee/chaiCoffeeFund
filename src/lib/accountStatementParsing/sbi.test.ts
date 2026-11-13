import { describe, expect, it } from "vitest";
import { balancesFromStatement, checkStatement } from "../aggregate/statementBalances";
import { parseAccountStatements } from "./index";
import { isSbiStatement, parseSbi } from "./sbi";

/** pdf.js's layout of SBI's account statement: invented names and figures. */
const LINE = "Statement of Mr. TEST PERSON (A/c-xxxxxxxxxxxxxx123) between 01/12/2025 to 01/11/2026";
const HEADS = "Txn Date   Value Date   Description   Debit   Credit   Balance";
const row = (d: string, description: string, amount: string, balance: string) => `${d}   ${d}   ${description ? `${description}   ` : ""}${amount}   ${balance}`;
const front = `Registered Branch Code: 01234   Thank you for choosing WhatsApp Banking services of State Bank of India  Mr. TEST PERSON  ${LINE}  Account Number : xxxxxxxxxxxxxx123 Branch : 01234 Balance as on 13-11-2026 : 999.00  ${HEADS}  `;
const END = "  ********* End of Statement **********  **This is computer generated statement and does not require a signature.**";
const text = (first = row("12/12/2025", "", "171.20", "0.00"), rest: string[] = REST) =>
  `${front}${[first, ...rest.slice(0, 2)].join(" ")}  **This is computer generated statement and does not require a signature.** ${LINE} ${HEADS}  ${rest.slice(2).join(" ")}${END}`;
const REST = [
  row("27/02/2026", "UPI/CR/111111111111/TEST /HDFC/test/UPI", "10000.00", "10000.00"),
  row("02/03/2026", "UPI/DR/222222222222/Fyers Se/UTIB/fyers.rzp1/Payvi", "9,000.00", "1000.00"),
  row("18/04/2026", "NEFT*ICIC0099999*IN1*FY ERS SECURITIES", "27.80", "1027.80"),
  row("25/09/2026", "", "28.80", "999.00"),
];

describe("isSbiStatement", () => {
  it("recognises SBI's statement, and parseAccountStatements reads it as SBI", () => {
    expect(isSbiStatement(text())).toBe(true);
    expect(isSbiStatement("UPI/DR/1/State Bank of India/SBIN/x")).toBe(false);
    const read = parseAccountStatements(text());
    expect(read).toHaveLength(1);
    expect(read![0].ok && read![0].parsed.bank).toBe("SBI");
  });
});

describe("parseSbi", () => {
  const result = parseSbi(text());

  it("reads the period, and takes no last 4 from a number showing only three digits", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(result.parsed.accountLast4).toBeUndefined();
    expect(result.parsed.statement).toMatchObject({ periodStart: "2025-12-01", periodEnd: "2026-11-01", closingBalance: 999 });
  });

  it("works out the opening balance from the first row: a credit to ₹0 would have started below zero, so it was a debit", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(result.parsed.statement.openingBalance).toBe(171.2);
  });

  it("gives each row its direction from the balance, across pages, including rows with no description", () => {
    if (!result.ok) throw new Error(result.problem);
    const rows = result.parsed.statement.rows;
    expect(rows.map((r) => [r.date, r.amount, r.balance])).toEqual([
      ["2025-12-12", -171.2, 0],
      ["2026-02-27", 10000, 10000],
      ["2026-03-02", -9000, 1000],
      ["2026-04-18", 27.8, 1027.8],
      ["2026-09-25", -28.8, 999],
    ]);
    expect(rows[0].narration).toBeUndefined();
    expect(rows[2].narration).toBe("UPI/DR/222222222222/Fyers Se/UTIB/fyers.rzp1/Payvi");
    expect(checkStatement(result.parsed.statement)).toEqual({ ok: true });
    expect(balancesFromStatement(result.parsed.statement).map((p) => p.date)).toEqual([
      "2025-11-30", "2025-12-31", "2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31", "2026-06-30", "2026-07-31", "2026-08-31", "2026-09-30", "2026-10-31", "2026-11-01",
    ]);
  });

  it("takes the first row's direction from its description when the balance can't say", () => {
    const credit = parseSbi(text(row("01/12/2025", "UPI/CR/1/TEST /HDFC/test/UPI", "500.00", "671.20"), [row("12/12/2025", "", "671.20", "0.00")]));
    expect(credit.ok && credit.parsed.statement.openingBalance).toBe(171.2);
    const debit = parseSbi(text(row("01/12/2025", "UPI/DR/1/SHOP/YESB/x/UPI", "500.00", "171.20"), [row("12/12/2025", "", "171.20", "0.00")]));
    expect(debit.ok && debit.parsed.statement.openingBalance).toBe(671.2);
  });

  it("won't guess the opening balance when neither the balance nor the description says which way the first row went", () => {
    expect(parseSbi(text(row("12/12/2025", "", "100.00", "500.00"), [row("13/12/2025", "", "500.00", "0.00")]))).toEqual({
      ok: false,
      problem: "couldn't tell the opening balance: the first row doesn't say whether it was a debit or a credit",
    });
  });

  it("refuses a row whose balance doesn't follow, and one cut short", () => {
    expect(parseSbi(text(undefined, [row("27/02/2026", "UPI/CR/1/TEST /HDFC/test/UPI", "10000.00", "10001.00")]))).toEqual({ ok: false, problem: "row 2's balance doesn't follow from the one before it" });
    expect(parseSbi(`${front}${row("12/12/2025", "", "171.20", "0.00")}`)).toEqual({ ok: false, problem: "couldn't find the end of the statement, so it may be cut short" });
  });
});
