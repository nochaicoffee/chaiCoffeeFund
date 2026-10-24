import { describe, expect, it } from "vitest";
import { balancesFromStatement, checkStatement } from "../aggregate/statementBalances";
import { isJupiterStatement, parseJupiter } from "./jupiter";

/** pdf.js's layout of the Federal Bank statement for Jupiter: invented names and figures. */
const TOP = "12*3 Phone Banking  1234 567 8901 1234 567 8901 www.federal.co.in";
const BOTTOM = "Page 1 of 3 The Federal Bank Ltd. Corporate Office: Federal Towers, Aluva, Kerala 683101 Phone number: 0484 1234567 Website: www.federal.co.in";
const COLS = "Date   Value Date   Particulars   Tran Type   Cheque Details   Withdrawals   Deposits   Balance   Dr/Cr";
const row = (d: string, narration: string, amount: string, balance: string, drcr = "Cr") => `${d}   ${d}   ${narration}   TFR   ${amount}   ${balance}   ${drcr}`;

const front = (opening = "1000.00") =>
  `${TOP}  Name   TEST PERSON   Branch Name   Fintech Partnerships (Jupiter)   Account Number   99900012345678   Customer ID   123456789 Currency   INR STATEMENT OF ACCOUNT PERIOD :   10-FEB-2022 to 23-OCT-2026  ${COLS}  Opening Balance   ${opening} `;
const page1 = [row("11/02/2022", "UPIOUT/111111111111/shop@ybl/Pay/1234", "250.50", "749.50", "Dr"), row("12/02/2022", "UPI IN/222222222222/friend@ybl/Pay/1234", "5000.00", "5749.50")].join("  ");
const page2 = [row("01/10/2026", "SBINT:01-07-2026 to 30-09-2026[1234]", "12.25", "5761.75"), row("23/10/2026", "UPIOUT/333333333333/x@ybl/Pay/1234", "5000.00", "761.75", "Dr")].join("  ");
const END = "GRAND TOTAL   5250.50   5012.25  Abbreviations Used CASH   Cash Transaction   TFR   Transfer Transaction *** END OF STATEMENT *** Page 3 of 3 The Federal Bank Ltd. Corporate Office: Federal Towers Website: www.federal.co.in";
const text = (opening?: string, total = END) => `${front(opening)} ${page1} ${BOTTOM} ${TOP} ${COLS} ${page2} ${total}`;

describe("isJupiterStatement", () => {
  it("recognises it by the Federal Bank layout", () => {
    expect(isJupiterStatement(text())).toBe(true);
    expect(isJupiterStatement("HDFC UPI-x@okhdfcbank")).toBe(false);
  });
});

describe("parseJupiter", () => {
  const result = parseJupiter(text());

  it("reads the period, the account's last 4 and the opening balance", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(result.parsed.bank).toBe("Jupiter");
    expect(result.parsed.accountLast4).toBe("5678");
    expect(result.parsed.statement).toMatchObject({ periodStart: "2022-02-10", periodEnd: "2026-10-23", openingBalance: 1000, closingBalance: 761.75 });
  });

  it("works out each row's direction from the balance, since the printed amount has none", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(result.parsed.statement.rows).toEqual([
      { date: "2022-02-11", amount: -250.5, balance: 749.5 },
      { date: "2022-02-12", amount: 5000, balance: 5749.5 },
      { date: "2026-10-01", amount: 12.25, balance: 5761.75 },
      { date: "2026-10-23", amount: -5000, balance: 761.75 },
    ]);
  });

  it("gives a statement whose numbers add up, month-ends for months with movements", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(checkStatement(result.parsed.statement)).toEqual({ ok: true });
    expect(balancesFromStatement(result.parsed.statement).map((p) => [p.date, p.kind])).toEqual([
      ["2022-02-09", "opening"],
      ["2022-02-28", "month-end"],
      ["2026-10-23", "closing"],
    ]);
  });

  it("checks the rows against the grand total of withdrawals and deposits", () => {
    expect(parseJupiter(text(undefined, END.replace("5250.50", "5250.51")))).toEqual({ ok: false, problem: "the rows don't add up to the statement's grand total" });
  });

  it("takes the direction from Dr/Cr, which is the transaction's, and the balance as printed without a sign", () => {
    if (!result.ok) throw new Error(result.problem);
    expect(result.parsed.statement.rows.map((r) => Math.sign(r.amount))).toEqual([-1, 1, 1, -1]);
    expect(result.parsed.statement.rows.every((r) => r.balance > 0)).toBe(true);
  });

  it("names the row whose balance does not follow, never the figures", () => {
    expect(parseJupiter(text().replace("749.50   Dr", "749.51   Dr"))).toEqual({ ok: false, problem: "row 1's balance doesn't follow from the one before it" });
  });

  it("refuses a row whose Dr/Cr contradicts its balance", () => {
    expect(parseJupiter(text().replace("749.50   Dr", "749.50   Cr"))).toEqual({ ok: false, problem: "row 1's balance doesn't follow from the one before it" });
  });

  it("refuses a statement with no grand total: it may be cut short", () => {
    expect(parseJupiter(text(undefined, "*** END ***"))).toEqual({ ok: false, problem: "couldn't find the grand total, so the statement may be cut short" });
  });

  it("says what it couldn't find", () => {
    expect(parseJupiter("The Federal Bank")).toEqual({ ok: false, problem: "couldn't read the statement's period" });
  });
});
