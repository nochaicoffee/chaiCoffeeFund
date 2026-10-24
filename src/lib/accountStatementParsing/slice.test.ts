import { describe, expect, it } from "vitest";
import { balancesFromStatement, checkStatement } from "../aggregate/statementBalances";
import { isSliceStatement, parseSlice } from "./slice";

/**
 * Written the way pdf.js lays the real statement out: one run of text, a "period  page" header
 * at the top of every page, a footer at the bottom, the summary as labels then amounts, rows as
 * "date  details  ref  amount  balance". All names and figures are invented.
 */
const HEADER = "02 Aug '25 - 23 Oct '26";
const FOOTER = "Need help? Contact our support team at help@slice.bank.in or +91-8000000000   slice small finance bank";
const page = (n: number, of: number, rows: string) => `${HEADER}  ${n}/${of} ${rows} ${FOOTER}`;

const FRONT =
  "PRATHIK B SHETTY  Customer ID   123456789012 Phone   9000000000 Opening date   02 Aug '25 Account   SAVINGS A/C number   500100012345678 IFSC   NESF0000001 " +
  "Opening balance   Total credits   Interest earned   Total debits   Closing balance  +   +   -   =  ₹0   ₹60,000   ₹3.5   ₹12,500.5   ₹47,503  " +
  "DATE   DETAILS   REF NO.   AMOUNT   BALANCE ";

const ROWS_1 = [
  "02 Aug '25   UPI Credit-SOMEONE-1234@slc -HDFC0000001-111111111111-self 100000000000001   ₹50,000   ₹50,000",
  "05 Aug '25   Interest Cr. for 05-Aug-2025   99999999999999   ₹1.5   ₹50,001.5",
  "10 Aug '25   UPI Debit-SHOP ONE-shop@ybl-222222222222 100000000000002   -₹500   ₹49,501.5",
].join("  ");
const ROWS_2 = [
  "31 Aug '25   UPI Credit-FRIEND-5678@okaxis-CNRB0000001-333333333333 100000000000003   ₹10,000   ₹59,501.5",
  "12 Sep '25   UPI Debit-RENT-landlord@ybl-444444444444 100000000000004   -₹12,000   ₹47,501.5",
  "20 Oct '26   Interest Cr. for 20-Oct-2026   99999999999999   ₹2   ₹47,503.5",
].join("  ");

// The summary above says closing ₹47,503 and the last row ends ₹47,503.5, so make the fixture consistent:
const text = (closing = "₹47,503.5", debits = "₹12,500", lastBalance?: string) =>
  `${page(1, 2, FRONT.replace("₹12,500.5", debits).replace("₹47,503 ", `${closing} `) + ROWS_1)} ${page(2, 2, ROWS_2.replace("₹47,503.5", lastBalance ?? "₹47,503.5"))}`;

describe("the older monthly layout, where a debit's minus is extracted as a digit", () => {
  const SUPPORT = "Need help? Contact our support team at help@sliceit.com or +911234567890   slice small finance bank";
  const front =
    "PRATHIK B SHETTY  Customer ID   123456789012 Account Opening Date 02 Aug '25 Account   SAVINGS A/C number   500100012345678 " +
    "Opening balance   Total credits   Interest earned   Total debits   Closing balance  +   +   -   =  ₹1,000   ₹500   ₹2.5   ₹300.5   ₹1,202  DATE   DETAILS   REF NO.   AMOUNT   BALANCE ";
  // Every "-" in the real text came out as a digit (here 7): "UPI Debit7SHOP7x@ybl", and the debit's "7₹300.5".
  const rows =
    "02 Jan '26   Interest Cr. for 317Dec72025   111111111111   ₹2.5   ₹1,002.5  " +
    "03 Jan '26   UPI Debit7SHOP7x@ybl7HDFC0000001 7Pay 222222222222   7₹300.5   ₹702  " +
    "09 Jan '26   UPI Credit7FRIEND7y@okaxis 333333333333   ₹500   ₹1,202";
  const text = `01 Jan '26 - 31 Jan '26  1/1  ${front}${rows} Generated on 01 Feb '26 ${SUPPORT}`;

  it("reads the stuck-on character as the debit's sign, and a spaced ₹ as a credit", () => {
    const r = parseSlice(text);
    if (!r.ok) throw new Error(r.problem);
    expect(r.parsed.statement.rows).toEqual([
      { date: "2026-01-02", amount: 2.5, balance: 1002.5 },
      { date: "2026-01-03", amount: -300.5, balance: 702 },
      { date: "2026-01-09", amount: 500, balance: 1202 },
    ]);
    expect(checkStatement(r.parsed.statement)).toEqual({ ok: true });
    expect(r.parsed.statement).toMatchObject({ openingBalance: 1000, closingBalance: 1202 });
  });
});

