import { describe, expect, it } from "vitest";
import { dueDateFor, latestStatementDate, nextStatementDate } from "./cardSchedule";

/** Prathik's HDFC Regalia Gold: statement on the 16th, due 20 days later. */
const hdfc = { statementDay: 16, dueDayBuffer: 20 };
/** A card billed on the 31st. */
const endOfMonth = { statementDay: 31, dueDayBuffer: 20 };

describe("nextStatementDate", () => {
  it("is this month's statement until it has passed, then next month's", () => {
    expect(nextStatementDate(hdfc, "2026-10-01")).toBe("2026-10-16");
    expect(nextStatementDate(hdfc, "2026-10-16")).toBe("2026-10-16");
    expect(nextStatementDate(hdfc, "2026-10-17")).toBe("2026-11-16");
  });

  it("rolls over into the new year", () => {
    expect(nextStatementDate(hdfc, "2026-12-20")).toBe("2027-01-16");
  });

  it("falls on a short month's last day, then comes back to the 31st", () => {
    expect(nextStatementDate(endOfMonth, "2027-02-01")).toBe("2027-02-28");
    expect(nextStatementDate(endOfMonth, "2028-02-01")).toBe("2028-02-29");
    expect(nextStatementDate(endOfMonth, "2027-03-01")).toBe("2027-03-31");
    expect(nextStatementDate(endOfMonth, "2026-04-01")).toBe("2026-04-30");
  });
});

describe("latestStatementDate", () => {
  it("is this month's statement once it has come, otherwise last month's", () => {
    expect(latestStatementDate(hdfc, "2026-10-16")).toBe("2026-10-16");
    expect(latestStatementDate(hdfc, "2026-10-19")).toBe("2026-10-16");
    expect(latestStatementDate(hdfc, "2026-10-15")).toBe("2026-09-16");
    expect(latestStatementDate(hdfc, "2026-01-05")).toBe("2025-12-16");
  });

  it("uses the last day of a short month", () => {
    expect(latestStatementDate(endOfMonth, "2027-03-05")).toBe("2027-02-28");
    expect(latestStatementDate(endOfMonth, "2026-10-31")).toBe("2026-10-31");
  });
});

describe("dueDateFor", () => {
  it("is the buffer's number of days after the statement, across month and year ends", () => {
    expect(dueDateFor(hdfc, "2026-10-16")).toBe("2026-11-05");
    expect(dueDateFor({ statementDay: 13, dueDayBuffer: 18 }, "2026-10-13")).toBe("2026-10-31");
    expect(dueDateFor(hdfc, "2026-12-16")).toBe("2027-01-05");
    expect(dueDateFor(endOfMonth, "2027-02-28")).toBe("2027-03-20");
  });
});
