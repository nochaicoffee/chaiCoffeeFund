import type { CardData, SpendPeriod } from "@/lib/aggregate/cardSpend";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `?period=all` or `?period=2025`; anything else (or nothing) is this year. */
export function parsePeriod(params: SearchParams, today: string): SpendPeriod {
  const value = first(params.period);
  if (value === "all") return { kind: "all" };
  if (value && /^\d{4}$/.test(value)) return { kind: "year", year: Number(value) };
  return { kind: "year", year: Number(today.slice(0, 4)) };
}

/** `?card=<id>` when it names a real card; otherwise undefined, meaning All Cards. */
export function parseSelectedCard(params: SearchParams, data: CardData): string | undefined {
  const value = first(params.card);
  return value && data.cards.some((c) => c.id === value) ? value : undefined;
}

/** The query string for a Cards page link, keeping the other choices (period, sample data). */
export function cardsQuery(current: { period: SpendPeriod; cardId?: string; demo: boolean }, today: string): string {
  const query = new URLSearchParams();
  if (current.cardId) query.set("card", current.cardId);
  if (current.period.kind === "all") query.set("period", "all");
  else if (current.period.year !== Number(today.slice(0, 4))) query.set("period", String(current.period.year));
  if (current.demo) query.set("demo", "");
  const text = query.toString().replace(/demo=(&|$)/, "demo$1");
  return text ? `?${text}` : "?";
}

/** The years the period menu offers: every year with statements, plus the one being shown, newest first. */
export function periodYears(yearsWithStatements: number[], period: SpendPeriod): number[] {
  const years = new Set(yearsWithStatements);
  if (period.kind === "year") years.add(period.year);
  return [...years].sort((a, b) => b - a);
}
