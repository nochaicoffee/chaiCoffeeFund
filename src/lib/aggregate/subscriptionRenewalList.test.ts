import { describe, expect, it } from "vitest";
import { demoSubscriptionData } from "../demo/subscriptionsDemo";
import type { SpendPeriod } from "./cardSpend";
import type { SubscriptionData } from "./subscriptionPage";
import {
  emptyPeriodReason,
  filterRenewals,
  groupRenewals,
  pageOfGroups,
  paidInPeriod,
  periodDates,
  placesIn,
  renewalCounts,
  renewalOverview,
  renewalRows,
  renewalTiles,
  type RenewalQuery,
} from "./subscriptionRenewalList";
import type { Subscription, SubscriptionPayment } from "../sheets/types";

const THIS_YEAR: SpendPeriod = { kind: "year", year: 2026 };

describe("on the design's sample data and today (design/subscriptions/SubsRenewals.dc.html)", () => {
  const TODAY = "2026-10-20";
  const data = demoSubscriptionData(TODAY);
  const rows = renewalRows(data, THIS_YEAR, TODAY);
  const query: RenewalQuery = { period: THIS_YEAR };

  it("counts the design's renewals: 79 in 2026 across 12 subscriptions, 1 not recorded and 16 still to come", () => {
    expect(renewalOverview(rows)).toEqual({ count: 79, subscriptions: 12, notRecorded: 1, toCome: 16 });
    expect(renewalCounts(rows, data, query).byStatus).toEqual({ all: 79, upcoming: 16, paid: 61, "not-recorded": 1 });
  });

  it("gives the design's tiles", () => {
    const tiles = renewalTiles(data, rows, THIS_YEAR, TODAY);
    expect(tiles.next30).toMatchObject({ count: 6, total: 4334, next: { subscriptionId: "demo-netflix", date: "2026-10-23" } });
    expect(tiles.notRecorded).toMatchObject({ count: 1, total: 219, renewals: [{ subscriptionId: "demo-icloud", date: "2026-09-24" }] });
    expect(tiles.paid.total).toBe(57163);
    expect(tiles.paid.payments).toBe(61);
    expect(Math.round(tiles.paid.monthlyAverage)).toBe(5716);
    expect(tiles.changes).toEqual({ count: 3, monthlyMore: 190, subscriptionIds: ["demo-spotify", "demo-netflix", "demo-youtube"] });
  });

  it("groups the next 30 days first, soonest first, then each past month, newest first", () => {
    const groups = groupRenewals(rows, TODAY);
    expect(groups.map((g) => [g.key, g.count])).toEqual([
      ["coming", 7],
      ["later", 10],
      ["2026-10", 3],
      ["2026-09", 6],
      ["2026-08", 5],
      ["2026-07", 7],
      ["2026-06", 7],
      ["2026-05", 6],
      ["2026-04", 7],
      ["2026-03", 8],
      ["2026-02", 6],
      ["2026-01", 7],
    ]);
    const [coming, later, october, september, august] = groups;
    expect(coming.rows.map((r) => `${r.subscriptionId} ${r.date} ${r.status}`)).toEqual([
      "demo-netflix 2026-10-23 upcoming",
      "demo-icloud 2026-10-24 upcoming",
      "demo-spotify 2026-10-28 upcoming",
      "demo-timesprime 2026-10-30 upcoming",
      "demo-youtube 2026-11-02 upcoming",
      "demo-sonyliv 2026-11-03 wont-renew",
      "demo-chatgpt 2026-11-08 upcoming",
    ]);
    expect(coming.toCome).toBe(4334);
    expect(later).toMatchObject({ collapsed: true, rows: [], count: 10 });
    expect(october).toMatchObject({ count: 3, paid: 6648, notRecorded: 0 });
    expect(october.rows.map((r) => r.subscriptionId)).toEqual(["demo-cult", "demo-chatgpt", "demo-youtube"]);
    expect(september).toMatchObject({ count: 6, paid: 3485, notRecorded: 1 });
    expect(august).toMatchObject({ count: 5, paid: 3135 });
  });

  it("shows the design's first page: 21 rows, page 1 of 4, months never split", () => {
    const page = pageOfGroups(groupRenewals(rows, TODAY), 1, 25);
    expect(page).toMatchObject({ page: 1, pages: 4, shown: 21 });
    expect(page.groups.map((g) => g.key)).toEqual(["coming", "later", "2026-10", "2026-09", "2026-08"]);
    expect(pageOfGroups(groupRenewals(rows, TODAY), 4, 25).groups.map((g) => g.key)).toEqual(["2026-01"]);
  });

  it("compares a payment with the one before it, or the latest one with the plan", () => {
    const at = (id: string, date: string) => rows.find((r) => r.subscriptionId === id && r.date === date)!;
    // Spotify's latest charge, ₹139, is ₹20 over its ₹119 plan; Netflix went up ₹150 in July.
    expect(at("demo-spotify", "2026-09-28").change).toEqual({ kind: "off-plan", amount: 20 });
    expect(at("demo-netflix", "2026-07-23").change).toEqual({ kind: "vs-last", amount: 150 });
    expect(at("demo-netflix", "2026-09-23").change).toBeNull();
  });

  it("shows where each one's charged: its payment's card, or for one still to come, the usual one", () => {
    const at = (id: string, date: string) => rows.find((r) => r.subscriptionId === id && r.date === date)!;
    expect(at("demo-cult", "2026-10-10")).toMatchObject({ place: { kind: "account", id: "demo-kotak" }, expectedPlace: false });
    expect(at("demo-spotify", "2026-10-28")).toMatchObject({ place: { kind: "card", id: "demo-millennia" }, expectedPlace: true });
    expect(at("demo-icloud", "2026-09-24").place).toBeNull();
    expect(at("demo-sonyliv", "2026-11-03").place).toBeNull();
  });

  it("is one subscription's whole history when filtered to it for all time", () => {
    const all = renewalRows(data, { kind: "all" }, TODAY);
    const netflix: RenewalQuery = { period: { kind: "all" }, subscriptionId: "demo-netflix" };
    expect(renewalCounts(all, data, netflix).byStatus).toEqual({ all: 35, upcoming: 3, paid: 32, "not-recorded": 0 });
    expect(filterRenewals(all, data, netflix)[0].date).toBe("2024-02-23");
  });
});

