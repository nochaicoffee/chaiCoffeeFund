import { describe, expect, it } from "vitest";
import { HIS_ENTRIES } from "@/lib/aggregate/epf.fixture";
import { fixedIncome } from "@/lib/aggregate/fixedIncome";
import { HIS_DEPOSITS } from "@/lib/aggregate/fixedIncome.fixture";
import type { EpfAccount } from "@/lib/sheets/types";
import { attentionView, doorsView, formatLakh, greetingView, lakhParts, stagesView, summarySentence } from "./views";

const TODAY = "2026-11-05";
const account: EpfAccount = { id: "epf-1", name: "NetApp India", status: "Active", confirmedThrough: "2026-11-04" };
const input = { epfAccounts: [account], epfEntries: HIS_ENTRIES, epfRates: [], deposits: HIS_DEPOSITS };
const f = fixedIncome(input, TODAY);
const text = (parts: ReturnType<typeof summarySentence>) => parts.map((p) => p.text).join("");

describe("formatLakh", () => {
  it("sets lakhs and crores to two decimals, as the design does, and small sums in rupees", () => {
    expect(formatLakh(1076000)).toBe("₹10.76L");
    expect(lakhParts(952566)).toEqual({ amount: "9.53", unit: "L" });
    expect(formatLakh(25000000)).toBe("₹2.50Cr");
    expect(formatLakh(3020)).toBe("₹3,020");
    expect(formatLakh(-123456)).toBe("₹−1.23L");
  });
});

