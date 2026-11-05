import { describe, expect, it } from "vitest";
import { MATCH_DAYS } from "./incomeSchedule";
import { firstPayoutDate, lentPromises, MISSING_AFTER_DAYS } from "./lentPromises";
import type { IncomeEntry, IncomeSource, LentLoan } from "../sheets/types";

const TODAY = "2026-11-06";

const threeL: LentLoan = { id: "l3", borrowerName: "B", principalAmount: 300000, startDate: "2025-11-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: 6000, status: "Active" };
const threeLSource: IncomeSource = { id: "s3", name: "B", alias: "B", category: "Investment", frequency: "Monthly", expectedAmount: 6000, status: "Active", scheduleDate: "2025-12-01" };
const oneEightyTwo: LentLoan = { id: "l2", borrowerName: "C", principalAmount: 182000, startDate: "2026-01-01", interestMode: "Paid-out", payoutFrequency: "Quarterly", payoutAmount: 18000, status: "Active" };
const oneEightyTwoSource: IncomeSource = { id: "s2", name: "C", alias: "C", category: "Investment", frequency: "Quarterly", expectedAmount: 18000, status: "Active", scheduleDate: "2026-04-01" };

let n = 0;
const got = (sourceId: string, expected: string, received: string, amount: number, extra: Partial<IncomeEntry> = {}): IncomeEntry => ({
  id: `e${++n}`, incomeSourceId: sourceId, expectedDate: expected, receivedDate: received, amount, status: "Received", tag: "Regular", ...extra,
});

/** The made-up sample on the mockups: ₹3L pays 10 of its 12 months (Feb never came, Mar was 9 days late, Nov isn't here yet); ₹1.82L pays all three quarters. */
const sampleEntries: IncomeEntry[] = [
  got("s3", "2025-12-01", "2025-12-01", 6000), got("s3", "2026-01-01", "2026-01-02", 6000),
  got("s3", "2026-03-01", "2026-03-10", 6000), got("s3", "2026-04-01", "2026-04-01", 6000), got("s3", "2026-05-01", "2026-05-02", 6000),
  got("s3", "2026-06-01", "2026-06-01", 6000), got("s3", "2026-07-01", "2026-07-01", 6000), got("s3", "2026-08-01", "2026-08-03", 6000),
  got("s3", "2026-09-01", "2026-09-01", 6000), got("s3", "2026-10-01", "2026-10-01", 6000),
  got("s2", "2026-04-01", "2026-04-01", 18000), got("s2", "2026-07-01", "2026-07-04", 18000), got("s2", "2026-10-01", "2026-10-01", 18000),
];

describe("firstPayoutDate", () => {
  it("is one period after the day it was lent", () => {
    expect(firstPayoutDate(threeL)).toBe("2025-12-01");
    expect(firstPayoutDate(oneEightyTwo)).toBe("2026-04-01");
  });
});

describe("lentPromises on the sample", () => {
  const a = lentPromises(threeL, threeLSource, sampleEntries, TODAY);
  const b = lentPromises(oneEightyTwo, oneEightyTwoSource, sampleEntries, TODAY);

  it("promises twelve months of ₹6,000 to the ₹3L loan and three quarters of ₹18,000 to the ₹1.82L, ₹1,26,000 in all", () => {
    expect(a.promises).toHaveLength(12);
    expect(b.promises).toHaveLength(3);
    expect(a.promised + b.promised).toBe(126000);
  });

  it("reaches ₹1,14,000 of it, with ₹12,000 not here: Feb missing and Nov overdue", () => {
    expect(a.arrived + b.arrived).toBe(114000);
    expect(a.missing).toBe(6000);
    expect(a.overdue).toBe(6000);
    expect(a.notHere).toBe(12000);
    expect(b.notHere).toBe(0);
  });

  it("gives each month its verdict", () => {
    const verdict = (d: string) => a.promises.find((p) => p.date === d)?.verdict;
    expect(verdict("2025-12-01")).toBe("On time");
    expect(verdict("2026-01-01")).toBe("On time"); // one day after, inside the grace
    expect(verdict("2026-02-01")).toBe("Missing");
    expect(verdict("2026-03-01")).toBe("Paid late"); // nine days after
    expect(verdict("2026-08-01")).toBe("On time"); // exactly three days after
    expect(verdict("2026-11-01")).toBe("Overdue"); // five days over today
  });

  it("names the next payout", () => {
    expect(a.next).toEqual({ date: "2026-12-01", amount: 6000, inDays: 25 });
    expect(b.next).toEqual({ date: "2027-01-01", amount: 18000, inDays: 56 });
  });
});

describe("a payout's verdict at the edges", () => {
  const verdictOn = (today: string, entries: IncomeEntry[] = []) =>
    lentPromises(threeL, threeLSource, entries, today).promises.find((p) => p.date === "2025-12-01")?.verdict;

  it("is Waiting on its own day and before, until it arrives", () => {
    expect(verdictOn("2025-12-01")).toBe("Waiting");
    expect(lentPromises(threeL, threeLSource, [], "2025-11-20").promises).toHaveLength(0);
  });
  it("is On time when it arrives early, three days late, and Paid late at four", () => {
    expect(lentPromises(threeL, threeLSource, [got("s3", "2025-12-01", "2025-11-29", 6000)], "2025-12-10").promises[0].verdict).toBe("On time");
    expect(lentPromises(threeL, threeLSource, [got("s3", "2025-12-01", "2025-12-04", 6000)], "2025-12-10").promises[0].verdict).toBe("On time");
    expect(lentPromises(threeL, threeLSource, [got("s3", "2025-12-01", "2025-12-05", 6000)], "2025-12-10").promises[0].verdict).toBe("Paid late");
  });
  it("is Overdue up to 14 days past, and Missing from the 15th", () => {
    expect(verdictOn("2025-12-15")).toBe("Overdue");
    expect(verdictOn("2025-12-16")).toBe("Missing");
  });
  it("lets a quarterly payout stay overdue as long as Income would still receive it (45 days)", () => {
    const verdict = (today: string) => lentPromises(oneEightyTwo, oneEightyTwoSource, [], today).promises[0].verdict;
    expect(verdict("2026-05-16")).toBe("Overdue");
    expect(verdict("2026-05-17")).toBe("Missing");
    expect(MISSING_AFTER_DAYS.Quarterly).toBe(45);
  });
});

describe("what counts as arrived", () => {
  it("promises nothing before the first payout, even when the income source's schedule reaches back", () => {
    const early: IncomeSource = { ...threeLSource, scheduleDate: "2025-10-01" };
    const r = lentPromises(threeL, early, [], "2025-12-20");
    expect(r.promises.map((p) => p.date)).toEqual(["2025-12-01"]);
  });
  it("lets one entry receive one day, and a second entry for the same day adds nothing", () => {
    const entries = [got("s3", "2025-12-01", "2025-12-01", 6000), got("s3", "2025-12-01", "2025-12-02", 6000)];
    const r = lentPromises(threeL, threeLSource, entries, "2025-12-20");
    expect(r.arrived).toBe(6000);
  });
  it("ignores a bonus, a pending row and another source's entry", () => {
    const entries = [
      got("s3", "2025-12-01", "2025-12-01", 6000, { tag: "Bonus" }),
      got("s3", "2025-12-01", "2025-12-01", 6000, { status: "Pending", receivedDate: undefined }),
      got("other", "2025-12-01", "2025-12-01", 6000),
    ];
    const r = lentPromises(threeL, threeLSource, entries, "2025-12-03");
    expect(r.arrived).toBe(0);
  });
  it("counts what actually arrived, not the usual amount", () => {
    const r = lentPromises(threeL, threeLSource, [got("s3", "2025-12-01", "2025-12-01", 5500)], "2025-12-03");
    expect(r.arrived).toBe(5500);
    expect(r.promised).toBe(5500);
  });
});

describe("a loan with nothing to read", () => {
  it("says not linked, and calls nothing missing, when it has no income source", () => {
    const r = lentPromises(threeL, undefined, sampleEntries, TODAY);
    expect(r).toMatchObject({ linked: false, promised: 0, missing: 0, overdue: 0, notHere: 0 });
    expect(r.promises).toEqual([]);
  });
  it("says not linked for an Accruing loan", () => {
    const accruing: LentLoan = { id: "a", borrowerName: "F", principalAmount: 650000, startDate: "2024-10-01", interestMode: "Accruing", interestRate: 12, status: "Active" };
    expect(lentPromises(accruing, threeLSource, sampleEntries, TODAY).linked).toBe(false);
  });
  it("promises nothing after a repaid loan's closing day, and has no next payout", () => {
    const repaid: LentLoan = { ...threeL, status: "Repaid", closedDate: "2026-02-15" };
    const r = lentPromises(repaid, threeLSource, sampleEntries, TODAY);
    expect(r.promises.map((p) => p.date).at(-1)).toBe("2026-02-01");
    expect(r.next).toBeUndefined();
  });
});

describe("review fixes", () => {
  it("skips a future payout that already arrived early when naming the next one", () => {
    const early = [got("s3", "2025-12-01", "2025-11-28", 6000)];
    const r = lentPromises(threeL, threeLSource, early, "2025-11-30");
    expect(r.next).toEqual({ date: "2026-01-01", amount: 6000, inDays: 32 });
  });
  it("follows Income's match window for quarterly and yearly payouts", () => {
    expect(MISSING_AFTER_DAYS.Quarterly).toBe(MATCH_DAYS.Quarterly);
    expect(MISSING_AFTER_DAYS.Yearly).toBe(MATCH_DAYS.Yearly);
  });
  it("promises a yearly payout one year after it was lent", () => {
    const yearly: LentLoan = { ...threeL, payoutFrequency: "Yearly", payoutAmount: 72000 };
    expect(firstPayoutDate(yearly)).toBe("2026-11-01");
  });
  it("puts a loan lent on the 31st on the last day of the next shorter month", () => {
    expect(firstPayoutDate({ startDate: "2026-01-31", payoutFrequency: "Monthly" })).toBe("2026-02-28");
  });
});

