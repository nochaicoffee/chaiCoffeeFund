import { describe, expect, it } from "vitest";
import { demoIncomeData } from "@/lib/demo/incomeDemo";
import { payCalendar, payChangesCard, sourcesTable, trendsCard } from "./lowerView";
import { ALL } from "./views";

const TODAY = "2026-10-24";
const data = demoIncomeData(TODAY);

describe("trendsCard", () => {
  const t = trendsCard(data, TODAY, 2026, ALL);

  it("adds this year up to this month, and last year through December", () => {
    expect(t.nowIndex).toBe(9);
    expect(t.thisYear).toHaveLength(10);
    expect(t.lastYear).toHaveLength(12);
    expect(t.thisYear.every((v, i) => i === 0 || v >= t.thisYear[i - 1])).toBe(true);
    expect(t.monthly.thisYear.reduce((a, b) => a + b, 0)).toBe(t.thisYear[9]);
  });

  it("projects from this month: what's landed, plus what's owed, plus the schedule at the usual amounts", () => {
    expect(t.projected.slice(0, 9).every((v) => v === null)).toBe(true);
    // October: the late ₹6,200 dividend; then two salaries, plus January's FD and dividends fall next year.
    expect(t.projected[9]).toBe(t.thisYear[9] + 6200);
    expect(t.projected[11]).toBe(t.thisYear[9] + 6200 + 138500 * 2);
    expect(t.labels.projected).toMatch(/by Dec$/);
  });

  it("names the sources that moved most against the same days last year", () => {
    expect(t.change).toMatchObject({ up: true });
    expect(t.movers[0]).toMatchObject({ name: "Salary", up: true });
    expect(t.movers.length).toBeLessThanOrEqual(3);
  });

  it("gives a dot per regular payment this year with how many days after expected it landed", () => {
    expect(t.rhythm.every((r) => r.days >= -3 && r.days < 30)).toBe(true);
    expect(t.rhythm.some((r) => r.name === "Salary")).toBe(true);
    expect(t.rhythmNote).toMatch(/more than 3 days late · on average/);
  });

  it("has no projection for a past year, and compares whole years", () => {
    const past = trendsCard(data, TODAY, 2025, ALL);
    expect(past.projected).toEqual([]);
    expect(past.thisYear).toHaveLength(12);
    expect(past.moversNote).toBe("on 2024");
    expect(t.moversNote).toBe("on 2025, same days");
  });
});

describe("sourcesTable", () => {
  const table = sourcesTable(data, TODAY, 2026);

  it("lists active sources first, biggest first, the inactive one last", () => {
    expect(table.rows.map((r) => r.id)).toEqual(["demo-salary", "demo-fd", "demo-div", "demo-tax"]);
    expect(table.note).toBe("3 active sources · a usual month is ₹1,46,700 when every one pays");
  });

  it("gives each its usual amount, this year's payments, next, where it lands and how it's doing", () => {
    const [salary, fd, div, tax] = table.rows;
    expect(salary).toMatchObject({ usual: "₹1,38,500", usualNote: "a month", next: "Nov 1", nextNote: "in 8 days", landsIn: "HDFC Salary", status: { text: "On track" } });
    expect(fd.usualNote).toBe("₹6,133 a month");
    expect(div).toMatchObject({ next: "Oct 10", nextNote: "14 days late", nextLate: true, status: { text: "Pending", tone: "warn" } });
    expect(tax).toMatchObject({ next: "Done", nextNote: "received once", status: { text: "Inactive" }, inactive: true });
  });

  it("fills its twelve months with what landed, and dashes what's still to come", () => {
    const salary = table.rows[0];
    expect(salary.months).toHaveLength(12);
    expect(salary.months[10]).toEqual({ amount: 138500, expected: true });
    // March: the salary and the bonus that landed that month.
    expect(salary.months[2].amount).toBe(125000 + 160000);
    expect(salary.months[2].expected).toBe(false);
  });
});

describe("payCalendar", () => {
  const cal = payCalendar(data, TODAY, 2026, ALL);

  it("opens on this month, Monday first, with every payment on its day", () => {
    expect(cal.start).toBe(9);
    const oct = cal.months[9];
    expect(oct.title).toBe("Oct 2026");
    expect(oct.weeks[0].slice(0, 3)).toEqual([null, null, null]);
    const days = oct.weeks.flat().filter((d) => d && d.payments.length > 0).map((d) => [d!.day, d!.payments.map((p) => `${p.name}:${p.state}`)]);
    expect(days).toEqual([
      [1, ["Salary:received"]],
      [5, ["FD interest:received"]],
      [10, ["Dividends:pending"]],
    ]);
    expect(oct.weeks.flat().find((d) => d?.today)?.day).toBe(24);
  });

  it("shows what's still to come dashed in the months ahead", () => {
    const nov = cal.months[10];
    expect(nov.weeks.flat().find((d) => d?.day === 1)?.payments).toEqual([expect.objectContaining({ name: "Salary", state: "expected" })]);
    expect(nov.note).toBe("still to come");
  });
});

describe("payChangesCard", () => {
  it("counts the changes, the biggest rise, and what they add up to", () => {
    const card = payChangesCard(data, ALL);
    expect(card.bars.length).toBeGreaterThan(0);
    expect(card.bars.length).toBeLessThanOrEqual(6);
    expect(card.biggest?.value).toMatch(/%$/);
    expect(card.added.value).toMatch(/^[+−]₹/);
  });

  it("counts every change, while the bars show the newest six", () => {
    const card = payChangesCard(data, ALL);
    expect(Number(card.count)).toBeGreaterThan(6);
    expect(card.bars).toHaveLength(6);
    expect(card.countNote).toMatch(/the newest 6 below$/);
  });

  it("says when nothing moved", () => {
    const card = payChangesCard({ ...data, entries: [] }, ALL);
    expect(card).toMatchObject({ count: "0", countNote: "nothing moved 2% or more", bars: [] });
    expect(card.biggest).toBeUndefined();
  });
});
