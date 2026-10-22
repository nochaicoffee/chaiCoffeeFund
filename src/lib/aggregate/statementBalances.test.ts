import { describe, expect, it } from "vitest";
import { balanceOn } from "./accounts";
import {
  balancesFromStatement,
  checkStatement,
  orderRows,
  planReviews,
  reconcile,
  resolution,
  sameAmount,
  statementSkipReason,
  type AccountStatement,
  type ReconcileAction,
  type ReviewRecord,
  type StatementRow,
} from "./statementBalances";
import type { BalanceSnapshot } from "../sheets/types";

/** Builds a statement whose balances chain from the opening one, so each test states only movements. */
function statementOf(periodStart: string, periodEnd: string, openingBalance: number, movements: [string, number][]): AccountStatement {
  let running = Math.round(openingBalance * 100);
  const rows: StatementRow[] = movements.map(([date, amount]) => {
    running += Math.round(amount * 100);
    return { date, amount, balance: running / 100 };
  });
  return { periodStart, periodEnd, openingBalance, closingBalance: running / 100, rows };
}

const snap = (id: string, date: string, balance: number, accountId = "acc-1"): BalanceSnapshot => ({ id, accountId, date, balance });

describe("sameAmount", () => {
  it("compares to the paisa, so float noise is not a mismatch", () => {
    expect(sameAmount(0.1 + 0.2, 0.3)).toBe(true);
    expect(sameAmount(100.01, 100.02)).toBe(false);
  });
});

describe("checkStatement", () => {
  const monthly = statementOf("2026-08-01", "2026-08-31", 10000, [
    ["2026-08-03", -2500.5],
    ["2026-08-10", 50000],
    ["2026-08-10", -1234.56],
    ["2026-08-28", -100],
  ]);

  it("accepts a statement whose numbers add up: opening plus movements is the closing balance", () => {
    expect(checkStatement(monthly)).toEqual({ ok: true });
    const moved = monthly.rows.reduce((sum, r) => sum + Math.round(r.amount * 100), 0);
    expect(Math.round(monthly.openingBalance * 100) + moved).toBe(Math.round(monthly.closingBalance * 100));
  });

  it("accepts a statement with no movements when closing equals opening", () => {
    expect(checkStatement(statementOf("2026-08-01", "2026-08-31", 500, []))).toEqual({ ok: true });
    expect(checkStatement({ ...statementOf("2026-08-01", "2026-08-31", 500, []), closingBalance: 501 }).ok).toBe(false);
  });

  it("rejects a closing balance that is not where the rows end", () => {
    const result = checkStatement({ ...monthly, closingBalance: monthly.closingBalance + 1 });
    expect(result).toEqual({ ok: false, problem: "the last balance doesn't match the closing balance" });
  });

  it("rejects a row whose balance does not follow from the one before it, naming the row and no amounts", () => {
    const rows = monthly.rows.map((r, i) => (i === 2 ? { ...r, balance: r.balance + 10 } : r));
    const result = checkStatement({ ...monthly, rows });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problem).toContain("row 3");
      expect(result.problem).not.toMatch(/\d{3,}/);
    }
  });

  it("rejects a row outside the period, rows out of date order and a period that ends before it starts", () => {
    expect(checkStatement({ ...monthly, rows: [{ ...monthly.rows[0], date: "2026-09-02" }, ...monthly.rows.slice(1)] }).ok).toBe(false);
    expect(checkStatement({ ...monthly, periodStart: "2026-09-01", periodEnd: "2026-08-01" }).ok).toBe(false);
    const outOfOrder = statementOf("2026-08-01", "2026-08-31", 100, [
      ["2026-08-10", 10],
      ["2026-08-05", 10],
    ]);
    expect(checkStatement(outOfOrder).ok).toBe(false);
  });

  it("handles an overdrawn account: balances below zero chain like any other", () => {
    const overdrawn = statementOf("2026-08-01", "2026-08-31", 100, [
      ["2026-08-02", -350],
      ["2026-08-20", 100],
    ]);
    expect(overdrawn.closingBalance).toBe(-150);
    expect(checkStatement(overdrawn)).toEqual({ ok: true });
  });
});

