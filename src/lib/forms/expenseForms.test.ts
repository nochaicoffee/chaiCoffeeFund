import { describe, expect, it } from "vitest";
import { readBigSpendForm } from "./expenseForms";

const known = { accountIds: ["hdfc"], cardIds: ["amex"] };
const base = { name: "Flights home", date: "2026-10-03", amount: "18,600", category: "Travel", paidFrom: "card:amex" };

describe("readBigSpendForm", () => {
  it("reads a big spend paid by card, and one paid from an account with a note", () => {
    expect(readBigSpendForm(base, known, "2026-11-09")).toEqual({ ok: true, input: { name: "Flights home", date: "2026-10-03", amount: 18600, category: "Travel", paidFromCardId: "amex" } });
    expect(readBigSpendForm({ ...base, paidFrom: "account:hdfc", note: "Diwali" }, known, "2026-11-09")).toMatchObject({ ok: true, input: { paidFromAccountId: "hdfc", note: "Diwali" } });
  });
  it("lets what paid for it be left blank", () => {
    expect(readBigSpendForm({ ...base, paidFrom: "" }, known, "2026-11-09")).toMatchObject({ ok: true });
  });
  it("says what's wrong, field by field", () => {
    const r = readBigSpendForm({ name: "", date: "2026-12-01", amount: "0", category: "Food", paidFrom: "card:gone" }, known, "2026-11-09");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["amount", "category", "date", "name", "paidFrom"]);
  });
});
