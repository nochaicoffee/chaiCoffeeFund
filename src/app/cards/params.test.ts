import { describe, expect, it } from "vitest";
import { cardsQuery, parsePanel, parsePeriod, parseSelectedCard, periodYears } from "./params";
import type { Card } from "@/lib/sheets/types";

const TODAY = "2026-10-17";
const data = { cards: [{ id: "regalia" } as Card], statements: [] };

describe("parsePeriod", () => {
  it("defaults to this year", () => {
    expect(parsePeriod({}, TODAY)).toEqual({ kind: "year", year: 2026 });
    expect(parsePeriod({ period: "nonsense" }, TODAY)).toEqual({ kind: "year", year: 2026 });
  });

  it("reads a past year or all time", () => {
    expect(parsePeriod({ period: "2025" }, TODAY)).toEqual({ kind: "year", year: 2025 });
    expect(parsePeriod({ period: "all" }, TODAY)).toEqual({ kind: "all" });
    expect(parsePeriod({ period: ["all", "2025"] }, TODAY)).toEqual({ kind: "all" });
  });
});

describe("parseSelectedCard", () => {
  it("accepts only a card that exists", () => {
    expect(parseSelectedCard({ card: "regalia" }, data)).toBe("regalia");
    expect(parseSelectedCard({ card: "gone" }, data)).toBeUndefined();
    expect(parseSelectedCard({}, data)).toBeUndefined();
  });
});

describe("cardsQuery", () => {
  it("keeps only the choices that differ from the defaults", () => {
    expect(cardsQuery({ period: { kind: "year", year: 2026 }, demo: false }, TODAY)).toBe("?");
    expect(cardsQuery({ period: { kind: "year", year: 2026 }, cardId: "regalia", demo: false }, TODAY)).toBe("?card=regalia");
    expect(cardsQuery({ period: { kind: "all" }, cardId: "regalia", demo: true }, TODAY)).toBe("?card=regalia&period=all&demo");
    expect(cardsQuery({ period: { kind: "year", year: 2025 }, demo: false }, TODAY)).toBe("?period=2025");
  });
});

describe("periodYears", () => {
  it("always offers the year being shown, so the menu matches the page", () => {
    expect(periodYears([2026, 2025], { kind: "year", year: 2023 })).toEqual([2026, 2025, 2023]);
    expect(periodYears([2026, 2025], { kind: "year", year: 2025 })).toEqual([2026, 2025]);
    expect(periodYears([2026], { kind: "all" })).toEqual([2026]);
  });
});

describe("parsePanel", () => {
  it("defaults to statements and keeps range in links", () => {
    expect(parsePanel({})).toBe("statements");
    expect(parsePanel({ panel: "range" })).toBe("range");
    expect(parsePanel({ panel: "other" })).toBe("statements");
    expect(cardsQuery({ period: { kind: "year", year: 2026 }, panel: "range", demo: false }, TODAY)).toBe("?panel=range");
  });
});
