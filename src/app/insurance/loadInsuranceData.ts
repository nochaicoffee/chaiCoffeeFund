import { isDemoAllowed } from "@/lib/demo/cardsDemo";
import { demoInsuranceData, type DemoVariant } from "@/lib/demo/insuranceDemo";
import { getCachedLoansTab, getCachedPoliciesTab, getCachedPolicyPaymentsTab } from "@/lib/sheets/cached";
import type { SkippedRows } from "@/lib/sheets/rowReading";
import type { InsuranceData } from "./views";

const VARIANTS: DemoVariant[] = ["", "soon", "lapsed", "empty"];

/**
 * What the Insurance page reads. With `?demo` in development it's the sample data (`?demo=soon`, `lapsed` and `empty` show the
 * other states), which never reads from or writes to the Sheet; otherwise the Policies and PolicyPayments tabs and the loans,
 * for the check on a financed thing with no policy, read in parallel. `demo` is the variant's text, or null for real data.
 * `skipped` is the rows that failed validation.
 */
export async function loadInsuranceData(params: Record<string, string | string[] | undefined>, today: string): Promise<{ demo: string | null; data: InsuranceData; skipped: SkippedRows[] }> {
  if (isDemoAllowed() && params.demo !== undefined) {
    const asked = typeof params.demo === "string" ? params.demo : "";
    const variant = VARIANTS.find((v) => v === asked) ?? "";
    return { demo: variant, data: demoInsuranceData(today, variant), skipped: [] };
  }
  const [policies, payments, loans] = await Promise.all([getCachedPoliciesTab(), getCachedPolicyPaymentsTab(), getCachedLoansTab()]);
  return {
    demo: null,
    data: {
      policies: policies.records,
      payments: payments.records,
      loans: loans.records.map((l) => ({ id: l.id, name: l.name, lenderName: l.lenderName, category: l.category, status: l.status })),
    },
    skipped: [policies.skipped, payments.skipped, loans.skipped],
  };
}
