import { describe, expect, it } from "vitest";
import {
  dueLabel,
  filterCounts,
  filterStatements,
  groupByMonth,
  minimumDueNow,
  paginate,
  paidSummary,
  paymentVariance,
  periodOverview,
  type StatementQuery,
} from "./cardStatements";
import type { CardData } from "./cardSpend";
import type { Card, Statement } from "../sheets/types";

const card = (overrides: Partial<Card>): Card => ({
  id: "card",
  name: "Card",
  alias: "C",
  issuer: "Bank",
  creditLimit: 100000,
  statementAnchorDate: "2026-01-05",
  dueAnchorDate: "2026-01-25",
  status: "Active",
  ...overrides,
});

let nextId = 0;
const statement = (overrides: Partial<Statement>): Statement => ({
  id: `s${nextId++}`,
  cardId: "card",
  statementDate: "2026-01-05",
  dueDate: "2026-01-25",
  totalAmountDue: 1000,
  minimumAmountDue: 100,
  status: "Paid",
  ...overrides,
});

/**
 * The Statements page design (design/dashboards/StatementsList.dc.html), viewed
 * on 18 Aug 2026: two pending August bills and three July/June bills paid in full.
 */
const TODAY = "2026-08-18";
const regalia = card({ id: "regalia", name: "Regalia Gold", alias: "Regalia", issuer: "HDFC Bank", last4: "7042" });
const amazon = card({ id: "amazon", name: "Amazon Pay", alias: "Amazon", issuer: "ICICI Bank", last4: "3189" });
const gold = card({ id: "gold", name: "Gold Card", alias: "Gold", issuer: "Amex", last4: "5560" });
const augRegalia = statement({ cardId: "regalia", statementDate: "2026-08-05", dueDate: "2026-08-25", totalAmountDue: 38500, minimumAmountDue: 3850, status: "Pending" });
const augAmazon = statement({ cardId: "amazon", statementDate: "2026-08-03", dueDate: "2026-08-23", totalAmountDue: 12400, minimumAmountDue: 1240, status: "Pending" });
const julRegalia = statement({ cardId: "regalia", statementDate: "2026-07-05", dueDate: "2026-07-25", totalAmountDue: 42100, minimumAmountDue: 4210, amountPaid: 42100 });
const julAmazon = statement({ cardId: "amazon", statementDate: "2026-07-03", dueDate: "2026-07-23", totalAmountDue: 15200, minimumAmountDue: 1520, amountPaid: 15200 });
const junRegalia = statement({ cardId: "regalia", statementDate: "2026-06-05", dueDate: "2026-06-25", totalAmountDue: 35600, minimumAmountDue: 3560, amountPaid: 35600 });
const design: CardData = { cards: [regalia, amazon, gold], statements: [julAmazon, augRegalia, junRegalia, augAmazon, julRegalia] };

const THIS_YEAR = { kind: "year", year: 2026 } as const;
const query = (overrides: Partial<StatementQuery> = {}): StatementQuery => ({ period: THIS_YEAR, ...overrides });
const ids = (statements: Statement[]) => statements.map((s) => s.id);

describe("minimumDueNow", () => {
  it("adds up the minimums on every pending bill, as in the design (₹3,850 + ₹1,240)", () => {
    expect(minimumDueNow(design)).toBe(5090);
  });

  it("takes anything already paid off the minimum, never below ₹0", () => {
    const partly = statement({ status: "Pending", totalAmountDue: 50000, minimumAmountDue: 5000, amountPaid: 3000 });
    const beyond = statement({ status: "Pending", totalAmountDue: 50000, minimumAmountDue: 5000, amountPaid: 8000 });
    expect(minimumDueNow({ cards: [card({})], statements: [partly] })).toBe(2000);
    expect(minimumDueNow({ cards: [card({})], statements: [beyond] })).toBe(0);
  });

  it("ignores paid bills and statements on a deleted card, and counts a blank minimum as ₹0", () => {
    const orphan = statement({ cardId: "gone", status: "Pending", minimumAmountDue: 999 });
    const blank = statement({ status: "Pending", minimumAmountDue: "" as unknown as number });
    expect(minimumDueNow({ cards: [card({})], statements: [orphan, blank, statement({ minimumAmountDue: 500 })] })).toBe(0);
  });
});

describe("periodOverview", () => {
  it("counts the period's statements, the cards they're on and how many are pending", () => {
    expect(periodOverview(design, THIS_YEAR)).toEqual({ count: 5, cardCount: 2, pending: 2 });
    expect(periodOverview(design, { kind: "year", year: 2025 })).toEqual({ count: 0, cardCount: 0, pending: 0 });
  });
});

