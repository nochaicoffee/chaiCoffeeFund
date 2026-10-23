import { describe, expect, it } from "vitest";
import { balancesFromStatement, checkStatement } from "../aggregate/statementBalances";
import { isHdfcStatement, parseHdfc } from "./hdfc";

/** pdf.js's layout of the combined statement: invented names and figures. */
const RELATIONSHIP = "Test Person  1 Test Road Town State India 560001 Statement as on Customer Email Customer ID  Account Relationship Summary  : 30/09/2026 : a@b.c : 123456789  INR   SAVINGS ACCOUNTS   50000.00   CR   0.00   0.00   0.00   50000.00  Ccy   Account Type   Balance  RM Name   : X Page 1 of 3";
const head = (account: string, from: string, to: string, opening: string) =>
  `Test Person Customer ID  Account Number Joint Holders 1 Joint Holders 2 Account Type Statement From Currency Nomination Account Branch RTGS/NEFT IFSC Test Branch MICR  Savings Account Details Opening Balance   Limit : 123456789  : ${account} : ${from} To ${to} : INR : Someone : 1234 : HDFC0001234   : 560240002 : ${opening}   : 0.00 : INSTANT SAVING (123) Expected AMB   : 0.00 : Not Applicable : Not Applicable `;
const COLUMNS = " Txn Date   Narration   Withdrawals   Deposits   Closing Balance ";
const row = (date: string, narration: string, out: string, inn: string, balance: string, ref = "Ref 111111111111") =>
  ` ${date}   ${narration} Value Dt ${date} ${ref} ${out}   ${inn}   ${balance}`;
const summary = (...amounts: string[]) => ` Total Sweep In FD Linked** Total Withdrawal Balance***  2 3  Credit Count Debit Count  ${amounts.join(" ")}  Closing Balance Credit Amount Debit Amount Opening Balance SUMMARY Your Combined statement generation frequency is monthly *** End of Statement ***  Page 3 of 3`;

const ACC = "50100123456789";
const page1 =
  head(ACC, "01/09/2026", "30/09/2026", "10,000.00") +
  COLUMNS +
  row("02/09/2026", "UPI-SHOP-shop@ybl-YESB0000001-222222222222-UPI", "500.00", "0.00", "9,500.00") +
  row("03/09/2026", "NEFT Cr-SALARY SEP NetApp India Private Limited", "0.00", "90,000.00", "99,500.00", "Ref CHASH123456789") +
  " Page 2 of 3";
const page2 =
  head(ACC, "01/09/2026", "30/09/2026", "10,000.00") +
  COLUMNS +
  row("30/09/2026", "Interest paid till 30-SEP-2026", "0.00", "1,234.50", "100,734.50".replace("100,", "1,00,"), "") +
  " Page 3 of 3";
const last = head(ACC, "01/09/2026", "30/09/2026", "10,000.00") + summary("1,00,734.50", "91,234.50", "500.00", "10,000.00");
const text = (...pages: string[]) => `${RELATIONSHIP} ${pages.join(" ")}`;

describe("isHdfcStatement", () => {
  it("recognises the combined statement by its layout", () => {
    expect(isHdfcStatement(text(page1, page2, last))).toBe(true);
    expect(isHdfcStatement("slice small finance bank   Payment from HDFC0000001")).toBe(false);
  });
});

