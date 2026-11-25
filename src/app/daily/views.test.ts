import { describe, expect, it } from "vitest";
import type { DailyBudget, DailyCategory, DailySpend } from "@/lib/sheets/types";
import { dailyModel, greetingView, heroView, monthsView, nowWidgets, periodOptions, periodWidgets, limitsView, stripView, summarySentence, whereView } from "./views";

const today = "2026-11-18";
let n = 0;
const spend = (date: string, amount: number, method: DailySpend["method"], category?: string, note?: string): DailySpend => ({ id: `s${++n}`, date, amount, method, ...(category && { category }), ...(note && { note }) });
const nov = (d: number, ...rows: [number, DailySpend["method"], string?, string?][]) => rows.map(([a, m, c, note]) => spend(`2026-11-${String(d).padStart(2, "0")}`, a, m, c, note));

/** The same November the mockups draw: ₹20,982, ₹6,335 on UPI and ₹14,647 on cards. */
const NOV = [
  ...nov(1, [2400, "Card", "groceries", "BigBasket"], [180, "UPI", "food"]),
  ...nov(2, [120, "UPI", "transport"], [340, "UPI", "food"]),
  ...nov(3, [90, "UPI", "transport"], [260, "UPI", "food"]),
  ...nov(4, [4999, "Card", "shopping", "Running shoes"], [150, "UPI", "food"]),
  ...nov(5, [410, "UPI", "food"]),
  ...nov(6, [620, "UPI", "fun"], [280, "UPI", "food"]),
  ...nov(7, [1850, "Card", "bills"], [720, "UPI", "food"]),
  ...nov(8, [3200, "Card", "groceries"]),
  ...nov(9, [100, "UPI", "transport"]),
  ...nov(10, [310, "UPI", "food"]),
  ...nov(12, [899, "Card", "health"], [95, "UPI", "transport"]),
  ...nov(13, [540, "UPI", "food"]),
  ...nov(14, [1299, "Card", "shopping"], [480, "UPI", "fun"]),
  ...nov(15, [760, "UPI", "food"]),
  ...nov(16, [110, "UPI", "transport"]),
  ...nov(17, [420, "UPI", "food"], [200, "UPI", "other"]),
  ...nov(18, [150, "UPI", "food", "Tea"]),
];
const budgets: DailyBudget[] = [{ id: "b1", month: "2026-11", limit: 30000 }];
const base = { spends: NOV, budgets, categoryRows: [] as DailyCategory[], today };

