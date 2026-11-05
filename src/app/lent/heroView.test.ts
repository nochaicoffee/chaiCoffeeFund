import { describe, expect, it } from "vitest";
import { ALL, heroView } from "./heroView";
import { lentModel, type LentData } from "./views";
import type { IncomeEntry, IncomeSource, LentLoan, LentRepayment } from "@/lib/sheets/types";

const TODAY = "2026-11-06";
const a: LentLoan = { id: "a", borrowerName: "Friend", principalAmount: 650000, startDate: "2024-10-01", interestMode: "Accruing", interestRate: 12, status: "Active" };
const b: LentLoan = { id: "b", borrowerName: "Friend – ₹3L", principalAmount: 300000, startDate: "2025-11-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: 6000, status: "Active", incomeSourceId: "sb" };
const c: LentLoan = { id: "c", borrowerName: "Friend – ₹1.82L", principalAmount: 182000, startDate: "2026-01-01", interestMode: "Paid-out", payoutFrequency: "Quarterly", payoutAmount: 18000, status: "Active", incomeSourceId: "sc" };
const sb: IncomeSource = { id: "sb", name: "B", alias: "B", category: "Investment", frequency: "Monthly", expectedAmount: 6000, status: "Active", scheduleDate: "2025-12-01" };
const sc: IncomeSource = { id: "sc", name: "C", alias: "C", category: "Investment", frequency: "Quarterly", expectedAmount: 18000, status: "Active", scheduleDate: "2026-04-01" };
let n = 0;
const got = (sourceId: string, expected: string, received: string, amount: number): IncomeEntry => ({ id: `e${++n}`, incomeSourceId: sourceId, expectedDate: expected, receivedDate: received, amount, status: "Received", tag: "Regular" });
const entries: IncomeEntry[] = [
  got("sb", "2025-12-01", "2025-12-01", 6000), got("sb", "2026-01-01", "2026-01-02", 6000), got("sb", "2026-03-01", "2026-03-10", 6000), got("sb", "2026-04-01", "2026-04-01", 6000),
  got("sb", "2026-05-01", "2026-05-02", 6000), got("sb", "2026-06-01", "2026-06-01", 6000), got("sb", "2026-07-01", "2026-07-01", 6000), got("sb", "2026-08-01", "2026-08-03", 6000),
  got("sb", "2026-09-01", "2026-09-01", 6000), got("sb", "2026-10-01", "2026-10-01", 6000),
  got("sc", "2026-04-01", "2026-04-01", 18000), got("sc", "2026-07-01", "2026-07-04", 18000), got("sc", "2026-10-01", "2026-10-01", 18000),
];
const data: LentData = { loans: [a, b, c], repayments: [], sources: [sb, sc], entries };
const pay = (id: string, lentLoanId: string, date: string, amount: number, kind: LentRepayment["kind"]): LentRepayment => ({ id, lentLoanId, date, amount, kind });

describe("heroView on his three loans", () => {
  const h = heroView(lentModel(data, TODAY))!;

  it("has a block per loan, biggest first, with shares of 62.8%, 23.2% and 14.0%", () => {
    expect(h.blocks.map((x) => [x.name, x.owed, x.share])).toEqual([["Friend", "₹8,13,693", "62.8%"], ["Friend – ₹3L", "₹3,00,000", "23.2%"], ["Friend – ₹1.82L", "₹1,82,000", "14.0%"]]);
    expect(h.asList).toBe(false);
    expect(h.keys).toEqual(["all", "a", "b", "c"]);
  });
  it("words each loan's terms and what makes up what is owed", () => {
    expect(h.blocks[0].terms).toBe("12% simple · 766 days out");
    expect(h.blocks[0].composition).toBe("₹6,50,000 principal + ₹1,63,693 interest");
    expect(h.blocks[1].terms).toBe("₹6,000 a month · 24% a year");
    expect(h.blocks[2].terms).toBe("₹18,000 a quarter · 39.6% a year");
    expect(h.blocks[1].composition).toBe("principal · interest is income");
  });
  it("draws the 12% loan's meter (it adds to one) and the ramp of its interest piling up, ending at the top", () => {
    const m = h.blocks[0].meter!;
    expect(m.principal + m.back + m.owed).toBeCloseTo(1, 12);
    expect(h.blocks[0].pile?.text).toBe("Interest piling up since Oct 2024: ₹214 a day, none of it paid");
    const ramp = h.blocks[0].pile!.ramp;
    expect(ramp[0]).toBe(0);
    expect(ramp.at(-1)).toBe(1);
    expect([...ramp].sort((x, y) => x - y)).toEqual(ramp);
    expect(h.blocks[1].pile).toBeUndefined();
  });
  it("shows each payout loan's promised-against-arrived and what isn't here", () => {
    expect(h.blocks[1].promises?.verdicts).toHaveLength(12);
    expect(h.blocks[1].promises?.verdicts.filter((v) => v === "Missing")).toHaveLength(1);
    expect(h.blocks[1].promises?.notHere).toBe("₹12,000 not here");
    expect(h.blocks[2].promises?.notHere).toBeUndefined();
    expect(h.blocks[0].promises).toBeUndefined();
  });
  it("opens Everyone with the three loans without each, in turn: ₹4,82,000 (37%) without Friend", () => {
    const all = h.panes[ALL];
    expect(all.big).toBe("12,95,693");
    expect(all.sub).toBe("owed today, across 3 loans");
    expect(all.chips).toEqual(["Biggest 62.8% with one loan", "Earning ₹608 a day"]);
    expect(all.rows.map((r) => [r.name, r.amount, r.remaining])).toEqual([["Without Friend", "₹4,82,000", "37%"], ["Without Friend – ₹3L", "₹9,95,693", "77%"], ["Without Friend – ₹1.82L", "₹11,13,693", "86%"]]);
  });
  it("opens a loan with what would still be out, the bar, and four tiles", () => {
    const p = h.panes.a;
    expect(p.title).toBe("If Friend didn't pay back");
    expect(p.big).toBe("4,82,000");
    expect(p.sub).toBe("would still be out with Friend – ₹3L and Friend – ₹1.82L");
    expect(p.without?.keepFraction).toBeCloseTo(482000 / 1295693.15, 6);
    expect(p.tiles.map((t) => [t.label, t.value])).toEqual([["You'd have lent out", "₹4,82,000"], ["Out of the total", "63%"], ["Earning a day", "₹395"], ["Net worth's Lent out line", "₹4,82,000"]]);
    expect(p.tiles[2].note).toBe("down from ₹608");
  });
  it("takes each pane's colour from its loan, and Everyone's from the stage", () => {
    expect(h.panes[ALL].colorKey).toBe("sapphire");
    expect(h.panes.a.colorKey).toBe(h.blocks[0].colorKey);
  });
});

describe("heroView in the other cases", () => {
  it("is nothing when nothing is out", () => {
    expect(heroView(lentModel({ loans: [], repayments: [], sources: [], entries: [] }, TODAY))).toBeNull();
    expect(heroView(lentModel({ ...data, loans: [{ ...a, status: "Repaid", closedDate: "2026-01-01" }] }, TODAY))).toBeNull();
  });
  it("keeps a repaid loan as a strip, and shares are over what is still out", () => {
    const h = heroView(lentModel({ ...data, loans: [a, { ...b, status: "Repaid", closedDate: "2026-06-01" }, c] }, TODAY))!;
    expect(h.blocks.map((x) => x.id)).toEqual(["a", "c"]);
    expect(h.repaid).toEqual([{ id: "b", name: "Friend – ₹3L", colorKey: h.panes.a.colorKey === "sapphire" ? "sapphire" : expect.any(String), note: "repaid Jun 1 · ₹3,00,000 lent · owes ₹0" }]);
    expect(h.panes[ALL].sub).toBe("owed today, across 2 loans · 1 repaid");
    expect(h.keys).toEqual(["all", "a", "c"]);
  });
  it("shows what came back on a part-repaid loan, and says 'some' of its interest was paid", () => {
    const h = heroView(lentModel({ ...data, loans: [a], repayments: [pay("r1", "a", "2026-01-01", 200000, "Principal"), pay("r2", "a", "2026-06-01", 5000, "Interest")] }, TODAY))!;
    expect(h.blocks[0].composition).toContain("₹2,00,000 came back");
    expect(h.blocks[0].pile?.text).toContain("some of it paid");
    expect(h.blocks[0].meter!.back).toBeGreaterThan(0);
  });
  it("becomes a list past three, longest first, with the top three and a note", () => {
    const four = ["w", "x", "y", "z"].map((id, i): LentLoan => ({ ...a, id, borrowerName: `P${i}`, principalAmount: 100000 * (i + 1) }));
    const h = heroView(lentModel({ loans: four, repayments: [], sources: [], entries: [] }, TODAY))!;
    expect(h.asList).toBe(true);
    expect(h.blocks.map((x) => x.name)).toEqual(["P3", "P2", "P1", "P0"]);
    expect(h.blocks[0].barFraction).toBe(1);
    expect(h.panes[ALL].rows).toHaveLength(3);
    expect(h.panes[ALL].chips[1]).toMatch(/^Top three hold \d+%$/);
    expect(h.listNote).toBe("4 still out, 0 repaid · scroll for the rest, longest first");
  });
  it("says nothing would still be out for a lone borrower", () => {
    const h = heroView(lentModel({ loans: [a], repayments: [], sources: [], entries: [] }, TODAY))!;
    expect(h.panes.a.sub).toBe("nothing would still be out");
    expect(h.panes.a.big).toBe("0");
  });
});
