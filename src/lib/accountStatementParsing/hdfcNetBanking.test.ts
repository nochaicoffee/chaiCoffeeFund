import { describe, expect, it } from "vitest";
import { balancesFromStatement, checkStatement } from "../aggregate/statementBalances";
import { isHdfcNetBankingStatement, parseHdfcNetBanking } from "./hdfcNetBanking";

/**
 * pdf.js's layout of HDFC's NetBanking account statement: invented names and figures. Every page repeats the
 * header block (with the open date, which looks like a row's date); the narration wraps with stray spaces.
 */
const header = (from: string, to: string) =>
  `Mr.   Test Person Statement   From : ${from}   TO   :   ${to} Account   Branch A/C   Open   Date Limit City Phone   No. Cust   ID Account   Status Account   number State RTGS/NEFT   IFSC JOINT HOLDERS: Address Email Currency Pr.Code   Br.Code PB Customer :   Hoodi :   Hdfc   Bank   Ltd, Hoodi, :   Bengaluru   560048 :   Karnataka :   12345678/12345678 :   HDFC0001234 :   a@b.c :   0.00   : INR :   123456789   : 123   :1234 :   50100123453840 :   24/08/2022 :   Account   Open Regular Not Applicable Not Applicable Nomination   : Someone MICR : 1 Road Town 560001 Expected AMB : 0.00 `;
const COLUMNS = " Date   Narration   Chq. / Ref No.   Value Date   Withdrawal Amount   Deposit Amount   Closing Balance* ";
const row = (txn: string, narration: string, ref: string, value: string, out: string, inn: string, balance: string) => `${txn}   ${narration}${ref ? ` ${ref}` : ""}   ${value}   ${out}   ${inn}   ${balance} `;
const summary = (closing: string, opening: string, debits: string, credits: string) =>
  ` Cr   Count 3 Debits ${debits} Dr   Count 1 Credits ${credits} Closing Balance ${closing} Opening Balance ${opening} **END   OF   STATEMENT** STATEMENT SUMMARY   :- Generation Date   :   24-Oct-26   12:00 Requesting Branch code : NET HDFC BANK LIMITED Page 2 of 2`;

// Opening 1,000.00. Row 1 was posted 31 Dec but valued 1 Jan; the last row (interest) posted 1 Apr, valued 31 Mar.
const page1 =
  header("01/01/26", "31/03/26") +
  COLUMNS +
  row("31/12/2025", "ME DC SI 526099XXXXXX8380 GHOST.ORG 13", "0000526099XX", "01/01/2026", "100.00", "0.00", "900.00") +
  row("05/01/2026", "UPI-SOMEONE-someone@ybl-YESB0000001-123456789012-UPI", "123456789012", "05/01/2026", "0.00", "5,000.00", "5,900.00") +
  " Page 1 of 2 ";
const page2 =
  header("01/01/26", "31/03/26") +
  row("06/02/2026", "NEFT DR-SOMEONE ELSE WITH A LONG NAME THAT WRA PS", "N123456789", "06/02/2026", "6,500.00", "0.00", "-600.00") +
  row("01/04/2026", "INTEREST PAID TILL 31-MAR-2026", "", "31/03/2026", "0.00", "50.00", "-550.00") +
  summary("-550.00", "1,000.00", "6,600.00", "5,050.00");
const text = (tail = summary("-550.00", "1,000.00", "6,600.00", "5,050.00")) => page1 + page2.replace(summary("-550.00", "1,000.00", "6,600.00", "5,050.00"), tail);

describe("isHdfcNetBankingStatement", () => {
  it("recognises the layout, and not the monthly combined statement or another bank's", () => {
    expect(isHdfcNetBankingStatement(text())).toBe(true);
    expect(isHdfcNetBankingStatement("Customer ID  Account Number Joint Holders Txn Date   Narration   Withdrawals   Deposits   Closing Balance HDFC")).toBe(false);
    expect(isHdfcNetBankingStatement("slice small finance bank")).toBe(false);
  });
});

describe("parseHdfcNetBanking", () => {
  const result = parseHdfcNetBanking(text());

  it("reads the period (two-digit years), the account's last 4 and the opening and closing balance", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(result.parsed.bank).toBe("HDFC");
    expect(result.parsed.accountLast4).toBe("3840");
    expect(result.parsed.statement).toMatchObject({ periodStart: "2026-01-01", periodEnd: "2026-03-31", openingBalance: 1000, closingBalance: -550 });
  });

  it("reads each row by its value date: a card payment posted 31 Dec and valued 1 Jan belongs to January; the interest posted 1 Apr and valued 31 Mar to March", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(result.parsed.statement.rows).toEqual([
      { date: "2026-01-01", amount: -100, balance: 900 },
      { date: "2026-01-05", amount: 5000, balance: 5900 },
      { date: "2026-02-06", amount: -6500, balance: -600 },
      { date: "2026-03-31", amount: 50, balance: -550 },
    ]);
  });

  it("reads a negative closing balance, which an ACH debit before its reversal can leave", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(result.parsed.statement.rows[2].balance).toBe(-600);
  });

  it("does not take the repeated header block, whose open date looks like a date, for the start of a row", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(result.parsed.statement.rows).toHaveLength(4);
    expect(result.parsed.statement.rows.every((r) => r.date >= "2026-01-01")).toBe(true);
  });

  it("gives a statement whose numbers add up, with the month-ends and the closing balance", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(checkStatement(result.parsed.statement)).toEqual({ ok: true });
    expect(balancesFromStatement(result.parsed.statement).map((p) => [p.date, p.balance, p.kind])).toEqual([
      ["2025-12-31", 1000, "opening"],
      ["2026-01-31", 5900, "month-end"],
      ["2026-02-28", -600, "month-end"],
      ["2026-03-31", -550, "closing"],
    ]);
  });

  it("checks the rows against the debit and credit totals, whichever way round their labels came out", () => {
    expect(parseHdfcNetBanking(text(summary("-550.00", "1,000.00", "5,050.00", "6,600.00"))).ok).toBe(true);
    expect(parseHdfcNetBanking(text(summary("-550.00", "1,000.00", "6,600.00", "5,051.00")))).toEqual({ ok: false, problem: "the rows don't add up to the statement's debit and credit totals" });
  });

  it("refuses a statement with no summary: it may be cut short", () => {
    expect(parseHdfcNetBanking(text(" Page 2 of 2"))).toEqual({ ok: false, problem: "couldn't find the statement's summary, so it may be cut short" });
  });

  it("leaves a closing balance that isn't where the rows end to checkStatement", () => {
    const r = parseHdfcNetBanking(text(summary("-540.00", "1,000.00", "6,600.00", "5,050.00")));
    if (!r.ok) throw new Error(r.problem);
    expect(checkStatement(r.parsed.statement).ok).toBe(false);
  });

  it("says what it could not find", () => {
    expect(parseHdfcNetBanking("HDFC")).toEqual({ ok: false, problem: "couldn't read the statement's period" });
  });
});
