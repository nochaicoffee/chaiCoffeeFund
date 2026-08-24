import { describe, expect, it } from "vitest";
import { nextOccurrence } from "./recurring";

describe("nextOccurrence", () => {
  it("returns the anchor date itself when it hasn't passed yet", () => {
    expect(nextOccurrence("2026-09-02", "Monthly", "2026-08-25")).toBe("2026-09-02");
  });

  it("steps forward monthly past a due date", () => {
    expect(nextOccurrence("2026-08-02", "Monthly", "2026-08-25")).toBe("2026-09-02");
  });

  it("steps forward yearly, matching real subscription data (Apple Creator Studio)", () => {
    expect(nextOccurrence("2025-04-24", "Yearly", "2026-08-25")).toBe("2027-04-24");
  });

  it("clamps end-of-month overflow instead of rolling into the next month", () => {
    // Jan 31 + 1 month should land on Feb 28 (2026 is not a leap year), not Mar 3.
    expect(nextOccurrence("2026-01-31", "Monthly", "2026-02-01")).toBe("2026-02-28");
  });

  it("handles quarterly cycles", () => {
    expect(nextOccurrence("2026-01-15", "Quarterly", "2026-08-25")).toBe("2026-10-15");
  });
});
