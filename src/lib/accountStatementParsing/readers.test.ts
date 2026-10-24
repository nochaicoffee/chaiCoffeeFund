import { describe, expect, it } from "vitest";
import { isoFrom, last4Of, parseNamedMonthDate, parseRupees, parseSlashDate } from "./readers";

describe("parseRupees", () => {
  it("reads lakh grouping, ₹ and Rs, and any number of decimals", () => {
    expect(parseRupees("₹1,23,456.78")).toBe(123456.78);
    expect(parseRupees("Rs. 500")).toBe(500);
    expect(parseRupees("₹99.9")).toBe(99.9);
    expect(parseRupees("₹5")).toBe(5);
  });
  it("reads negatives: a leading minus, brackets, or Dr", () => {
    expect(parseRupees("-₹2,500")).toBe(-2500);
    expect(parseRupees("₹-2,500.50")).toBe(-2500.5);
    expect(parseRupees("(1,000.00)")).toBe(-1000);
    expect(parseRupees("1,000.00 Dr")).toBe(-1000);
    expect(parseRupees("1,000.00 Cr")).toBe(1000);
  });
  it("rounds to the paisa, so float noise never reaches a comparison", () => {
    expect(parseRupees("0.1")! + parseRupees("0.2")!).not.toBe(0.3);
    expect(Math.round((parseRupees("0.1")! + parseRupees("0.2")!) * 100)).toBe(30);
  });
  it("says null for anything that is not an amount", () => {
    for (const bad of ["", "abc", "₹", "1,2,x", ".5", "12.34.56", "--5"]) expect(parseRupees(bad)).toBeNull();
  });
});

describe("dates", () => {
  it("reads a named month with a two- or four-digit year, with spaces, an apostrophe or hyphens", () => {
    expect(parseNamedMonthDate("21 Aug '25")).toBe("2025-08-21");
    expect(parseNamedMonthDate("1 Sep 2026")).toBe("2026-09-01");
    expect(parseNamedMonthDate("31-AUG-2026")).toBe("2026-08-31");
  });
  it("refuses a day that is not on the calendar", () => {
    expect(parseNamedMonthDate("31 Feb '26")).toBeNull();
    expect(parseSlashDate("29/02/2026")).toBeNull();
    expect(parseSlashDate("29/02/2028")).toBe("2028-02-29");
    expect(isoFrom(2026, 13, 1)).toBeNull();
  });
  it("reads day-first slash dates", () => {
    expect(parseSlashDate("05/10/26")).toBe("2026-10-05");
    expect(parseSlashDate("05/10/2026")).toBe("2026-10-05");
  });
});

describe("last4Of", () => {
  it("takes the last 4 digits, keeping a leading zero, ignoring spaces and X masks", () => {
    expect(last4Of("XXXXXXXX0042")).toBe("0042");
    expect(last4Of("5010 0123 4567")).toBe("4567");
    expect(last4Of("12")).toBeUndefined();
  });
});