describe("orderRows", () => {
  const oldestFirst = statementOf("2026-08-01", "2026-08-31", 1000, [
    ["2026-08-05", -100],
    ["2026-08-05", 50],
    ["2026-08-09", -25],
  ]);

  it("leaves rows that already chain from the opening balance alone", () => {
    expect(orderRows(oldestFirst.openingBalance, oldestFirst.rows)).toEqual(oldestFirst.rows);
  });

  it("puts a newest-first statement right, including two rows on one day, which the dates alone cannot order", () => {
    const newestFirst = [...oldestFirst.rows].reverse();
    expect(orderRows(oldestFirst.openingBalance, newestFirst)).toEqual(oldestFirst.rows);
    expect(checkStatement({ ...oldestFirst, rows: orderRows(oldestFirst.openingBalance, newestFirst) })).toEqual({ ok: true });
  });

  it("leaves rows that chain neither way as given, for checkStatement to report", () => {
    const broken = oldestFirst.rows.map((r, i) => (i === 1 ? { ...r, balance: 1 } : r));
    expect(orderRows(oldestFirst.openingBalance, broken)).toEqual(broken);
    expect(checkStatement({ ...oldestFirst, rows: broken }).ok).toBe(false);
  });
});

describe("balancesFromStatement", () => {
  it("a monthly statement gives the opening balance (day before) and the closing balance", () => {
    const s = statementOf("2026-08-01", "2026-08-31", 10000, [
      ["2026-08-03", -2000],
      ["2026-08-20", 500],
    ]);
    expect(balancesFromStatement(s)).toEqual([
      { date: "2026-07-31", balance: 10000, kind: "opening" },
      { date: "2026-08-31", balance: 8500, kind: "closing" },
    ]);
  });

  it("a yearly statement gives the balance at the end of each month with movements, and the closing balance once", () => {
    const s = statementOf("2026-01-01", "2026-04-30", 1000, [
      ["2026-01-05", 100],
      ["2026-01-20", -50],
      ["2026-03-15", 400],
      ["2026-04-30", -10],
    ]);
    const points = balancesFromStatement(s);
    expect(points.map((p) => [p.date, p.balance, p.kind])).toEqual([
      ["2025-12-31", 1000, "opening"],
      ["2026-01-31", 1050, "month-end"],
      ["2026-03-31", 1450, "month-end"],
      ["2026-04-30", 1440, "closing"],
    ]);
  });

  it("a month with no movements is left out, and carrying the balance forward gives the same figure for it", () => {
    const s = statementOf("2026-01-01", "2026-03-31", 1000, [["2026-01-05", 100]]);
    const carried: BalanceSnapshot[] = balancesFromStatement(s).map((p, i) => snap(`s${i}`, p.date, p.balance));
    expect(balancesFromStatement(s).some((p) => p.date === "2026-02-28")).toBe(false);
    expect(balanceOn(carried, "acc-1", "2026-02-28")?.balance).toBe(1100);
  });

  it("every month-end is the last balance on or before it: the statement's own running balance", () => {
    const s = statementOf("2026-01-01", "2026-06-30", 0, [
      ["2026-01-31", 100],
      ["2026-02-01", 100],
      ["2026-02-28", -30],
      ["2026-05-10", 7],
      ["2026-06-30", 1],
    ]);
    for (const p of balancesFromStatement(s).filter((q) => q.kind === "month-end")) {
      const lastOnOrBefore = [...s.rows].filter((r) => r.date <= p.date).pop();
      expect(p.balance).toBe(lastOnOrBefore?.balance);
    }
  });

  it("a custom range ending mid-month closes on its own last day, not on the month's", () => {
    const s = statementOf("2026-02-10", "2026-04-15", 500, [
      ["2026-02-12", 10],
      ["2026-03-12", 10],
      ["2026-04-12", 10],
    ]);
    expect(balancesFromStatement(s).map((p) => [p.date, p.kind])).toEqual([
      ["2026-02-09", "opening"],
      ["2026-02-28", "month-end"],
      ["2026-03-31", "month-end"],
      ["2026-04-15", "closing"],
    ]);
  });

  it("opening on January 1st is December 31st of the year before", () => {
    expect(balancesFromStatement(statementOf("2026-01-01", "2026-01-31", 5, []))[0].date).toBe("2025-12-31");
  });
});

