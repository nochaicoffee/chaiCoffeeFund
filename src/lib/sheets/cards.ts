import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import { CARD_COLORS, type Card } from "./types";

export const createCardSchema = z.object({
  name: nonEmptyString,
  alias: nonEmptyString,
  issuer: nonEmptyString,
  creditLimit: nonNegativeNumber,
  statementAnchorDate: isoDate,
  dueAnchorDate: isoDate,
  status: z.enum(["Active", "Inactive", "Closed"]),
  statementPdfPassword: nonEmptyString.optional(),
  emailMatchKeywords: nonEmptyString.optional(),
  last4: z.string().regex(/^\d{4}$/, "Enter the last 4 digits of the card number"),
  color: z.enum(CARD_COLORS),
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
  columns: [
    "id",
    "name",
    "alias",
    "issuer",
    "creditLimit",
    "statementAnchorDate",
    "dueAnchorDate",
    "status",
    "statementPdfPassword",
    "emailMatchKeywords",
    "last4",
    "color",
  ],
  dateColumns: ["statementAnchorDate", "dueAnchorDate"],
  schema: cardRowSchema,
});
