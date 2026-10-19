import { describe, expect, it } from "vitest";
import {
  parseAmex,
  parseAxis,
  parseCsb,
  parseGeneric,
  parseHdfc,
  parseIcici,
  parseKotak,
  parseSbi,
  parseYes,
} from "./bankParsers";
import { parseStatement } from "./parseStatement";

describe("parseHdfc", () => {
  it("parses the tabular format", () => {
    const text = "Payment Due Date Total Dues Minimum Amount Due\n07/11/2025 6,482.00 330.00";
    expect(parseHdfc(text)).toMatchObject({
      dueDate: "07/11/2025",
      totalAmountDue: "6482.00",
      minimumAmountDue: "330.00",
    });
  });

  it("parses the 2025+ vertical format with the C currency glyph", () => {
    const text = "TOTAL AMOUNT DUE\nC18,264.00\nMINIMUM DUE\nC915.00\nDUE DATE\n23 Jun 2025\nAs on : 03 Jun, 2025";
    expect(parseHdfc(text)).toMatchObject({
      totalAmountDue: "18264.00",
      minimumAmountDue: "915.00",
      dueDate: "23 Jun 2025",
      statementDate: "03 Jun, 2025",
    });
  });

  it("reports a credit balance as N/A rather than a missing due date", () => {
    const text = "TOTAL AMOUNT DUE\nC-3,871.25\nMINIMUM DUE\nC0.00\nDUE DATE\nNil";
    expect(parseHdfc(text).dueDate).toBe("N/A (Credit Balance)");
    expect(parseHdfc(text).totalAmountDue).toBe("-3871.25");
  });

  // Made-up numbers, laid out the way pdf.js extracts a real statement: its text
  // pieces joined by spaces, with the "C" glyph a piece of its own (#56).
  it("reads pdf.js's text, where a space follows the C glyph", () => {
    const text =
      "TOTAL AMOUNT DUE  C 12,345.00  MINIMUM DUE  C 620.00  DUE DATE  21 Mar, 2026  Reward Points  1,000 " +
      "Your Card Control Setting   As on : 01 Mar, 2026 Domestic Transaction " +
      "CURRENT DUES  C 619.50  MINIMUM DUES  C 999.00  PREVIOUS STATEMENT DUES   PAYMENTS/CREDITS RECEIVED  C 4,000.00   C 4,000.00";
    expect(parseHdfc(text)).toMatchObject({
      totalAmountDue: "12345.00",
      minimumAmountDue: "620.00",
      dueDate: "21 Mar, 2026",
      statementDate: "01 Mar, 2026",
    });
  });

  it("reads a credit balance from pdf.js's text", () => {
    const text = "TOTAL AMOUNT DUE  C -1,234.50  MINIMUM DUE  C 0.00  DUE DATE  Nil  Reward Points  1,000";
    expect(parseHdfc(text)).toMatchObject({ totalAmountDue: "-1234.50", minimumAmountDue: "0.00", dueDate: "N/A (Credit Balance)" });
  });

  it("falls back to the standard key-value patterns", () => {
    const text = "Total Amount Due: Rs. 5,000.00\nMinimum Amount Due: Rs. 250.00\nPayment Due Date: 12/03/2026";
    expect(parseHdfc(text)).toMatchObject({
      totalAmountDue: "5000.00",
      minimumAmountDue: "250.00",
      dueDate: "12/03/2026",
    });
  });
});

describe("parseIcici", () => {
  it("parses the Á-glyph amounts (min first, total second) and the two word-dates", () => {
    const text = "Á365.00\nÁ5,742.30\nNovember 3, 2025\nNovember 21, 2025";
    expect(parseIcici(text)).toMatchObject({
      minimumAmountDue: "365.00",
      totalAmountDue: "5742.30",
      statementDate: "November 3, 2025",
      dueDate: "November 21, 2025",
    });
  });

  it("prefers the statement-period end date over the first word-date when present", () => {
    const text =
      "Á365.00\nÁ5,742.30\nStatement period : October 4, 2025 to November 3, 2025\nNovember 21, 2025 due";
    expect(parseIcici(text).statementDate).toBe("November 3, 2025");
  });
});