describe("statementSkipReason", () => {
  const account = { status: "Active" as const, startDate: "2026-01-01" };
  it("applies to an open account for a period that has ended", () => {
    expect(statementSkipReason(account, { periodEnd: "2026-09-30" }, "2026-10-23")).toBeNull();
    expect(statementSkipReason(account, { periodEnd: "2026-10-23" }, "2026-10-23")).toBeNull();
  });
  it("skips a closed account, a period not over yet and one before the account opened", () => {
    expect(statementSkipReason({ ...account, status: "Inactive" }, { periodEnd: "2026-09-30" }, "2026-10-23")).toBe("closed-account");
    expect(statementSkipReason(account, { periodEnd: "2026-10-31" }, "2026-10-23")).toBe("period-in-future");
    expect(statementSkipReason(account, { periodEnd: "2025-12-31" }, "2026-10-23")).toBe("before-account-opened");
  });
});

describe("reconcile", () => {
  const august = statementOf("2026-08-01", "2026-08-31", 10000, [["2026-08-03", -2000]]);
  const points = balancesFromStatement(august);

  const apply = (existing: BalanceSnapshot[], actions: ReconcileAction[]): BalanceSnapshot[] => {
    const next = [...existing];
    actions.forEach((a, i) => {
      if (a.type === "create") next.push(snap(`new-${i}-${a.date}`, a.date, a.balance));
    });
    return next;
  };

  it("creates the opening and closing balance for an account with none", () => {
    const actions = reconcile([], "acc-1", points);
    expect(actions.map((a) => [a.type, a.date, a.balance])).toEqual([
      ["create", "2026-07-31", 10000],
      ["create", "2026-08-31", 8000],
    ]);
  });

  it("leaves a balance that already matches, to the paisa", () => {
    const actions = reconcile([snap("a", "2026-07-31", 10000.0), snap("b", "2026-08-31", 8000)], "acc-1", points);
    expect(actions.map((a) => a.type)).toEqual(["unchanged"]);
    expect(actions[0]).toMatchObject({ type: "unchanged", snapshotId: "b" });
  });

  it("leaves a different balance on the same day as it is, and says the statement disagrees: the recorded one wins", () => {
    const existing = [snap("b", "2026-08-31", 7900)];
    const actions = reconcile(existing, "acc-1", points);
    expect(actions.find((a) => a.type === "mismatch")).toMatchObject({ type: "mismatch", date: "2026-08-31", balance: 8000, recordedBalance: 7900, snapshotId: "b" });
    expect(actions.some((a) => a.date === "2026-08-31" && a.type !== "mismatch")).toBe(false);
    expect(existing).toEqual([snap("b", "2026-08-31", 7900)]);
  });

  it("does not create an opening balance when something earlier is recorded: the day is carried from it", () => {
    const actions = reconcile([snap("old", "2026-06-30", 9000)], "acc-1", points);
    expect(actions.map((a) => [a.type, a.date])).toEqual([["create", "2026-08-31"]]);
  });

  it("notes, and does not overwrite, an opening balance that disagrees with the balance recorded for that day", () => {
    const actions = reconcile([snap("prev", "2026-07-31", 9000)], "acc-1", points);
    expect(actions[0]).toEqual({ type: "continuity", date: "2026-07-31", balance: 10000, recordedBalance: 9000, snapshotId: "prev" });
    expect(actions.some((a) => a.type === "mismatch")).toBe(false);
  });

  it("is idempotent: once the creates are applied, a second run creates nothing and the mismatch is the same one", () => {
    const existing = [snap("b", "2026-08-31", 7900)];
    const first = reconcile(existing, "acc-1", points);
    const again = reconcile(apply(existing, first), "acc-1", points);
    expect(again.filter((a) => a.type === "create" || a.type === "continuity")).toEqual([]);
    expect(again.filter((a) => a.type === "mismatch")).toEqual(first.filter((a) => a.type === "mismatch"));
  });

  it("with no mismatches a second run is all unchanged", () => {
    const first = reconcile([], "acc-1", points);
    const again = reconcile(apply([], first), "acc-1", points);
    expect(again.every((a) => a.type === "unchanged")).toBe(true);
  });

  it("a monthly statement then a yearly one covering the same months: the overlap is unchanged, only new months are created", () => {
    const yearly = statementOf("2026-01-01", "2026-08-31", 1000, [
      ["2026-02-02", 100],
      ["2026-07-30", 8900],
      ["2026-08-03", -2000],
    ]);
    const first = reconcile([], "acc-1", balancesFromStatement(statementOf("2026-08-01", "2026-08-31", 10000, [["2026-08-03", -2000]])));
    const existing = apply([], first);
    const second = reconcile(existing, "acc-1", balancesFromStatement(yearly));
    expect(second.find((a) => a.date === "2026-08-31")?.type).toBe("unchanged");
    expect(second.find((a) => a.date === "2026-07-31")?.type).toBe("unchanged");
    expect(second.filter((a) => a.type === "create").map((a) => a.date)).toEqual(["2025-12-31", "2026-02-28"]);
  });

  it("only touches the account it is for", () => {
    const actions = reconcile([snap("x", "2026-08-31", 1, "other")], "acc-1", points);
    expect(actions.every((a) => a.type === "create")).toBe(true);
  });

  it("flags a balance more than a fifth below the one before it, in the statement's own sequence", () => {
    const drop = statementOf("2026-08-01", "2026-09-30", 10000, [["2026-08-10", -1000], ["2026-09-10", -6000]]);
    const actions = reconcile([], "acc-1", balancesFromStatement(drop));
    expect(actions.filter((a) => a.type === "create" && a.bigDrop).map((a) => a.date)).toEqual(["2026-09-30"]);
  });

  it("drops balances dated before the account was opened", () => {
    const actions = reconcile([], "acc-1", points, "2026-08-01");
    expect(actions.map((a) => a.date)).toEqual(["2026-08-31"]);
  });
});

