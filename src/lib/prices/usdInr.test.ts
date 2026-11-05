import { describe, expect, it } from "vitest";
import { parseUsdInr } from "./usdInr";

describe("parseUsdInr", () => {
  it("reads Frankfurter's latest rate and its date", () => {
    expect(parseUsdInr({ amount: 1, base: "USD", date: "2026-11-04", rates: { INR: 94.64 } })).toEqual({ ok: true, rate: 94.64, date: "2026-11-04" });
  });

  it.each([
    ["no rates", { date: "2026-11-04" }],
    ["no INR rate", { date: "2026-11-04", rates: { EUR: 0.9 } }],
    ["a zero rate", { date: "2026-11-04", rates: { INR: 0 } }],
    ["a negative rate", { date: "2026-11-04", rates: { INR: -90 } }],
    ["a rate sent as text", { date: "2026-11-04", rates: { INR: "94.64" } }],
    ["a rate that isn't finite", { date: "2026-11-04", rates: { INR: Number.POSITIVE_INFINITY } }],
    ["no date", { rates: { INR: 94.64 } }],
    ["a date that isn't a day", { date: "yesterday", rates: { INR: 94.64 } }],
  ])("fails on %s", (_name, body) => {
    expect(parseUsdInr(body).ok).toBe(false);
  });

  it.each([[null], ["94.64"], [42], [undefined]])("fails on a body that isn't an object (%s)", (body) => {
    expect(parseUsdInr(body).ok).toBe(false);
  });

  it("gives a reason a person can read when it fails", () => {
    const failed = parseUsdInr({ date: "2026-11-04", rates: {} });
    expect(failed.ok === false && failed.reason).toMatch(/no USD to INR rate/);
  });
});
