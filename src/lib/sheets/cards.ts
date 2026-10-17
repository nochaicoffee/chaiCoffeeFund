import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import { CARD_COLORS, type Card } from "./types";

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
});

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
