import { describe, expect, it } from "vitest";
import {
  RENEW_SOON_DAYS,
  byRenewal,
  checkNewTerm,
  cashPaidIn,
  coverByKind,
  coverGaps,
  gapDays,
  monthlyCover,
  nextNcb,
  nextRenewal,
  paidTerms,
  premiumOverCover,
  premiumRunway,
  priceChanges,
  quoteChange,
  renewalDefaults,
  renewalsToComeIn,
  renewingWithin,
  termOf,
  termPreview,
  uninsuredLoans,
  upcomingRenewals,
  viewPolicies,
  viewPolicy,
  yearlyCover,
} from "./insurance";
import type { Loan, Policy, PolicyPayment } from "../sheets/types";

const TODAY = "2026-10-29";

const policy = (id: string, kind: Policy["kind"], sumInsured: number, extra: Partial<Policy> = {}): Policy => ({ id, name: id, kind, insurer: "Insurer", covers: "You", sumInsured, status: "Active", ...extra });
const payment = (policyId: string, periodStart: string, years: number, amount: number, extra: Partial<PolicyPayment> = {}): PolicyPayment => ({ id: `${policyId}-${periodStart}`, policyId, periodStart, years, amount, status: "Paid", ...extra });

// His four policies: a single premium for three years (health, bike), and two for a year (accident, car).
const health = policy("health", "Health", 5_000_000);
const accident = policy("accident", "Accident", 1_500_000);
const car = policy("car", "Motor", 442_000);
const bike = policy("bike", "Motor", 73_545);
const POLICIES = [health, accident, car, bike];
const PAYMENTS = [
  payment("health", "2026-07-05", 3, 38_427.59), // paid-on day not known
  payment("accident", "2026-03-21", 1, 451, { paidOn: "2026-03-18" }),
  payment("car", "2026-08-06", 1, 5_504, { ncb: 50 }), // paid-on day not known
  payment("bike", "2026-03-21", 3, 5_241, { paidOn: "2026-03-18", ncb: 0 }),
];
const at = (today: string, payments: PolicyPayment[] = PAYMENTS, policies: Policy[] = POLICIES) => viewPolicies(policies, payments, today);
const view = (id: string, today: string, payments: PolicyPayment[] = PAYMENTS, policies: Policy[] = POLICIES) => at(today, payments, policies).find((v) => v.policy.id === id)!;

describe("termOf", () => {
  it("a single premium for three years is one term that ends the day before the third anniversary", () => {
    const term = termOf(PAYMENTS[0]);
    expect(term.start).toBe("2026-07-05");
    expect(term.end).toBe("2029-07-04");
    expect(term.renewsOn).toBe("2029-07-05");
  });

  it("a year of cover times the years it bought is exactly what was paid", () => {
    for (const p of PAYMENTS) {
      const term = termOf(p);
      expect(term.perYear * p.years).toBeCloseTo(p.amount, 9);
    }
    expect(termOf(PAYMENTS[0]).perYear).toBeCloseTo(12_809.196667, 5);
  });

  it("dates the money by the paid-on day, or by the start when the day isn't known, and says which", () => {
    expect(termOf(PAYMENTS[1])).toMatchObject({ cashDay: "2026-03-18", assumed: false });
    expect(termOf(PAYMENTS[0])).toMatchObject({ cashDay: "2026-07-05", assumed: true });
    expect(termOf(payment("x", "2026-07-05", 1, 1, { paidOn: "" })).assumed).toBe(true);
  });

  it("clamps a leap day to the end of February, so a year from Feb 29 ends Feb 27", () => {
    const term = termOf(payment("x", "2024-02-29", 1, 100));
    expect(term.renewsOn).toBe("2025-02-28");
    expect(term.end).toBe("2025-02-27");
  });
});

describe("paidTerms", () => {
  it("returns a policy's Paid terms earliest first, and leaves out Pending quotes and other policies", () => {
    const payments = [payment("a", "2027-03-21", 1, 460), payment("a", "2026-03-21", 1, 451), payment("a", "2028-03-21", 1, 470, { status: "Pending" }), payment("b", "2026-01-01", 1, 9)];
    expect(paidTerms("a", payments).map((t) => t.start)).toEqual(["2026-03-21", "2027-03-21"]);
  });
});