describe("the monthly statement", () => {
  const GRIEVANCE = "For grievance redressal, contact Mr. Someone on +91 9000000000 or email customergrievance@slice.bank.in";
  const monthlyFront =
    "PRATHIK B SHETTY  Customer ID   123456789012 Account   Saving A/C number   500100012345678 Statement overview  Total closing balance (incl. atoms)   ₹305.5   •   ₹1.5 interest  Savings account  " +
    "Opening balance   Total credits   Interest earned   Total debits   Closing balance  +   +   -   =  ₹100   ₹250   ₹1.5   ₹51   ₹300.5  DATE   DETAILS   REF NO.   AMOUNT   BALANCE ";
  const p1 = "01 Sep '26   Interest Cr. for 31-Aug-2026   111111111111   ₹1.5   ₹101.5  05 Sep '26   UPI-Debit-111111111111-SHOP-x@ybl-Scan and P ay 111111111111   -₹51   ₹50.5";
  const p2 = "20 Sep '26   UPI-Credit-222222222222-FRIEND-y@okaxis 222222222222   ₹250   ₹300.5";
  const atom = "Round ups atom  Opening balance   Total credits   Interest earned   Total debits   Closing balance  +   +   -   =  ₹5   ₹0   ₹0   ₹0   ₹5  No transactions found  Generated on 1 October 2026 9:00PM";
  const support = "Need help? Contact our support team at help@slice.bank.in or +91-9000000000";
  const monthly = `1 Sep '26 - 30 Sep '26  1/2  ${monthlyFront} ${p1} ${support} ${GRIEVANCE} 1 Sep '26 - 30 Sep '26  2/2  DATE   DETAILS   REF NO.   AMOUNT   BALANCE  ${p2} ${support} ${GRIEVANCE} 1 Sep '26 - 30 Sep '26  3/3 ${atom} ${support} ${GRIEVANCE}`;

  it("keeps a page's last row apart from the next page's first, with the grievance line in between", () => {
    const r = parseSlice(monthly);
    if (!r.ok) throw new Error(r.problem);
    expect(r.parsed.statement.rows).toEqual([
      { date: "2026-09-01", amount: 1.5, balance: 101.5 },
      { date: "2026-09-05", amount: -51, balance: 50.5 },
      { date: "2026-09-20", amount: 250, balance: 300.5 },
    ]);
    expect(checkStatement(r.parsed.statement)).toEqual({ ok: true });
    expect(r.parsed.statement).toMatchObject({ periodStart: "2026-09-01", periodEnd: "2026-09-30", openingBalance: 100, closingBalance: 300.5 });
  });

  it("does not read the round-up account's own summary as the account's, and keeps it as money held outside the rows", () => {
    const r = parseSlice(monthly);
    if (!r.ok) throw new Error(r.problem);
    expect(r.parsed.statement.closingBalance).toBe(300.5);
    expect(r.parsed.statement.held).toEqual({ opening: 5, closing: 5, constant: true });
  });

  it("counts the round-up money in the opening and closing balance it gives: savings plus atoms", () => {
    const r = parseSlice(monthly);
    if (!r.ok) throw new Error(r.problem);
    expect(balancesFromStatement(r.parsed.statement).map((p) => [p.date, p.balance, p.kind])).toEqual([
      ["2026-08-31", 105, "opening"],
      ["2026-09-30", 305.5, "closing"],
    ]);
  });

  it("refuses a statement whose savings and round-up balances do not add up to the total it prints", () => {
    expect(parseSlice(monthly.replace("₹305.5", "₹306.5"))).toEqual({ ok: false, problem: "the savings and round-up balances don't add up to the total the statement prints" });
  });

  it("knows the round-up money moved when its opening and closing differ, so month-ends are left out", () => {
    const moved = monthly.replace("=  ₹5   ₹0   ₹0   ₹0   ₹5", "=  ₹5   ₹3   ₹0   ₹0   ₹8").replace("₹305.5", "₹308.5");
    const r = parseSlice(moved);
    if (!r.ok) throw new Error(r.problem);
    expect(r.parsed.statement.held).toEqual({ opening: 5, closing: 8, constant: false });
    expect(balancesFromStatement({ ...r.parsed.statement, periodEnd: "2026-11-30", rows: [...r.parsed.statement.rows, { date: "2026-10-05", amount: 1, balance: 301.5 }], closingBalance: 301.5 }).map((p) => p.kind)).toEqual(["opening", "closing"]);
  });
});

