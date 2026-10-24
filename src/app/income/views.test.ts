import { describe, expect, it } from "vitest";
import { demoIncomeData } from "@/lib/demo/incomeDemo";
import { ALL, attentionView, coverView, greetingView, incomeYears, summarySentence, type IncomeData } from "./views";

const TODAY = "2026-10-24";
const data = demoIncomeData(TODAY);
const text = (parts: { text: string }[]) => parts.map((p) => p.text).join("");
const rupees = (s: string) => Number(s.replace(/[^\d]/g, ""));

describe("the greeting", () => {
  const parts = summarySentence(data, TODAY, 2026);
  const cards = greetingView(data, TODAY, 2026);

  it("reads like the design", () => {
    expect(text(parts)).toMatch(/^You've received ₹[\d,]+ so far in 2026, about ₹[\d,]+ a month, \d+% more than at this point last year\. March was the biggest month at ₹[\d,]+\. ₹6,200 from Dividends is 14 days late, and ₹1,38,500 is expected in the next 30 days\.$/);
  });

  it("gives every pointed figure a card", () => {
    const points = new Set(parts.map((p) => p.point).filter(Boolean));
    expect([...points].sort()).toEqual(["average", "best", "late", "next", "received", "vsLast"]);
    for (const p of points) expect(cards[p as keyof typeof cards]).toBeDefined();
  });

  it("agrees with its cards", () => {
    const figure = (point: string) => parts.find((p) => p.point === point)?.text ?? "";
    expect(cards.received?.total).toBe(figure("received"));
    expect(cards.average?.total).toBe(figure("average"));
    expect(cards.late?.total).toBe(figure("late"));
    expect(cards.next?.total).toBe(figure("next"));
    expect(cards.best?.total).toBe(parts.filter((p) => p.point === "best")[1].text);
    // The received card's rows add up to its total.
    expect(cards.received?.rows.reduce((t, r) => t + rupees(r.amount), 0)).toBe(rupees(cards.received?.total ?? ""));
  });

  it("speaks in the past tense about a past year, with no pending or upcoming", () => {
    const past = text(summarySentence(data, TODAY, 2025));
    expect(past).toMatch(/^You received ₹[\d,]+ in 2025, about ₹[\d,]+ a month\. March was the biggest month at ₹[\d,]+\.$/);
    expect(greetingView(data, TODAY, 2025).late).toBeUndefined();
  });

  it("says what to do when there are no sources, and when nothing has landed", () => {
    const empty: IncomeData = { sources: [], entries: [], accounts: [] };
    expect(text(summarySentence(empty, TODAY, 2026))).toBe("No income sources yet. Add one, then record what comes in, and this page fills in.");
    expect(greetingView(empty, TODAY, 2026)).toEqual({});
    const fresh: IncomeData = { ...data, entries: [] };
    expect(text(summarySentence({ ...fresh, sources: fresh.sources.map((s) => ({ ...s, scheduleDate: "2026-11-01" })) }, TODAY, 2026))).toBe("Nothing has landed in 2026 yet. ₹1,63,100 is expected in the next 30 days.");
  });
});

describe("the attention strip", () => {
  it("names each source that's late, how much, and where it should have landed", () => {
    expect(attentionView(data, TODAY)).toEqual([{ sourceId: "demo-div", name: "Dividends", amount: "₹6,200", text: "was expected Oct 10 (14 days ago) and hasn't landed in ICICI Invest." }]);
  });
});

describe("the cover", () => {
  const cover = coverView(data, TODAY, 2026);

  it("has twelve months whose parts add up, by source and by tag", () => {
    expect(cover.months).toHaveLength(12);
    for (const m of cover.months) {
      expect(m.bySource.reduce((t, s) => t + s.amount, 0)).toBe(m.total);
      expect(m.byTag.reduce((t, s) => t + s.amount, 0)).toBe(m.total);
    }
    expect(cover.months.reduce((t, m) => t + m.total, 0)).toBe(cover.picks[0].total);
  });

  it("shows what's owed in its month and what's scheduled from today on", () => {
    const oct = cover.months[9];
    expect(oct.current).toBe(true);
    expect(oct.pending).toBe(6200);
    expect(cover.months[10]).toMatchObject({ future: true, total: 0, expected: 138500 });
    expect(cover.months[0].expected).toBe(0);
  });

  it("offers all sources first, then each source, biggest first and inactive last", () => {
    expect(cover.picks.map((p) => p.id)).toEqual([ALL, "demo-salary", "demo-fd", "demo-div", "demo-tax"]);
    expect(cover.sources.at(-1)).toMatchObject({ id: "demo-tax", inactive: true });
  });

  it("gives all sources the usual month, pending, next payday and on time", () => {
    const all = cover.picks[0];
    expect(all.figures.map((f) => f.label)).toEqual(["A usual month", "Pending", "Next payday", "On time"]);
    expect(all.figures[0].value).toBe("₹1,46,700"); // 1,38,500 + 18,400 ÷ 3 + 6,200 ÷ 3
    expect(all.figures[1]).toMatchObject({ value: "₹6,200", note: "Dividends · 14 days late", tone: "warn" });
    expect(all.figures[2]).toMatchObject({ value: "Nov 1", note: "Salary ₹1,38,500 · in 8 days" });
    expect(all.line.amount).toBeCloseTo(138500 + 18400 / 3 + 6200 / 3);
    expect(cover.picks.find((p) => p.id === "demo-div")?.line).toEqual({ label: "A usual payment", amount: 6200 });
  });

  it("gives a source its usual amount, next, last paid and where it lands", () => {
    const div = cover.picks.find((p) => p.id === "demo-div");
    expect(div?.figures.map((f) => [f.label, f.value])).toEqual([["Usual amount", "₹6,200"], ["Next", "Oct 10"], ["Last paid", "Jul 11"], ["Lands in", "ICICI Invest"]]);
    expect(div?.figures[1].tone).toBe("warn");
  });

  it("leaves a past year without pending or expected payments, and its figures are about that year", () => {
    const past = coverView(data, TODAY, 2025);
    expect(past.months.every((m) => m.pending === 0 && m.expected === 0)).toBe(true);
    expect(past.picks[0].figures.map((f) => f.label)).toEqual(["About a month", "Biggest month", "Payments", "On time"]);
    expect(past.picks[0].figures[1]).toMatchObject({ value: "Mar" });
  });

  it("says when pending money is from before this year, as it has no column", () => {
    const january = coverView(data, "2027-01-20", 2027);
    expect(january.picks[0].figures[1].note).toMatch(/from last year$/);
  });
});

describe("the years", () => {
  it("runs from this year back to the first with income", () => {
    expect(incomeYears(data, TODAY)).toEqual([2026, 2025]);
    expect(incomeYears({ sources: [], entries: [], accounts: [] }, TODAY)).toEqual([2026]);
  });
});
