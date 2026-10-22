import { describe, expect, it } from "vitest";
import { cardName, formatPercent, optionLabel, ordinal } from "./labels";

describe("optionLabel", () => {
  it("shows hyphenated dropdown values with spaces", () => {
    expect(optionLabel("HDFC-Bank")).toBe("HDFC Bank");
    expect(optionLabel("AU-Small-Finance-Bank")).toBe("AU Small Finance Bank");
    expect(optionLabel("Reward-Points")).toBe("Reward Points");
    expect(optionLabel("Cashback")).toBe("Cashback");
  });
});

describe("cardName", () => {
  it("is the short name, or the full name when there's no short name", () => {
    expect(cardName({ name: "HDFC Bank Regalia Gold Credit Card", alias: "Regalia Gold" })).toBe("Regalia Gold");
    expect(cardName({ name: "HDFC Bank Regalia Gold Credit Card", alias: "  " })).toBe("HDFC Bank Regalia Gold Credit Card");
  });
});

describe("ordinal", () => {
  it("says the day of the month", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "31st"]);
  });
});

describe("formatPercent", () => {
  it("shows whole percents from 10%, one decimal below, and a dash with no limit", () => {
    expect(formatPercent(0.321)).toBe("32%");
    expect(formatPercent(0.0425)).toBe("4.3%");
    expect(formatPercent(0.04)).toBe("4%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(null)).toBe("–");
  });
});
