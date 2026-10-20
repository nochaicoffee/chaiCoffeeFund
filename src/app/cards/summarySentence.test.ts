import { describe, expect, it } from "vitest";
import { sentenceText, summarySentence } from "./summarySentence";
import { pendingSummary, spendSummary, type SpendPeriod } from "../../lib/aggregate/cardSpend";
import { lastMonths } from "../../lib/aggregate/period";
import { demoCardData } from "../../lib/demo/cardsDemo";

const TODAY = "2026-08-18";
const data = demoCardData(TODAY);
const thisYear = { kind: "year" as const, year: 2026 };

describe("summarySentence", () => {
  it("reads like the design for this year, with the confirmed average", () => {
    const text = sentenceText(
      summarySentence({ summary: spendSummary(data, thisYear, TODAY), pending: pendingSummary(data, TODAY), period: thisYear, today: TODAY }),
    );
    expect(text).toBe(
      "You've spent ₹2,39,700 so far in 2026, averaging ₹29,963 a month. July 2026 has been your highest month at ₹57,300. 2 bills are pending, totalling ₹50,900, next due Aug 23.",
    );
  });

  it("marks the figures as bold parts", () => {
    const parts = summarySentence({ summary: spendSummary(data, thisYear, TODAY), pending: pendingSummary(data, TODAY), period: thisYear, today: TODAY });
    expect(parts.filter((p) => p.strong).map((p) => p.text)).toEqual(["₹2,39,700", "₹29,963", "July 2026", "₹57,300", "2 bills", "₹50,900"]);
  });

  it("names the card when one is selected", () => {
    const text = sentenceText(
      summarySentence({
        summary: spendSummary(data, thisYear, TODAY, "demo-regalia"),
        pending: pendingSummary(data, TODAY, "demo-regalia"),
        period: thisYear,
        today: TODAY,
        cardName: "Regalia Gold",
      }),
    );
    expect(text).toContain("You've spent ₹1,73,900 on Regalia Gold so far in 2026");
    expect(text).toContain("1 bill is pending, totalling ₹38,500, due Aug 25.");
  });

  it("uses the past tense for a past year", () => {
    const past = { kind: "year" as const, year: 2026 };
    const text = sentenceText(summarySentence({ summary: spendSummary(data, past, "2027-02-01"), pending: { count: 0, total: 0, nextDueDate: null }, period: past, today: "2027-02-01" }));
    expect(text).toMatch(/^You spent ₹2,39,700 in 2026, averaging ₹19,975 a month\. July 2026 was your highest month at ₹57,300\. No bills are pending\.$/);
  });

  it("says since when for all time", () => {
    const all = { kind: "all" as const };
    const text = sentenceText(summarySentence({ summary: spendSummary(data, all, TODAY), pending: pendingSummary(data, TODAY), period: all, today: TODAY }));
    expect(text.startsWith("You've spent ₹2,39,700 since April 2026")).toBe(true);
  });

  it("words a range of months and the quick ranges (#113)", () => {
    const say = (period: SpendPeriod, today = TODAY) => sentenceText(summarySentence({ summary: spendSummary(data, period, today), pending: { count: 0, total: 0, nextDueDate: null }, period, today }));
    expect(say({ kind: "range", from: "2026-05", to: "2026-07" })).toBe(
      "You spent ₹1,47,800 from May to July 2026, averaging ₹49,267 a month. July 2026 was your highest month at ₹57,300. No bills are pending.",
    );
    expect(say({ kind: "range", from: "2026-06", to: "2026-08" })).toMatch(/^You've spent ₹1,58,300 since June 2026, averaging ₹52,767 a month\. July 2026 has been your highest month/);
    expect(say(lastMonths(3, TODAY))).toMatch(/^You've spent ₹1,58,300 in the last 3 months, averaging ₹52,767 a month\./);
  });

  it("gives just the total for a one-month range, with no average or highest month to repeat it, but leaves January's sentence as it was", () => {
    const one = { kind: "range" as const, from: "2026-07", to: "2026-07" };
    expect(sentenceText(summarySentence({ summary: spendSummary(data, one, TODAY), pending: pendingSummary(data, TODAY), period: one, today: TODAY }))).toBe(
      "You spent ₹57,300 in July 2026. 2 bills are pending, totalling ₹50,900, next due Aug 23.",
    );
    const january = { ...data, statements: data.statements.map((s) => ({ ...s, statementDate: "2027-01-05" })) };
    expect(sentenceText(summarySentence({ summary: spendSummary(january, { kind: "year", year: 2027 }, "2027-01-20"), pending: { count: 0, total: 0, nextDueDate: null }, period: { kind: "year", year: 2027 }, today: "2027-01-20" }))).toMatch(
      /^You've spent ₹[\d,]+ so far in 2027, averaging ₹[\d,]+ a month\. January 2027 has been your highest month/,
    );
  });

  it("says a range had no statements in the same words", () => {
    const empty = { kind: "range" as const, from: "2026-01", to: "2026-03" };
    expect(sentenceText(summarySentence({ summary: spendSummary(data, empty, TODAY), pending: { count: 0, total: 0, nextDueDate: null }, period: empty, today: TODAY }))).toBe(
      "No statements from January to March 2026. No bills are pending.",
    );
  });

  it("flags an overdue bill", () => {
    const text = sentenceText(summarySentence({ summary: spendSummary(data, thisYear, "2026-08-30"), pending: pendingSummary(data, "2026-08-30"), period: thisYear, today: "2026-08-30" }));
    expect(text).toContain("2 bills are pending, totalling ₹50,900, overdue since Aug 23.");
  });

  it("handles no statements at all", () => {
    const empty = { cards: [], statements: [] };
    expect(sentenceText(summarySentence({ summary: spendSummary(empty, thisYear, TODAY), pending: pendingSummary(empty, TODAY), period: thisYear, today: TODAY }))).toBe(
      "No statements in 2026. No bills are pending.",
    );
    const all = { kind: "all" as const };
    expect(sentenceText(summarySentence({ summary: spendSummary(empty, all, TODAY), pending: pendingSummary(empty, TODAY), period: all, today: TODAY }))).toBe(
      "No statements yet. No bills are pending.",
    );
  });
});