describe("paidSummary", () => {
  it("totals what was paid on the period's paid statements (₹92,900 across 3 in the design, all in full)", () => {
    expect(paidSummary(design, THIS_YEAR)).toEqual({ total: 92900, count: 3, inFull: 3, partial: 0 });
  });

  it("uses the amount paid, not the total due, and only the period's statements", () => {
    const short = statement({ statementDate: "2026-02-05", totalAmountDue: 10000, amountPaid: 9000 });
    const over = statement({ statementDate: "2026-03-05", totalAmountDue: 5000, amountPaid: 5100 });
    const lastYear = statement({ statementDate: "2025-12-05", totalAmountDue: 7000, amountPaid: 7000 });
    const data = { cards: [card({})], statements: [short, over, lastYear] };
    expect(paidSummary(data, THIS_YEAR)).toEqual({ total: 14100, count: 2, inFull: 1, partial: 1 });
    expect(paidSummary(data, { kind: "all" })).toEqual({ total: 21100, count: 3, inFull: 2, partial: 1 });
  });
});

describe("filterStatements", () => {
  it("lists the period's statements newest first, by statement date", () => {
    expect(ids(filterStatements(design, query()))).toEqual(ids([augRegalia, augAmazon, julRegalia, julAmazon, junRegalia]));
  });

  it("can list oldest first", () => {
    expect(ids(filterStatements(design, query({ sort: "oldest" })))).toEqual(ids([junRegalia, julAmazon, julRegalia, augAmazon, augRegalia]));
  });

  it("filters by status and by card", () => {
    expect(ids(filterStatements(design, query({ status: "pending" })))).toEqual(ids([augRegalia, augAmazon]));
    expect(ids(filterStatements(design, query({ status: "paid", cardId: "regalia" })))).toEqual(ids([julRegalia, junRegalia]));
    expect(filterStatements(design, query({ cardId: "gold" }))).toEqual([]);
  });

  it("leaves out other years, and includes them for all time", () => {
    const old = statement({ cardId: "gold", statementDate: "2025-11-05", dueDate: "2025-11-25" });
    const data = { ...design, statements: [...design.statements, old] };
    expect(filterStatements(data, query())).toHaveLength(5);
    expect(filterStatements(data, query({ period: { kind: "all" } })).at(-1)?.id).toBe(old.id);
  });

  it("searches the card's name, alias, issuer and last 4, ignoring case", () => {
    expect(filterStatements(design, query({ search: "hdfc" }))).toHaveLength(3);
    expect(filterStatements(design, query({ search: "  AMAZON " }))).toHaveLength(2);
    expect(filterStatements(design, query({ search: "7042" }))).toHaveLength(3);
    expect(filterStatements(design, query({ search: "bank" }))).toHaveLength(5);
    expect(filterStatements(design, query({ search: "visa" }))).toEqual([]);
  });

  it("searches amounts, ignoring ₹ and commas, and needs every word to match", () => {
    expect(ids(filterStatements(design, query({ search: "38,500" })))).toEqual(ids([augRegalia]));
    expect(ids(filterStatements(design, query({ search: "₹15200" })))).toEqual(ids([julAmazon]));
    expect(ids(filterStatements(design, query({ search: "regalia 42,100" })))).toEqual(ids([julRegalia]));
    expect(filterStatements(design, query({ search: "amazon 38,500" }))).toEqual([]);
  });

  it("finds an amount with paise by its rupees or as printed", () => {
    const paise = statement({ cardId: "gold", statementDate: "2026-02-12", totalAmountDue: 38512.5, minimumAmountDue: 1925.63 });
    const data = { ...design, statements: [paise] };
    expect(filterStatements(data, query({ search: "38,512.50" }))).toHaveLength(1);
    expect(filterStatements(data, query({ search: "38512" }))).toHaveLength(1);
    expect(filterStatements(data, query({ search: "1925" }))).toHaveLength(1);
  });

  it("doesn't match a blank amount as ₹0", () => {
    const blank = statement({ cardId: "amazon", statementDate: "2026-02-12", totalAmountDue: 123, minimumAmountDue: "" as unknown as number, amountPaid: 123 });
    expect(filterStatements({ ...design, statements: [blank] }, query({ search: "0" }))).toEqual([]);
  });
});