describe("planReviews", () => {
  const mismatch = (date: string, balance: number, recordedBalance: number): ReconcileAction => ({ type: "mismatch", date, balance, kind: "closing", snapshotId: "snap", recordedBalance, bigDrop: false });
  const review = (overrides: Partial<ReviewRecord> = {}): ReviewRecord => ({ id: "r1", accountId: "acc-1", date: "2026-08-31", statementBalance: 8000, status: "Open", ...overrides });

  it("raises a review for each mismatch and ignores other actions", () => {
    const plan = planReviews([mismatch("2026-08-31", 8000, 7900), { type: "unchanged", date: "2026-07-31", balance: 1, kind: "opening", snapshotId: "x" }], "acc-1", []);
    expect(plan.create.map((a) => a.date)).toEqual(["2026-08-31"]);
    expect(plan.supersede).toEqual([]);
  });

  it("does not raise the same statement value again, whatever the earlier answer: waiting, kept or accepted", () => {
    for (const status of ["Open", "Kept", "Accepted"] as const) {
      expect(planReviews([mismatch("2026-08-31", 8000.0, 7900)], "acc-1", [review({ status })]).create).toEqual([]);
    }
  });

  it("a corrected statement with a different value raises a new review and supersedes the open one", () => {
    const plan = planReviews([mismatch("2026-08-31", 8100, 7900)], "acc-1", [review()]);
    expect(plan.create).toHaveLength(1);
    expect(plan.supersede).toEqual(["r1"]);
  });

  it("does not supersede a review that was already answered, nor another account's or day's", () => {
    const plan = planReviews([mismatch("2026-08-31", 8100, 7900)], "acc-1", [review({ id: "k", status: "Kept" }), review({ id: "o", accountId: "other" }), review({ id: "d", date: "2026-07-31" })]);
    expect(plan.supersede).toEqual([]);
  });

  it("a superseded review does not stop its value coming back later", () => {
    expect(planReviews([mismatch("2026-08-31", 8000, 7900)], "acc-1", [review({ status: "Superseded" })]).create).toHaveLength(1);
  });
});

describe("resolution", () => {
  it("accepting sets the recorded balance to the statement's; keeping changes nothing", () => {
    expect(resolution({ statementBalance: 8000 }, "accept")).toEqual({ status: "Accepted", setBalance: 8000 });
    expect(resolution({ statementBalance: 8000 }, "keep")).toEqual({ status: "Kept", setBalance: null });
  });
});
