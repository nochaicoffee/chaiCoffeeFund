import { describe, expect, it } from "vitest";
import { instrumentConflict, instrumentProblem, snapshotConflict } from "./priceRules";
import type { Instrument, PriceSnapshot } from "./types";

const inst = (o: Partial<Instrument>): Instrument => ({ id: "i1", symbol: "NTAP", market: "US", name: "NetApp", assetType: "Equity", priceTicker: "NTAP", ...o });
const snap = (o: Partial<PriceSnapshot>): PriceSnapshot => ({ id: "s1", date: "2026-11-05", ticker: "NTAP", close: 170.9, currency: "USD", source: "Yahoo", ...o });

describe("instrumentConflict", () => {
  it("refuses a second instrument with the same symbol in the same market, whatever the case", () => {
    expect(instrumentConflict([inst({})], { symbol: "ntap", market: "US" })).toMatch(/already an instrument/);
  });

  it("allows the same symbol in the other market, and a different symbol", () => {
    expect(instrumentConflict([inst({})], { symbol: "NTAP", market: "IND" })).toBeNull();
    expect(instrumentConflict([inst({})], { symbol: "INTC", market: "US" })).toBeNull();
  });

  it("lets a row be edited without clashing with itself", () => {
    expect(instrumentConflict([inst({})], { symbol: "NTAP", market: "US" }, "i1")).toBeNull();
  });
});

describe("snapshotConflict", () => {
  it("refuses a second close for the same ticker and day", () => {
    expect(snapshotConflict([snap({})], { ticker: "NTAP", date: "2026-11-05" })).toMatch(/already has a close/);
  });

  it("allows another day, another ticker, and an edit of the row itself", () => {
    expect(snapshotConflict([snap({})], { ticker: "NTAP", date: "2026-11-04" })).toBeNull();
    expect(snapshotConflict([snap({})], { ticker: "INTC", date: "2026-11-05" })).toBeNull();
    expect(snapshotConflict([snap({})], { ticker: "NTAP", date: "2026-11-05" }, "s1")).toBeNull();
  });
});

describe("instrumentProblem", () => {
  it("accepts an upper-case symbol and a one-word ticker", () => {
    expect(instrumentProblem({ symbol: "NIFTYBEES", priceTicker: "NIFTYBEES.NS" })).toBeNull();
  });

  it("refuses a lower-case symbol, saying what to write", () => {
    expect(instrumentProblem({ symbol: "ntap", priceTicker: "NTAP" })).toMatch(/NTAP/);
  });

  it("refuses a ticker with a space in it", () => {
    expect(instrumentProblem({ symbol: "NTAP", priceTicker: "NT AP" })).toMatch(/one word/);
  });
});
