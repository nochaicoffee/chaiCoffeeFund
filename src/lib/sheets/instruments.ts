import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearableToUnset, nonEmptyString } from "./validation";
import { COLORS, INVESTMENT_ASSET_TYPES, type Instrument } from "./types";

/** An instrument: what a holding is and where its price comes from (ADR 0013). */
const instrumentFields = z.object({
  symbol: nonEmptyString,
  market: z.enum(["IND", "US"]),
  name: nonEmptyString,
  assetType: z.enum(INVESTMENT_ASSET_TYPES),
  /** Yahoo's ticker, or a mutual fund's all-digit AMFI scheme code. */
  priceTicker: nonEmptyString,
  color: z.enum(COLORS).optional(),
});

export const createInstrumentSchema = instrumentFields;

/** A partial update, merged over the stored row. "" clears the colour. */
export const updateInstrumentSchema = instrumentFields.partial().extend({
  color: clearableToUnset(z.enum(COLORS)).optional(),
});

/** A row as read back from the Sheet: a valid create, plus its id. */
export const instrumentRowSchema = instrumentFields.extend({ id: nonEmptyString });

/** The Instruments tab's columns, in order. */
export const INSTRUMENT_COLUMNS: (keyof Instrument)[] = ["id", "symbol", "market", "name", "assetType", "priceTicker", "color"];

export const instrumentsRepository = createRepository<Instrument>({
  sheetName: "Instruments",
  columns: INSTRUMENT_COLUMNS,
  schema: instrumentRowSchema,
});
