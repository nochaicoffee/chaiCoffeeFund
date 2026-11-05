import { describe, expect, it } from "vitest";
import { demoLoansData } from "@/lib/demo/loansDemo";
import { ALL, attentionView, coverView, greetingView, monthKeyAdd, pickIds, shortAccountName, summarySentence, type LoansData } from "./views";
import { loanWidgets } from "./widgetsView";

// The design's "today", and its sample loans.
const today = "2026-10-25";
const data = demoLoansData(today);
const empty: LoansData = { loans: [], installments: [], prepayments: [], accounts: [], cards: [], salary: null, balances: [] };

describe("the greeting", () => {
  const parts = summarySentence(data, today);
  const cards = greetingView(data, today);

  it("reads as the design's sentence", () => {
    const text = parts.map((p) => p.text).join("");
    expect(text).toMatch(/^You owe ₹[\d,]+ across 3 loans, and ₹[\d,]+ goes out in EMIs each month\. \d+% of what you borrowed is repaid/);
    expect(text).toContain("Your next EMI, ₹9,893 for the Personal loan, is due Oct 28");
    expect(text).toContain("debt-free in Jun 2043.");
  });

  it("gives every bold figure a card, with the same total", () => {
    for (const part of parts.filter((p) => p.strong)) {
      const card = cards[part.point as keyof typeof cards];
      expect(card, part.text).toBeDefined();
      if (part.point !== "free") expect(card!.total).toBe(part.text);
    }
  });

  it("says so when there are no loans, or none still running", () => {
    expect(summarySentence(empty, today).map((p) => p.text).join("")).toMatch(/^No loans yet/);
    expect(greetingView(empty, today)).toEqual({});
    const closed = { ...data, loans: data.loans.map((l) => ({ ...l, status: "Closed" as const })) };
    expect(summarySentence(closed, today).map((p) => p.text).join("")).toBe("You're debt-free: 4 loans paid off, nothing owed.");
  });
});

describe("the attention strip", () => {
  it("shows an EMI due within a week, and where it will be charged", () => {
    const items = attentionView(data, today);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: "Personal loan", amount: "₹9,893", overdue: false, text: "is due Oct 28 (in 3 days) and will be charged to HDFC Regalia (card)." });
  });

  it("shows one line per loan, however many EMIs are overdue", () => {
    const items = attentionView(data, "2026-12-30");
    expect(items.map((i) => i.name)).toEqual(["Personal loan", "Car loan", "Home loan"]);
    expect(items[0].text).toBe("was due Oct 28 (63 days ago) and isn't marked paid, with 2 more EMIs overdue after it.");
  });

  it("calls one past its due date overdue", () => {
    const items = attentionView(data, "2026-10-30");
    expect(items[0]).toMatchObject({ overdue: true, text: "was due Oct 28 (2 days ago) and isn't marked paid." });
  });
});

describe("when the account can't cover an EMI", () => {
  // The demo's HDFC Salary holds ₹18,000 (recorded on the design's "today", Oct 25). The Home loan's EMI (about ₹24,655) is
  // due on the 12th, more than that; the Car loan's (about ₹14,599, due on the 5th) isn't.
  const soon = "2026-11-05"; // the Home loan's EMI is 7 days off
  const home = data.loans.find((l) => l.id === "demo-home")!;
  const pending = data.installments.find((i) => i.loanId === "demo-home" && i.status === "Pending")!;
  const low = (balance: number, date = today) => ({ ...data, balances: [{ accountId: "demo-hdfc", balance, date }] });

  it("flags an EMI bigger than what its account holds, in the strip and in Coming up", () => {
    expect(attentionView(data, "2026-11-10").find((i) => i.name === "Home loan")?.short).toBe("HDFC Salary");
    const rows = loanWidgets(data, soon).comingUp.rows;
    expect(rows.find((r) => r.loanId === "demo-home")?.short).toBe("HDFC Salary");
    expect(rows.find((r) => r.loanId === "demo-car")?.short).toBeUndefined();
  });

  it("doesn't flag it when the account holds enough, or has no balance recorded", () => {
    expect(loanWidgets(low(500_000), soon).comingUp.rows.every((r) => !r.short)).toBe(true);
    expect(loanWidgets({ ...data, balances: [] }, soon).comingUp.rows.every((r) => !r.short)).toBe(true);
  });

  it("never flags an EMI charged to a card, whatever the account holds", () => {
    // Even with an account set on the loan, a card on the loan or on the installment decides.
    expect(shortAccountName(low(1), { ...home, emiPaidFromCardId: "demo-regalia" }, pending, "2026-11-10")).toBeUndefined();
    expect(shortAccountName(low(1), home, { ...pending, paidFromCardId: "demo-regalia" }, "2026-11-10")).toBeUndefined();
    expect(shortAccountName(low(1), home, pending, "2026-11-10")).toBe("HDFC Salary"); // the same EMI, from the account
  });

  it("only flags an EMI due within a week, as the strip does", () => {
    const due = (date: string) => ({ ...pending, dueDate: date });
    expect(shortAccountName(low(1), home, due("2026-11-11"), "2026-11-04")).toBe("HDFC Salary"); // 7 days
    expect(shortAccountName(low(1), home, due("2026-11-12"), "2026-11-04")).toBeUndefined(); // 8 days
  });

  it("doesn't flag an EMI already past its due date, which the balance may already have paid", () => {
    const late = (date: string) => ({ ...pending, dueDate: date });
    expect(shortAccountName(low(1), home, late("2026-11-04"), "2026-11-04")).toBe("HDFC Salary"); // due today
    expect(shortAccountName(low(1), home, late("2026-11-03"), "2026-11-04")).toBeUndefined(); // a day late
    expect(attentionView(data, "2026-11-14").find((i) => i.name === "Home loan")).toMatchObject({ overdue: true, short: undefined });
  });

  it("ignores a balance recorded more than 35 days ago", () => {
    const due = { ...pending, dueDate: "2026-11-30" };
    expect(shortAccountName(low(1, "2026-10-26"), home, due, "2026-11-25")).toBe("HDFC Salary"); // 30 days old
    expect(shortAccountName(low(1, "2026-10-20"), home, due, "2026-11-25")).toBeUndefined(); // 36 days old
  });
});

