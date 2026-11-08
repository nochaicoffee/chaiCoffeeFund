import type { ExpenseFormsData } from "@/components/expenses/forms/BigSpendDialog";
import type { ExpenseData } from "@/lib/aggregate/expenses";
import { cardColorKey } from "@/lib/format/colors";

/** What the Big spend form offers: the active accounts and cards, plus any one a big spend still names, marked as no longer active. */
export function expenseFormsData(data: ExpenseData, today: string): ExpenseFormsData {
  const used = new Set(data.bigSpends.flatMap((s) => [s.paidFromAccountId, s.paidFromCardId].filter(Boolean)));
  return {
    today,
    spends: data.bigSpends,
    accounts: data.accounts.filter((a) => a.status === "Active" || used.has(a.id)).map((a) => ({ id: a.id, name: a.name, inactive: a.status !== "Active" || undefined })),
    cards: data.cards.filter((c) => c.status === "Active" || used.has(c.id)).map((c) => ({ id: c.id, name: c.alias || c.name, color: cardColorKey(c.color), inactive: c.status !== "Active" || undefined })),
  };
}