describe("viewPolicy state", () => {
  it("his four policies on Oct 29, 2026: all in force, with the days to each renewal", () => {
    const views = at(TODAY);
    expect(views.map((v) => [v.policy.id, v.state, v.daysLeft])).toEqual([
      ["health", "In force", 980],
      ["accident", "In force", 143],
      ["car", "In force", 281],
      ["bike", "In force", 874],
    ]);
  });

  it("is renew soon from 30 days out, and in force at 31", () => {
    expect(RENEW_SOON_DAYS).toBe(30);
    expect(view("accident", "2027-02-18")).toMatchObject({ daysLeft: 31, state: "In force" });
    expect(view("accident", "2027-02-19")).toMatchObject({ daysLeft: 30, state: "Renew soon" });
    expect(view("accident", "2027-03-20")).toMatchObject({ daysLeft: 1, state: "Renew soon" });
  });

  it("lapses on the renewal date: the last day of cover is the day before", () => {
    expect(view("accident", "2027-03-20").state).toBe("Renew soon");
    expect(view("accident", "2027-03-21")).toMatchObject({ daysLeft: 0, state: "Lapsed" });
    expect(view("accident", "2027-03-27")).toMatchObject({ daysLeft: -6, state: "Lapsed", elapsed: 1 });
  });

  it("a cancelled policy is Cancelled whatever its terms say, and holds no cover", () => {
    const v = view("car", TODAY, PAYMENTS, [health, accident, { ...car, status: "Cancelled", endedOn: "2026-11-02" }, bike]);
    expect(v.state).toBe("Cancelled");
    expect(v.yearly).toBeNull();
  });

  it("a policy bought ahead has not started, and one with no term has nothing in force", () => {
    expect(view("health", "2026-01-01")).toMatchObject({ state: "Not started", elapsed: 0, yearly: null, current: null });
    expect(viewPolicy(policy("p", "Home", 1), [], TODAY)).toMatchObject({ state: "No term", renewsOn: null, daysLeft: null });
  });

  it("a Pending quote changes nothing", () => {
    const withQuote = [...PAYMENTS, payment("accident", "2027-03-21", 1, 473, { status: "Pending" })];
    expect(view("accident", TODAY, withQuote)).toMatchObject({ renewsOn: "2027-03-21", daysLeft: 143, state: "In force" });
  });

  it("how much of the term has gone by: the days since it started over its length", () => {
    expect(view("accident", "2026-09-20").elapsed).toBeCloseTo(183 / 365, 9);
    expect(view("accident", "2026-03-21").elapsed).toBe(0);
    expect(view("health", "2027-07-05").elapsed).toBeCloseTo(365 / 1096, 9); // the three years hold the leap day of 2028
  });
});

describe("renewing early, and late", () => {
  const early = [...PAYMENTS, payment("accident", "2027-03-21", 1, 473, { paidOn: "2026-10-20" })];

  it("an early renewal moves the renewal date to the end of the latest term, and the term in force stays the old one", () => {
    const v = view("accident", TODAY, early);
    expect(v.renewsOn).toBe("2028-03-21");
    expect(v.daysLeft).toBe(509);
    expect(v.current?.start).toBe("2026-03-21");
    expect(v.latest?.start).toBe("2027-03-21");
    expect(v.state).toBe("In force");
    expect(v.elapsed).toBeCloseTo(222 / 365, 9);
  });

  it("the new term becomes the one in force once it starts", () => {
    const v = view("accident", "2027-04-01", early);
    expect(v.current?.start).toBe("2027-03-21");
    expect(v.yearly).toBe(473);
  });

  it("a term recorded for a later start leaves a gap, and the policy is lapsed in it", () => {
    const late = [...PAYMENTS, payment("accident", "2027-04-10", 1, 473)];
    const v = view("accident", "2027-03-25", late);
    expect(v.state).toBe("Lapsed");
    expect(coverGaps(v.terms)).toEqual([{ from: "2027-03-21", to: "2027-04-09", days: 20 }]);
  });
});

