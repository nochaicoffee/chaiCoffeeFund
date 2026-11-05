import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LentLoan, LentRepayment } from "@/lib/sheets/types";

const fake = vi.hoisted(() => ({ loans: [] as LentLoan[], repayments: [] as LentRepayment[], tags: [] as string[], fail: false, failRepaymentDelete: false, n: 0 }));
vi.mock("next/cache", () => ({ updateTag: (tag: string) => fake.tags.push(tag), unstable_cache: <T,>(fn: T) => fn }));
const guard = () => { if (fake.fail) throw new Error("Sheets said no"); };
vi.mock("@/lib/sheets/lentLoans", async (original) => ({
  ...(await original<object>()),
  lentLoansRepository: {
    get: async (id: string) => fake.loans.find((l) => l.id === id) ?? null,
    create: async (input: Omit<LentLoan, "id">) => { guard(); const row = { ...input, id: `ll${++fake.n}` }; fake.loans.push(row); return row; },
    update: async (id: string, patch: Record<string, unknown>) => {
      guard();
      const row = fake.loans.find((l) => l.id === id)!;
      for (const [k, v] of Object.entries(patch)) { if (v === "" || v === undefined) delete (row as unknown as Record<string, unknown>)[k]; else (row as unknown as Record<string, unknown>)[k] = v; }
      return row;
    },
    remove: async (id: string) => { guard(); if (!fake.loans.some((l) => l.id === id)) throw new (await import("@/lib/sheets/repository")).NotFoundError(`LentLoans ${id}`); fake.loans = fake.loans.filter((l) => l.id !== id); },
  },
}));
vi.mock("@/lib/sheets/lentRepayments", async (original) => ({
  ...(await original<object>()),
  lentRepaymentsRepository: {
    list: async () => fake.repayments,
    create: async (input: Omit<LentRepayment, "id">) => { guard(); const row = { ...input, id: `lr${++fake.n}` }; fake.repayments.push(row); return row; },
    remove: async (id: string) => { guard(); fake.repayments = fake.repayments.filter((r) => r.id !== id); },
    removeWhere: async (match: (v: Partial<Record<keyof LentRepayment, unknown>>) => boolean) => {
      if (fake.failRepaymentDelete) throw new Error("Sheets said no");
      const before = fake.repayments.length;
      fake.repayments = fake.repayments.filter((r) => !match(r));
      return before - fake.repayments.length;
    },
  },
}));

