import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { Card } from "./types";

export const cardsRepository = createRepository<Card>({
  sheetName: "Cards",
  columns: ["id", "name", "alias", "issuer", "creditLimit", "statementAnchorDate", "dueAnchorDate", "status"],
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
});

export const updateCardSchema = createCardSchema.partial();