describe("parseIcici, on pdf.js's text", () => {
  // Made-up numbers, in the order pdf.js extracts a real statement (#56): the
  // labels come first, then the two amounts behind the backtick rupee glyph.
  // A later page has a worked example of how the minimum due is worked out.
  const text =
    "STATEMENT DATE CREDIT SUMMARY PAYMENT DUE DATE STATEMENT DATE  STATEMENT SUMMARY = Total Amount due Minimum Amount due  " +
    "Interest will be charged if your total amount due is not paid  EARNINGS  Earned  120   120  ` 150.00  ` 2,999.10 SPENDS OVERVIEW  " +
    "January 5, 2026 January 23, 2026  Statement period : December 6, 2025 to January 5, 2026 ` 4,000.00 ` 2,999.10 ` 0.00 `4,000.00\n" +
    "k) 5% on remaining Balance   1,000.00 l) Total Minimum Amount Due   4,321.00   Minimum Amount Due*   4,330.00";

  it("takes the backtick-glyph amounts, minimum first, and the two word-dates", () => {
    expect(parseIcici(text)).toMatchObject({
      minimumAmountDue: "150.00",
      totalAmountDue: "2999.10",
      statementDate: "January 5, 2026",
      dueDate: "January 23, 2026",
    });
  });

  it("isn't filled in from the worked example", () => {
    expect(parseStatement(`ICICI Bank ${text}`)).toMatchObject({ bank: "icici", minimumAmountDue: "150.00", totalAmountDue: "2999.10" });
  });
});

describe("parseAxis", () => {
  it("parses the tabular period/due/generation dates and the two Dr-delimited amounts", () => {
    const text = [
      "08/09/2025 - 07/10/2025 27/10/2025 08/10/2025",
      "08/10/2025 18,450.40 Dr 922.00 Dr",
      "Previous Balance - Payments - Credits + Purchase + Cash Advance + Other Debit&Charges =Total Payment Due",
      "2,100.00 Dr 2,100.00 0.00 18,300.40 0.00 150.00 18,450.40 Dr",
    ].join("\n");
    expect(parseAxis(text)).toMatchObject({
      dueDate: "27/10/2025",
      statementDate: "08/10/2025",
      totalAmountDue: "18450.40",
      minimumAmountDue: "922.00",
    });
  });
});

describe("parseAxis, on pdf.js's text", () => {
  // Made-up numbers, laid out the way pdf.js extracts a real statement (#56).
  const summary =
    "PAYMENT SUMMARY  Total Payment Due   Minimum Payment Due   Statement Period   Payment Due Date   Statement Generation Date " +
    "20/05/2026 - 19/06/2026   09/07/2026   19/06/2026 12,345.67   Dr   1,234.00   Dr Credit Card Number   Credit Limit ";
  const accountSummary =
    "Previous Balance - Payments - Credits + Purchase + Cash Advance + Other Debit&Charges =Total Payment Due " +
    "9,999.99 Dr   9,999.99   100.00   12,345.67   0.00   100.00   12,245.67   Dr  Account Summary";

  it("reads the payment summary row", () => {
    expect(parseAxis(summary + accountSummary)).toMatchObject({
      dueDate: "09/07/2026",
      statementDate: "19/06/2026",
      totalAmountDue: "12345.67",
      minimumAmountDue: "1234.00",
    });
  });

  it("never takes the previous balance after the account summary's '=Total Payment Due' for the total", () => {
    expect(parseAxis(accountSummary).totalAmountDue).toBeUndefined();
  });
});

describe("parseSbi", () => {
  it("parses standard key-value fields", () => {
    const text = "Total Amount Due: Rs. 12,345.00\nMinimum Amount Due: Rs. 600.00\nPayment Due Date: 05/03/2026\nStatement Date: 10/02/2026";
    expect(parseSbi(text)).toMatchObject({
      totalAmountDue: "12345.00",
      minimumAmountDue: "600.00",
      dueDate: "05/03/2026",
      statementDate: "10/02/2026",
    });
  });
});

