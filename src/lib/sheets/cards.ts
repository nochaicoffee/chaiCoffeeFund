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
  // Optional: the statement import fills it in from the PDF (#78).
  last4: z.string().regex(/^\d{4}$/, "Enter the last 4 digits of the card number").optional(),
  color: z.enum(CARD_COLORS),
  defaultPaidFromAccountId: nonEmptyString.optional(),
});

export const updateCardSchema = createCardSchema.partial();

/**
 * A row as read back from the Sheet: a valid create, plus its id. The colour
 * may be blank on rows added before that column existed (see Card).
 */
export const cardRowSchema = createCardSchema.extend({
  id: nonEmptyString,
  color: createCardSchema.shape.color.optional(),
});

/** The Cards tab's column order, verified against the real Sheet (#75). */
export const CARD_COLUMNS: (keyof Card)[] = [
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
];

export const cardsRepository = createRepository<Card>({
  sheetName: "Cards",
  columns: CARD_COLUMNS,
  schema: cardRowSchema,
});
