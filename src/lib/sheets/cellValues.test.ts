import { describe, expect, it } from "vitest";
import { toUserEnteredCell } from "./cellValues";

describe("toUserEnteredCell", () => {
  it("marks text as literal, so Sheets doesn't parse it", () => {
    expect(toUserEnteredCell("0425")).toBe("'0425");
    expect(toUserEnteredCell("01011990")).toBe("'01011990");
    expect(toUserEnteredCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(toUserEnteredCell("Active")).toBe("'Active");
  });

  it("sends numbers as numbers", () => {
    expect(toUserEnteredCell(120000)).toBe(120000);
    expect(toUserEnteredCell(0)).toBe(0);
  });

  it("sends dates as plain ISO text, so Sheets stores them as real dates", () => {
    expect(toUserEnteredCell("2026-08-05", true)).toBe("2026-08-05");
  });

  it("still marks a malformed date as literal text instead of letting Sheets guess", () => {
    expect(toUserEnteredCell("5/8/2026", true)).toBe("'5/8/2026");
  });

  it("keeps a user's own leading apostrophe, since Sheets strips only one", () => {
    expect(toUserEnteredCell("'90s card")).toBe("''90s card");
  });

  it("sends booleans as they are", () => {
    expect(toUserEnteredCell(true)).toBe(true);
  });

  it("refuses NaN and Infinity instead of silently clearing the cell", () => {
    expect(() => toUserEnteredCell(Number.NaN)).toThrow(/silently clear/);
    expect(() => toUserEnteredCell(Number.POSITIVE_INFINITY)).toThrow(/silently clear/);
  });

  it("clears the cell for missing values", () => {
    expect(toUserEnteredCell(undefined)).toBe("");
    expect(toUserEnteredCell(null)).toBe("");
    expect(toUserEnteredCell("")).toBe("");
  });
});