describe("coverGaps", () => {
  const terms = (...starts: string[]) => starts.map((start) => termOf(payment("a", start, 1, 100)));

  it("a renewal that is late by six days is a gap of six days", () => {
    expect(coverGaps(terms("2026-03-21", "2027-03-27"))).toEqual([{ from: "2027-03-21", to: "2027-03-26", days: 6 }]);
  });

  it("a renewal on the day, or one that overlaps the last term, is no gap", () => {
    expect(coverGaps(terms("2026-03-21", "2027-03-21"))).toEqual([]);
    expect(coverGaps(terms("2026-03-21", "2027-03-01"))).toEqual([]);
  });
});

describe("a year of cover", () => {
  it("adds up what everything you hold costs a year, with the single premiums spread over their years", () => {
    const views = at(TODAY);
    expect(yearlyCover(views)).toBeCloseTo(38_427.59 / 3 + 451 + 5_504 + 5_241 / 3, 6);
    expect(yearlyCover(views)).toBeCloseTo(20_511.2, 1);
    expect(monthlyCover(views)).toBeCloseTo(yearlyCover(views) / 12, 9);
  });

  it("leaves out a policy that has lapsed or been cancelled", () => {
    const lapsed = at("2027-03-27");
    expect(yearlyCover(lapsed)).toBeCloseTo(38_427.59 / 3 + 5_504 + 5_241 / 3, 6);
    const cancelled = at(TODAY, PAYMENTS, [health, accident, car, { ...bike, status: "Cancelled" }]);
    expect(yearlyCover(cancelled)).toBeCloseTo(38_427.59 / 3 + 451 + 5_504, 6);
  });

  it("is a policy's price against its cover, and none when there is no cover figure", () => {
    expect(premiumOverCover(view("health", TODAY))).toBeCloseTo(38_427.59 / 3 / 5_000_000, 9);
    expect(premiumOverCover(viewPolicy(policy("tp", "Motor", 0), [payment("tp", "2026-08-06", 1, 900)], TODAY))).toBeNull();
    expect(premiumOverCover(view("accident", "2027-03-27"))).toBeNull();
  });
});

describe("cashPaidIn (the calendar year, up to today)", () => {
  it("is every Paid term paid that year, in full, so three-year premiums make it far more than a year of cover", () => {
    const paid = cashPaidIn(2026, PAYMENTS, TODAY);
    expect(paid.total).toBeCloseTo(38_427.59 + 451 + 5_504 + 5_241, 6);
    expect(paid.total).toBeGreaterThan(yearlyCover(at(TODAY)) * 2);
  });

  it("says how much of it is dated by a guess", () => {
    expect(cashPaidIn(2026, PAYMENTS, TODAY).assumed).toBeCloseTo(38_427.59 + 5_504, 6);
    expect(cashPaidIn(2026, [PAYMENTS[1]], TODAY).assumed).toBe(0);
  });

  it("counts a premium in the year the money left, not the year the cover starts", () => {
    const december = [payment("a", "2027-01-02", 1, 300, { paidOn: "2026-12-31" })];
    expect(cashPaidIn(2026, december, "2026-12-31").total).toBe(300);
    expect(cashPaidIn(2027, december, "2027-06-01").total).toBe(0);
  });

  it("leaves out Pending terms and money that hasn't left yet", () => {
    const later = [payment("a", "2026-12-05", 1, 300, { paidOn: "2026-12-01" }), payment("a", "2026-01-01", 1, 99, { status: "Pending" })];
    expect(cashPaidIn(2026, later, TODAY).total).toBe(0);
    expect(cashPaidIn(2026, later, "2026-12-01").total).toBe(300);
    expect(cashPaidIn(2025, PAYMENTS, TODAY).total).toBe(0);
  });
});

