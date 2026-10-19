import { describe, expect, it } from "vitest";
import { cleanAmount, cleanAmountToNumber, parseFlexibleDateToIso } from "./normalize";

describe("cleanAmount", () => {
  it("strips commas and spaces", () => {
    expect(cleanAmount("18,264.00")).toBe("18264.00");
  });

  it("strips a leading Rs./INR marker", () => {
    expect(cleanAmount("Rs. 5,000.00")).toBe("5000.00");
    expect(cleanAmount("INR 5000")).toBe("5000");
  });

  it("preserves a leading minus sign (credit balance)", () => {
    expect(cleanAmount("-3,871.25")).toBe("-3871.25");
  });
});

describe("cleanAmountToNumber", () => {
  it("converts a cleaned amount to a number", () => {
    expect(cleanAmountToNumber("18,264.00")).toBe(18264);
  });

  it("returns null for undefined or unparsable input", () => {
    expect(cleanAmountToNumber(undefined)).toBeNull();
    expect(cleanAmountToNumber("Nil")).toBeNull();
  });
});

describe("parseFlexibleDateToIso", () => {
  it("parses DD/MM/YYYY as day-first, not month-first", () => {
    expect(parseFlexibleDateToIso("07/11/2025")).toBe("2025-11-07");
  });

  it("parses DD-MM-YYYY", () => {
    expect(parseFlexibleDateToIso("19-08-2025")).toBe("2025-08-19");
  });

  it('parses "DD Mon YYYY" and "DD Mon, YYYY"', () => {
    expect(parseFlexibleDateToIso("23 Jun 2025")).toBe("2025-06-23");
    expect(parseFlexibleDateToIso("03 Jun, 2025")).toBe("2025-06-03");
  });

  it('parses "Month DD, YYYY"', () => {
    expect(parseFlexibleDateToIso("June 09, 2025")).toBe("2025-06-09");
    expect(parseFlexibleDateToIso("November 3, 2025")).toBe("2025-11-03");
  });

  it("passes through an already-ISO date", () => {
    expect(parseFlexibleDateToIso("2025-06-23")).toBe("2025-06-23");
  });

  it("returns null for missing or unparsable input", () => {
    expect(parseFlexibleDateToIso(undefined)).toBeNull();
    expect(parseFlexibleDateToIso("N/A (Credit Balance)")).toBeNull();
  });
});
