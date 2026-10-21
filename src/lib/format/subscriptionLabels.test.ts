import { describe, expect, it } from "vitest";
import { SUBSCRIPTION_CATEGORIES } from "../sheets/types";
import { cardColorKey, categoryColor, categoryLabel, cycleWord, whenFrom } from "./subscriptionLabels";
import { formatDayDate } from "./date";

describe("subscription labels", () => {
  it("shows a category without its hyphen", () => {
    expect(categoryLabel("Cloud-Storage")).toBe("Cloud storage");
    expect(categoryLabel("Streaming")).toBe("Streaming");
  });

  it("gives every category a colour from the card palette", () => {
    for (const c of SUBSCRIPTION_CATEGORIES) expect(categoryColor(c)).toMatch(/^(ruby|teal|sapphire|violet|copper|onyx)$/);
    expect(categoryColor("Streaming")).toBe("ruby");
  });

  it("names what one payment covers, and a card's colour as a key", () => {
    expect(cycleWord("Quarterly")).toBe("quarter");
    expect(cardColorKey("Teal")).toBe("teal");
    expect(cardColorKey(undefined)).toBe("onyx");
  });
});

describe("dates in words", () => {
  it("writes a renewal's day, and how far off it is", () => {
    expect(formatDayDate("2026-10-23")).toBe("Fri, Oct 23");
    expect(whenFrom("2026-10-20", "2026-10-20")).toBe("today");
    expect(whenFrom("2026-10-20", "2026-10-21")).toBe("tomorrow");
    expect(whenFrom("2026-10-20", "2026-10-23")).toBe("in 3 days");
    expect(whenFrom("2026-10-20", "2027-03-03")).toBe("in 4 months");
    expect(whenFrom("2026-10-20", "2026-10-16")).toBe("4 days ago");
  });
});
