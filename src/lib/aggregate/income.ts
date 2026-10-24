import type { CardColor, IncomeFrequency, IncomeSource } from "../sheets/types";

const FREQUENCY_STEP_MONTHS: Record<IncomeFrequency, number> = {
  Monthly: 1,
  Quarterly: 3,
  Yearly: 12,
  // A one-time source doesn't recur, so it contributes nothing to an
  // ongoing monthly figure — it only shows up once in the entries log.
  "One-Time": 0,
};

/** Normalizes a recurring income source's expected amount to a monthly figure. Zero for One-Time sources. */
export function monthlyEquivalentIncome(source: IncomeSource): number {
  const step = FREQUENCY_STEP_MONTHS[source.frequency];
  return step === 0 ? 0 : source.expectedAmount / step;
}

/** Total monthly-equivalent income across active sources. */
export function totalMonthlyEquivalentIncome(sources: IncomeSource[]): number {
  return sources.filter((s) => s.status === "Active").reduce((sum, s) => sum + monthlyEquivalentIncome(s), 0);
}

/** A source's colour when it has none of its own: its category's. */
export const CATEGORY_COLORS: Record<IncomeSource["category"], CardColor> = { Salary: "Sapphire", Investment: "Teal", Other: "Ruby" };

export function sourceColor(source: Pick<IncomeSource, "color" | "category">): CardColor {
  return source.color ?? CATEGORY_COLORS[source.category];
}