describe("renewalsToComeIn", () => {
  it("adds the renewals still to come in a year at each policy's last premium", () => {
    expect(renewalsToComeIn(2026, at(TODAY), TODAY)).toBe(0);
    expect(renewalsToComeIn(2027, at(TODAY), TODAY)).toBe(451 + 5_504);
  });

  it("leaves out renewals already past, and policies you no longer hold", () => {
    expect(renewalsToComeIn(2027, at("2027-04-01"), "2027-04-01")).toBe(5_504);
    const cancelled = at(TODAY, PAYMENTS, [health, accident, { ...car, status: "Cancelled" }, bike]);
    expect(renewalsToComeIn(2027, cancelled, TODAY)).toBe(451);
  });
});

describe("premiumRunway", () => {
  const runway = premiumRunway(at(TODAY), "2026-01", "2029-08");
  const month = (key: string) => runway.find((m) => m.month === key)!;

  it("puts each paid term in the month the money left, assumed days in the month cover starts", () => {
    expect(month("2026-03").items.map((i) => [i.policyId, i.amount, i.paid, i.assumed]).sort()).toEqual([["accident", 451, true, false], ["bike", 5_241, true, false]]);
    expect(month("2026-03").total).toBe(5_692);
    expect(month("2026-07").items).toEqual([{ policyId: "health", amount: 38_427.59, paid: true, on: "2026-07-05", assumed: true }]);
    expect(month("2026-08").items).toEqual([{ policyId: "car", amount: 5_504, paid: true, on: "2026-08-06", assumed: true }]);
  });

  it("steps each renewal on by its own years: a year for the accident cover, three for the health and bike", () => {
    expect(month("2027-03").items).toEqual([{ policyId: "accident", amount: 451, paid: false, on: "2027-03-21", assumed: false }]);
    expect(month("2028-03").items).toEqual([{ policyId: "accident", amount: 451, paid: false, on: "2028-03-21", assumed: false }]);
    expect(month("2029-03").items.map((i) => i.policyId).sort()).toEqual(["accident", "bike"]);
    expect(month("2029-07").items).toEqual([{ policyId: "health", amount: 38_427.59, paid: false, on: "2029-07-05", assumed: false }]);
    expect(month("2027-08").items[0]).toMatchObject({ policyId: "car", paid: false });
  });

  it("every renewal appears exactly once, and a month with nothing due is empty", () => {
    const due = runway.flatMap((m) => m.items).filter((i) => !i.paid);
    expect(new Set(due.map((i) => `${i.policyId}${i.on}`)).size).toBe(due.length);
    expect(month("2026-11").items).toEqual([]);
    expect(month("2026-11").total).toBe(0);
  });

  it("its paid money for a year is what cashPaidIn says for it", () => {
    const paid2026 = runway.filter((m) => m.month.startsWith("2026")).flatMap((m) => m.items).filter((i) => i.paid).reduce((t, i) => t + i.amount, 0);
    expect(paid2026).toBeCloseTo(cashPaidIn(2026, PAYMENTS, TODAY).total, 6);
  });

  it("a cancelled or lapsed policy keeps its history but has no future bars", () => {
    const cancelled = premiumRunway(at(TODAY, PAYMENTS, [health, accident, car, { ...bike, status: "Cancelled" }]), "2026-01", "2029-08");
    expect(cancelled.flatMap((m) => m.items).filter((i) => i.policyId === "bike")).toEqual([{ policyId: "bike", amount: 5_241, paid: true, on: "2026-03-18", assumed: false }]);
    const lapsed = premiumRunway(at("2027-03-27"), "2026-01", "2029-08");
    expect(lapsed.flatMap((m) => m.items).filter((i) => i.policyId === "accident" && !i.paid)).toEqual([]);
  });
});

describe("priceChanges", () => {
  it("compares each term's cost of a year with the one before, so a three-year premium isn't three times dearer", () => {
    const terms = [termOf(payment("a", "2024-01-01", 3, 30_000)), termOf(payment("a", "2027-01-01", 1, 11_000)), termOf(payment("a", "2028-01-01", 1, 12_100))];
    const changes = priceChanges(terms);
    expect(changes[0]).toBeNull();
    expect(changes[1]).toBeCloseTo(0.1, 9);
    expect(changes[2]).toBeCloseTo(0.1, 9);
  });
});

