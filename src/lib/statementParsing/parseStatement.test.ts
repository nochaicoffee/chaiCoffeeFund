import { describe, expect, it } from "vitest";
import { parseGeneric } from "./bankParsers";
import { parseStatement } from "./parseStatement";

describe("parseStatement", () => {
  it("auto-detects the bank and routes to its parser", () => {
    const text = "HDFC Bank\nTOTAL AMOUNT DUE\nC18,264.00\nMINIMUM DUE\nC915.00\nDUE DATE\n23 Jun 2025\nAs on : 03 Jun, 2025";
    const details = parseStatement(text);
    expect(details.bank).toBe("hdfc");
    expect(details.totalAmountDue).toBe("18264.00");
  });

  it("respects an explicitly given bank instead of detecting", () => {
    const text = "Total Amount Due: Rs. 999.00\nMinimum Amount Due: Rs. 99.00\nDue Date: 01/01/2026\nStatement Date: 01/12/2025";
    const details = parseStatement(text, "sbi");
    expect(details.bank).toBe("sbi");
  });

  it("never fills a known bank's gaps from the generic patterns (#89)", () => {
    // ICICI's own parser finds the amounts, but none of these wordings for the
    // dates; the generic patterns would. They search the whole text, so a gap
    // filled from them can come from anywhere, like a worked example (#86).
    const text = "ICICI Bank\nÁ365.00\nÁ5,742.30\nBill Date: 03/11/2025\nPay By: 21/11/2025";
    const details = parseStatement(text);
    expect(details).toEqual({ bank: "icici", minimumAmountDue: "365.00", totalAmountDue: "5742.30" });
    expect(parseGeneric(text)).toMatchObject({ statementDate: "03/11/2025", dueDate: "21/11/2025" });
  });

  it("falls back to the generic parser entirely for an unrecognized bank", () => {
    const text = "Total Amount Due: Rs. 500.00\nMinimum Amount Due: Rs. 50.00\nDue Date: 01/01/2026\nStatement Date: 01/12/2025";
    expect(parseStatement(text).bank).toBe("unknown");
  });
});
