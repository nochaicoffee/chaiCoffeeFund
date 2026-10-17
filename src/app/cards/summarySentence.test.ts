import { describe, expect, it } from "vitest";
import { sentenceText, summarySentence } from "./summarySentence";
import { pendingSummary, spendSummary } from "../../lib/aggregate/cardSpend";
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