describe("isSliceStatement", () => {
  it("recognises the bank's name or support address", () => {
    expect(isSliceStatement(text())).toBe(true);
    expect(isSliceStatement("HDFC Bank Statement")).toBe(false);
  });
});

describe("parseSlice", () => {
  const result = parseSlice(text());

  it("reads the period from the page header, and the account's last 4", () => {
    expect(result.ok && result.parsed.statement.periodStart).toBe("2025-08-02");
    expect(result.ok && result.parsed.statement.periodEnd).toBe("2026-10-23");
    expect(result.ok && result.parsed.accountLast4).toBe("5678");
    expect(result.ok && result.parsed.bank).toBe("Slice");
  });

  it("reads the summary's opening and closing balances", () => {
    expect(result.ok && result.parsed.statement.openingBalance).toBe(0);
    expect(result.ok && result.parsed.statement.closingBalance).toBe(47503.5);
  });

  it("reads every row across the page break with its signed amount and balance, and none of the headers or footers", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(result.parsed.statement.rows).toEqual([
      { date: "2025-08-02", amount: 50000, balance: 50000 },
      { date: "2025-08-05", amount: 1.5, balance: 50001.5 },
      { date: "2025-08-10", amount: -500, balance: 49501.5 },
      { date: "2025-08-31", amount: 10000, balance: 59501.5 },
      { date: "2025-09-12", amount: -12000, balance: 47501.5 },
      { date: "2026-10-20", amount: 2, balance: 47503.5 },
    ]);
  });

  it("gives a statement whose numbers add up, and month-ends for the months with movements", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(checkStatement(result.parsed.statement)).toEqual({ ok: true });
    expect(balancesFromStatement(result.parsed.statement).map((p) => [p.date, p.kind])).toEqual([
      ["2025-08-01", "opening"],
      ["2025-08-31", "month-end"],
      ["2025-09-30", "month-end"],
      ["2026-10-23", "closing"],
    ]);
  });

  it("a row the page header would swallow still gets its own date: the first row after a page break", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(result.parsed.statement.rows[3].date).toBe("2025-08-31");
  });

  it("reads a statement that fails its own arithmetic, and leaves that to checkStatement", () => {
    const wrong = parseSlice(text("₹47,503.5", "₹12,500", "₹47,999.5"));
    if (!wrong.ok) throw new Error(wrong.problem);
    expect(checkStatement(wrong.parsed.statement).ok).toBe(false);
  });

  it("says what it could not find, never a value", () => {
    expect(parseSlice("slice small finance bank")).toEqual({ ok: false, problem: "couldn't read the statement's period" });
    expect(parseSlice(`${HEADER}  1/1 nothing here`)).toEqual({ ok: false, problem: "couldn't find the account summary" });
  });

  it("a statement with no movements is just its opening and closing balance", () => {
    const quiet = `${HEADER}  1/1 A/C number   500100012345678 Opening balance   Total credits   Interest earned   Total debits   Closing balance  +   +   -   =  ₹100   ₹0   ₹0   ₹0   ₹100  DATE   DETAILS   REF NO.   AMOUNT   BALANCE ${FOOTER}`;
    const r = parseSlice(quiet);
    if (!r.ok) throw new Error(r.problem);
    expect(r.parsed.statement.rows).toEqual([]);
    expect(checkStatement(r.parsed.statement)).toEqual({ ok: true });
  });
});