// ---------- Fixtures ----------

const TODAY = "2026-10-21";

const sub = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: "netflix",
  name: "Netflix Premium",
  alias: "Netflix",
  category: "Streaming",
  amount: 649,
  billingCycle: "Monthly",
  billingAnchorDate: "2026-01-23",
  startDate: "2026-01-23",
  status: "Active",
  defaultPaidFromCardId: "card-1",
  ...overrides,
});

let nextId = 0;
const pay = (subscriptionId: string, paymentDate: string, amount: number, overrides: Partial<SubscriptionPayment> = {}): SubscriptionPayment => ({
  id: `pay-${++nextId}`,
  subscriptionId,
  paymentDate,
  amount,
  status: "Paid",
  paidFromCardId: "card-1",
  ...overrides,
});

const dataOf = (subscriptions: Subscription[], payments: SubscriptionPayment[]): SubscriptionData => ({
  subscriptions,
  payments,
  cards: [{ id: "card-1", name: "Millennia", alias: "Millennia", issuer: "HDFC-Bank", cardType: "Cashback", creditLimit: 1, statementDay: 1, dueDayBuffer: 20, status: "Active" }],
  accounts: [{ id: "acct-1", name: "Kotak Savings", bank: "Kotak", accountType: "Savings", purpose: "Spending", startDate: "2020-01-01", status: "Active" }],
});

