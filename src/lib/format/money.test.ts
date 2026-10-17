import { describe, expect, it } from "vitest";
import { formatInr, formatInrCompact, formatInrExact } from "./money";

describe("formatInr", () => {
  it("uses Indian digit grouping", () => {
    expect(formatInr(239700)).toBe("₹2,39,700");
    expect(formatInr(400000)).toBe("₹4,00,000");
    expect(formatInr(12500000)).toBe("₹1,25,00,000");
  });

  it("rounds to whole rupees", () => {
    expect(formatInr(47939.6)).toBe("₹47,940");
  });

  it("shows negatives with a typographic minus", () => {
    expect(formatInr(-6400)).toBe("−₹6,400");
  });

  it("never shows a negative zero", () => {
    expect(formatInr(0)).toBe("₹0");
    expect(formatInr(-0.2)).toBe("₹0");
  });
});

describe("formatInrExact", () => {
  it("shows paise only when there are any, with Indian grouping", () => {
    expect(formatInrExact(38500)).toBe("₹38,500");
    expect(formatInrExact(238512.4)).toBe("₹2,38,512.40");
    expect(formatInrExact(0.1)).toBe("₹0.10");
    expect(formatInrExact(250.5)).toBe("₹250.50");
  });

  it("rounds to the paisa, and never shows a negative zero", () => {
    expect(formatInrExact(100.3 - 100.2)).toBe("₹0.10");
    expect(formatInrExact(-0.001)).toBe("₹0");
    expect(formatInrExact(-6400.25)).toBe("−₹6,400.25");
    expect(formatInrExact(Number.NaN)).toBe("—");
  });
});

describe("formatInrCompact", () => {
  it("matches the design's chart labels", () => {
    expect(formatInrCompact(41000)).toBe("₹41.0k");
    expect(formatInrCompact(57300)).toBe("₹57.3k");
    expect(formatInrCompact(47940)).toBe("₹47.9k");
    expect(formatInrCompact(12400)).toBe("₹12.4k");
  });

  it("keeps small amounts whole", () => {
    expect(formatInrCompact(950)).toBe("₹950");
    expect(formatInrCompact(0)).toBe("₹0");
  });

  it("uses lakhs from 1,00,000 and crores from 1,00,00,000", () => {
    expect(formatInrCompact(240000)).toBe("₹2.4L");
    expect(formatInrCompact(12500000)).toBe("₹1.3Cr");
    expect(formatInrCompact(250000000)).toBe("₹25.0Cr");
  });

  it("moves to the next unit only when rounding reaches it", () => {
    expect(formatInrCompact(99960)).toBe("₹1.0L");
    expect(formatInrCompact(9999999)).toBe("₹1.0Cr");
    expect(formatInrCompact(100000)).toBe("₹1.0L");
  });

  it("keeps amounts just under a unit in the smaller unit", () => {
    expect(formatInrCompact(95000)).toBe("₹95.0k");
    expect(formatInrCompact(99949)).toBe("₹99.9k");
    expect(formatInrCompact(9500000)).toBe("₹95.0L");
  });

  it("rounds .x5 amounts up consistently", () => {
    expect(formatInrCompact(12450)).toBe("₹12.5k");
    expect(formatInrCompact(1050)).toBe("₹1.1k");
  });

  it("shows negatives with a typographic minus", () => {
    expect(formatInrCompact(-6400)).toBe("−₹6.4k");
  });
});

describe("invalid amounts", () => {
  it("shows a dash instead of NaN or Infinity", () => {
    expect(formatInr(Number.NaN)).toBe("\u2014");
    expect(formatInrCompact(Number.NaN)).toBe("\u2014");
    expect(formatInr(Number.POSITIVE_INFINITY)).toBe("\u2014");
  });
});
