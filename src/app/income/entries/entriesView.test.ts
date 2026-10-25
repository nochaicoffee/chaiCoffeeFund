import { describe, expect, it } from "vitest";
import { demoIncomeData } from "@/lib/demo/incomeDemo";
import { entriesHeader, ledgerRows, monthTitle, passbook, passbookSources } from "./entriesView";

const TODAY = "2026-10-24";
const data = demoIncomeData(TODAY);
const text = (parts: { text: string }[]) => parts.map((p) => p.text).join("");

describe("entriesHeader", () => {
  it("says how many payments, how many owed and how many to come", () => {
    const h = entriesHeader(data, TODAY, 2026);
    expect(text(h.sentence)).toMatch(/^Every payment in one place: \d+ in 2026 across 4 sources\. 1 is pending, and 2 are still to come\.$/);
    expect(h.tiles.map((t) => t.label)).toEqual(["Next 30 days", "Pending", "Received this year", "On time"]);
    expect(h.tiles[0]).toMatchObject({ value: "₹1,38,500", note: "1 payment · next Salary on Nov 1" });
    expect(h.tiles[1]).toMatchObject({ value: "₹6,200", note: "1 payment · Dividends, 14 days late", tone: "warn" });
  });

  it("reads well when there's nothing yet, or nothing owed", () => {
    expect(text(entriesHeader({ sources: [], entries: [], accounts: [] }, TODAY, 2026).sentence)).toBe("No income recorded yet. Add a source, then record what comes in, and every payment shows here.");
    const quiet = { ...data, sources: data.sources.filter((s) => s.id === "demo-fd") };
    expect(text(entriesHeader(quiet, TODAY, 2026).sentence)).toMatch(/^Every payment in one place: \d+ in 2026 across \d+ sources?\. Nothing is pending, and nothing else is due this year\.$/);
  });

  it("describes a past year without pending or upcoming", () => {
    const h = entriesHeader(data, TODAY, 2025);
    expect(text(h.sentence)).toMatch(/^Every payment in one place: \d+ in 2025 across 3 sources\.$/);
    expect(h.tiles.map((t) => t.label)).toEqual(["A month", "Payments", "Received in 2025", "On time"]);
  });
});

describe("ledgerRows", () => {
  const rows = ledgerRows(data, TODAY, 2026);

  it("lists what's owed, then what's to come this year, then what landed, newest first", () => {
    const kinds = rows.map((r) => r.kind);
    expect(kinds.indexOf("upcoming")).toBeGreaterThan(kinds.lastIndexOf("pending"));
    expect(kinds.indexOf("received")).toBeGreaterThan(kinds.lastIndexOf("upcoming"));
    const landed = rows.filter((r) => r.kind === "received").map((r) => r.month);
    expect(landed).toEqual([...landed].sort().reverse());
    expect(rows.filter((r) => r.kind === "upcoming").map((r) => r.expectedDate)).toEqual(["2026-11-01", "2026-12-01"]);
  });

  it("gives a row its payday, status, where it landed and its change", () => {
    expect(rows[0]).toMatchObject({ kind: "pending", name: "Dividends", expected: "Sat, Oct 10", expectedNote: "14 days ago", amountNote: "expected", status: { tone: "late" }, landsIn: "ICICI Invest" });
    const july = rows.find((r) => r.kind === "received" && r.name === "Dividends" && r.month === "2026-07");
    expect(july).toMatchObject({ received: "Jul 11", receivedNote: "1 day after", tag: "Regular", change: { up: true } });
    expect(rows.find((r) => r.name === "Tax refund")?.status).toEqual({ text: "Received · 6 days late", tone: "warn" });
    expect(rows.find((r) => r.kind === "received" && r.name === "Salary")?.fromStatement).toBe(true);
  });

  it("is searchable by source and amount", () => {
    expect(rows.filter((r) => r.search.includes("dividends")).length).toBeGreaterThan(0);
    expect(rows.filter((r) => r.search.includes("18400")).every((r) => r.name === "FD interest")).toBe(true);
  });

  it("has only what landed for a past year", () => {
    expect(ledgerRows(data, TODAY, 2025).every((r) => r.kind === "received")).toBe(true);
    expect(monthTitle("2026-10")).toBe("October 2026");
  });
});

describe("passbook", () => {
  const book = passbook(data, TODAY, 2026, "demo-salary")!;

  it("gives one source's facts, figures and a year of months", () => {
    expect(book.facts).toBe("Salary · monthly · lands in HDFC Salary");
    expect(book.figures.map((f) => f.label)).toEqual(["Received 2026", "Usual amount", "Last raise", "Next", "On time"]);
    expect(book.figures[2]).toMatchObject({ value: "+₹13,500", tone: "accent" });
    expect(book.figures[3]).toMatchObject({ value: "Nov 1", note: "in 8 days" });
    expect(book.months).toHaveLength(12);
    expect(book.months[10]).toMatchObject({ amount: 138500, expected: true });
  });

  it("lists every payment newest first, what's to come on top", () => {
    expect(book.items[0].state).toBe("upcoming");
    expect(book.items.find((i) => i.state === "received")).toMatchObject({ date: "Oct 1", title: "October · Salary", status: { text: "Received" } });
    expect(book.items.some((i) => i.title === "March · bonus")).toBe(true);
    expect(book.items.find((i) => i.otherYear)?.otherYear).toBe("2027");
  });

  it("is undefined for a source that isn't there, and lists the sources all-first", () => {
    expect(passbook(data, TODAY, 2026, "nope")).toBeUndefined();
    expect(passbookSources(data, 2026).map((s) => s.id)).toEqual(["all", "demo-salary", "demo-fd", "demo-div", "demo-tax"]);
  });
});
