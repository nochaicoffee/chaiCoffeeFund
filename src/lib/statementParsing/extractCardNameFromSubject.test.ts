import { describe, expect, it } from "vitest";
import { extractCardNameFromSubject } from "./extractCardNameFromSubject";

describe("extractCardNameFromSubject", () => {
  it("strips a leading date range and RuPay suffix", () => {
    expect(extractCardNameFromSubject("Your 17 Dec 2025 - 16 Jan 2026 Edge CSB Bank RuPay Credit Card Statement")).toBe(
      "Edge CSB Bank Credit Card",
    );
  });

  it("keeps an issuer - variant name and trailing period", () => {
    expect(extractCardNameFromSubject("Your HDFC Bank - Regalia Gold Credit Card Statement - January 2026")).toBe(
      "HDFC Bank - Regalia Gold Credit Card",
    );
  });

  it("falls back to the trimmed subject when no 'Credit Card' phrase is found", () => {
    expect(extractCardNameFromSubject("  Your monthly account summary  ")).toBe("Your monthly account summary");
  });
});
