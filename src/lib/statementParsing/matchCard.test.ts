import { describe, expect, it } from "vitest";
import { matchCard } from "./matchCard";
import type { Card } from "@/lib/sheets/types";

function makeCard(overrides: Partial<Card>): Card {
  return {
    id: overrides.id ?? "id",
    name: "Test Card",
    alias: "TestCard",
    issuer: "Other",
    cardType: "Cashback",
    creditLimit: 100000,
    statementDay: 1,
    dueDayBuffer: 19,
    status: "Active",
    ...overrides,
  };
}

describe("matchCard", () => {
  it("matches by name via bidirectional contains", () => {
    const card = makeCard({ id: "1", name: "HDFC Bank Regalia Credit Card", alias: "Regalia" });
    const result = matchCard("HDFC Bank Regalia Credit Card", [card]);
    expect(result).toEqual({ card });
  });

  it("matches by alias when the extracted name is a substring of it", () => {
    const card = makeCard({ id: "1", name: "Amazon Pay ICICI Bank Credit Card", alias: "Amazon Pay ICICI" });
    const result = matchCard("Amazon Pay ICICI", [card]);
    expect(result).toEqual({ card });
  });

  it("reports ambiguity for two cards whose names overlap, rather than guessing", () => {
    const regalia = makeCard({ id: "1", name: "Regalia Credit Card", alias: "Regalia" });
    const regaliaGold = makeCard({ id: "2", name: "Regalia Gold Credit Card", alias: "Regalia Gold" });
    const result = matchCard("Regalia Credit Card", [regalia, regaliaGold]);
    expect(result).toHaveProperty("ambiguous");
    if ("ambiguous" in result) {
      expect(result.ambiguous.map((c) => c.id).sort()).toEqual(["1", "2"]);
    }
  });

  it("falls back to emailMatchKeywords when name/alias don't match", () => {
    const card = makeCard({ id: "1", name: "Edge Credit Card", alias: "Edge", emailMatchKeywords: "jupiter, csb" });
    const result = matchCard("CSB Bank RuPay Credit Card", [card]);
    expect(result).toEqual({ card });
  });

  it("reports ambiguity when more than one card's keywords match", () => {
    const cardA = makeCard({ id: "1", name: "First Card", alias: "First", emailMatchKeywords: "rupay" });
    const cardB = makeCard({ id: "2", name: "Second Card", alias: "Second", emailMatchKeywords: "rupay" });
    const result = matchCard("Some RuPay Credit Card", [cardA, cardB]);
    expect(result).toHaveProperty("ambiguous");
  });

  it("reports no match when nothing lines up", () => {
    const card = makeCard({ id: "1", name: "Unrelated Card", alias: "Unrelated" });
    expect(matchCard("Totally Different Card", [card])).toEqual({ noMatch: true });
  });
});
