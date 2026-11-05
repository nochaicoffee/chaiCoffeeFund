import { describe, expect, it } from "vitest";
import type { EpfAccount } from "../sheets/types";
import { HIS_ENTRIES } from "./epf.fixture";
import { fixedIncome } from "./fixedIncome";
import { HIS_DEPOSITS } from "./fixedIncome.fixture";
import { comingUp, creditTiming, creditYears, growthPath, moneyInByMonth, moneyInStats, passbookChecks } from "./fixedIncomeWidgets";

const TODAY = "2026-11-05";
const account: EpfAccount = { id: "epf-1", name: "NetApp India", status: "Active", confirmedThrough: "2026-11-04" };
const input = { epfAccounts: [account], epfEntries: HIS_ENTRIES, epfRates: [], deposits: HIS_DEPOSITS };
const f = fixedIncome(input, TODAY);

describe("money in each month, on his data", () => {
  const months = moneyInByMonth(HIS_ENTRIES, HIS_DEPOSITS, TODAY);
  const by = (m: string) => months.find((x) => x.month === m)!;
  it("runs from his first credit to this month", () => {
    expect(months[0].month).toBe("2024-02");
    expect(months.at(-1)!.month).toBe("2026-11");
  });
  it("adds the deposit placed in a month to the credits that arrived in it", () => {
    expect(by("2026-03")).toMatchObject({ epf: 28646, deposits: 15000, depositCount: 1, total: 43646 });
    expect(by("2026-08")).toMatchObject({ epf: 39308, deposits: 30000, total: 69308 });
    expect(by("2026-09")).toMatchObject({ deposits: 0, depositCount: 0 });
    expect(by("2026-11")).toMatchObject({ epf: 0, deposits: 15000 });
  });
  it("the design's three figures: ₹42,345 a month this year, a deposit in 7 of 9 months, the biggest month ₹69,308", () => {
    const stats = moneyInStats(months, TODAY);
    expect(Math.round(stats.perMonth!.amount)).toBe(42345);
    expect(stats.perMonth).toMatchObject({ from: "2026-01", to: "2026-10" });
    expect(stats.depositMonths).toMatchObject({ count: 7, of: 9, since: "2026-03", without: ["2026-06", "2026-09"] });
    expect(stats.biggest).toMatchObject({ month: "2026-08", total: 69308 });
  });
  it("is empty with nothing, and has no deposit figures with no deposits", () => {
    expect(moneyInByMonth([], [], TODAY)).toEqual([]);
    const only = moneyInStats(moneyInByMonth(HIS_ENTRIES, [], TODAY), TODAY);
    expect(only.depositMonths).toBeNull();
    expect(moneyInStats([], TODAY)).toEqual({ perMonth: null, depositMonths: null, biggest: null });
  });
});

describe("credits on time", () => {
  const years = creditYears(HIS_ENTRIES, "2026-11-04", TODAY);
  it("one row for each financial year, twelve wage months each", () => {
    expect(years.map((y) => y.financialYear)).toEqual(["2023-24", "2024-25", "2025-26", "2026-27"]);
    expect(years.every((y) => y.dots.length === 12)).toBe(true);
  });
  it("shows the days each credit took, and what is still to come", () => {
    const run = years[3].dots;
    expect(run.slice(0, 3).map((d) => d.lagDays)).toEqual([1, 1, 1]);
    expect(run[3]).toMatchObject({ wageMonth: "2026-06", lagDays: 26 });
    expect(run.slice(4, 7).map((d) => d.lagDays)).toEqual([18, 17, 18]);
    expect(run[7]).toMatchObject({ wageMonth: "2026-10", state: "Expected", lagDays: null });
    expect(years[0].dots[0]).toMatchObject({ state: "Before" });
  });
  it("sees that credits moved from the first of the month to about the 17th, from June's wages", () => {
    expect(creditTiming(HIS_ENTRIES)).toEqual({ since: "2026-06", lagRange: { min: 17, max: 26 }, earlierLag: 1, usualDay: 18 });
  });
  it("says nothing moved when nothing did", () => {
    const steady = HIS_ENTRIES.filter((e) => e.kind === "Contribution" && e.wageMonth! < "2026-06");
    expect(creditTiming(steady)).toMatchObject({ since: null, lagRange: { min: 1, max: 1 }, earlierLag: null });
    expect(creditTiming([])).toBeNull();
  });
});