describe("parseYes", () => {
  it("parses the label-then-newline-then-amount layout", () => {
    const text =
      "Total Amount Due:\nRs. 2,736.40\nMinimum Amount Due:\nRs. 150.00\nPayment Due Date: 21/12/2025\nStatement Date : 01/12/2025";
    expect(parseYes(text)).toMatchObject({
      totalAmountDue: "2736.40",
      minimumAmountDue: "150.00",
      dueDate: "21/12/2025",
      statementDate: "01/12/2025",
    });
  });
});

describe("parseKotak", () => {
  it("parses standard key-value fields", () => {
    const text = "Total Amount Due: Rs. 8,000.00\nMinimum Amount Due: Rs. 400.00\nDue Date: 12/03/2026\nStatement Date: 15/02/2026";
    expect(parseKotak(text)).toMatchObject({
      totalAmountDue: "8000.00",
      minimumAmountDue: "400.00",
      dueDate: "12/03/2026",
      statementDate: "15/02/2026",
    });
  });
});

describe("parseAmex", () => {
  it("parses New Balance / Minimum Payment Due / Please Pay By / Closing Date", () => {
    const text = "New Balance: $1,234.56\nMinimum Payment Due: $35.00\nPlease Pay By: 15/01/2026\nClosing Date: 20/12/2025";
    expect(parseAmex(text)).toMatchObject({
      totalAmountDue: "1234.56",
      minimumAmountDue: "35.00",
      dueDate: "15/01/2026",
      statementDate: "20/12/2025",
    });
  });

  it("falls back to the word-date Pay By format", () => {
    const text = "New Balance: $1,234.56\nMinimum Payment Due: $35.00\nPay By: January 15, 2026";
    expect(parseAmex(text).dueDate).toBe("January 15, 2026");
  });
});

describe("parseCsb", () => {
  it("takes the first two Rs. amounts as total/min and reads the trailing dates", () => {
    const text = "Some spaced text\nRs. 9,614.20 19 Dec 2025\nRs. 480.00 29/11/2025";
    expect(parseCsb(text)).toMatchObject({
      totalAmountDue: "9614.20",
      minimumAmountDue: "480.00",
      dueDate: "19 Dec 2025",
      statementDate: "29/11/2025",
    });
  });
});

describe("parseCsb, on pdf.js's text", () => {
  // Made-up numbers, laid out the way pdf.js extracts a real statement (#56):
  // total and due date, minimum and generation date, then the summary and the
  // statement period.
  const tail = " Rs. 50,000   Rs. 48,800   Pay your bill now  10/01/2026   Rs. 400.00 Rs. 1,200.00 Rs. 0.00 Rs. 1,200.00 10 JAN 2026 - 09 FEB 2026  Page 1 of 4";

  it("reads the due date after the total", () => {
    const text = `XXXX XXXX XXXX 1111  Rs. 1,200.00   02 MAR 2026  Rs. 200.00   10/02/2026${tail}`;
    expect(parseCsb(text)).toMatchObject({ totalAmountDue: "1200.00", minimumAmountDue: "200.00", dueDate: "02 MAR 2026", statementDate: "10/02/2026" });
  });

  it("finds no due date when the bill is due 'Immediate', rather than the statement period's start", () => {
    const text = `XXXX XXXX XXXX 1111  Rs. 1,200.00   Immediate  Rs. 200.00   10/02/2026${tail}`;
    expect(parseCsb(text)).toMatchObject({ totalAmountDue: "1200.00", minimumAmountDue: "200.00", statementDate: "10/02/2026" });
    expect(parseStatement(`CSB Bank ${text}`).dueDate).toBeUndefined();
  });

  it("finds no due date on a closed card's last bill, which has none", () => {
    const text = `XXXX XXXX XXXX 1111  Rs. 0.00  Rs. 0.00   10/03/2026${tail}`;
    expect(parseCsb(text).dueDate).toBeUndefined();
  });
});

describe("parseGeneric", () => {
  it("parses common cross-bank label patterns", () => {
    const text = "Total Amount Due: Rs. 999.00\nMinimum Amount Due: Rs. 99.00\nDue Date: 01/01/2026\nStatement Date: 01/12/2025";
    expect(parseGeneric(text)).toMatchObject({
      bank: "unknown",
      totalAmountDue: "999.00",
      minimumAmountDue: "99.00",
      dueDate: "01/01/2026",
      statementDate: "01/12/2025",
    });
  });
});
