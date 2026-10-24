import { describe, expect, it } from "vitest";
import { daysAfterExpected, isLate, nextPayment, pendingPayments, receivedScheduledDates, scheduledDates, upcomingPayments } from "./incomeSchedule";
import type { IncomeEntry, IncomeSource } from "../sheets/types";

const source = (o: Partial<IncomeSource> = {}): IncomeSource => ({
  id: "fd",
  name: "FD interest",
  alias: "FD",
  category: "Investment",
  frequency: "Quarterly",
  expectedAmount: 18400,
  status: "Active",
  scheduleDate: "2026-01-05",
  ...o,
});

let n = 0;
const got = (expectedDate: string, receivedDate: string, o: Partial<IncomeEntry> = {}): IncomeEntry => ({
  id: `e${n++}`,
  incomeSourceId: "fd",
  expectedDate,
  receivedDate,
  amount: 18400,
  status: "Received",
  tag: "Regular",
  ...o,
});

describe("scheduledDates", () => {
  it("counts both ways from the schedule date", () => {
    expect(scheduledDates(source(), "2025-06-01", "2026-12-31")).toEqual(["2025-07-05", "2025-10-05", "2026-01-05", "2026-04-05", "2026-07-05", "2026-10-05"]);
  });

  it("includes both ends", () => {
    expect(scheduledDates(source(), "2026-04-05", "2026-07-05")).toEqual(["2026-04-05", "2026-07-05"]);
  });

  it("comes back to the 31st after a short month instead of drifting", () => {
    const salary = source({ frequency: "Monthly", scheduleDate: "2026-01-31" });
    expect(scheduledDates(salary, "2026-02-01", "2026-04-30")).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("gives a one-time source only its own date", () => {
    const refund = source({ frequency: "One-Time", scheduleDate: "2026-07-31" });
    expect(scheduledDates(refund, "2026-01-01", "2026-12-31")).toEqual(["2026-07-31"]);
    expect(scheduledDates(refund, "2026-08-01", "2026-12-31")).toEqual([]);
  });

  it("is empty without a schedule date", () => {
    expect(scheduledDates(source({ scheduleDate: undefined }), "2026-01-01", "2026-12-31")).toEqual([]);
  });
});

describe("pendingPayments", () => {
  it("is every scheduled date after the latest received one that has passed (Prathik's example)", () => {
    // Last recorded Apr 5; Jul 5 and Oct 5 missed.
    const pending = pendingPayments([source()], [got("2026-01-05", "2026-01-05"), got("2026-04-05", "2026-04-06")], "2026-10-24");
    expect(pending.map((p) => p.expectedDate)).toEqual(["2026-07-05", "2026-10-05"]);
    expect(pending.map((p) => p.daysLate)).toEqual([111, 19]);
    expect(pending.every((p) => p.amount === 18400)).toBe(true);
  });

  it("never nags about gaps before the latest received payment", () => {
    // Jan 5 was never recorded, but Apr 5 was: Jan 5 is history.
    const pending = pendingPayments([source()], [got("2026-04-05", "2026-04-05")], "2026-06-01");
    expect(pending).toEqual([]);
  });

  it("counts from the schedule date when nothing has been received", () => {
    const pending = pendingPayments([source({ scheduleDate: "2026-04-05" })], [], "2026-07-06");
    expect(pending.map((p) => p.expectedDate)).toEqual(["2026-04-05", "2026-07-05"]);
  });

  it("starts the day after the expected date, not on it", () => {
    expect(pendingPayments([source()], [got("2026-07-05", "2026-07-05")], "2026-10-05")).toEqual([]);
    expect(pendingPayments([source()], [got("2026-07-05", "2026-07-05")], "2026-10-06").map((p) => p.daysLate)).toEqual([1]);
  });

  it("isn't filled in by a bonus: only a Regular entry receives a regular payment", () => {
    const salary = source({ id: "sal", frequency: "Monthly", scheduleDate: "2026-01-01", expectedAmount: 138500 });
    const entries = [got("2026-02-01", "2026-02-01", { incomeSourceId: "sal" }), got("2026-03-01", "2026-03-20", { incomeSourceId: "sal", tag: "Bonus", amount: 160000 })];
    expect(pendingPayments([salary], entries, "2026-03-10").map((p) => p.expectedDate)).toEqual(["2026-03-01"]);
  });

  it("ignores inactive sources and a one-time source once it's received", () => {
    const refund = source({ id: "tax", frequency: "One-Time", scheduleDate: "2026-07-31" });
    expect(pendingPayments([source({ status: "Inactive" })], [], "2026-10-24")).toEqual([]);
    expect(pendingPayments([refund], [], "2026-08-01").map((p) => p.expectedDate)).toEqual(["2026-07-31"]);
    expect(pendingPayments([refund], [got("2026-07-31", "2026-08-06", { incomeSourceId: "tax" })], "2026-10-24")).toEqual([]);
  });

  it("lets an entry receive the scheduled date nearest its expected date, within half a cycle", () => {
    const salary = source({ id: "sal", frequency: "Monthly", scheduleDate: "2026-01-01", expectedAmount: 138500 });
    // Recorded as expected Sep 30 (the day it landed): it receives the Oct 1 salary, so nothing is pending on Oct 2
    // and Oct 1 isn't listed as still to come.
    const early = [got("2026-09-30", "2026-09-30", { incomeSourceId: "sal" })];
    expect(pendingPayments([salary], early, "2026-10-02")).toEqual([]);
    expect(upcomingPayments([salary], early, "2026-09-30", "2026-11-01").map((p) => p.expectedDate)).toEqual(["2026-11-01"]);
    expect(receivedScheduledDates(salary, early)).toEqual(new Set(["2026-10-01"]));
    // Between two quarterly dates it receives the nearer one; a tie goes to the earlier.
    expect(receivedScheduledDates(source(), [got("2026-02-20", "2026-02-20")])).toEqual(new Set(["2026-04-05"]));
    expect(receivedScheduledDates(source(), [got("2026-02-19", "2026-02-19")])).toEqual(new Set(["2026-01-05"]));
  });

  it("doesn't count an old stored Pending row as received", () => {
    const entries: IncomeEntry[] = [{ id: "old", incomeSourceId: "fd", expectedDate: "2026-04-05", amount: 18400, status: "Pending", tag: "Regular" }];
    expect(pendingPayments([source()], entries, "2026-04-10").map((p) => p.expectedDate)).toEqual(["2026-01-05", "2026-04-05"]);
  });
});

describe("upcomingPayments", () => {
  it("is each active source's schedule from today on, at its usual amount, soonest first", () => {
    const salary = source({ id: "sal", frequency: "Monthly", scheduleDate: "2026-01-01", expectedAmount: 138500 });
    const up = upcomingPayments([source(), salary], [], "2026-10-24", "2027-01-31");
    expect(up).toEqual([
      { sourceId: "sal", expectedDate: "2026-11-01", amount: 138500 },
      { sourceId: "sal", expectedDate: "2026-12-01", amount: 138500 },
      { sourceId: "sal", expectedDate: "2027-01-01", amount: 138500 },
      { sourceId: "fd", expectedDate: "2027-01-05", amount: 18400 },
    ]);
  });

  it("includes today and leaves out what's already received early", () => {
    const up = upcomingPayments([source()], [got("2026-10-05", "2026-10-03")], "2026-10-05", "2027-01-05");
    expect(up.map((p) => p.expectedDate)).toEqual(["2027-01-05"]);
  });
});

describe("nextPayment", () => {
  it("is the oldest pending one first, else the next upcoming", () => {
    expect(nextPayment(source(), [got("2026-04-05", "2026-04-05")], "2026-10-24")).toMatchObject({ expectedDate: "2026-07-05", pending: true });
    expect(nextPayment(source(), [got("2026-10-05", "2026-10-05")], "2026-10-24")).toMatchObject({ expectedDate: "2027-01-05", pending: false });
    expect(nextPayment(source({ frequency: "One-Time", scheduleDate: "2026-01-01" }), [got("2026-01-01", "2026-01-01")], "2026-10-24")).toBeUndefined();
  });
});

describe("late", () => {
  it("is more than 3 days after it was expected", () => {
    expect(isLate(got("2026-04-05", "2026-04-08"))).toBe(false);
    expect(isLate(got("2026-04-05", "2026-04-09"))).toBe(true);
    expect(daysAfterExpected(got("2026-04-05", "2026-04-03"))).toBe(-2);
  });
});