describe("the passbook check", () => {
  const checks = passbookChecks(HIS_ENTRIES, TODAY);
  it("opening + credits + interest = closing for each year, as the design shows", () => {
    expect(checks.map((c) => [c.financialYear, c.opening, c.credits, c.interest, c.closing])).toEqual([
      ["2023-24", 0, 40868, 116, 40984],
      ["2024-25", 40984, 294912, 14422, 350318],
      ["2025-26", 350318, 328816, 40924, 720058],
      ["2026-27", 720058, 232508, 0, 952566],
    ]);
    for (const c of checks) expect(c.opening + c.credits + c.interest).toBe(c.closing);
    expect(checks.map((c) => c.running)).toEqual([false, false, false, true]);
  });
  it("counts rows he typed, which the passbook hasn't confirmed", () => {
    const typed = HIS_ENTRIES.map((e) => (e.wageMonth === "2026-09" ? { ...e, source: "Typed" as const } : e));
    expect(passbookChecks(typed, TODAY).at(-1)!.typed).toBe(1);
    expect(passbookChecks(HIS_ENTRIES, TODAY).every((c) => c.typed === 0)).toBe(true);
    expect(passbookChecks([], TODAY)).toEqual([]);
  });
});

describe("coming up", () => {
  const items = comingUp(f, HIS_ENTRIES, [], TODAY);
  it("the next credit, the year's end and the first deposits to mature, soonest first", () => {
    expect(items.slice(0, 5).map((i) => [i.date, i.kind])).toEqual([
      ["2026-11-18", "epf-credit"],
      ["2027-03-31", "epf-year-end"],
      ["2027-09-14", "maturity"],
      ["2027-10-02", "maturity"],
      ["2027-11-03", "maturity"],
    ]);
    expect(items[0]).toMatchObject({ note: "2026-10 wages", amount: 39308, estimate: true });
  });
  it("the year's end carries the interest expected for the whole year: about ₹74,455", () => {
    expect(Math.abs(items[1].amount - 74455)).toBeLessThan(60);
  });
  it("a deposit's maturity is an estimate until the bank's figure is entered", () => {
    const withBank = comingUp(fixedIncome({ ...input, deposits: [{ ...HIS_DEPOSITS[0], maturityAmount: 17000 }] }, TODAY), HIS_ENTRIES, [], TODAY).find((i) => i.kind === "maturity")!;
    expect(withBank).toMatchObject({ amount: 17000, estimate: false });
  });
  it("a late credit is flagged, and the year's end drops out once the interest is credited", () => {
    const late = fixedIncome({ ...input, epfAccounts: [{ ...account, confirmedThrough: "2026-11-25" }] }, "2026-11-25");
    expect(comingUp(late, HIS_ENTRIES, [], "2026-11-25")[0]).toMatchObject({ kind: "epf-credit", late: true });
  });
  it("is empty with nothing held", () => {
    expect(comingUp(fixedIncome({ epfAccounts: [], epfEntries: [], epfRates: [], deposits: [] }, TODAY), [], [], TODAY)).toEqual([]);
  });
});

describe("the growth path", () => {
  const g = growthPath(HIS_ENTRIES, [], undefined, TODAY)!;
  it("uses the last credit and the rate in use, and steps 5, 10 and 20 years", () => {
    expect(g.perCredit).toBe(39308);
    expect(g.ratePercent).toBe(8.25);
    expect(g.balanceNow).toBe(952566);
    expect(g.steps.map((s) => [s.years, s.year])).toEqual([[5, "2031"], [10, "2036"], [20, "2046"]]);
  });
  it("10 years is about ₹93.7L: ₹9.53L today, ₹47.17L put in, the rest interest", () => {
    const ten = g.steps[1].projection;
    expect(Math.abs(ten.total - 9373000)).toBeLessThan(40000);
    expect(ten.contributed).toBe(39308 * 120);
    expect(ten.total).toBe(g.balanceNow + ten.contributed + ten.interest);
  });
  it("a credit ₹5,000 higher adds a known sum in 10 years, and the account's own setting wins over the last credit", () => {
    expect(g.extra).toMatchObject({ amount: 5000, years: 10 });
    expect(g.extra!.adds).toBeGreaterThan(5000 * 120);
    expect(growthPath(HIS_ENTRIES, [], 45000, TODAY)!.perCredit).toBe(45000);
  });
  it("has no path without a credit or a rate", () => {
    expect(growthPath([], [], undefined, TODAY)).toBeNull();
  });
});