describe("filterCounts", () => {
  it("counts each status and each card, as the design's filters show them", () => {
    expect(filterCounts(design, query())).toEqual({
      byStatus: { all: 5, pending: 2, paid: 3 },
      byCard: { regalia: 3, amazon: 2, gold: 0 },
      allCards: 5,
    });
  });

  it("counts statuses within the chosen card, and cards within the chosen status", () => {
    const counts = filterCounts(design, query({ status: "pending", cardId: "amazon" }));
    expect(counts.byStatus).toEqual({ all: 2, pending: 1, paid: 1 });
    expect(counts.byCard).toEqual({ regalia: 1, amazon: 1, gold: 0 });
    expect(counts.allCards).toBe(2);
  });

  it("respects the search", () => {
    expect(filterCounts(design, query({ search: "icici" })).byStatus).toEqual({ all: 2, pending: 1, paid: 1 });
  });
});

describe("paginate", () => {
  const items = [1, 2, 3, 4, 5];

  it("splits a list into pages", () => {
    expect(paginate(items, 1, 2)).toEqual({ items: [1, 2], page: 1, pages: 3, total: 5, from: 1, to: 2 });
    expect(paginate(items, 3, 2)).toEqual({ items: [5], page: 3, pages: 3, total: 5, from: 5, to: 5 });
  });

  it("shows the nearest real page for a page number out of range", () => {
    expect(paginate(items, 0, 2).page).toBe(1);
    expect(paginate(items, 99, 2).items).toEqual([5]);
    expect(paginate(items, Number.NaN, 2).page).toBe(1);
  });

  it("has one empty page for an empty list", () => {
    expect(paginate([], 1, 20)).toEqual({ items: [], page: 1, pages: 1, total: 0, from: 0, to: 0 });
  });
});

describe("groupByMonth", () => {
  it("groups by statement month with what's due and what was paid, as in the design", () => {
    const groups = groupByMonth(filterStatements(design, query()));
    expect(groups.map(({ month, count, due, paid }) => ({ month, count, due, paid }))).toEqual([
      { month: "2026-08", count: 2, due: 50900, paid: 0 },
      { month: "2026-07", count: 2, due: 0, paid: 57300 },
      { month: "2026-06", count: 1, due: 0, paid: 35600 },
    ]);
  });

  it("counts only what's still due on a part-paid pending bill", () => {
    const part = statement({ status: "Pending", totalAmountDue: 10000, amountPaid: 4000 });
    expect(groupByMonth(filterStatements({ cards: [card({})], statements: [part] }, query()))[0].due).toBe(6000);
  });

  it("gives a month split across pages the whole month's header on each page", () => {
    const all = filterStatements(design, query());
    const first = groupByMonth(paginate(all, 1, 3).items, all);
    const second = groupByMonth(paginate(all, 2, 3).items, all);
    expect(first.at(-1)).toMatchObject({ month: "2026-07", count: 2, paid: 57300 });
    expect(first.at(-1)?.statements).toHaveLength(1);
    expect(second[0]).toMatchObject({ month: "2026-07", count: 2, paid: 57300 });
  });
});

describe("paymentVariance", () => {
  it("is paid in full when the amount paid equals the total due", () => {
    expect(paymentVariance(julRegalia)).toEqual({ kind: "full" });
  });

  it("is overpaid or underpaid by the exact difference", () => {
    expect(paymentVariance(statement({ totalAmountDue: 15200, amountPaid: 15300 }))).toEqual({ kind: "over", amount: 100 });
    expect(paymentVariance(statement({ totalAmountDue: 15200.5, amountPaid: 14950 }))).toEqual({ kind: "under", amount: 250.5 });
  });

  it("keeps the difference to the paisa, without floating-point leftovers", () => {
    expect(paymentVariance(statement({ totalAmountDue: 100.2, amountPaid: 100.3 }))).toEqual({ kind: "over", amount: 0.1 });
  });

  it("treats a blank amount paid as ₹0 paid", () => {
    expect(paymentVariance(statement({ totalAmountDue: 500, amountPaid: undefined }))).toEqual({ kind: "under", amount: 500 });
  });

  it("has none for a pending statement", () => {
    expect(paymentVariance(augRegalia)).toEqual({ kind: "none" });
  });
});

describe("dueLabel", () => {
  it("counts down to the due date, as in the design", () => {
    expect(dueLabel(augRegalia, TODAY)).toBe("in 7 days");
    expect(dueLabel(augAmazon, TODAY)).toBe("in 5 days");
    expect(dueLabel(augAmazon, "2026-08-22")).toBe("in 1 day");
    expect(dueLabel(augAmazon, "2026-08-23")).toBe("due today");
  });

  it("says how long a pending bill has been overdue", () => {
    expect(dueLabel(augAmazon, "2026-08-24")).toBe("1 day overdue");
    expect(dueLabel(augAmazon, "2026-08-26")).toBe("3 days overdue");
  });

  it("says closed once paid", () => {
    expect(dueLabel(julRegalia, TODAY)).toBe("closed");
  });
});
