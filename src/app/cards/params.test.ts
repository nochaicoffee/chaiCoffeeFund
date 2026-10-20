import { describe, expect, it } from "vitest";
import { cardsQuery, parsePage, parseShowClosed, parsePanel, parsePeriod, parseSearch, parseSelectedCard, parseSort, parseStatus, periodMenu, periodYears, statementsQuery } from "./params";
import type { Card, Statement } from "@/lib/sheets/types";

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

describe("Statements page params", () => {
  it("reads the status, sort, search and page, falling back to the defaults", () => {
    expect(parseStatus({ status: "pending" })).toBe("pending");
    expect(parseStatus({ status: "paid" })).toBe("paid");
    expect(parseStatus({ status: "other" })).toBe("all");
    expect(parseSort({ sort: "oldest" })).toBe("oldest");
    expect(parseSort({})).toBe("newest");
    expect(parseSearch({ q: "  hdfc  " })).toBe("hdfc");
    expect(parseSearch({ q: "x".repeat(500) })).toHaveLength(100);
    expect(parseSearch({})).toBe("");
    expect(parsePage({ page: "3" })).toBe(3);
    expect(parsePage({ page: "0" })).toBe(1);
    expect(parsePage({ page: "2.5" })).toBe(1);
    expect(parsePage({ page: "abc" })).toBe(1);
  });

  it("builds links that keep every choice except the defaults", () => {
    const thisYear = { kind: "year", year: 2026 } as const;
    expect(statementsQuery({ period: thisYear, status: "all", sort: "newest", page: 1, demo: false }, TODAY)).toBe("?");
    expect(statementsQuery({ period: { kind: "all" }, cardId: "regalia", status: "pending", search: "38,500", sort: "oldest", page: 2, demo: true }, TODAY)).toBe(
      "?card=regalia&period=all&status=pending&q=38%2C500&sort=oldest&page=2&demo",
    );
  });
});

describe("closed cards in the card row", () => {
  it("opens with ?closed=1 and keeps it in links", () => {
    expect(parseShowClosed({ closed: "1" })).toBe(true);
    expect(parseShowClosed({})).toBe(false);
    expect(cardsQuery({ period: { kind: "year", year: 2026 }, cardId: "edge", showClosed: true, demo: false }, TODAY)).toBe("?card=edge&closed=1");
  });
});

describe("periodMenu", () => {
  const card = (id: string) => ({ id }) as Card;
  const statement = (id: string, cardId: string, statementDate: string, totalAmountDue: number) =>
    ({ id, cardId, statementDate, dueDate: statementDate, totalAmountDue, minimumAmountDue: 0, amountPaid: 0, status: "Paid" }) as Statement;
  const spend = {
    cards: [card("regalia"), card("amazon")],
    statements: [statement("a", "regalia", "2026-03-04", 41000), statement("b", "amazon", "2026-03-12", 9000), statement("c", "regalia", "2024-11-04", 240000)],
  };

  it("offers this year, every other year with statements and all time, each with its spend, newest first", () => {
    expect(periodMenu(spend, { kind: "year", year: 2026 }, TODAY)).toEqual([
      { value: "", label: "This year", meta: "₹50.0k" },
      { value: "2024", label: "2024", meta: "₹2.4L" },
      { value: "all", label: "All time", meta: "₹2.9L" },
    ]);
  });

  it("totals the selected card only, and keeps a year without statements when it's the one shown", () => {
    expect(periodMenu(spend, { kind: "year", year: 2025 }, TODAY, "amazon")).toEqual([
      { value: "", label: "This year", meta: "₹9.0k" },
      { value: "2025", label: "2025", meta: "₹0" },
      { value: "2024", label: "2024", meta: "₹0" },
      { value: "all", label: "All time", meta: "₹9.0k" },
    ]);
  });
});
