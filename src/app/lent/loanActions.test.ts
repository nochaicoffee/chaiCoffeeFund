import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, IncomeSource, LentLoan, LentRepayment } from "@/lib/sheets/types";

const fake = vi.hoisted(() => ({ loans: [] as LentLoan[], repayments: [] as LentRepayment[], sources: [] as IncomeSource[], accounts: [] as Account[], tags: [] as string[], fail: false, failRepaymentDelete: false, failLoanCreate: false, failSourceRemove: false, failSourceUpdate: false, failLoanUpdate: false, n: 0 }));
vi.mock("next/cache", () => ({ updateTag: (tag: string) => fake.tags.push(tag), unstable_cache: <T,>(fn: T) => fn }));
const guard = () => { if (fake.fail) throw new Error("Sheets said no"); };
vi.mock("@/lib/sheets/lentLoans", async (original) => ({
  ...(await original<object>()),
  lentLoansRepository: {
    get: async (id: string) => fake.loans.find((l) => l.id === id) ?? null,
    list: async () => fake.loans,
    create: async (input: Omit<LentLoan, "id">) => { guard(); if (fake.failLoanCreate) throw new Error("Sheets said no"); const row = { ...input, id: `ll${++fake.n}` }; fake.loans.push(row); return row; },
    update: async (id: string, patch: Record<string, unknown>) => {
      guard();
      if (fake.failLoanUpdate) throw new Error("Sheets said no");
      const row = fake.loans.find((l) => l.id === id)!;
      for (const [k, v] of Object.entries(patch)) { if (v === "" || v === undefined) delete (row as unknown as Record<string, unknown>)[k]; else (row as unknown as Record<string, unknown>)[k] = v; }
      return row;
    },
    remove: async (id: string) => { guard(); if (!fake.loans.some((l) => l.id === id)) throw new (await import("@/lib/sheets/repository")).NotFoundError(`LentLoans ${id}`); fake.loans = fake.loans.filter((l) => l.id !== id); },
  },
}));
vi.mock("@/lib/sheets/accounts", () => ({ accountsRepository: { list: async () => fake.accounts } }));
vi.mock("@/lib/sheets/incomeSources", async (original) => ({
  ...(await original<object>()),
  incomeSourcesRepository: {
    get: async (id: string) => fake.sources.find((x) => x.id === id) ?? null,
    list: async () => fake.sources,
    create: async (input: Omit<IncomeSource, "id">) => { guard(); const row = { ...input, id: `src${++fake.n}` }; fake.sources.push(row); return row; },
    update: async (id: string, patch: Record<string, unknown>) => { if (fake.failSourceUpdate) throw new Error("Sheets said no"); Object.assign(fake.sources.find((x) => x.id === id)!, patch); },
    remove: async (id: string) => { if (fake.failSourceRemove) throw new Error("Sheets said no"); fake.sources = fake.sources.filter((x) => x.id !== id); },
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

beforeEach(() => { fake.loans = []; fake.repayments = []; fake.sources = []; fake.accounts = [{ id: "hdfc", name: "HDFC" } as Account]; fake.tags = []; fake.fail = false; fake.failRepaymentDelete = false; fake.failLoanCreate = false; fake.failSourceRemove = false; fake.failSourceUpdate = false; fake.failLoanUpdate = false; fake.n = 0; });

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

describe("using an income source he already has", () => {
  const unlinked = (): LentLoan => ({ ...loanB, incomeSourceId: undefined });
  const mine = (over: Partial<IncomeSource> = {}): IncomeSource => ({ id: "mine", name: "Lending - B", alias: "B", category: "Investment", frequency: "Monthly", expectedAmount: 6000, status: "Active", ...over });
  const use = { ...paidOut, id: "b", incomeSourceId: "mine" };

  it("links an unlinked loan to it without touching the source, and creates nothing", async () => {
    fake.loans = [unlinked()];
    fake.sources = [mine()];
    const before = { ...fake.sources[0] };
    expect(await saveLentLoan(IDLE, form(use))).toMatchObject({ status: "saved" });
    expect(fake.loans[0].incomeSourceId).toBe("mine");
    expect(fake.sources).toEqual([before]);
    expect(fake.tags).toEqual(["lentLoans"]);
  });
  it("links a new loan to it as it is added", async () => {
    fake.sources = [mine()];
    expect(await saveLentLoan(IDLE, form({ ...paidOut, incomeSourceId: "mine" }))).toMatchObject({ status: "saved" });
    expect(fake.loans[0]).toMatchObject({ borrowerName: "B", incomeSourceId: "mine", status: "Active" });
    expect(fake.sources).toHaveLength(1);
  });
  it("writes nothing when the source is another loan's, off, a different amount or not there", async () => {
    fake.loans = [unlinked(), { ...loanA, id: "other", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: 6000, incomeSourceId: "mine" }];
    fake.sources = [mine()];
    expect(await saveLentLoan(IDLE, form(use))).toMatchObject({ status: "invalid", errors: { incomeSourceId: expect.stringContaining("another loan") } });
    fake.loans = [unlinked()];
    fake.sources = [mine({ status: "Inactive" })];
    expect(await saveLentLoan(IDLE, form(use))).toMatchObject({ errors: { incomeSourceId: expect.stringContaining("switched off") } });
    fake.sources = [mine({ expectedAmount: 5000 })];
    expect(await saveLentLoan(IDLE, form(use))).toMatchObject({ errors: { incomeSourceId: expect.stringContaining("Make them the same") } });
    fake.sources = [];
    expect(await saveLentLoan(IDLE, form(use))).toMatchObject({ errors: { incomeSourceId: expect.stringContaining("isn't in Income") } });
    expect(fake.loans[0].incomeSourceId).toBeUndefined();
  });
  it("lets a loan keep its own source when it is edited (the source isn't 'another loan's')", async () => {
    fake.loans = [{ ...loanB, incomeSourceId: "mine" }];
    fake.sources = [mine()];
    expect(await saveLentLoan(IDLE, form(use))).toMatchObject({ status: "saved" });
    expect(fake.loans[0].incomeSourceId).toBe("mine");
  });
  it("doesn't link an accruing loan to a source", async () => {
    fake.loans = [{ ...loanA }];
    fake.sources = [mine()];
    expect(await saveLentLoan(IDLE, form({ ...accruing, id: "a", incomeSourceId: "mine" }))).toMatchObject({ status: "saved" });
    expect(fake.loans[0].incomeSourceId).toBeUndefined();
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

describe("adding a Paid-out loan with its income source (B2)", () => {
  const linked = { ...paidOut, createIncomeSource: "1", statementMatch: "RAVI KUMAR", accountId: "hdfc" };

  it("creates the source first, then the loan holding its id, and refreshes both", async () => {
    expect(await saveLentLoan(IDLE, form(linked))).toMatchObject({ status: "saved" });
    expect(fake.sources).toHaveLength(1);
    expect(fake.sources[0]).toMatchObject({ name: "B interest", category: "Investment", frequency: "Monthly", expectedAmount: 6000, status: "Active", scheduleDate: "2025-12-01", statementMatch: "RAVI KUMAR", accountId: "hdfc" });
    expect(fake.loans[0].incomeSourceId).toBe(fake.sources[0].id);
    expect(fake.tags.sort()).toEqual(["incomeSources", "lentLoans"]);
  });
  it("starts the source one period after the day it was lent, quarterly included", async () => {
    await saveLentLoan(IDLE, form({ ...linked, payoutFrequency: "Quarterly", payoutAmount: "18000", startDate: "2026-01-01" }));
    expect(fake.sources[0]).toMatchObject({ frequency: "Quarterly", expectedAmount: 18000, scheduleDate: "2026-04-01" });
  });
  it("saves the loan alone, not linked, when the box isn't ticked", async () => {
    expect(await saveLentLoan(IDLE, form(paidOut))).toMatchObject({ status: "saved" });
    expect(fake.sources).toEqual([]);
    expect(fake.loans[0].incomeSourceId).toBeUndefined();
  });
  it("ignores the box for an Accruing loan", async () => {
    await saveLentLoan(IDLE, form({ ...accruing, createIncomeSource: "1" }));
    expect(fake.sources).toEqual([]);
    expect(fake.loans[0].incomeSourceId).toBeUndefined();
  });
  it("is both or neither: a loan that can't be written takes its source back out", async () => {
    fake.failLoanCreate = true;
    expect((await saveLentLoan(IDLE, form(linked))).status).toBe("failed");
    expect(fake.sources).toEqual([]);
    expect(fake.loans).toEqual([]);
  });
  it("says which source is left behind when it can't be taken back out", async () => {
    fake.failLoanCreate = true;
    fake.failSourceRemove = true;
    expect(await saveLentLoan(IDLE, form(linked))).toMatchObject({ status: "invalid", errors: { form: expect.stringContaining("B interest") } });
    expect(fake.sources).toHaveLength(1);
  });
  it("writes nothing when the statement text is too short or the account is unknown", async () => {
    expect(await saveLentLoan(IDLE, form({ ...linked, statementMatch: "RK" }))).toMatchObject({ status: "invalid", errors: { statementMatch: expect.any(String) } });
    expect(await saveLentLoan(IDLE, form({ ...linked, accountId: "nope" }))).toMatchObject({ status: "invalid", errors: { accountId: expect.any(String) } });
    expect(fake.sources).toEqual([]);
    expect(fake.loans).toEqual([]);
  });
});

describe("giving an existing paid-out loan its income source", () => {
  const unlinked = (): LentLoan => ({ ...loanB, incomeSourceId: undefined });
  const link = { ...paidOut, id: "b", createIncomeSource: "1", statementMatch: "RAVI KUMAR" };

  it("creates the source and links the loan to it, refreshing both", async () => {
    fake.loans = [unlinked()];
    expect(await saveLentLoan(IDLE, form(link))).toMatchObject({ status: "saved" });
    expect(fake.sources).toHaveLength(1);
    expect(fake.sources[0]).toMatchObject({ name: "B interest", frequency: "Monthly", expectedAmount: 6000, scheduleDate: "2025-12-01", statementMatch: "RAVI KUMAR" });
    expect(fake.loans[0].incomeSourceId).toBe(fake.sources[0].id);
    expect(fake.tags.sort()).toEqual(["incomeSources", "lentLoans"]);
  });
  it("leaves the loan unlinked when the box isn't ticked", async () => {
    fake.loans = [unlinked()];
    await saveLentLoan(IDLE, form({ ...paidOut, id: "b" }));
    expect(fake.sources).toEqual([]);
    expect(fake.loans[0].incomeSourceId).toBeUndefined();
  });
  it("takes the source back out when the loan can't be saved, so it is both or neither", async () => {
    fake.loans = [unlinked()];
    const original = fake.loans[0];
    fake.failSourceRemove = false;
    // The loan's update fails after the source was made.
    fake.fail = false;
    fake.failLoanUpdate = true;
    expect((await saveLentLoan(IDLE, form(link))).status).toBe("failed");
    expect(fake.sources).toEqual([]);
    expect(fake.loans[0]).toBe(original);
  });
  it("writes nothing when the statement text is too short", async () => {
    fake.loans = [unlinked()];
    expect(await saveLentLoan(IDLE, form({ ...link, statementMatch: "RK" }))).toMatchObject({ status: "invalid", errors: { statementMatch: expect.any(String) } });
    expect(fake.sources).toEqual([]);
  });
  it("doesn't make a second source for a loan that already has one", async () => {
    fake.loans = [{ ...loanB }];
    fake.sources = [{ id: "src-b", name: "B interest", alias: "B", category: "Investment", frequency: "Monthly", expectedAmount: 6000, status: "Active", scheduleDate: "2025-12-01" }];
    await saveLentLoan(IDLE, form(link));
    expect(fake.sources).toHaveLength(1);
  });
});

describe("editing a loan that has an income source (B2)", () => {
  const src = (): IncomeSource => ({ id: "src-b", name: "B interest", alias: "B", category: "Investment", frequency: "Monthly", expectedAmount: 6000, status: "Active", scheduleDate: "2025-12-01" });
  beforeEach(() => { fake.loans = [{ ...loanB }]; fake.sources = [src()]; });

  it("gives the source the new payout amount", async () => {
    expect(await saveLentLoan(IDLE, form({ ...paidOut, id: "b", payoutAmount: "7000" }))).toMatchObject({ status: "saved" });
    expect(fake.loans[0].payoutAmount).toBe(7000);
    expect(fake.sources[0].expectedAmount).toBe(7000);
    expect(fake.loans[0].incomeSourceId).toBe("src-b");
  });
  it("leaves the source alone when nothing about the payout changed", async () => {
    await saveLentLoan(IDLE, form({ ...paidOut, id: "b", borrowerName: "B renamed" }));
    expect(fake.sources[0]).toEqual(src());
    expect(fake.tags).toEqual(["lentLoans"]);
  });
  it("won't change how often it pays, since the schedule lives in Income, and writes nothing", async () => {
    expect(await saveLentLoan(IDLE, form({ ...paidOut, id: "b", payoutFrequency: "Quarterly" }))).toMatchObject({ errors: { payoutFrequency: expect.stringContaining("Income") } });
    expect(fake.loans[0].payoutFrequency).toBe("Monthly");
  });
  it("pauses the source when the loan becomes Accruing, and unlinks it", async () => {
    expect(await saveLentLoan(IDLE, form({ ...accruing, id: "b" }))).toMatchObject({ status: "saved" });
    expect(fake.sources[0].status).toBe("Inactive");
    expect(fake.loans[0].incomeSourceId).toBeUndefined();
  });
  it("says so when the loan saved but the source couldn't be updated", async () => {
    fake.failSourceUpdate = true;
    expect(await saveLentLoan(IDLE, form({ ...paidOut, id: "b", payoutAmount: "7000" }))).toMatchObject({ status: "invalid", errors: { form: expect.stringContaining("brought in line with the loan") } });
    expect(fake.loans[0].payoutAmount).toBe(7000);
  });
  it("moves the source's schedule to the new first payout when the lent day changes, and leaves it when it doesn't", async () => {
    expect(await saveLentLoan(IDLE, form({ ...paidOut, id: "b", startDate: "2025-11-05" }))).toMatchObject({ status: "saved" });
    expect(fake.sources[0].scheduleDate).toBe("2025-12-05");
    expect(fake.sources[0].expectedAmount).toBe(6000);
    fake.sources[0].scheduleDate = "2025-12-03";
    await saveLentLoan(IDLE, form({ ...paidOut, id: "b", startDate: "2025-11-05", payoutAmount: "7000" }));
    expect(fake.sources[0]).toMatchObject({ scheduleDate: "2025-12-03", expectedAmount: 7000 });
  });
  it("edits a loan whose source has been deleted without touching Income", async () => {
    fake.sources = [];
    expect(await saveLentLoan(IDLE, form({ ...paidOut, id: "b", payoutAmount: "7000" }))).toMatchObject({ status: "saved" });
  });
});

