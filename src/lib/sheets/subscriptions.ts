import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { Subscription } from "./types";

export const subscriptionsRepository = createRepository<Subscription>({
  sheetName: "Subscriptions",
  columns: ["id", "name", "alias", "category", "amount", "billingCycle", "billingAnchorDate", "startDate", "status"],
  dateColumns: ["billingAnchorDate", "startDate"],
});

export const createSubscriptionSchema = z.object({
  name: nonEmptyString,
  alias: nonEmptyString,
  category: nonEmptyString,
  amount: nonNegativeNumber,
  billingCycle: z.enum(["Monthly", "Quarterly", "Yearly"]),
  billingAnchorDate: isoDate,
  startDate: isoDate,
  status: z.enum(["Active", "Paused"]),
});

export const updateSubscriptionSchema = createSubscriptionSchema.partial();