describe("nextNcb", () => {
  it("moves to the next step up, and stays at the top", () => {
    expect([0, 20, 25, 35, 45, 50].map(nextNcb)).toEqual([20, 25, 35, 45, 50, 50]);
  });

  it("a value between steps goes to the step above it", () => {
    expect(nextNcb(12)).toBe(20);
    expect(nextNcb(30)).toBe(35);
  });
});

describe("what's next", () => {
  it("orders what you hold by renewal date and names the next", () => {
    expect(byRenewal(at(TODAY)).map((v) => v.policy.id)).toEqual(["accident", "car", "bike", "health"]);
    expect(nextRenewal(at(TODAY))?.policy.id).toBe("accident");
  });

  it("leaves out a lapsed policy, and a cancelled one, from what's next", () => {
    expect(nextRenewal(at("2027-03-27"))?.policy.id).toBe("car");
    expect(byRenewal(at(TODAY, PAYMENTS, [health, accident, { ...car, status: "Cancelled" }, bike])).map((v) => v.policy.id)).not.toContain("car");
  });

  it("lists what renews within a window, a month by default", () => {
    expect(renewingWithin(at("2027-02-25")).map((v) => v.policy.id)).toEqual(["accident"]);
    expect(renewingWithin(at(TODAY))).toEqual([]);
    expect(renewingWithin(at(TODAY), 300).map((v) => v.policy.id)).toEqual(["accident", "car"]);
  });
});

describe("coverByKind", () => {
  it("adds the cover you hold by kind and never mixes kinds", () => {
    expect(coverByKind(at(TODAY))).toEqual({ Health: 5_000_000, Life: 0, Motor: 442_000 + 73_545, Home: 0, Accident: 1_500_000 });
  });

  it("leaves out a lapsed or cancelled policy's cover", () => {
    expect(coverByKind(at("2027-03-27")).Accident).toBe(0);
    expect(coverByKind(at(TODAY, PAYMENTS, [health, accident, { ...car, status: "Cancelled" }, bike])).Motor).toBe(73_545);
  });
});

describe("uninsuredLoans", () => {
  const loan = (id: string, category: Loan["category"], status: Loan["status"] = "Active") => ({ id, name: id, category, status });
  const loans = [loan("auto", "Auto"), loan("home", "Home"), loan("personal", "Personal"), loan("closed-home", "Home", "Closed")];

  it("names a Home loan when no home policy is held, and ignores personal, other and closed loans", () => {
    expect(uninsuredLoans(loans, at(TODAY)).map((l) => l.id)).toEqual(["home"]);
  });

  it("an Auto loan is covered by any motor policy you hold, and not by a lapsed one", () => {
    expect(uninsuredLoans([loan("auto", "Auto")], at(TODAY))).toEqual([]);
    const lapsedCar = at("2027-09-01");
    expect(uninsuredLoans([loan("auto", "Auto")], lapsedCar.filter((v) => v.policy.id === "car"))).toHaveLength(1);
  });

  it("a held home policy closes the gap", () => {
    const homePolicy = policy("hp", "Home", 2_800_000);
    const views = viewPolicies([homePolicy], [payment("hp", "2026-06-02", 1, 5_600)], TODAY);
    expect(uninsuredLoans([loan("home", "Home")], views)).toEqual([]);
    expect(uninsuredLoans(loans, views).map((l) => l.id)).toEqual(["auto"]);
  });
});

