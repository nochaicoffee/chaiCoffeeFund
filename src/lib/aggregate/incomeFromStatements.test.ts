import { describe, expect, it } from "vitest";
import { incomeFromStatement, matchSource, statementRef } from "./incomeFromStatements";
import type { IncomeSource } from "../sheets/types";
import type { StatementRow } from "./statementBalances";

const salary: IncomeSource = { id: "sal", name: "NetApp Salary", alias: "Salary", category: "Salary", frequency: "Monthly", expectedAmount: 138500, status: "Active", scheduleDate: "2026-01-01", accountId: "hdfc", statementMatch: "NETAPP" };
const fd: IncomeSource = { id: "fd", name: "FD interest", alias: "FD", category: "Investment", frequency: "Quarterly", expectedAmount: 18400, status: "Active", scheduleDate: "2026-01-05", statementMatch: "INT PD" };
const row = (date: string, amount: number, narration?: string): StatementRow => ({ date, amount, balance: 0, narration });

describe("matchSource", () => {
  it("matches the statement text ignoring case and the stray spaces pdf.js wraps in", () => {
    expect(matchSource("NEFT Cr-SALARY SEP Net App India Private Limited", "hdfc", [salary])?.id).toBe("sal");
    expect(matchSource("UPI-SHOP-shop@ybl", "hdfc", [salary])).toBeUndefined();
  });

  it("only takes deposits into the source's account, when it has one", () => {
    expect(matchSource("NETAPP INDIA", "kotak", [salary])).toBeUndefined();
    expect(matchSource("FD INT PD 0123", "kotak", [fd])?.id).toBe("fd");
  });

  it("prefers the longest statement text when two sources match", () => {
    const bonus: IncomeSource = { ...salary, id: "sal-bonus", statementMatch: "NETAPP BONUS" };
    expect(matchSource("NEFT CR NETAPP BONUS MAR", "hdfc", [salary, bonus])?.id).toBe("sal-bonus");
  });

  it("ignores a source with no (or a blank) statement text", () => {
    expect(matchSource("NETAPP", "hdfc", [{ ...salary, statementMatch: undefined }, { ...salary, id: "x", statementMatch: "  " }])).toBeUndefined();
  });
});

describe("incomeFromStatement", () => {
  it("turns each matching deposit into a received, Regular entry from the statement", () => {
    const out = incomeFromStatement([row("2026-09-30", 138500, "NEFT CR NETAPP INDIA"), row("2026-10-02", -500, "NETAPP REFUND REVERSAL"), row("2026-10-03", 900, "UPI FRIEND")], "hdfc", [salary], []);
    expect(out).toEqual([
      { incomeSourceId: "sal", expectedDate: "2026-10-01", receivedDate: "2026-09-30", amount: 138500, status: "Received", accountId: "hdfc", tag: "Regular", origin: "Statement", statementRef: "hdfc:2026-09-30:13850000:1" },
    ]);
  });

  it("is always Regular, even a second credit in the same month (Prathik retags a bonus)", () => {
    const out = incomeFromStatement([row("2026-03-01", 138500, "NETAPP SAL"), row("2026-03-28", 160000, "NETAPP SAL")], "hdfc", [salary], []);
    expect(out.map((e) => [e.expectedDate, e.tag])).toEqual([["2026-03-01", "Regular"], ["2026-04-01", "Regular"]]);
  });

  it("uses the day it landed as the expected date when no payday is within half a cycle", () => {
    const once: IncomeSource = { ...salary, id: "once", frequency: "One-Time", scheduleDate: "2026-01-01" };
    expect(incomeFromStatement([row("2026-09-15", 5000, "NETAPP")], "hdfc", [once], [])[0].expectedDate).toBe("2026-09-15");
  });

  it("adds nothing when the same line is read again", () => {
    const first = incomeFromStatement([row("2026-09-30", 138500, "NETAPP")], "hdfc", [salary], []);
    expect(incomeFromStatement([row("2026-09-30", 138500, "NETAPP")], "hdfc", [salary], first)).toEqual([]);
    expect(first[0].statementRef).toBe(statementRef("hdfc", { date: "2026-09-30", amount: 138500 }));
  });

  it("adds nothing for the same money read from another statement a day apart, or already typed in", () => {
    // The monthly statement dated it Sep 30 (posted); the yearly one Oct 1 (value date).
    const monthly = incomeFromStatement([row("2026-09-30", 138500, "NETAPP")], "hdfc", [salary], []);
    expect(incomeFromStatement([row("2026-10-01", 138500, "NETAPP")], "hdfc", [salary], monthly)).toEqual([]);
    const typed = [{ incomeSourceId: "sal", amount: 138500, receivedDate: "2026-10-02" }];
    expect(incomeFromStatement([row("2026-09-30", 138500, "NETAPP")], "hdfc", [salary], typed)).toEqual([]);
  });

  it("still adds a different amount, or the same amount a month later", () => {
    const sep = incomeFromStatement([row("2026-09-30", 138500, "NETAPP")], "hdfc", [salary], []);
    expect(incomeFromStatement([row("2026-10-31", 138500, "NETAPP"), row("2026-10-01", 2000, "NETAPP REIMB")], "hdfc", [salary], sep)).toHaveLength(2);
  });

  it("keeps two lines of the same amount in one statement, a day apart or the same day, and reads both again as nothing new", () => {
    const rows = [row("2026-09-03", 2000, "NETAPP REIMB"), row("2026-09-04", 2000, "NETAPP REIMB"), row("2026-09-04", 2000, "NETAPP REIMB")];
    const first = incomeFromStatement(rows, "hdfc", [salary], []);
    expect(first.map((e) => e.statementRef)).toEqual(["hdfc:2026-09-03:200000:1", "hdfc:2026-09-04:200000:1", "hdfc:2026-09-04:200000:2"]);
    expect(incomeFromStatement(rows, "hdfc", [salary], first)).toEqual([]);
  });

  it("doesn't match an inactive source", () => {
    expect(incomeFromStatement([row("2026-09-30", 138500, "NETAPP")], "hdfc", [{ ...salary, status: "Inactive" }], [])).toEqual([]);
  });

  it("ignores a row with no narration (a reader that doesn't keep one)", () => {
    expect(incomeFromStatement([row("2026-09-30", 138500)], "hdfc", [salary], [])).toEqual([]);
  });
});
