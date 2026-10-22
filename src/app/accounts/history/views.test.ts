import { describe, expect, it } from "vitest";
import { demoAccountsData } from "@/lib/demo/accountsDemo";
import { parseHistoryState } from "./params";
import { historyPageView } from "./views";

const today = "2026-10-22";
const data = demoAccountsData(today);
const view = (params: Record<string, string> = {}, d = data) => historyPageView(d, parseHistoryState(params, d.accounts, today, false), today);

describe("historyPageView", () => {
  const v = view();
  it("says how many were recorded, and the tiles agree with the filters' counts", () => {
    const all = v.statuses.find((s) => s.value === "all")!.count;
    expect(v.tiles[0].value).toBe(String(all));
    expect(v.lede.find((p) => p.strong)?.text).toBe(`${all} this year`);
    const [r, f] = [v.statuses[1].count, v.statuses[2].count];
    expect(v.tiles[0].caption[0].text).toContain(`${r} up · ${f} down`);
  });
  it("lists a page of rows, newest month first, with a month's figures for the whole month", () => {
    expect(v.page.total).toBeGreaterThan(12);
    expect(v.groups.flatMap((g) => g.rows)).toHaveLength(12);
    expect(v.groups[0].title).toBe("October 2026");
    expect(v.groups[0].note).toMatch(/^\d+ balances · net /);
  });
  it("flags the stale account and its last read date", () => {
    expect(v.tiles[2]).toMatchObject({ label: "Not read lately", value: "1", warning: true });
    expect(v.tiles[2].caption[0].text).toBe("SBI Rainy Day");
  });
  it("narrows to one account, with the sentence naming it", () => {
    const one = view({ account: "demo-hdfc" });
    expect(one.groups.flatMap((g) => g.rows).every((r) => r.accountId === "demo-hdfc")).toBe(true);
    expect(one.lede.map((p) => p.text).join("")).toContain("for HDFC Salary");
  });
  it("looks for stale accounts only among the ones chosen", () => {
    expect(view({ account: "demo-hdfc" }).tiles[2]).toMatchObject({ value: "0", caption: [{ text: "Every balance is up to date" }] });
    expect(view({ account: "demo-sbi" }).tiles[2].value).toBe("1");
  });
  it("marks first and closing balances", () => {
    const rows = view({ period: "all", sort: "oldest" }).groups.flatMap((g) => g.rows);
    expect(rows.find((r) => r.accountId === "demo-yes" && r.pill)?.pill).toBe("First balance");
    expect(view({ period: "all", account: "demo-yes", status: "first" }).groups.flatMap((g) => g.rows).map((r) => r.pill).sort()).toEqual(["Closing balance", "First balance"]);
  });
  it("has one ungrouped list for the biggest moves, largest first", () => {
    const big = view({ sort: "biggest" });
    expect(big.groups).toHaveLength(1);
    expect(big.groups[0].title).toBe("Biggest moves first");
  });
  it("explains an empty list in the right words, with the right way out", () => {
    expect(view({ q: "zzzz" }).empty).toMatchObject({ title: "No balances match", action: "clear-filters" });
    expect(view({ period: "2019" }).empty).toMatchObject({ action: "show-all-time" });
    expect(view({}, { ...data, snapshots: [] }).empty).toMatchObject({ title: "No balances recorded yet", action: "update-balances" });
    expect(view({}, { ...data, accounts: [], snapshots: [] }).empty?.action).toBe("go-accounts");
    expect(v.empty).toBeNull();
  });
  it("clamps a page past the end to the last one", () => {
    const last = view({ page: "99" });
    expect(last.page.page).toBe(last.page.pages);
    expect(last.groups.length).toBeGreaterThan(0);
  });
});
