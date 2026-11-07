import { describe, expect, it } from "vitest";
import type { InvestmentTarget } from "../sheets/types";
import { planTargetWrites, readTargetsForm, targetFieldValues } from "./targetsForm";

const row = (o: Partial<InvestmentTarget>): InvestmentTarget => ({ id: "r", kind: "Target", name: "Gold", percent: 5, ...o });

describe("readTargetsForm", () => {
  it("reads the numbers typed and leaves a blank one not set", () => {
    const r = readTargetsForm({ "India-Equity": "35", "US-Equity": "50%", Debt: "", Gold: "", Dollars: "70", "One-Holding": "" });
    expect(r).toEqual({ ok: true, input: { "India-Equity": 35, "US-Equity": 50, Dollars: 70 } });
  });

  it("is happy with nothing at all, which clears everything", () => {
    expect(readTargetsForm({})).toEqual({ ok: true, input: {} });
  });

  it("refuses words, numbers out of range and 0.35 for 35%", () => {
    const r = readTargetsForm({ Dollars: "lots", Gold: "120", "One-Holding": "0.3" });
    expect(r.ok === false && r.errors).toEqual({ Dollars: expect.stringMatching(/as a number/), Gold: expect.stringMatching(/0 to 100/), "One-Holding": expect.stringMatching(/35 for 35%/) });
  });

  it("allows 0 as a share, and a limit of 100", () => {
    expect(readTargetsForm({ Gold: "0", Dollars: "100" }).ok).toBe(true);
  });

  it("needs targets to add up to no more than 100, and to exactly 100 when all four are set", () => {
    const over = readTargetsForm({ "India-Equity": "60", "US-Equity": "50" });
    expect(over.ok === false && over.errors["India-Equity"]).toMatch(/110%.*more than 100/);
    const four = readTargetsForm({ "India-Equity": "35", "US-Equity": "50", Debt: "10", Gold: "4" });
    expect(four.ok === false && four.errors["India-Equity"]).toMatch(/99%.*should add up to 100/);
    expect(readTargetsForm({ "India-Equity": "35", "US-Equity": "50", Debt: "10", Gold: "5" }).ok).toBe(true);
  });

  it("lets fewer than four targets add up to less than 100, and thirds add up", () => {
    expect(readTargetsForm({ "India-Equity": "30" }).ok).toBe(true);
    expect(readTargetsForm({ "India-Equity": "33.3", "US-Equity": "33.3", Debt: "33.4" }).ok).toBe(true);
  });
});

describe("planTargetWrites", () => {
  it("creates what is new, with its kind, updates what changed, removes what was blanked and leaves the rest", () => {
    const existing = [row({ id: "g", name: "Gold", percent: 5 }), row({ id: "d", kind: "Limit", name: "Dollars", percent: 70 }), row({ id: "c", kind: "Target", name: "Debt", percent: 10 })];
    const w = planTargetWrites(existing, { Gold: 7.5, Dollars: 70, "US-Equity": 50, "One-Holding": 30 });
    expect(w.create).toEqual([{ kind: "Target", name: "US-Equity", percent: 50 }, { kind: "Limit", name: "One-Holding", percent: 30 }]);
    expect(w.update).toEqual([{ id: "g", percent: 7.5 }]);
    expect(w.remove).toEqual(["c"]);
  });

  it("does nothing when nothing changed", () => {
    expect(planTargetWrites([row({ id: "g" })], { Gold: 5 })).toEqual({ create: [], update: [], remove: [] });
  });

  it("keeps one row for a name that has two", () => {
    const w = planTargetWrites([row({ id: "a", percent: 5 }), row({ id: "b", percent: 9 })], { Gold: 5 });
    expect(w.remove).toEqual(["b"]);
    expect(w.update).toEqual([]);
  });
});

describe("targetFieldValues", () => {
  it("fills each name with its saved percent, blank when not set", () => {
    const v = targetFieldValues([row({ percent: 7.5 })]);
    expect(v.Gold).toBe("7.5");
    expect(v.Dollars).toBe("");
    expect(Object.keys(v)).toHaveLength(8);
  });
});
