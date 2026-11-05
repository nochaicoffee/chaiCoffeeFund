import { describe, expect, it } from "vitest";
import { HIS_ENTRIES } from "@/lib/aggregate/epf.fixture";
import { fixedIncome } from "@/lib/aggregate/fixedIncome";
import { HIS_DEPOSITS } from "@/lib/aggregate/fixedIncome.fixture";
import type { EpfAccount } from "@/lib/sheets/types";
import { comingUpView, creditsView, depositsTableView, epfCardView, growthView, inPhrase, interestView, moneyInView } from "./widgetsView";

const TODAY = "2026-11-05";
const account: EpfAccount = { id: "epf-1", name: "NetApp India", status: "Active", confirmedThrough: "2026-11-04" };
const input = { epfAccounts: [account], epfEntries: HIS_ENTRIES, epfRates: [], deposits: HIS_DEPOSITS };
const f = fixedIncome(input, TODAY);

describe("inPhrase", () => {
  it("says how far away a day is the way a person does", () => {
    expect(inPhrase("2026-11-18", TODAY)).toBe("in 13 days");
    expect(inPhrase("2026-11-06", TODAY)).toBe("in 1 day");
    expect(inPhrase("2027-03-31", TODAY)).toBe("in 5 months");
    expect(inPhrase("2027-09-14", TODAY)).toBe("in 10 months");
    expect(inPhrase("2028-10-05", TODAY)).toBe("in 1.9 years");
    expect(inPhrase(TODAY, TODAY)).toBe("today");
  });
});

describe("money in each month", () => {
  const v = moneyInView(input, TODAY)!;
  it("a row for each year, twelve cells, labelled in thousands, with a dot where a deposit was placed", () => {
    expect(v.years.map((y) => y.year)).toEqual(["2024", "2025", "2026"]);
    const cell = (year: string, month: string) => v.years.find((y) => y.year === year)!.cells[Number(month) - 1];
    expect(cell("2024", "01")).toMatchObject({ blank: true, label: "" });
    expect(cell("2024", "02")).toMatchObject({ label: "17k", dot: false });
    expect(cell("2026", "08")).toMatchObject({ label: "69k", dot: true, tier: 3 });
    expect(cell("2026", "11")).toMatchObject({ label: "15k", now: true, dot: true });
    expect(cell("2026", "12")).toMatchObject({ blank: true });
  });
  it("the design's three figures", () => {
    expect(v.stats).toEqual([
      { label: "A month, this year", value: "₹42,345", note: "EPF plus deposits, Jan to Oct 2026" },
      { label: "A deposit in", value: "7 of 9 months", note: "since March; none in Jun or Sep so far" },
      { label: "Biggest month", value: "₹69,308", note: "Aug 2026: the credit and the ₹30,000 deposit" },
    ]);
    expect(v.legend.map((l) => l.tier)).toEqual([1, 2, 3]);
  });
  it("is left out with nothing to show", () => {
    expect(moneyInView({ epfEntries: [], deposits: [] }, TODAY)).toBeNull();
  });
});

describe("credits on time", () => {
  const v = creditsView(input, "2026-11-04", TODAY)!;
  it("the days each credit took, the next one due, and the rest still to come", () => {
    const last = v.rows.at(-1)!;
    expect(last.label).toBe("FY 26-27");
    expect(last.dots.slice(0, 8).map((d) => [d.label, d.tone])).toEqual([["1", "ok"], ["1", "ok"], ["1", "ok"], ["26", "late"], ["18", "warn"], ["17", "warn"], ["18", "warn"], ["?", "due"]]);
    expect(last.dots[8]).toMatchObject({ label: "", tone: "none" });
    expect(v.rows[0].dots[0]).toMatchObject({ label: "", tone: "none" });
  });
  it("says what moved: from June's wages the credit comes about the 18th, not the 1st", () => {
    expect(v.note).toBe("From June's wages the credit comes about the 18th, not the 1st: 17 to 26 days after the month, against 1 day before. Worth knowing when a month looks missing.");
  });
  it("the passbook check, a line for each year", () => {
    expect(v.checks[0]).toEqual({ label: "FY 23-24", equation: "₹0 + ₹40,868 + ₹116 = ₹40,984", status: "adds up", detail: "every row from a passbook" });
    expect(v.checks.at(-1)).toMatchObject({ label: "FY 26-27", equation: "₹7,20,058 + ₹2,32,508 + ₹0 = ₹9,52,566", status: "so far" });
  });
  it("flags a year with typed rows", () => {
    const typed = HIS_ENTRIES.map((e) => (e.wageMonth === "2025-05" ? { ...e, source: "Typed" as const } : e));
    expect(creditsView({ epfEntries: typed }, "2026-11-04", TODAY)!.checks[2]).toMatchObject({ status: "typed", detail: "1 row typed, not from a passbook" });
  });
});