describe("overlapping and duplicate terms (the repository checks one row at a time and can't refuse them)", () => {
  const overlapping = [payment("accident", "2026-03-21", 3, 1_200), payment("accident", "2027-01-01", 1, 473, { paidOn: "2026-12-20" })];

  it("the renewal date is the latest end of any term, so a shorter term inside a longer one can't pull it in", () => {
    const v = view("accident", "2026-10-29", overlapping);
    expect(v.renewsOn).toBe("2029-03-21");
    expect(v.state).toBe("In force");
  });

  it("a short term that has ended inside a longer one that hasn't leaves the policy covered", () => {
    const v = view("accident", "2028-01-05", overlapping);
    expect(v.state).toBe("In force");
    expect(v.current?.start).toBe("2026-03-21");
  });

  it("a duplicate term (renewing twice) leaves one renewal date, not two", () => {
    const twice = [payment("accident", "2026-03-21", 1, 451), { ...payment("accident", "2026-03-21", 1, 451), id: "again" }];
    const v = view("accident", "2026-10-29", twice);
    expect(v.renewsOn).toBe("2027-03-21");
    expect(upcomingRenewals([v], "2029-12-31").map((r) => r.on)).toEqual(["2027-03-21", "2028-03-21", "2029-03-21"]);
  });

  it("a gap is measured from the latest end so far, so an overlap doesn't hide one after it", () => {
    const terms = [termOf(payment("a", "2026-01-01", 3, 100)), termOf(payment("a", "2027-01-01", 1, 100)), termOf(payment("a", "2029-02-01", 1, 100))];
    expect(coverGaps(terms)).toEqual([{ from: "2029-01-01", to: "2029-01-31", days: 31 }]);
  });
});

describe("renewals in a year after the next one", () => {
  it("steps a one-year policy on, as the runway does: the accident cover renews again in 2028", () => {
    expect(renewalsToComeIn(2028, at(TODAY), TODAY)).toBe(451 + 5_504);
    expect(renewalsToComeIn(2029, at(TODAY), TODAY)).toBe(451 + 5_504 + 5_241 + 38_427.59);
  });

  it("agrees with the runway for every year", () => {
    const runway = premiumRunway(at(TODAY), "2026-01", "2029-12");
    for (const year of [2026, 2027, 2028, 2029]) {
      const due = runway.filter((m) => m.month.startsWith(String(year))).flatMap((m) => m.items).filter((i) => !i.paid).reduce((t, i) => t + i.amount, 0);
      expect(renewalsToComeIn(year, at(TODAY), TODAY)).toBeCloseTo(due, 6);
    }
  });
});

describe("a term paid early with no paid-on day", () => {
  it("was paid by today, so it counts today and is reported as assumed, not left out until its start", () => {
    const early = [payment("accident", "2027-03-21", 1, 473)];
    expect(cashPaidIn(2026, early, TODAY)).toEqual({ total: 473, assumed: 473 });
    expect(cashPaidIn(2027, early, TODAY).total).toBe(0);
  });

  it("a paid-on day that is later than today is a scheduled one and isn't counted yet", () => {
    expect(cashPaidIn(2026, [payment("accident", "2027-03-21", 1, 473, { paidOn: "2026-12-01" })], TODAY).total).toBe(0);
  });
});

describe("uninsuredLoans keeps the caller's loan", () => {
  it("returns the loans as given, with every field", () => {
    const loan = { id: "l", name: "Home loan", lenderName: "SBI", category: "Home" as const, status: "Active" as const };
    const [gap] = uninsuredLoans([loan], at(TODAY));
    expect(gap.lenderName).toBe("SBI");
  });
});

