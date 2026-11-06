import { describe, expect, it } from "vitest";
import { formatLakh, lakhParts } from "./lakh";

describe("formatLakh", () => {
  it("writes lakhs from a lakh, crores from a crore and plain rupees below, with two decimals", () => {
    expect(formatLakh(3069223)).toBe("₹30.69L");
    expect(formatLakh(12_500_000)).toBe("₹1.25Cr");
    expect(formatLakh(24570)).toBe("₹24,570");
  });

  it("keeps a negative amount's sign in its parts, with the typographic minus", () => {
    expect(lakhParts(-250000)).toEqual({ amount: "−2.50", unit: "L" });
  });
});