describe("the greeting", () => {
  const model = dailyModel(base);
  it("says what was spent so far, by UPI and by card, a day, what's left and today's allowance", () => {
    const text = summarySentence(model).map((p) => p.text).join("");
    expect(text).toBe("You've spent ₹20,982 in November 2026 so far: ₹6,335 on UPI and ₹14,647 on credit cards, about ₹1,165.67 a day. ₹9,018 of your ₹30,000 limit is left, and today's allowance is ₹705.");
  });
  it("gives every figure in the sentence a card whose total is that figure", () => {
    const cards = greetingView(model);
    for (const part of summarySentence(model).filter((p) => p.strong)) {
      expect(part.point, part.text).toBeDefined();
      expect(cards[part.point as keyof typeof cards]?.total, part.text).toBe(part.text);
    }
  });
  it("says it when the limit's passed, and leaves the allowance out", () => {
    const over = dailyModel({ ...base, spends: [...NOV, spend("2026-11-18", 9400, "Card", "shopping")] });
    const text = summarySentence(over).map((p) => p.text).join("");
    expect(text).toMatch(/You're ₹382 over your ₹30,000 limit\.$/);
    expect(greetingView(over).allowance).toBeDefined();
  });
  it("says nothing about a limit when none is set, and has no cards for the limit", () => {
    const none = dailyModel({ ...base, budgets: [] });
    expect(summarySentence(none).map((p) => p.text).join("")).not.toMatch(/limit/);
    expect(greetingView(none).left).toBeUndefined();
  });
  it("asks for the first spend when the month is empty", () => {
    const empty = dailyModel({ ...base, spends: [] });
    expect(summarySentence(empty).map((p) => p.text).join("")).toMatch(/^Nothing written down for November 2026 yet/);
    expect(greetingView(empty)).toEqual({});
  });
});

describe("the strip", () => {
  it("is what's left, the pace, and what's left today", () => {
    const s = stripView(dailyModel(base));
    expect(s).toMatchObject({ hasLimit: true, label: "Left to spend", value: "₹9,018", paceLabel: "Pace for the 18th", paceValue: "₹18,000", tone: "warn", pill: { tone: "warn", text: "₹2,982 over pace" }, todayLabel: "Left today", todayValue: "₹555", daysLeft: "12 days to go" });
    expect(s.paceFraction).toBeCloseTo(0.6, 6);
    expect(s.fraction).toBeCloseTo(0.6994, 4);
  });
  it("turns red and says over the limit, and over today, when it is", () => {
    const s = stripView(dailyModel({ ...base, spends: [...NOV, spend("2026-11-18", 9400, "Card", "shopping")] }));
    expect(s).toMatchObject({ label: "Over the limit", value: "₹382", tone: "neg", pill: { tone: "due", text: "₹382 over the limit" }, todayLabel: "Over today by", todayValue: "₹8,845", todayNegative: true });
  });
  it("asks for a limit when there isn't one", () => {
    expect(stripView(dailyModel({ ...base, budgets: [] })).hasLimit).toBe(false);
  });
});

describe("the hero", () => {
  const hero = heroView(dailyModel(base));
  it("has today's details across the top: which day of the month, spent today and spent this month", () => {
    expect(hero).toMatchObject({ isCurrent: true, dayOf: "day 18 of 30", spentToday: "₹150", spentMonth: "₹20,982" });
  });
  it("heads with this month as one figure and a sentence under it, today and the date as pills", () => {
    expect(hero).toMatchObject({ kicker: "Spent this month · November 2026", story: "70% of your ₹30,000 limit, about ₹1,166 a day.", dateShort: "Wed, Nov 18" });
    expect(heroView(dailyModel({ ...base, budgets: [] })).story).toBe("About ₹1,166 a day.");
    expect(heroView(dailyModel({ ...base, spends: [] })).story).toBe("Nothing written down yet.");
  });
  it("lays the calendar out Monday first, with the day's total, dots and shade", () => {
    expect(hero.weeks).toHaveLength(6);
    expect(hero.weeks[0].map((c) => c?.day ?? null)).toEqual([null, null, null, null, null, null, 1]);
    const nov4 = hero.weeks[1][2];
    expect(nov4).toMatchObject({ date: "2026-11-04", total: "₹5,149", compact: "₹5.1k", upi: true, card: true, count: 2, level: 4 });
    const today18 = hero.weeks[3][2];
    expect(today18).toMatchObject({ date: "2026-11-18", today: true, total: "₹150", upi: true, card: false, level: 1 });
    expect(hero.weeks[3][3]).toMatchObject({ date: "2026-11-19", future: true, total: "" });
    expect(hero.weeks[2][2]).toMatchObject({ date: "2026-11-11", quiet: true, total: "", level: 0 });
  });
  it("has each day's spends for the panel, newest first, and won't let a day to come take one", () => {
    expect(hero.details["2026-11-14"]).toMatchObject({ label: "Sat, Nov 14", rel: "4 days ago", total: "₹1,779", upi: "₹480", card: "₹1,299", canAdd: true });
    expect(hero.details["2026-11-14"].rows.map((r) => [r.title, r.amount, r.method])).toEqual([["Fun", "₹480", "UPI"], ["Shopping", "₹1,299", "Card"]]);
    expect(hero.details["2026-11-18"].rows[0]).toMatchObject({ title: "Tea", sub: "Food · UPI" });
    expect(hero.details["2026-11-20"]).toMatchObject({ canAdd: false, rel: "In 2 days" });
  });
  it("opens on today, and steps back a month but not forward past this one", () => {
    expect(hero.defaultSelected).toBe("2026-11-18");
    expect(hero.nextHref).toBeNull();
    expect(hero.prevHref).toBe("/daily?month=2026-10");
    expect(hero.backHref).toBeNull();
  });
  it("shows a past month by its biggest day, with a way back to this one and no 'spent today'", () => {
    const oct = heroView(dailyModel({ ...base, month: "2026-10", spends: [...NOV, spend("2026-10-12", 2200, "Card", "shopping")] }));
    expect(oct).toMatchObject({ isCurrent: false, spentToday: null, kicker: "Spent in October 2026", defaultSelected: "2026-10-12", backHref: "/daily", nextHref: "/daily" });
  });
});

describe("the widgets", () => {
  const model = dailyModel(base);
  it("Right now: left today, the week so far, and where the month is heading", () => {
    const [today1, week, track] = nowWidgets(model)!;
    expect(today1).toMatchObject({ title: "Left today", tag: "Now", value: "₹555", sub: "of ₹705 for today" });
    expect(week).toMatchObject({ title: "Week so far", value: "₹880", sub: "₹6,120 left of ₹7,000 · 16–22 Nov" });
    expect(week.visual.kind === "week" && week.visual.days.map((d) => d.label).join("")).toBe("MTWTFSS");
    expect(track).toMatchObject({ title: "On track to end at", value: "₹34,970", sub: "₹4,970 over your ₹30,000", valueTone: "warn" });
  });
  it("Right now is left out without a limit, since all three are about it", () => {
    expect(nowWidgets(dailyModel({ ...base, budgets: [] }))).toBeNull();
  });
  it("shows today as past its allowance, in red, when it is", () => {
    const over = nowWidgets(dailyModel({ ...base, spends: [...NOV, spend("2026-11-18", 9400, "Card", "shopping")] }))!;
    expect(over[0]).toMatchObject({ value: "−₹8,845", valueTone: "neg", sub: "past today's ₹705" });
  });
  it("the period widgets for a year: six, tagged with the year, in a fixed order", () => {
    const ws = periodWidgets(model);
    expect(ws.map((w) => w.key)).toEqual(["spent", "top", "biggest", "split", "quiet", "inside"]);
    expect(ws.every((w) => w.tag === "2026" && !w.isNow)).toBe(true);
    expect(ws[0]).toMatchObject({ title: "Spent in 2026", value: "₹20,982" });
    expect(ws[1]).toMatchObject({ title: "Top category", value: "Shopping", sub: "₹6,298 · 30% of the year", valueColor: "raspberry" });
    expect(ws[2]).toMatchObject({ title: "Biggest spend", value: "₹4,999", sub: "Running shoes · Nov 4 · Credit card" });
    expect(ws[3]).toMatchObject({ value: "70% card", sub: "₹6,335 UPI · ₹14,647 card" });
    expect(ws[4]).toMatchObject({ title: "Quiet days", value: "1 day" });
  });
  it("the same six over a month: November's own, with days under the allowance in place of months inside the limit", () => {
    const ws = periodWidgets(dailyModel({ ...base, period: "month" }));
    expect(ws[0]).toMatchObject({ title: "Spent in November", tag: "November 2026", sub: "₹1,165.67 a day · 18 days" });
    expect(ws[5]).toMatchObject({ title: "Days under the allowance", value: "13 of 18" });
  });
  it("the quiet-days columns never outgrow the chart: the month with the most fills it, the rest are in proportion", () => {
    const sparse = [spend("2026-09-01", 100, "UPI", "food"), spend("2026-09-02", 100, "UPI", "food"), spend("2026-10-01", 100, "UPI", "food"), spend("2026-11-01", 100, "UPI", "food"), spend("2026-11-18", 100, "UPI", "food")];
    const model = dailyModel({ ...base, spends: sparse });
    const quiet = model.period.months.map((x) => x.quiet);
    expect(Math.max(...quiet)).toBeGreaterThan(4);
    const visual = periodWidgets(model).find((x) => x.key === "quiet")!.visual;
    if (visual.kind !== "columns") throw new Error("a year draws columns");
    const heights = visual.bars.map((b) => b.height);
    expect(Math.max(...heights)).toBe(100);
    expect(heights.every((h) => h <= 100)).toBe(true);
    const i = quiet.indexOf(Math.max(...quiet));
    const j = quiet.findIndex((q, k) => k !== i && q > 0 && !model.period.months[k].empty);
    expect(heights[j]).toBeCloseTo((quiet[j] / quiet[i]) * 100);
  });
  it("safe with an empty diary", () => {
    const ws = periodWidgets(dailyModel({ ...base, spends: [] }));
    expect(ws.map((w) => w.value)).toEqual(["₹0", "—", "—", "—", "0 days", "—"]);
  });
});

describe("the bars' hover cards", () => {
  const model = dailyModel(base);
  it("each day of the week says its date and what was spent, and a day to come says so", () => {
    const week = nowWidgets(model)![1].visual;
    if (week.kind !== "week") throw new Error("the week draws days");
    expect(week.days.map((d) => d.tip)).toEqual(["Mon, Nov 16 · ₹110", "Tue, Nov 17 · ₹620", "Wed, Nov 18 · ₹150", "Thu, Nov 19 · to come", "Fri, Nov 20 · to come", "Sat, Nov 21 · to come", "Sun, Nov 22 · to come"]);
  });
  it("a part of the stacked bars says what it is, and agrees with its legend entry", () => {
    const top = periodWidgets(model).find((x) => x.key === "top")!.visual;
    if (top.kind !== "stack") throw new Error("Top category draws a stack");
    for (const l of top.legend) expect(top.segments.find((s) => s.name === l.name)!.tip).toContain(l.percent);
    expect(top.segments[0].tip).toMatch(/^Shopping · ₹6,298 · 30%$/);
  });
  it("the columns, the pills and the month rows carry their figures too", () => {
    const ws = periodWidgets(model);
    const spent = ws[0].visual;
    if (spent.kind !== "columns") throw new Error("a year draws columns");
    expect(spent.bars[10].tip).toBe("November · ₹20,982");
    expect(spent.bars[11].tip).toBe("December · to come");
    expect(monthsView(model).rows[10].tips).toEqual({ upi: "UPI · ₹6,335", card: "Credit card · ₹14,647", cash: "Cash · ₹0" });
    expect(whereView(model).rows[0].tip).toBe("Shopping · ₹6,298 · 30% of the year");
  });
});

describe("where it went, and month by month", () => {
  it("where: the period's categories biggest first, with the colour each has, by name", () => {
    const w = whereView(dailyModel(base));
    expect(w).toMatchObject({ title: "Where 2026 went", total: "₹20,982" });
    expect(w.rows.slice(0, 3).map((r) => [r.name, r.amount, r.share])).toEqual([["Shopping", "₹6,298", "30%"], ["Groceries", "₹5,600", "27%"], ["Food", "₹4,520", "22%"]]);
    expect(w.rows[0].fraction).toBe(1);
  });
  it("a renamed or added category shows by its new name; a hidden one still shows on the spends it has", () => {
    const rows: DailyCategory[] = [{ id: "r1", builtIn: "food", name: "Eating out", color: "Ruby", status: "Hidden" }, { id: "c-9", name: "Pets", color: "Violet", status: "Active" }];
    const m = dailyModel({ ...base, categoryRows: rows, spends: [...NOV, spend("2026-11-10", 850, "Card", "c-9")] });
    expect(m.nameOf("food")).toBe("Eating out");
    expect(m.nameOf("c-9")).toBe("Pets");
    expect(m.nameOf(undefined)).toBe("No category");
    expect(whereView(m).rows.map((r) => r.name)).toContain("Eating out");
  });
  it("months for a year are twelve rows against the limit; a month's are the last six", () => {
    const year = monthsView(dailyModel(base));
    expect(year.rows).toHaveLength(12);
    expect(year.rows[10]).toMatchObject({ label: "Nov", total: "₹20,982", on: true, diff: "₹9,018 under" });
    expect(year.rows[11]).toMatchObject({ label: "Dec", total: "—", empty: true });
    expect(year.limitLabel).toBe("₹30,000 limit");
    const month = monthsView(dailyModel({ ...base, period: "month" }));
    expect(month.rows).toHaveLength(6);
    expect(month.rows[0].label).toBe("Nov 2026");
  });
});

describe("the period picker", () => {
  it("offers This month and each year from the diary's start, marking the one on", () => {
    const m = dailyModel({ ...base, spends: [...NOV, spend("2025-12-30", 100, "UPI")] });
    const { options, value } = periodOptions(m);
    expect(options.map((o) => [o.value, o.label])).toEqual([["month", "This month"], ["2026", "2026"], ["2025", "2025"]]);
    expect(value).toBe("2026");
    expect(periodOptions(dailyModel({ ...base, period: "month" })).value).toBe("month");
    expect(dailyModel({ ...base, period: "2025" }).periodLabel).toBe("2025");
  });
});

describe("a spend still being saved", () => {
  const pending = { id: "pending-1", date: "2026-11-18", amount: 349, method: "UPI" as const, category: "food", note: "Evening snacks" };
  const before = dailyModel(base);
  const after = dailyModel({ ...base, spends: [...NOV, pending] });

  it("is in the sentence, the strip, the hero, the calendar and the widgets at once", () => {
    expect(summarySentence(after).map((p) => p.text).join("")).toMatch(/^You've spent ₹21,331 in November 2026 so far: ₹6,684 on UPI and ₹14,647 on credit cards/);
    expect(stripView(after)).toMatchObject({ value: "₹8,669", todayValue: "₹206" });
    const hero = heroView(after);
    expect(hero).toMatchObject({ spentToday: "₹499", spentMonth: "₹21,331" });
    expect(hero.weeks[3][2]).toMatchObject({ date: "2026-11-18", total: "₹499", count: 2 });
    expect(nowWidgets(after)![0]).toMatchObject({ value: "₹206" });
    expect(periodWidgets(after)[0]).toMatchObject({ value: "₹21,331" });
    expect(whereView(after).rows.find((r) => r.name === "Food")?.amount).toBe("₹4,869");
  });
  it("is marked as saving in its day's list, so it can't be edited before the Sheet has it", () => {
    const rows = heroView(after).details["2026-11-18"].rows;
    expect(rows.map((r) => [r.title, r.saving])).toEqual([["Evening snacks", true], ["Tea", false]]);
    expect(heroView(before).details["2026-11-18"].rows.every((r) => !r.saving)).toBe(true);
  });
  it("takes nothing from the figures once it's gone (a save that failed)", () => {
    expect(stripView(before).value).toBe("₹9,018");
  });
});

describe("limitsView", () => {
  const limits = [{ id: "l1", category: "shopping", month: "2026-11", limit: 5000 }, { id: "l2", category: "food", month: "2026-11", limit: 3000 }, { id: "l3", category: "bills", month: "2026-11", limit: 2000 }];
  const OCT = [spend("2026-10-05", 2000, "UPI", "food"), spend("2026-10-12", 1000, "Card", "shopping"), spend("2026-10-25", 700, "UPI", "food")];
  it("lists each category against its limit, over ones flagged, with what's left", () => {
    const v = limitsView(dailyModel({ ...base, categoryLimits: limits }));
    expect(v.title).toBe("Where November 2026 went");
    const shopping = v.rows.find((r) => r.id === "shopping");
    expect(shopping).toMatchObject({ spent: "₹6,298", of: "of ₹5,000 · 126%", state: "over", status: "₹1,298 over", fraction: 1 });
    expect(v.rows.find((r) => r.id === "food")).toMatchObject({ spent: "₹4,520", state: "over", status: "₹1,520 over" });
    expect(v.rows.find((r) => r.id === "bills")).toMatchObject({ spent: "₹1,850", state: "near", status: "93% used" });
    expect(v.rows.find((r) => r.id === "transport")).toMatchObject({ state: "none", status: "No limit", of: "" });
    expect(v.hasLimits).toBe(true);
  });
  it("says what needs a look, the furthest along first, and what the limits leave of the monthly one", () => {
    const v = limitsView(dailyModel({ ...base, categoryLimits: limits }));
    expect(v.attention.map((a) => a.text)).toEqual(["Food is ₹1,520 over its ₹3,000 limit", "Shopping is ₹1,298 over its ₹5,000 limit", "Bills is at 93% of its ₹2,000"]);
    expect(v.footnote).toBe("₹20,000 of your ₹30,000 isn't given to a category.");
    expect(limitsView(dailyModel({ ...base, categoryLimits: [{ id: "l9", category: "food", month: "2026-11", limit: 40000 }] })).footnote).toContain("more than your ₹30,000 monthly limit");
  });
  it("compares with the same days of last month only when the diary was kept then", () => {
    const withOct = limitsView(dailyModel({ ...base, spends: [...OCT, ...NOV], categoryLimits: limits }));
    // Food last month by the 18th: the 5th only (₹2,000); this month ₹4,520.
    expect(withOct.rows.find((r) => r.id === "food")?.vs).toEqual({ text: "₹2,520 vs Oct", tone: "up" });
    expect(limitsView(dailyModel({ ...base, categoryLimits: limits })).rows.every((r) => r.vs === null)).toBe(true);
  });
  it("has no limits, no attention and no footnote until a category is given one", () => {
    const v = limitsView(dailyModel(base));
    expect(v).toMatchObject({ hasLimits: false, attention: [], footnote: null });
    expect(v.rows.length).toBeGreaterThan(0);
  });
});
