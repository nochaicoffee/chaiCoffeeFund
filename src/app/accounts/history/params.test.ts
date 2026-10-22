import { describe, expect, it } from "vitest";
import { historyHref, historyQuery, parseHistoryState } from "./params";

const today = "2026-10-22";
const accounts = [{ id: "a1" }, { id: "a2" }];
const parse = (params: Record<string, string>, demo = false) => parseHistoryState(params, accounts, today, demo);

describe("parseHistoryState", () => {
  it("opens on this year, every balance, newest first, page 1", () => {
    expect(parse({})).toEqual({ period: { kind: "year", year: 2026 }, status: "all", accountId: undefined, purpose: undefined, search: undefined, sort: "newest", page: 1, demo: false });
  });
  it("reads each filter", () => {
    const s = parse({ account: "a2", purpose: "Investment", status: "falls", q: " hdfc ", sort: "biggest", page: "3", period: "all" });
    expect(s).toMatchObject({ accountId: "a2", purpose: "Investment", status: "falls", search: "hdfc", sort: "biggest", page: 3, period: { kind: "all" } });
  });
  it("ignores an account, purpose, status, sort or page it doesn't know", () => {
    expect(parse({ account: "gone", purpose: "Fun", status: "x", sort: "sideways", page: "0" })).toMatchObject({ accountId: undefined, purpose: undefined, status: "all", sort: "newest", page: 1 });
  });
});

describe("historyQuery", () => {
  it("leaves out the defaults, and keeps demo as a bare word", () => {
    expect(historyQuery(parse({}), today)).toBe("?");
    expect(historyHref(parse({}), today)).toBe("/accounts/history");
    expect(historyHref(parse({}, true), today)).toBe("/accounts/history?demo");
  });
  it("round-trips a state", () => {
    const state = parse({ account: "a1", purpose: "Spending", status: "rises", q: "50,000", sort: "oldest", page: "2", period: "last-6m" });
    expect(parse(Object.fromEntries(new URLSearchParams(historyQuery(state, today)))).sort).toBe("oldest");
    expect(parseHistoryState(Object.fromEntries(new URLSearchParams(historyQuery(state, today))), accounts, today, false)).toEqual(state);
  });
});
