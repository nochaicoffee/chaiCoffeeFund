import { describe, expect, it } from "vitest";
import type { EpfAccount, EpfRate, FixedDeposit } from "../sheets/types";
import { HIS_ENTRIES } from "./epf.fixture";
import { builtUpSeries, depositBars, epfBars, expectedAtMaturity, fixedIncome } from "./fixedIncome";
import { HIS_DEPOSITS } from "./fixedIncome.fixture";

const TODAY = "2026-11-05";
const account: EpfAccount = { id: "epf-1", name: "NetApp India", status: "Active", confirmedThrough: "2026-11-04" };
const input = { epfAccounts: [account], epfEntries: HIS_ENTRIES, epfRates: [] as EpfRate[], deposits: HIS_DEPOSITS };

describe("fixedIncome on his real passbooks and deposits (4 Nov 2026)", () => {
  const f = fixedIncome(input, TODAY);
  it("EPF is the passbook figure: credits plus credited interest, each share", () => {
    expect(f.epf.employee).toBe(476283);
    expect(f.epf.employer).toBe(476283);
    expect(f.epf.pension).toBe(0);
    expect(f.epf.total).toBe(952566);
    expect(f.epf.creditedInterest).toBe(2 * (58 + 7211 + 20462));
  });
  it("the deposits are worth what they have built up, a little over what was placed", () => {
    expect(f.deposits.held).toHaveLength(7);
    expect(f.deposits.placed).toBe(120000);
    // His app showed ₹3,020 on 4 Nov; a day later is about ₹20 more.
    expect(Math.abs(f.deposits.accrued - 3020)).toBeLessThan(40);
  });
  it("adds them up to his ₹10.76L, of which ₹10.17L he put in and ₹58,482 is earned", () => {
    expect(f.total).toBeCloseTo(952566 + 120000 + f.deposits.accrued, 6);
    expect(Math.round(f.total / 1000)).toBe(1076);
    expect(f.putIn).toBe(952566 - 55462 + 120000);
    expect(Math.abs(f.earned - 58482)).toBeLessThan(50); // his app's ₹3,020 on 4 Nov against a day more of compounding
  });
  it("earns about ₹241 a day and ₹7,349 a month at today's rates", () => {
    expect(Math.round(f.perDay)).toBe(241);
    expect(Math.abs(f.perMonth - 7349)).toBeLessThan(15);
    expect(f.epf.perDay).toBeCloseTo((952566 * 8.25) / 100 / 365, 4);
  });
  it("EPF has about ₹39,008 of this year's interest built up and not credited, at the 8.25% its credited years imply", () => {
    expect(f.epf.estimate).toBe(f.epf.holdings[0].estimate.amount);
    expect(Math.abs(f.epf.estimate - 39008)).toBeLessThan(5);
    expect(f.epf.holdings[0]).toMatchObject({ ratePercent: 8.25, rateSource: "Assumed" });
  });
  it("the next EPF credit is October's wages, about the 18th of November, and not late", () => {
    expect(f.epf.holdings[0].nextCredit).toMatchObject({ wageMonth: "2026-10", due: "2026-11-18", late: false });
    expect(f.epf.holdings[0].lateMonths).toEqual([]);
  });
  it("this year's contributions, the last credit and the last interest, as the page's EPF tiles say", () => {
    expect(f.epf.holdings[0].putInThisYear).toEqual({ amount: 232508, count: 7 });
    expect(f.epf.holdings[0].lastCredit).toEqual({ date: "2026-10-18", amount: 39308 });
    expect(f.epf.holdings[0].lastInterest).toEqual({ date: "2026-03-31", amount: 40924 });
    expect(Math.abs(f.deposits.worthOf["fd-1"] - 15764)).toBeLessThan(5); // his app's figure on 4 Nov, a day earlier
  });
  it("the first deposit matures on 14 Sep 2027, in 10 months, and none is waiting to be closed", () => {
    expect(f.deposits.nextMaturity).toMatchObject({ months: 10, deposit: { startDate: "2026-03-13" } });
    expect(f.deposits.due).toEqual([]);
  });
  it("all seven are missing the bank and the maturity amount", () => {
    expect(f.deposits.incomplete).toHaveLength(7);
  });
});