describe("the growth path", () => {
  const v = growthView(HIS_ENTRIES, [], undefined, TODAY)!;
  it("5, 10 and 20 years, with what is put in and what is interest", () => {
    expect(v.steps.map((s) => [s.years, s.year])).toEqual([[5, "2031"], [10, "2036"], [20, "2046"]]);
    expect(v.steps[1]).toMatchObject({ now: "₹9.53L", putIn: "₹47.17L" });
    expect(v.steps[1].total).toMatch(/^₹93\.\d\dL$/);
    expect(v.steps[1].split.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(Math.round(v.steps[1].interestOfGrowth * 100)).toBe(44);
    expect(v.perCredit).toBe("₹39,308");
    expect(v.rate).toBe("8.25%");
  });
  it("says what a ₹5,000 higher credit adds, and that nothing assumes a raise", () => {
    expect(v.extra).toMatch(/^If each month's credit were ₹5,000 higher, EPF would be ₹9\.\d\dL more in 10 years\./);
  });
  it("is left out without a credit", () => {
    expect(growthView([], [], undefined, TODAY)).toBeNull();
  });
});

describe("the deposits table", () => {
  const rows = depositsTableView(f, TODAY)!;
  it("a row for each deposit as his app shows it", () => {
    expect(rows).toHaveLength(7);
    expect(rows[0]).toMatchObject({ sub: "18 months 1 day · started Mar 13, 2026", rate: "7.75%", rateNote: "compounds quarterly", placed: "₹15,000", matures: "Sep 14, 2027", maturesIn: "in 10 months", maturesAtNote: "an estimate" });
    expect(rows[0].maturesAt).toMatch(/^₹16,83\d$/);
    expect(Math.round(rows[0].through * 100)).toBe(43);
    expect(rows.find((r) => r.placed === "₹30,000")!.sub).toBe("2 years · started Aug 26, 2026");
  });
  it("a matured deposit says to close it, and a bank's figure replaces the estimate", () => {
    const matured = fixedIncome({ ...input, deposits: [{ ...HIS_DEPOSITS[0], id: "m", startDate: "2025-01-01", maturityDate: "2026-07-02", maturityAmount: 17000 }] }, TODAY);
    expect(depositsTableView(matured, TODAY)![0]).toMatchObject({ maturesIn: "matured: close it", due: true, maturesAt: "₹17,000", maturesAtNote: "the bank's figure" });
  });
  it("is left out with no deposits", () => {
    expect(depositsTableView(fixedIncome({ ...input, deposits: [] }, TODAY), TODAY)).toBeNull();
  });
});

describe("coming up", () => {
  const v = comingUpView(f, input, TODAY)!;
  it("the next dates as the design lists them", () => {
    expect(v.items.slice(0, 3).map((i) => [i.day, i.month, i.title, i.when])).toEqual([
      ["18", "NOV", "EPF contribution", "in 13 days"],
      ["31", "MAR", "EPF year ends", "in 5 months"],
      ["14", "SEP", "₹15,000 FD · 13 Mar matures", "in 10 months"],
    ]);
    expect(v.items[0]).toMatchObject({ note: "October wages, about the 18th", amount: "≈ ₹39,308" });
    expect(v.items[2]).toMatchObject({ note: "18 months 1 day, interest included" });
    expect(v.items[2].amount).toMatch(/^₹16,83\d$/);
  });
});

describe("the EPF card", () => {
  const v = epfCardView(f, input, TODAY)!;
  it("each share, this year's contributions, the interest not credited and each year credited", () => {
    expect(v.account).toBe("NetApp India");
    expect(v.tiles.map((t) => [t.label, t.value, t.note])).toEqual([["Employee", "₹4.76L", "₹4,76,283"], ["Employer", "₹4.76L", "₹4,76,283"], ["Pension (EPS)", "₹0", "none credited"]]);
    expect(v.rows[0]).toEqual({ label: "This year's contributions", note: "7 credits, ₹39,308 a month now", value: "₹2,32,508" });
    expect(v.rows[1]).toMatchObject({ label: "Interest not credited yet", note: "Apr to Oct at 8.25%, an estimate" });
    expect(v.rows.slice(2).map((r) => [r.label, r.value])).toEqual([["Interest credited, FY 2025-26", "₹40,924"], ["Interest credited, FY 2024-25", "₹14,422"], ["Interest credited, FY 2023-24", "₹116"]]);
  });
  it("is left out with no EPF", () => {
    expect(epfCardView(fixedIncome({ ...input, epfAccounts: [], epfEntries: [] }, TODAY), { epfEntries: [] }, TODAY)).toBeNull();
  });
});

describe("the year's interest arriving against its estimate", () => {
  const uncredited = HIS_ENTRIES.filter((e) => !(e.kind === "Interest" && e.date === "2026-03-31"));
  const credited = [...uncredited, { id: "i-new", epfAccountId: "epf-1", kind: "Interest" as const, date: "2026-03-31", employee: 20462, employer: 20462, pension: 0, source: "Passbook" as const }];
  const arrived = fixedIncome({ ...input, epfEntries: credited }, "2026-06-10");
  it("shows the estimate, what was credited and the difference", () => {
    const v = interestView(arrived)!;
    expect(v.financialYear).toBe("2025-26");
    expect(v.tiles.map((t) => t.label)).toEqual(["Estimated", "Credited", "Difference"]);
    expect(v.tiles[1]).toEqual({ label: "Credited", value: "₹40,924", note: "Mar 31, 2026" });
    expect(v.tiles[0].value).toMatch(/^≈ ₹40,9\d\d$/);
    expect(v.tiles[0].note).toBe("8.25% on each month's balance");
    expect(v.rate).toEqual({ value: "not declared yet", note: "estimates use the last one, 8.25%, and are marked as estimates" });
  });
  it("says a declared rate is the one in use, and says nothing when no interest has just arrived", () => {
    const declared = fixedIncome({ ...input, epfEntries: credited, epfRates: [{ id: "r", epfAccountId: "epf-1", financialYear: "2026-27", ratePercent: 8.5, source: "Declared" }] }, "2026-06-10");
    expect(interestView(declared)!.rate).toEqual({ value: "8.5% declared", note: "estimates use it" });
    expect(interestView(f)).toBeNull();
  });
});
