import { describe, expect, it } from "vitest";
import { cleanAmount, cleanAmountToNumber, parseFlexibleDateToIso } from "./normalize";

describe("cleanAmount", () => {
  it("strips commas and spaces", () => {
    expect(cleanAmount("16,098.00")).toBe("16098.00");
  });

  it("strips a leading Rs./INR marker", () => {
    expect(cleanAmount("Rs. 5,000.00")).toBe("5000.00");
    expect(cleanAmount("INR 5000")).toBe("5000");
  });

  it("preserves a leading minus sign (credit balance)", () => {
    expect(cleanAmount("-14,238.61")).toBe("-14238.61");
  });
});

describe("cleanAmountToNumber", () => {
  it("converts a cleaned amount to a number", () => {
    expect(cleanAmountToNumber("16,098.00")).toBe(16098);
  });

  it("returns null for undefined or unparsable input", () => {
    expect(cleanAmountToNumber(undefined)).toBeNull();
    expect(cleanAmountToNumber("Nil")).toBeNull();
  });
});

describe("parseFlexibleDateToIso", () => {
  it("parses DD/MM/YYYY as day-first, not month-first", () => {
    expect(parseFlexibleDateToIso("04/09/2025")).toBe("2025-09-04");
  });

  it("parses DD-MM-YYYY", () => {
    expect(parseFlexibleDateToIso("13-01-2026")).toBe("2026-01-13");
  });

  it('parses "DD Mon YYYY" and "DD Mon, YYYY"', () => {
    expect(parseFlexibleDateToIso("04 Feb 2026")).toBe("2026-02-04");
    expect(parseFlexibleDateToIso("15 Jan, 2026")).toBe("2026-01-15");
  });

  it('parses "Month DD, YYYY"', () => {
    expect(parseFlexibleDateToIso("February 04, 2026")).toBe("2026-02-04");
    expect(parseFlexibleDateToIso("August 12, 2026")).toBe("2026-08-12");
  });

  it("passes through an already-ISO date", () => {
    expect(parseFlexibleDateToIso("2026-02-04")).toBe("2026-02-04");
  });

  it("returns null for missing or unparsable input", () => {
    expect(parseFlexibleDateToIso(undefined)).toBeNull();
    expect(parseFlexibleDateToIso("N/A (Credit Balance)")).toBeNull();
  });
});