describe("parseHdfc", () => {
  const [result] = parseHdfc(text(page1, page2, last));

  it("reads the account's last 4, period and opening balance from the details block", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(result.parsed.bank).toBe("HDFC");
    expect(result.parsed.accountLast4).toBe("6789");
    expect(result.parsed.statement).toMatchObject({ periodStart: "2026-09-01", periodEnd: "2026-09-30", openingBalance: 10000, closingBalance: 100734.5 });
  });

  it("reads every row across pages: deposits minus withdrawals, with or without a Ref", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(result.parsed.statement.rows).toEqual([
      { date: "2026-09-02", amount: -500, balance: 9500 },
      { date: "2026-09-03", amount: 90000, balance: 99500 },
      { date: "2026-09-30", amount: 1234.5, balance: 100734.5 },
    ]);
  });

  it("gives a statement whose numbers add up, with the month's closing balance", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(checkStatement(result.parsed.statement)).toEqual({ ok: true });
    expect(balancesFromStatement(result.parsed.statement).map((p) => [p.date, p.kind])).toEqual([
      ["2026-08-31", "opening"],
      ["2026-09-30", "closing"],
    ]);
  });

  it("does not take the relationship summary page, or a repeated details block, for movements", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(result.parsed.statement.rows).toHaveLength(3);
  });

  it("counts a row posted the day after the period ends but valued within it on the last day", () => {
    const late = head(ACC, "01/09/2026", "30/09/2026", "10,000.00") + COLUMNS + ` 01/10/2026   Interest paid till 30-SEP-2026 Value Dt 30/09/2026 0.00   1,234.50   11,234.50 Page 2 of 3`;
    const [r] = parseHdfc(text(late, last.replace("1,00,734.50", "11,234.50")));
    if (!r.ok) throw new Error(r.problem);
    expect(r.parsed.statement.rows).toEqual([{ date: "2026-09-30", amount: 1234.5, balance: 11234.5 }]);
    expect(checkStatement(r.parsed.statement)).toEqual({ ok: true });
  });

  it("still refuses a row dated after the period that was not valued within it", () => {
    const late = head(ACC, "01/09/2026", "30/09/2026", "10,000.00") + COLUMNS + ` 01/10/2026   UPI-X Value Dt 01/10/2026 0.00   100.00   10,100.00 Page 2 of 3`;
    const [r] = parseHdfc(text(late, last.replace("1,00,734.50", "10,100.00")));
    if (!r.ok) throw new Error(r.problem);
    expect(checkStatement(r.parsed.statement)).toEqual({ ok: false, problem: "row 1 is dated outside the statement's period" });
  });

  it("gives one statement for each account in the PDF", () => {
    const other = "50100999900042";
    const second = head(other, "01/09/2026", "30/09/2026", "200.00") + COLUMNS + row("05/09/2026", "UPI-X", "0.00", "50.00", "250.00") + " Page 5 of 5";
    const secondSummary = head(other, "01/09/2026", "30/09/2026", "200.00") + summary("250.00", "50.00", "0.00", "200.00");
    const results = parseHdfc(text(page1, page2, last, second, secondSummary));
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.ok && r.parsed.accountLast4)).toEqual(["6789", "0042"]);
    expect(results[1].ok && results[1].parsed.statement.closingBalance).toBe(250);
  });

  it("reads a negative closing balance, as an overdrawn day can leave", () => {
    const neg = head(ACC, "01/09/2026", "30/09/2026", "100.00") + COLUMNS + " 02/09/2026   ACH D- SOMETHING Value Dt 02/09/2026 Ref 111111111111 250.00   0.00   -150.00 Page 2 of 3";
    const [r] = parseHdfc(text(neg, head(ACC, "01/09/2026", "30/09/2026", "100.00") + summary("-150.00", "100.00", "250.00", "0.00")));
    if (!r.ok) throw new Error(r.problem);
    expect(r.parsed.statement.rows).toEqual([{ date: "2026-09-02", amount: -250, balance: -150 }]);
    expect(checkStatement(r.parsed.statement)).toEqual({ ok: true });
  });

  it("refuses a statement with no summary page: it may be cut short", () => {
    expect(parseHdfc(text(page1, page2))).toEqual([{ ok: false, problem: "couldn't find the statement's summary, so it may be cut short" }]);
  });

  it("refuses one whose summary does not hold the balances the rows give", () => {
    const wrong = head(ACC, "01/09/2026", "30/09/2026", "10,000.00") + summary("1,00,000.00", "91,234.50", "500.00", "10,000.00");
    expect(parseHdfc(text(page1, page2, wrong))).toEqual([{ ok: false, problem: "the summary's balances don't match the transactions" }]);
  });

  it("an account with no movements is its opening balance, closing on the same figure", () => {
    const quiet = head(ACC, "01/09/2026", "30/09/2026", "10,000.00") + COLUMNS + " Page 2 of 3";
    const [r] = parseHdfc(text(quiet, last.replace("1,00,734.50", "10,000.00")));
    if (!r.ok) throw new Error(r.problem);
    expect(r.parsed.statement.rows).toEqual([]);
    expect(checkStatement(r.parsed.statement)).toEqual({ ok: true });
  });

  it("says it can't find the details block rather than guessing", () => {
    expect(parseHdfc("nothing")).toEqual([{ ok: false, problem: "couldn't find the account details" }]);
  });
});
