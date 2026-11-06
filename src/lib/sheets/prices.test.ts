import { describe, expect, it } from "vitest";
import { columnSpecs } from "./tableColumns";
import { INSTRUMENT_COLUMNS, createInstrumentSchema, instrumentRowSchema, updateInstrumentSchema } from "./instruments";
import { PRICE_SNAPSHOT_COLUMNS, createPriceSnapshotSchema, priceSnapshotRowSchema } from "./priceSnapshots";

const instrument = { symbol: "NTAP", market: "US", name: "NetApp", assetType: "Equity", priceTicker: "NTAP" };
const snapshot = { date: "2026-11-05", ticker: "NTAP", close: 170.92, currency: "USD", source: "Yahoo" };

describe("createInstrumentSchema", () => {
  it("accepts an instrument, with or without a colour", () => {
    expect(createInstrumentSchema.safeParse(instrument).success).toBe(true);
    expect(createInstrumentSchema.safeParse({ ...instrument, color: "Teal" }).success).toBe(true);
  });

  it.each([
    ["a market that isn't IND or US", { ...instrument, market: "UK" }],
    ["an asset type that isn't in the list", { ...instrument, assetType: "Bond" }],
    ["a colour that isn't in the palette", { ...instrument, color: "Puce" }],
    ["no name", { ...instrument, name: "" }],
  ])("refuses %s", (_name, input) => {
    expect(createInstrumentSchema.safeParse(input).success).toBe(false);
  });

  it("lets an update clear the colour with an empty string", () => {
    expect(updateInstrumentSchema.safeParse({ color: "" }).success).toBe(true);
  });

  it("reads a stored row only with an id, and its columns line up with the tab", () => {
    expect(instrumentRowSchema.safeParse(instrument).success).toBe(false);
    expect(instrumentRowSchema.safeParse({ ...instrument, id: "i1" }).success).toBe(true);
    expect(columnSpecs(INSTRUMENT_COLUMNS as string[], instrumentRowSchema).map((c) => c.name)).toEqual(INSTRUMENT_COLUMNS);
  });
});

describe("createPriceSnapshotSchema", () => {
  it("accepts a close", () => {
    expect(createPriceSnapshotSchema.safeParse(snapshot).success).toBe(true);
  });

  it.each([
    ["a close of zero", { ...snapshot, close: 0 }],
    ["a negative close", { ...snapshot, close: -1 }],
    ["a date that isn't an ISO day", { ...snapshot, date: "5/11/2026" }],
    ["a currency that isn't INR or USD", { ...snapshot, currency: "EUR" }],
    ["a source that isn't one of the three", { ...snapshot, source: "Google" }],
  ])("refuses %s", (_name, input) => {
    expect(createPriceSnapshotSchema.safeParse(input).success).toBe(false);
  });

  it("types the date as a date and the close as a number in the tab", () => {
    const types = Object.fromEntries(columnSpecs(PRICE_SNAPSHOT_COLUMNS as string[], priceSnapshotRowSchema).map((c) => [c.name, c.type]));
    expect(types.date).toBe("DATE");
    expect(types.close).toBe("DOUBLE");
  });
});