describe("states", () => {
  it("nothing yet is zero everywhere", () => {
    const f = fixedIncome({ epfAccounts: [], epfEntries: [], epfRates: [], deposits: [] }, TODAY);
    expect(f).toMatchObject({ total: 0, putIn: 0, earned: 0, perDay: 0, perMonth: 0 });
    expect(f.deposits.nextMaturity).toBeNull();
  });
  it("a deposit past its maturity day is waiting to be closed and a closed one holds nothing", () => {
    const matured: FixedDeposit = { ...HIS_DEPOSITS[0], id: "m", startDate: "2025-01-01", maturityDate: "2026-07-02" };
    const closed: FixedDeposit = { ...HIS_DEPOSITS[1], id: "c", status: "Closed", closedDate: "2026-06-01", receivedAmount: 16000, closeKind: "Pre-closed" };
    const f = fixedIncome({ ...input, deposits: [matured, closed] }, TODAY);
    expect(f.deposits.due.map((d) => d.id)).toEqual(["m"]);
    expect(f.deposits.held.map((d) => d.id)).toEqual(["m"]);
    expect(f.deposits.nextMaturity).toBeNull();
  });
  it("an EPF credit that is late is flagged once the passbook was printed after its usual day", () => {
    const f = fixedIncome({ ...input, epfAccounts: [{ ...account, confirmedThrough: "2026-11-25" }] }, "2026-11-25");
    expect(f.epf.holdings[0].lateMonths.map((m) => m.wageMonth)).toEqual(["2026-10"]);
    expect(f.epf.holdings[0].nextCredit).toMatchObject({ wageMonth: "2026-10", late: true });
  });
  it("a closed EPF account keeps its balance but expects and flags nothing", () => {
    const f = fixedIncome({ ...input, epfAccounts: [{ ...account, status: "Closed", confirmedThrough: "2026-11-25" }] }, "2026-11-25");
    expect(f.epf.total).toBe(952566);
    expect(f.epf.holdings[0].nextCredit).toBeNull();
    expect(f.epf.holdings[0].lateMonths).toEqual([]);
  });
  it("a payout deposit earns on what was placed, and holds it", () => {
    const payout: FixedDeposit = { ...HIS_DEPOSITS[0], compoundingType: "Non-Cumulative", payoutFrequency: "Quarterly" };
    const f = fixedIncome({ epfAccounts: [], epfEntries: [], epfRates: [], deposits: [payout] }, TODAY);
    expect(f.deposits.worth).toBe(15000);
    expect(f.perDay).toBeCloseTo((15000 * 7.75) / 100 / 365, 6);
  });
});

describe("series", () => {
  it("builds up from the first contribution: EPF rises every month and the deposits begin in March 2026", () => {
    const series = builtUpSeries(input, TODAY);
    expect(series[0]).toMatchObject({ month: "2024-02", deposits: 0 });
    expect(series.at(-1)).toMatchObject({ month: "2026-11" });
    expect(series.at(-1)!.epf).toBe(952566);
    expect(series.find((p) => p.month === "2026-02")!.deposits).toBe(0);
    expect(series.find((p) => p.month === "2026-03")!.deposits).toBeGreaterThan(15000);
    for (let i = 1; i < series.length; i++) expect(series[i].epf).toBeGreaterThanOrEqual(series[i - 1].epf);
  });
  it("EPF bars: what went in each month, each March's interest, and the next credit expected", () => {
    const bars = epfBars(HIS_ENTRIES, { due: "2026-11-18", amount: 39308 }, TODAY);
    expect(bars[0]).toMatchObject({ month: "2024-02", put: 16964 });
    expect(bars.find((b) => b.month === "2026-03")).toMatchObject({ interest: 40924 });
    expect(bars.at(-1)).toMatchObject({ month: "2026-11", put: 39308, expected: true });
    expect(bars.filter((b) => b.interest > 0)).toHaveLength(3);
  });
  it("deposit bars: one for each held, how far through its term, soonest started first", () => {
    const bars = depositBars(HIS_DEPOSITS, TODAY);
    expect(bars).toHaveLength(7);
    expect(bars[0]).toMatchObject({ startDate: "2026-03-13" });
    expect(Math.round(bars[0].through * 100)).toBe(43);
    expect(Math.round(bars[6].through * 100)).toBe(1);
  });
  it("expected at maturity is the bank's figure, or an estimate that says so", () => {
    expect(expectedAtMaturity({ ...HIS_DEPOSITS[0], maturityAmount: 17000 })).toEqual({ amount: 17000, estimate: false });
    const est = expectedAtMaturity(HIS_DEPOSITS[0]);
    expect(est.estimate).toBe(true);
    expect(Math.round(est.amount)).toBeCloseTo(16839, -1);
  });
});