const { saveLentLoan, recordRepayment, deleteLentRepayment, markLentLoanRepaid, reopenLentLoan, deleteLentLoan } = await import("./loanActions");
const IDLE = { status: "idle" } as never;
const form = (values: Record<string, string>) => { const d = new FormData(); for (const [k, v] of Object.entries(values)) d.set(k, v); return d; };
const accruing = { borrowerName: "Friend", principalAmount: "6,50,000", startDate: "2024-10-01", interestMode: "Accruing", interestRate: "12" };
const paidOut = { borrowerName: "B", principalAmount: "3,00,000", startDate: "2025-11-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: "6000" };
const loanA: LentLoan = { id: "a", borrowerName: "Friend", principalAmount: 650000, startDate: "2024-10-01", interestMode: "Accruing", interestRate: 12, status: "Active" };
const loanB: LentLoan = { id: "b", borrowerName: "B", principalAmount: 300000, startDate: "2025-11-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: 6000, status: "Active", incomeSourceId: "src-b" };
const back = (id: string, lentLoanId: string, date: string, amount: number, kind: LentRepayment["kind"]): LentRepayment => ({ id, lentLoanId, date, amount, kind });

beforeEach(() => { fake.loans = []; fake.repayments = []; fake.tags = []; fake.fail = false; fake.failRepaymentDelete = false; fake.n = 0; });

describe("saveLentLoan", () => {
  it("adds an active loan and refreshes the loans", async () => {
    expect(await saveLentLoan(IDLE, form(accruing))).toMatchObject({ status: "saved" });
    expect(fake.loans[0]).toMatchObject({ borrowerName: "Friend", principalAmount: 650000, interestMode: "Accruing", interestRate: 12, status: "Active" });
    expect(fake.tags).toEqual(["lentLoans"]);
  });
  it("says what's wrong and writes nothing", async () => {
    expect(await saveLentLoan(IDLE, form({ ...accruing, interestRate: "" }))).toMatchObject({ status: "invalid", errors: { interestRate: expect.any(String) } });
    expect(fake.loans).toEqual([]);
  });
  it("edits a loan, and a switch to Accruing drops the payout fields and the income source", async () => {
    fake.loans = [{ ...loanB }];
    expect(await saveLentLoan(IDLE, form({ ...accruing, id: "b" }))).toMatchObject({ status: "saved" });
    expect(fake.loans[0]).toMatchObject({ interestMode: "Accruing", interestRate: 12 });
    expect(fake.loans[0].payoutFrequency).toBeUndefined();
    expect(fake.loans[0].payoutAmount).toBeUndefined();
    expect(fake.loans[0].incomeSourceId).toBeUndefined();
  });
  it("won't move a loan's start after a repayment, nor make a loan paid-out that has interest repayments", async () => {
    fake.loans = [{ ...loanA }];
    fake.repayments = [back("r1", "a", "2025-06-01", 5000, "Interest")];
    expect(await saveLentLoan(IDLE, form({ ...accruing, id: "a", startDate: "2025-09-01" }))).toMatchObject({ errors: { startDate: expect.stringContaining("repayment") } });
    expect(await saveLentLoan(IDLE, form({ ...paidOut, startDate: "2024-10-01", id: "a" }))).toMatchObject({ errors: { interestMode: expect.stringContaining("Income") } });
  });
  it("won't cut the amount lent below the principal already back", async () => {
    fake.loans = [{ ...loanA }];
    fake.repayments = [back("r1", "a", "2025-06-01", 200000, "Principal")];
    expect(await saveLentLoan(IDLE, form({ ...accruing, id: "a", principalAmount: "1,00,000" }))).toMatchObject({ errors: { principalAmount: expect.stringContaining("already come back") } });
    expect(fake.loans[0].principalAmount).toBe(650000);
  });
  it("says the loan is gone, and failed when the Sheet fails", async () => {
    expect(await saveLentLoan(IDLE, form({ ...accruing, id: "nope" }))).toMatchObject({ errors: { form: expect.stringMatching(/isn't in the Sheet/) } });
    fake.fail = true;
    expect((await saveLentLoan(IDLE, form(accruing))).status).toBe("failed");
  });
});

describe("recordRepayment", () => {
  const principal = { kind: "Principal", date: "2026-06-01", amount: "1,00,000" };
  it("records a repayment of a loan that exists", async () => {
    fake.loans = [{ ...loanA }];
    expect(await recordRepayment(IDLE, form({ lentLoanId: "a", ...principal }))).toMatchObject({ status: "saved" });
    expect(fake.repayments[0]).toMatchObject({ lentLoanId: "a", date: "2026-06-01", amount: 100000, kind: "Principal" });
    expect(fake.tags).toEqual(["lentRepayments"]);
  });
  it("refuses a repayment that names no loan, or one that isn't there", async () => {
    expect(await recordRepayment(IDLE, form(principal))).toMatchObject({ errors: { form: expect.stringMatching(/isn't in the Sheet/) } });
    expect(await recordRepayment(IDLE, form({ lentLoanId: "ghost", ...principal }))).toMatchObject({ errors: { form: expect.any(String) } });
    expect(fake.repayments).toEqual([]);
  });
  it("warns about too much principal, writes nothing, and records it when confirmed", async () => {
    fake.loans = [{ ...loanA }];
    const over = { lentLoanId: "a", ...principal, amount: "7,00,000" };
    expect(await recordRepayment(IDLE, form(over))).toMatchObject({ status: "invalid", overridable: true, errors: { amount: expect.stringContaining("would still be out") } });
    expect(fake.repayments).toEqual([]);
    expect(await recordRepayment(IDLE, form({ ...over, confirmed: "1" }))).toMatchObject({ status: "saved" });
    expect(fake.repayments).toHaveLength(1);
  });
  it("is not overridable for a plain mistake", async () => {
    fake.loans = [{ ...loanA }];
    const r = await recordRepayment(IDLE, form({ lentLoanId: "a", kind: "Principal", date: "2026-06-01", amount: "" }));
    expect(r).toMatchObject({ status: "invalid" });
    expect(r).not.toHaveProperty("overridable");
  });
  it("counts the loan's own repayments only", async () => {
    fake.loans = [{ ...loanA }, { ...loanB }];
    fake.repayments = [back("r1", "b", "2026-01-01", 600000, "Principal")];
    expect(await recordRepayment(IDLE, form({ lentLoanId: "a", ...principal, amount: "6,00,000" }))).toMatchObject({ status: "saved" });
  });
});

describe("markLentLoanRepaid and reopenLentLoan", () => {
  it("needs the closing day, then marks it repaid with that day", async () => {
    fake.loans = [{ ...loanA }];
    expect(await markLentLoanRepaid(IDLE, form({ id: "a" }))).toMatchObject({ status: "invalid", errors: { closedDate: expect.any(String) } });
    expect(await markLentLoanRepaid(IDLE, form({ id: "a", closedDate: "2026-09-01" }))).toMatchObject({ status: "saved" });
    expect(fake.loans[0]).toMatchObject({ status: "Repaid", closedDate: "2026-09-01" });
    expect(await markLentLoanRepaid(IDLE, form({ id: "a", closedDate: "2026-09-01" }))).toMatchObject({ errors: { form: expect.stringContaining("already") } });
  });
  it("reopens it: active again, no closing day", async () => {
    fake.loans = [{ ...loanA, status: "Repaid", closedDate: "2026-09-01" }];
    expect(await reopenLentLoan(IDLE, form({ id: "a" }))).toMatchObject({ status: "saved" });
    expect(fake.loans[0].status).toBe("Active");
    expect(fake.loans[0].closedDate).toBeUndefined();
  });
});

describe("deleteLentLoan", () => {
  it("deletes the loan and every repayment of it, and only those", async () => {
    fake.loans = [{ ...loanA }, { ...loanB }];
    fake.repayments = [back("r1", "a", "2025-06-01", 5000, "Interest"), back("r2", "a", "2025-09-01", 90000, "Principal"), back("r3", "b", "2026-01-01", 1000, "Principal")];
    expect(await deleteLentLoan(IDLE, form({ id: "a" }))).toMatchObject({ status: "saved" });
    expect(fake.loans.map((l) => l.id)).toEqual(["b"]);
    expect(fake.repayments.map((r) => r.id)).toEqual(["r3"]);
    expect(fake.tags.sort()).toEqual(["lentLoans", "lentRepayments"]);
  });
  it("says so when the loan is gone, and leaves its repayments alone if the loan can't be deleted", async () => {
    expect(await deleteLentLoan(IDLE, form({ id: "nope" }))).toMatchObject({ errors: { form: expect.stringMatching(/isn't in the Sheet/) } });
    fake.loans = [{ ...loanA }];
    fake.repayments = [back("r1", "a", "2025-06-01", 5000, "Interest")];
    fake.fail = true;
    expect((await deleteLentLoan(IDLE, form({ id: "a" }))).status).toBe("failed");
    expect(fake.repayments).toHaveLength(1);
  });
  it("tells him what is left when the repayments can't be deleted after the loan went", async () => {
    fake.loans = [{ ...loanA }];
    fake.repayments = [back("r1", "a", "2025-06-01", 5000, "Interest")];
    fake.failRepaymentDelete = true;
    const r = await deleteLentLoan(IDLE, form({ id: "a" }));
    expect(r).toMatchObject({ status: "invalid", errors: { form: expect.stringContaining("repayments couldn't be") } });
    expect(fake.loans).toEqual([]);
    expect(fake.tags).toEqual(["lentLoans"]);
  });
});

describe("deleteLentRepayment", () => {
  it("takes one repayment back", async () => {
    fake.repayments = [back("r1", "a", "2025-06-01", 5000, "Interest"), back("r2", "a", "2025-07-01", 5000, "Interest")];
    expect(await deleteLentRepayment(IDLE, form({ id: "r1" }))).toMatchObject({ status: "saved" });
    expect(fake.repayments.map((r) => r.id)).toEqual(["r2"]);
  });
});