describe("the cover", () => {
  const cover = coverView(data, today);

  it("has All loans and a tile per active loan", () => {
    expect(cover.tiles.map((t) => t.name)).toEqual(["All loans", "Home loan", "Car loan", "Personal loan"]);
    expect(pickIds(data)).toEqual([ALL, "demo-home", "demo-car", "demo-personal"]);
    const [all, ...loans] = cover.tiles;
    expect(all.owed).toBeCloseTo(loans.reduce((t, l) => t + l.owed, 0), 2);
  });

  it("draws the cliffs from six months back to the last EMI, stepping down as loans end", () => {
    const { months, flags } = cover.cliffs;
    expect(months[0].key).toBe("2026-04");
    expect(months.at(-1)!.key).toBe("2043-06");
    expect(flags.map((f) => f.name)).toEqual(["Personal loan", "Car loan", "Home loan"]);
    const before = months.find((m) => m.key === "2028-02")!.total;
    const after = months.find((m) => m.key === "2028-03")!.total;
    expect(before - after).toBeCloseTo(months.find((m) => m.key === "2028-02")!.byLoan["demo-personal"], 0);
  });

  it("has a capsule per active loan: principal repaid, and how far through its term", () => {
    for (const c of cover.capsules) {
      expect(c.repaidShare).toBeGreaterThan(0);
      expect(c.repaidShare).toBeLessThan(c.termShare + 0.2);
    }
  });
});

describe("the widgets", () => {
  const widgets = loanWidgets(data, today);

  it("follows every pick", () => {
    for (const key of ["split", "payments", "schedule", "clock", "whatIf", "emiAnatomy", "load"] as const) {
      expect(Object.keys(widgets[key]).sort(), key).toEqual(pickIds(data).sort());
    }
  });

  it("splits 24 months, this one in the middle, into principal and interest", () => {
    const { months } = widgets.split[ALL];
    expect(months).toHaveLength(24);
    expect(months[11]).toMatchObject({ key: "2026-10", now: true });
    expect(months[0].key).toBe(monthKeyAdd("2026-10", -11));
  });

  it("lists the six most recent EMIs paid, newest first", () => {
    const { rows, count } = widgets.payments[ALL];
    expect(rows).toHaveLength(6);
    expect(rows[0]).toMatchObject({ title: "EMI 40 of 240", paidOn: "Oct 12" });
    expect(count).toMatch(/^The 6 most recent of \d+ this year$/);
  });

  it("keeps a closed loan in the table, last", () => {
    expect(widgets.table.rows.map((r) => r.loan.name)).toEqual(["Home loan", "Car loan", "Personal loan", "Laptop loan"]);
    expect(widgets.table.rows[3]).toMatchObject({ owed: "₹0", owedNote: "Closed", repaidShare: 1 });
  });

  it("shows the next loan due's schedule with all loans, around the next EMI", () => {
    const s = widgets.schedule[ALL];
    expect(s.loan.name).toBe("Personal loan");
    expect(s.rows.map((r) => r.number)).toEqual([17, 18, 19, 20, 21, 22, 23, 24]);
    expect(s.rows.find((r) => r.next)?.status).toEqual({ tone: "due", text: "Due in 3 days" });
  });

  it("counts down to the last EMI", () => {
    expect(widgets.clock[ALL]).toMatchObject({ years: 16, months: 7, days: 18 });
  });

  it("tries a prepayment on the dearest loan with all loans", () => {
    expect(widgets.whatIf[ALL].loan.name).toBe("Personal loan");
    expect(widgets.whatIf[ALL].effect).toBe("Reduce-Emi");
  });

  it("weighs the EMIs against the salary", () => {
    const load = widgets.load[ALL]!;
    expect(load.share).toBeCloseTo(49146.41 / 138500, 3);
    expect(load.zone).toBe("Stretched");
    expect(loanWidgets({ ...data, salary: null }, today).load[ALL]).toBeNull();
  });

  it("adds the cost of borrowing up as interest and charges, apart", () => {
    const cost = widgets.cost!;
    expect(cost.borrowed).toBe("₹38,00,000");
    expect(cost.rows).toHaveLength(3);
  });
});
