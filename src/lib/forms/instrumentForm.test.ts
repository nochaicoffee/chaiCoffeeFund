import { describe, expect, it } from "vitest";
import { readInstrumentForm, suggestTicker } from "./instrumentForm";

const existing = [{ symbol: "NTAP", market: "US" as const, name: "NetApp" }];
const good = { market: "IND", symbol: "niftybees", name: "Nippon Nifty BeES", assetType: "ETF", priceTicker: "niftybees.ns" };

describe("readInstrumentForm", () => {
  it("reads a holding, upper-casing its symbol and ticker", () => {
    expect(readInstrumentForm(good, existing)).toEqual({ ok: true, input: { symbol: "NIFTYBEES", market: "IND", name: "Nippon Nifty BeES", assetType: "ETF", priceTicker: "NIFTYBEES.NS" } });
  });

  it("takes a US share by its plain ticker, and a mutual fund by its scheme code", () => {
    expect(readInstrumentForm({ ...good, market: "US", priceTicker: "nvda", symbol: "NVDA", assetType: "Equity" }, existing).ok).toBe(true);
    expect(readInstrumentForm({ ...good, assetType: "Mutual-Fund", priceTicker: "122639" }, existing).ok).toBe(true);
  });

  it("asks for each field in plain words when they are blank", () => {
    const r = readInstrumentForm({}, existing);
    expect(r.ok === false && Object.keys(r.errors).sort()).toEqual(["assetType", "market", "name", "priceTicker", "symbol"]);
  });

  it("refuses a symbol he already has in the same market, but not in the other", () => {
    const dup = readInstrumentForm({ ...good, market: "US", symbol: "ntap", priceTicker: "NTAP" }, existing);
    expect(dup.ok === false && dup.errors.symbol).toMatch(/already have NTAP \(NetApp\)/);
    expect(readInstrumentForm({ ...good, symbol: "NTAP", priceTicker: "NTAP.NS" }, existing).ok).toBe(true);
  });

  it("refuses a scheme code for a US share, and an Indian share without .NS or .BO", () => {
    const us = readInstrumentForm({ ...good, market: "US", priceTicker: "122639" }, existing);
    expect(us.ok === false && us.errors.priceTicker).toMatch(/Indian mutual fund/);
    const ind = readInstrumentForm({ ...good, priceTicker: "NIFTYBEES" }, existing);
    expect(ind.ok === false && ind.errors.priceTicker).toMatch(/\.NS/);
  });

  it("refuses a scheme code for an Indian share or ETF, which would be priced as a fund", () => {
    const r = readInstrumentForm({ ...good, assetType: "Equity", priceTicker: "122639" }, existing);
    expect(r.ok === false && r.errors.priceTicker).toMatch(/prices a mutual fund/);
    expect(readInstrumentForm({ ...good, assetType: "Debt-Fund", priceTicker: "122639" }, existing).ok).toBe(true);
  });

  it("refuses spaces in a symbol or ticker", () => {
    const r = readInstrumentForm({ ...good, symbol: "NIFTY BEES", priceTicker: "NIFTY BEES.NS" }, existing);
    expect(r.ok === false && [r.errors.symbol, r.errors.priceTicker].every(Boolean)).toBe(true);
  });
});

describe("suggestTicker", () => {
  it("starts a US share from its symbol and an Indian one from symbol.NS, a fund from nothing", () => {
    expect(suggestTicker("US", "Equity", "nvda")).toBe("NVDA");
    expect(suggestTicker("IND", "ETF", "niftybees")).toBe("NIFTYBEES.NS");
    expect(suggestTicker("IND", "Mutual-Fund", "PPFAS")).toBe("");
    expect(suggestTicker(undefined, "Equity", "x")).toBe("");
    expect(suggestTicker("US", "Equity", "  ")).toBe("");
  });
});
