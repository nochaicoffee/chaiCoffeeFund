import { describe, expect, it } from "vitest";
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

  it("fills gaps left by a bank-specific parser using the generic fallback", () => {
    // ICICI's parser only looks for its rupee glyph and word-dates — give it a
    // statement date in the generic key-value format instead, which its own
    // parser won't find but the generic fallback will.
    const text = "ICICI Bank\nÁ365.00\nÁ5,742.30\nStatement Date: 03/11/2025";
    const details = parseStatement(text);
    expect(details.bank).toBe("icici");
    expect(details.minimumAmountDue).toBe("365.00");
    expect(details.statementDate).toBe("03/11/2025");
  });

  it("falls back to the generic parser entirely for an unrecognized bank", () => {
    const text = "Total Amount Due: Rs. 500.00\nMinimum Amount Due: Rs. 50.00\nDue Date: 01/01/2026\nStatement Date: 01/12/2025";
    expect(parseStatement(text).bank).toBe("unknown");
  });
});
