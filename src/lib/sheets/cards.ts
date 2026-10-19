import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { nonEmptyString, nonNegativeNumber } from "./validation";
import { CARD_COLORS, CARD_ISSUERS, CARD_TYPES, type Card } from "./types";

export const createCardSchema = z.object({
  name: nonEmptyString,
  alias: nonEmptyString,
  issuer: z.enum(CARD_ISSUERS),
  cardType: z.enum(CARD_TYPES),
  creditLimit: nonNegativeNumber,
  statementDay: z.number().int().min(1).max(31),
  dueDayBuffer: z.number().int().min(1).max(60),
  status: z.enum(["Active", "Inactive", "Closed"]),
  statementPdfPassword: nonEmptyString.optional(),
  emailMatchKeywords: nonEmptyString.optional(),
  last4: z.string().regex(/^\d{4}$/, "Enter the last 4 digits of the card number"),
  color: z.enum(CARD_COLORS),
  defaultPaidFromAccountId: nonEmptyString.optional(),
});

export const updateCardSchema = createCardSchema.partial();

/**
 * A row as read back from the Sheet: a valid create, plus its id. Last 4 and
 * colour may be blank on rows added before those columns existed (see Card).
 */
export const cardRowSchema = createCardSchema.extend({
  id: nonEmptyString,
  last4: createCardSchema.shape.last4.optional(),
  color: createCardSchema.shape.color.optional(),
});

export const cardsRepository = createRepository<Card>({
  sheetName: "Cards",
  // The Cards tab's column order, verified against the real Sheet (#75).
  columns: [
    "id",
    "name",
    "alias",
    "issuer",
    "cardType",
    "creditLimit",
    "statementDay",
    "dueDayBuffer",
    "status",
    "statementPdfPassword",
    "emailMatchKeywords",
    "last4",
    "color",
    "defaultPaidFromAccountId",
  ],
  schema: cardRowSchema,
});