describe("the greeting, on his real numbers", () => {
  it("reads as the design's sentence, with the figures that point", () => {
    const parts = summarySentence(f);
    expect(text(parts)).toMatch(/^Your fixed income is worth ₹10\.76L: EPF ₹9\.53L and 7 deposits ₹1\.23L, earning about ₹241 a day\. EPF has about ₹39,00\d of this year's interest built up and not yet credited\. The next deposit matures in 10 months\.$/);
    expect(parts.filter((p) => p.strong).map((p) => p.point)).toEqual(["total", "epf", "deposits", "perDay", "interest", "next"]);
  });
  it("every pointing figure has a card, and a figure with nothing behind it has none", () => {
    const cards = greetingView(f, TODAY);
    for (const part of summarySentence(f).filter((p) => p.point)) expect(cards[part.point as keyof typeof cards], part.point).toBeDefined();
    const none = fixedIncome({ ...input, epfAccounts: [], epfEntries: [], deposits: [] }, TODAY);
    expect(greetingView(none, TODAY)).toEqual({});
    expect(text(summarySentence(none))).toMatch(/^Nothing here yet/);
  });
  it("the cards say what is behind each figure", () => {
    const cards = greetingView(f, TODAY);
    expect(cards.epf?.rows.map((r) => [r.name, r.amount])).toEqual([["Employee", "₹4,76,283"], ["Employer", "₹4,76,283"], ["Pension (EPS)", "₹0"]]);
    expect(cards.deposits?.rows).toHaveLength(7);
    expect(cards.interest).toMatchObject({ title: "EPF interest, not credited yet" });
    expect(cards.interest?.rows.map((r) => r.name)).toEqual(["Rate used", "Months counted this year", "Credited last year"]);
    expect(cards.interest?.rows[1]).toMatchObject({ amount: "7", note: "Apr to Oct" });
    expect(cards.next?.total).toBe("Sep 14");
  });
  it("with only EPF, or only deposits, the sentence drops what isn't there", () => {
    expect(text(summarySentence(fixedIncome({ ...input, deposits: [] }, TODAY)))).toMatch(/^Your fixed income is worth ₹9\.53L, all of it EPF, earning about ₹215 a day\. EPF has/);
    expect(text(summarySentence(fixedIncome({ ...input, epfAccounts: [], epfEntries: [] }, TODAY)))).toMatch(/^Your fixed income is worth ₹1\.23L, all of it 7 deposits, earning about ₹2\d a day\. The next deposit matures in 10 months\.$/);
  });
});

describe("what needs attention", () => {
  it("is the EPF interest still to be credited, and the deposits missing their bank and maturity amount", () => {
    expect(attentionView(f, TODAY).map((i) => i.kind)).toEqual(["interest", "incomplete"]);
    expect(attentionView(f, TODAY)[0].title).toBe("EPF's FY 2026-27 interest isn't credited yet.");
    expect(attentionView(f, TODAY)[1].title).toBe("The 7 deposits have no bank and no maturity amount.");
  });
  it("adds a deposit that has matured and isn't closed, and an EPF credit that is late, before those", () => {
    const matured = { ...HIS_DEPOSITS[0], id: "m", startDate: "2025-01-01", maturityDate: "2026-07-02" };
    const late = fixedIncome({ ...input, epfAccounts: [{ ...account, confirmedThrough: "2026-11-25" }], deposits: [matured] }, "2026-11-25");
    const items = attentionView(late, "2026-11-25");
    expect(items.map((i) => i.kind)).toEqual(["late", "due", "interest", "incomplete"]);
    expect(items[1].depositId).toBe("m");
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
  it("gives each late month its own item", () => {
    const entries = HIS_ENTRIES.filter((e) => e.wageMonth !== "2026-09" && e.wageMonth !== "2026-08");
    const late = fixedIncome({ ...input, epfEntries: entries, epfAccounts: [{ ...account, confirmedThrough: "2026-12-30" }] }, "2026-12-30");
    const lates = attentionView(late, "2026-12-30").filter((i) => i.kind === "late");
    expect(lates.length).toBeGreaterThan(1);
    expect(new Set(lates.map((i) => i.id)).size).toBe(lates.length);
  });
  it("names the year that ended and is waiting for its interest, first", () => {
    const uncredited = HIS_ENTRIES.filter((e) => !(e.kind === "Interest" && e.date === "2026-03-31"));
    const april = fixedIncome({ ...input, epfEntries: uncredited, epfAccounts: [{ ...account, confirmedThrough: "2026-04-20" }] }, "2026-04-20");
    const items = attentionView(april, "2026-04-20");
    expect(items[0]).toMatchObject({ id: "interest-prior", title: "EPF's FY 2025-26 interest isn't credited yet." });
    expect(items[0].text).toMatch(/^The year ended on 31 March\. About ₹40,9\d\d is expected at 8\.25%/);
    expect(text(summarySentence(april))).toMatch(/of interest built up and not yet credited\./);
    expect(greetingView(april, "2026-04-20").interest?.rows.map((r) => r.name)).toEqual(["Rate used", "FY 2025-26, ended", "Credited last year"]);
  });
  it("is empty when there's nothing to say", () => {
    const quiet = fixedIncome({ ...input, epfEntries: [...HIS_ENTRIES], deposits: HIS_DEPOSITS.map((d) => ({ ...d, bankName: "HDFC" })) }, TODAY);
    const none = { ...quiet, epf: { ...quiet.epf, estimate: 0, holdings: quiet.epf.holdings.map((h) => ({ ...h, estimate: { ...h.estimate, amount: 0 } })) } };
    expect(attentionView(none, TODAY)).toEqual([]);
  });
});

describe("the doors and their stages", () => {
  it("three doors: everything, EPF (89% of it) and the deposits", () => {
    const doors = doorsView(f);
    expect(doors.map((d) => [d.id, d.total])).toEqual([["all", "₹10.76L"], ["epf", "₹9.53L"], ["fd", "₹1.23L"]]);
    expect(doors[1].sub).toBe("89% of it · 8.25% a year");
    expect(doors[2].sub).toBe("7 deposits · 7.75%");
    expect(doors[1].fraction + doors[2].fraction).toBeCloseTo(1, 6);
  });
  it("Everything's stage carries the design's four tiles", () => {
    const s = stagesView(input, f, TODAY).all;
    expect(s.big).toEqual({ amount: "10.76", unit: "L" });
    expect(s.tiles.map((t) => t.label)).toEqual(["Earned so far", "Put in", "Earning a month", "First deposit matures"]);
    expect(s.tiles[1].value).toBe("₹10.17L");
    expect(s.tiles[3].value).toBe("Sep 14, 2027");
    expect(s.chips[0]).toBe("Earning ₹241 a day");
    expect(s.chips[1]).toMatch(/^Next in about Nov 18$/);
    expect(s.chart).toMatchObject({ kind: "built" });
  });
  it("EPF's stage is the passbook: this year's contributions, interest not credited, last year's credited, a day", () => {
    const s = stagesView(input, f, TODAY).epf;
    expect(s.caption).toBe("as your passbook says: interest to Mar 31, 2026, contributions to Oct 18");
    expect(s.chips).toEqual(["Rate 8.25%", "Employee ₹4.76L", "Employer ₹4.76L", "Pension ₹0"]);
    expect(s.tiles[0]).toMatchObject({ label: "Put in this year", value: "₹2,32,508", note: "7 credits · ₹39,308 a month now" });
    expect(s.tiles[1]).toMatchObject({ label: "Interest not credited", note: "7 months, at 8.25%" });
    expect(s.tiles[2]).toMatchObject({ value: "₹40,924", note: "on Mar 31, 2026" });
    expect(s.tiles[3].value).toBe("₹215.31");
    expect(s.chart).toMatchObject({ kind: "epf" });
  });
  it("the deposits' stage has one bar for each, and none when none are held", () => {
    const s = stagesView(input, f, TODAY).fd;
    expect(s.chart).toMatchObject({ kind: "deposits" });
    expect(s.chart && s.chart.kind === "deposits" && s.chart.bars).toHaveLength(7);
    const none = fixedIncome({ ...input, deposits: [] }, TODAY);
    expect(stagesView({ ...input, deposits: [] }, none, TODAY).fd.chart).toBeNull();
  });
});