describe("checkNewTerm", () => {
  const terms = paidTerms("accident", PAYMENTS);

  it("accepts the renewal that starts the day the last term ends, and a late one (which leaves a gap)", () => {
    expect(checkNewTerm(accident, terms, { periodStart: "2027-03-21", years: 1 })).toBeNull();
    expect(checkNewTerm(accident, terms, { periodStart: "2027-03-27", years: 1 })).toBeNull();
  });

  it("refuses a term that starts the same day as one already recorded, as pressing Renew twice would", () => {
    expect(checkNewTerm(accident, terms, { periodStart: "2026-03-21", years: 1 })).toBe("This policy already has a term that starts on Mar 21, 2026");
  });

  it("refuses a term that starts inside an earlier one, or that runs into a later one", () => {
    expect(checkNewTerm(accident, terms, { periodStart: "2026-12-01", years: 1 })).toBe("That overlaps the term from Mar 21, 2026 to Mar 20, 2027");
    const later = [...terms, termOf(payment("accident", "2028-03-21", 1, 460))];
    expect(checkNewTerm(accident, later, { periodStart: "2027-03-21", years: 2 })).toContain("overlaps the term from Mar 21, 2028");
    expect(checkNewTerm(accident, later, { periodStart: "2027-03-21", years: 1 })).toBeNull();
  });

  it("a three-year term overlaps for three years", () => {
    const health3 = paidTerms("health", PAYMENTS);
    expect(checkNewTerm(health, health3, { periodStart: "2028-07-05", years: 1 })).toContain("overlaps");
    expect(checkNewTerm(health, health3, { periodStart: "2029-07-05", years: 3 })).toBeNull();
  });

  it("only a motor policy takes a no-claim step", () => {
    expect(checkNewTerm(health, paidTerms("health", PAYMENTS), { periodStart: "2029-07-05", years: 1, ncb: 20 })).toBe("A no-claim bonus is for a motor policy");
    expect(checkNewTerm(car, paidTerms("car", PAYMENTS), { periodStart: "2027-08-06", years: 1, ncb: 50 })).toBeNull();
  });
});

describe("renewalDefaults", () => {
  it("starts the next term on the renewal date, for the same years, with the next no-claim step", () => {
    expect(renewalDefaults(view("car", TODAY), TODAY)).toEqual({ start: "2027-08-06", years: 1, lastAmount: 5_504, ncb: 50, gapDays: 0 });
    expect(renewalDefaults(view("bike", TODAY), TODAY)).toEqual({ start: "2029-03-21", years: 3, lastAmount: 5_241, ncb: 20, gapDays: 0 });
  });

  it("a policy with no no-claim step has none to suggest", () => {
    expect(renewalDefaults(view("health", TODAY), TODAY)).toEqual({ start: "2029-07-05", years: 3, lastAmount: 38_427.59, gapDays: 0 });
  });

  it("a lapsed policy starts today, and says how many days it was without cover", () => {
    expect(renewalDefaults(view("accident", "2027-03-27"), "2027-03-27")).toMatchObject({ start: "2027-03-27", gapDays: 6 });
    expect(renewalDefaults(view("accident", "2027-03-21"), "2027-03-21")).toMatchObject({ start: "2027-03-21", gapDays: 0 });
  });

  it("has nothing to renew from when there is no term", () => {
    expect(renewalDefaults(viewPolicy(policy("p", "Home", 1), [], TODAY), TODAY)).toBeNull();
  });
});

describe("what the forms preview", () => {
  it("counts the days with no cover when a term starts after the last one's renewal date, and none when it's on time or early", () => {
    expect(gapDays("2026-10-20", "2026-10-29")).toBe(9);
    expect(gapDays("2026-10-20", "2026-10-20")).toBe(0);
    expect(gapDays("2026-10-20", "2026-10-01")).toBe(0);
  });

  it("compares a quote's cost of a year with the last term's, so one premium for three years isn't three times dearer", () => {
    expect(quoteChange({ amount: 9900, years: 3 }, { amount: 9000, years: 3 })).toBeCloseTo(0.1, 6);
    expect(quoteChange({ amount: 3300, years: 1 }, { amount: 9000, years: 3 })).toBeCloseTo(0.1, 6);
    expect(quoteChange({ amount: 5000, years: 1 }, null)).toBeNull();
  });

  it("works out a term's last day, a year of it, and a year over the cover", () => {
    expect(termPreview({ start: "2026-08-05", years: 3, amount: 9000, cover: 500000 })).toEqual({ end: "2029-08-04", perYear: 3000, ratio: 0.006 });
    expect(termPreview({ start: "2026-08-06", years: 1, amount: 5504, cover: 0 })).toMatchObject({ end: "2027-08-05", ratio: null });
  });
});
