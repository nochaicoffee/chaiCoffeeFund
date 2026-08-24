import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { SubscriptionPayment } from "./types";

export const subscriptionPaymentsRepository = createRepository<SubscriptionPayment>({
  sheetName: "SubscriptionPayments",
  columns: ["id", "subscriptionId", "paymentDate", "amount", "status", "paidFromAccountId", "paidFromCardId"],
  dateColumns: ["paymentDate"],
});

export const createSubscriptionPaymentSchema = z.object({
  subscriptionId: nonEmptyString,
  paymentDate: isoDate,
  amount: nonNegativeNumber,
  status: z.enum(["Pending", "Paid"]),
  paidFromAccountId: nonEmptyString.optional(),
  paidFromCardId: nonEmptyString.optional(),
});

export const updateSubscriptionPaymentSchema = createSubscriptionPaymentSchema.partial();
