import { cardColorKey } from "@/lib/format/colors";
import { isDemoAllowed } from "@/lib/demo/cardsDemo";
import { DEMO_VARIANTS, demoInsuranceData } from "@/lib/demo/insuranceDemo";
import { getCachedAccounts, getCachedCards, getCachedLoansTab, getCachedPoliciesTab, getCachedPolicyPaymentsTab } from "@/lib/sheets/cached";
import type { SkippedRows } from "@/lib/sheets/rowReading";
import type { InsuranceData } from "./views";

/**
 * What the Insurance page reads. With `?demo` in development it's the sample data (`?demo=soon` and the other states are listed in insuranceDemo.ts), which never reads from or writes to the Sheet; otherwise the Policies and PolicyPayments tabs and the loans
 * (for the check on a financed thing with no policy), accounts and cards (for where a premium was paid from) read in parallel. `demo` is the variant's text, or null for real data.
 * `skipped` is the rows that failed validation.
 */
export async function loadInsuranceData(params: Record<string, string | string[] | undefined>, today: string): Promise<{ demo: string | null; data: InsuranceData; skipped: SkippedRows[] }> {
  if (isDemoAllowed() && params.demo !== undefined) {
    const asked = typeof params.demo === "string" ? params.demo : "";
    const variant = DEMO_VARIANTS.find((v) => v === asked) ?? "";
    return { demo: variant, data: demoInsuranceData(today, variant), skipped: [] };
  }
  const [policies, payments, loans, accounts, cards] = await Promise.all([getCachedPoliciesTab(), getCachedPolicyPaymentsTab(), getCachedLoansTab(), getCachedAccounts(), getCachedCards()]);
  return {
    demo: null,
    data: {
      policies: policies.records,
      payments: payments.records,
      loans: loans.records.map((l) => ({ id: l.id, name: l.name, lenderName: l.lenderName, category: l.category, status: l.status })),
      accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
      cards: cards.map((c) => ({ id: c.id, name: c.alias || c.name, color: cardColorKey(c.color) })),
    },
    skipped: [policies.skipped, payments.skipped, loans.skipped],
  };
}