describe("periodDates", () => {
  const subs = [sub({ startDate: "2023-06-28" }), sub({ startDate: "2025-01-02" })];
  it("runs a year from Jan 1 to Dec 31, so this year's includes what's still to come", () => {
    expect(periodDates({ kind: "year", year: 2026 }, TODAY, subs)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
  it("runs a range of months from its first day to its last", () => {
    expect(periodDates({ kind: "range", from: "2026-02", to: "2026-04", last: 3 }, TODAY, subs)).toEqual({ from: "2026-02-01", to: "2026-04-30" });
  });
  it("runs all time from the first subscription's start to the end of this year", () => {
    expect(periodDates({ kind: "all" }, TODAY, subs)).toEqual({ from: "2023-06-28", to: "2026-12-31" });
  });
});

describe("grouping", () => {
  const netflix = sub();
  const payments = [
    pay("netflix", "2026-08-23", 649),
    pay("netflix", "2026-09-23", 649),
    // Marked paid ahead of Oct 23.
    pay("netflix", "2026-10-23", 649),
  ];
  const data = dataOf([netflix], payments);
  const rows = renewalRows(data, THIS_YEAR, TODAY);

  it("goes by date, not status: a renewal marked paid ahead is still coming up", () => {
    const [coming] = groupRenewals(rows, TODAY);
    expect(coming.key).toBe("coming");
    expect(coming.rows.map((r) => `${r.date} ${r.status}`)).toEqual(["2026-10-23 paid"]);
    expect(coming).toMatchObject({ count: 1, paid: 649, toCome: 0 });
  });

  it("folds later renewals away unless asked, but not when nothing's coming up", () => {
    expect(groupRenewals(rows, TODAY)[1]).toMatchObject({ key: "later", collapsed: true, rows: [], count: 2, toCome: 1298 });
    expect(groupRenewals(rows, TODAY, { showLater: true })[1].rows.map((r) => r.date)).toEqual(["2026-11-23", "2026-12-23"]);
    const farOff = renewalRows(dataOf([sub({ billingCycle: "Yearly", billingAnchorDate: "2026-12-23", startDate: "2026-12-23" })], []), THIS_YEAR, TODAY);
    expect(groupRenewals(farOff, TODAY)).toMatchObject([{ key: "later", count: 1, rows: [{ date: "2026-12-23" }] }]);
  });

  it("runs the other way oldest first: past months from the oldest, then what's coming", () => {
    const groups = groupRenewals(rows, TODAY, { sort: "oldest" });
    expect(groups.map((g) => g.key)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "coming", "later"]);
  });

  it("pages whole groups, as many as fit, at least one a page", () => {
    const groups = groupRenewals(rows, TODAY);
    // Coming up (1), later (folded), then one a month from September back to January.
    expect(pageOfGroups(groups, 1, 4)).toMatchObject({ pages: 3, shown: 4 });
    expect(pageOfGroups(groups, 1, 4).groups.map((g) => g.key)).toEqual(["coming", "later", "2026-09", "2026-08", "2026-07"]);
    expect(pageOfGroups(groups, 3, 4).groups.map((g) => g.key)).toEqual(["2026-02", "2026-01"]);
    expect(pageOfGroups(groups, 9, 4).page).toBe(3);
    expect(pageOfGroups(groups, 1, 1).groups.map((g) => g.key)).toEqual(["coming", "later"]);
    expect(pageOfGroups([], 1, 25)).toMatchObject({ groups: [], page: 1, pages: 1, shown: 0 });
  });

  it("keeps the later renewals on the coming-up ones' page when they're opened, however many", () => {
    const opened = groupRenewals(rows, TODAY, { showLater: true });
    expect(pageOfGroups(opened, 1, 2).groups.map((g) => g.key)).toEqual(["coming", "later"]);
    expect(pageOfGroups(opened, 1, 2).shown).toBe(3);
    expect(pageOfGroups(opened, 2, 2).groups.map((g) => g.key)).toEqual(["2026-09", "2026-08"]);
    const oldest = groupRenewals(rows, TODAY, { sort: "oldest", showLater: true });
    expect(pageOfGroups(oldest, 99, 2).groups.map((g) => g.key)).toEqual(["2026-09", "coming", "later"]);
  });
});

describe("filters and counts", () => {
  const subs = [
    sub(),
    sub({ id: "swiggy", name: "Swiggy One", alias: "Swiggy One", category: "Food", amount: 549, billingCycle: "Quarterly", billingAnchorDate: "2026-03-01", startDate: "2026-03-01", defaultPaidFromCardId: undefined, defaultPaidFromAccountId: "acct-1" }),
    sub({ id: "sony", name: "SonyLIV", alias: "SonyLIV", amount: 999, billingCycle: "Yearly", billingAnchorDate: "2025-11-03", startDate: "2025-11-03", status: "Cancelled", endDate: "2026-09-14" }),
  ];
  const payments = [
    ...["01", "02", "03", "04", "05", "06", "07", "08"].map((m) => pay("netflix", `2026-${m}-23`, 649)),
    // September didn't charge; October is coming up.
    pay("netflix", "2026-09-23", 0, { status: "Skipped", paidFromCardId: undefined }),
    pay("swiggy", "2026-03-01", 549, { paidFromCardId: undefined, paidFromAccountId: "acct-1" }),
    pay("sony", "2025-11-03", 999),
  ];
  const data = dataOf(subs, payments);
  const rows = renewalRows(data, THIS_YEAR, TODAY);
  const keys = (q: Partial<RenewalQuery>) => filterRenewals(rows, data, { period: THIS_YEAR, ...q }).map((r) => `${r.subscriptionId} ${r.date}`);

  it("files a skipped one with the paid ones, and a won't-renew one under All only", () => {
    const at = (id: string, date: string) => rows.find((r) => r.subscriptionId === id && r.date === date)!;
    expect(at("netflix", "2026-09-23")).toMatchObject({ status: "skipped", filter: "paid" });
    expect(at("sony", "2026-11-03")).toMatchObject({ status: "wont-renew", filter: null });
    expect(keys({ status: "not-recorded" })).toEqual(["swiggy 2026-06-01", "swiggy 2026-09-01"]);
    expect(keys({ status: "upcoming" })).toEqual(["netflix 2026-10-23", "netflix 2026-11-23", "swiggy 2026-12-01", "netflix 2026-12-23"]);
    expect(keys({}).length).toBe(17);
  });

  it("filters by subscription and by where it's charged, a payment's place or the usual one still to come", () => {
    expect(keys({ subscriptionId: "swiggy" })).toEqual(["swiggy 2026-03-01", "swiggy 2026-06-01", "swiggy 2026-09-01", "swiggy 2026-12-01"]);
    expect(keys({ place: { kind: "account", id: "acct-1" } })).toEqual(["swiggy 2026-03-01", "swiggy 2026-12-01"]);
    expect(placesIn(rows, data)).toEqual([
      { kind: "card", id: "card-1" },
      { kind: "account", id: "acct-1" },
    ]);
  });

  it("searches names, categories and whole-rupee amounts", () => {
    expect(keys({ search: "food" })).toHaveLength(4);
    expect(keys({ search: "swiggy 549" })).toHaveLength(4);
    expect(keys({ search: "₹999" })).toEqual(["sony 2026-11-03"]);
    expect(keys({ search: "netflix 549" })).toEqual([]);
    // The renewal's own amount, not the plan's price today: Netflix at 649 a month, paid ₹499 before.
    const repriced = dataOf([sub({ billingAnchorDate: "2026-09-23", startDate: "2026-09-23" })], [pay("netflix", "2026-09-23", 499)]);
    expect(filterRenewals(renewalRows(repriced, THIS_YEAR, TODAY), repriced, { period: THIS_YEAR, search: "649" }).map((r) => r.date)).toEqual(["2026-10-23", "2026-11-23", "2026-12-23"]);
  });

  it("counts what each filter would show with the others applied", () => {
    const counts = renewalCounts(rows, data, { period: THIS_YEAR, status: "upcoming", subscriptionId: "netflix" });
    expect(counts.byStatus).toEqual({ all: 12, upcoming: 3, paid: 9, "not-recorded": 0 });
    expect(counts.bySubscription).toEqual({ netflix: 3, swiggy: 1, sony: 0 });
    expect(counts.allSubscriptions).toBe(4);
  });
});

describe("paidInPeriod", () => {
  const data = dataOf(
    [sub({ billingAnchorDate: "2025-07-23", startDate: "2025-07-23" })],
    [pay("netflix", "2025-07-23", 499), pay("netflix", "2025-12-23", 499), pay("netflix", "2026-02-23", 649), pay("netflix", "2026-03-23", 0, { status: "Skipped" }), pay("netflix", "2026-10-23", 649)],
  );

  it("averages a past year over 12 months, and this year over the months so far", () => {
    expect(paidInPeriod(data, { kind: "year", year: 2025 }, TODAY)).toEqual({ total: 998, payments: 2, monthlyAverage: 998 / 12 });
    // October counts in full, including a payment marked ahead of its date.
    expect(paidInPeriod(data, THIS_YEAR, TODAY)).toEqual({ total: 1298, payments: 2, monthlyAverage: 1298 / 10 });
  });

  it("averages all time from the first payment's month", () => {
    expect(paidInPeriod(data, { kind: "all" }, TODAY)).toEqual({ total: 2296, payments: 4, monthlyAverage: 2296 / 16 });
  });

  it("is nothing for a year still to come", () => {
    expect(paidInPeriod(data, { kind: "year", year: 2027 }, TODAY)).toEqual({ total: 0, payments: 0, monthlyAverage: 0 });
  });
});

describe("renewalTiles", () => {
  it("turns a yearly plan's price change into what it adds a month, and counts only the period's", () => {
    const prime = sub({ id: "prime", alias: "Prime", amount: 1899, billingCycle: "Yearly", billingAnchorDate: "2023-12-15", startDate: "2023-12-15" });
    // The last one is marked paid ahead of Dec 15: like what's paid, it counts once its month comes.
    const data = dataOf([prime], [pay("prime", "2023-12-15", 1299), pay("prime", "2024-12-15", 1499), pay("prime", "2025-12-15", 1699), pay("prime", "2026-12-15", 1899)]);
    const year = (y: number): SpendPeriod => ({ kind: "year", year: y });
    expect(renewalTiles(data, renewalRows(data, year(2025), TODAY), year(2025), TODAY).changes).toEqual({ count: 1, monthlyMore: 200 / 12, subscriptionIds: ["prime"] });
    expect(renewalTiles(data, renewalRows(data, { kind: "all" }, TODAY), { kind: "all" }, TODAY).changes.count).toBe(2);
    expect(renewalTiles(data, renewalRows(data, THIS_YEAR, TODAY), THIS_YEAR, TODAY).changes.count).toBe(0);
  });

  it("lists what isn't recorded newest first, at the plan's price", () => {
    const data = dataOf([sub()], [pay("netflix", "2026-01-23", 649)]);
    const rows = renewalRows(data, THIS_YEAR, TODAY);
    const { notRecorded } = renewalTiles(data, rows, THIS_YEAR, TODAY);
    expect(notRecorded.count).toBe(8);
    expect(notRecorded.total).toBe(8 * 649);
    expect(notRecorded.renewals[0].date).toBe("2026-09-23");
  });
});

describe("emptyPeriodReason", () => {
  it("says there are no subscriptions, that none had started, or that none renewed", () => {
    const early: SpendPeriod = { kind: "range", from: "2022-01", to: "2022-03" };
    expect(emptyPeriodReason(dataOf([], []), early, TODAY)).toEqual({ kind: "no-subscriptions" });
    expect(emptyPeriodReason(dataOf([sub({ id: "b", startDate: "2024-01-01" }), sub({ id: "a", startDate: "2022-12-15" })], []), early, TODAY)).toMatchObject({ kind: "not-started", oldest: { id: "a" } });
    expect(emptyPeriodReason(dataOf([sub({ startDate: "2021-01-01" })], []), early, TODAY)).toEqual({ kind: "none" });
  });
});
