import { describe, expect, it } from "vitest";
import { epfFormsData } from "./epfFormsData";
import { HIS_ENTRIES } from "@/lib/aggregate/epf.fixture";
import type { EpfAccount, EpfRate } from "@/lib/sheets/types";

const account: EpfAccount = { id: "epf-1", name: "NetApp India", status: "Active" };

describe("epfFormsData on his passbooks", () => {
  const data = epfFormsData({ accounts: [account], entries: HIS_ENTRIES, rates: [] }, "2026-11-05");
  const a = data.accounts[0];
  it("offers the next credit: the month after the latest, on the usual day, for the same amounts", () => {
    // His latest wage month is Sep 2026 (credited 18 Oct): the next is Oct 2026, expected about the 18th of November, which hasn't come, so today.
    expect(a.next).toMatchObject({ wageMonth: "2026-10", date: "2026-11-05", employee: 19654, employer: 19654, pension: 0 });
  });
  it("lists each year with its rate, and only the years not yet credited can be set", () => {
    expect(a.years.map((y) => [y.financialYear, y.editable, y.source])).toEqual([
      ["2023-24", false, "Implied"],
      ["2024-25", false, "Implied"],
      ["2025-26", false, "Implied"],
      ["2026-27", true, "Assumed"],
    ]);
    expect(a.years[3].ratePercent).toBe(8.25);
    expect(a.years[3].entered).toBeUndefined();
  });
  it("starts the settings with the rate that was entered", () => {
    const rate: EpfRate = { id: "r1", epfAccountId: "epf-1", financialYear: "2026-27", ratePercent: 8.5, source: "Declared" };
    const years = epfFormsData({ accounts: [account], entries: HIS_ENTRIES, rates: [rate] }, "2026-11-05").accounts[0].years;
    expect(years[3]).toMatchObject({ ratePercent: 8.5, source: "Declared", entered: { ratePercent: 8.5, source: "Declared" } });
  });
  it("shows the balance today and the newest entry first", () => {
    expect(a.balance).toBe(476283 * 2);
    expect(data.entries[0].date >= data.entries[1].date).toBe(true);
  });
});

describe("the next credit is only offered once it can exist", () => {
  it("not while its wage month is still running", () => {
    // Oct 2026 wages are credited from 1 Nov. On 20 Nov the Nov wages can't be credited yet: nothing is offered.
    const withOct = [...HIS_ENTRIES, { id: "oct", epfAccountId: "epf-1", kind: "Contribution" as const, wageMonth: "2026-10", date: "2026-11-18", employee: 19654, employer: 19654, pension: 0, source: "Typed" as const }];
    expect(epfFormsData({ accounts: [account], entries: withOct, rates: [] }, "2026-11-20").accounts[0].next).toBeNull();
    expect(epfFormsData({ accounts: [account], entries: withOct, rates: [] }, "2026-12-02").accounts[0].next).toMatchObject({ wageMonth: "2026-11", date: "2026-12-02" });
  });
});

describe("a new account", () => {
  it("has nothing to prefill and only this year to set", () => {
    const a = epfFormsData({ accounts: [account], entries: [], rates: [] }, "2026-11-05").accounts[0];
    expect(a.next).toBeNull();
    expect(a.years).toEqual([{ financialYear: "2026-27", ratePercent: null, source: null, editable: true }]);
  });
});
