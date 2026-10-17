import { describe, expect, it } from "vitest";
import { toClientCard } from "./clientCard";
import type { Card } from "../sheets/types";

const card: Card = {
  id: "c1",
  name: "Card",
  alias: "C",
  issuer: "Other",
  cardType: "Cashback",
  creditLimit: 1000,
  statementDay: 5,
  dueDayBuffer: 20,
  status: "Active",
  statementPdfPassword: "FAKE-PDF-PASSWORD",
};

describe("toClientCard", () => {
  it("drops the PDF password and says whether one is saved", () => {
    const client = toClientCard(card);
    expect(JSON.stringify(client)).not.toContain("FAKE-PDF-PASSWORD");
    expect(client.hasPdfPassword).toBe(true);
    expect(toClientCard({ ...card, statementPdfPassword: undefined }).hasPdfPassword).toBe(false);
  });
});
