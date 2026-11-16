import type { MonthKey, SpendPeriod } from "@/lib/aggregate/cardSpend";
import type { PartKey } from "@/lib/aggregate/expenses";
import { paidPhrase, periodLabel, periodPhrase } from "@/lib/aggregate/period";
import { goalsAddedIn, premiumsPaidIn, subscriptionsPaidIn } from "@/lib/aggregate/rangeSums";
import { PART_KEYS } from "@/lib/aggregate/expenses";
import { PART_NAMES } from "@/app/expenses/views";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import type { MonthlyView } from "./monthlyView";
import type { OverviewModel } from "./model";
import type { TileKey } from "./views";

/**
 * What the page says about the period it follows (docs/design/overview.md, MzB): the greeting reads over it, net worth shows it, and every tile
 * gains a line for what happened inside it. Everything is worked out once here from the model and the Month by month figures, so the widget,
 * the greeting and the tiles can't disagree. Only Due this month and the foot of the page stay on now: they look forward.
 */
export interface RangeFigures {
  period: SpendPeriod;
  /** "this year", "2025", "last 6 months", "all time". */
  label: string;
  /** For the greeting: "so far in 2026", "in 2025", "in the last 6 months". */
  phrase: string;
  /** For a tile's line: "this year", "in 2025", "in the last 6 months", "so far". */
  when: string;
  includesToday: boolean;
  months: ReadonlySet<MonthKey>;
  cameIn: number;
  invested: number;
  emis: number;
  cards: number;
  /** Spent in all, over the months that have ended; null when none has ended yet. */
  spent: number | null;
  /** How many months that is over. */
  spentMonths: number;
  /** The last month spent covers, when the period includes the month in progress (which has no spent figure); null when it covers the whole period. */
  spentThrough: MonthKey | null;
  spentParts: Record<PartKey, number>;
  incomeAverage: number;
  spentAverage: number | null;
  subsPaid: number;
  goalsAdded: number;
  premiums: number;
}

export function rangeFigures(m: OverviewModel, monthly: MonthlyView, period: SpendPeriod, today: string): RangeFigures {
  const months = m.range?.months ?? [];
  const set = new Set(months);
  const measure = (key: string) => monthly.measures.find((x) => x.meta.key === key)!.summary;
  const spent = monthly.spent.months > 0 ? monthly.spent.total : null;
  const current = today.slice(0, 7);
  const ended = [...set].filter((month) => month < current).sort();
  return {
    period,
    label: periodLabel(period, today),
    phrase: periodPhrase(period, today, months[0]),
    when: paidPhrase(period, today),
    includesToday: m.range?.includesToday ?? true,
    months: set,
    cameIn: measure("income").total,
    invested: measure("invested").total,
    emis: measure("emis").total,
    cards: measure("cards").total,
    spent,
    spentMonths: monthly.spent.months,
    spentThrough: set.has(current) && ended.length > 0 ? ended[ended.length - 1] : null,
    spentParts: monthly.spent.parts,
    incomeAverage: measure("income").average,
    spentAverage: spent === null ? null : spent / monthly.spent.months,
    subsPaid: subscriptionsPaidIn(m.data.subscriptionPayments, set),
    goalsAdded: goalsAddedIn(m.data.goals.contributions, set),
    premiums: m.data.insurance.failed ? 0 : premiumsPaidIn(m.data.insurance.payments, set),
  };
}

/** What a tile says over the period, over what it says now: any of its headline, the small unit after it, its tag and its line. */
export interface TileRange {
  value?: string;
  per?: string;
  tag?: string;
  sub?: string;
  /** The hover card, when the tile's own describes a month or a rate rather than the period. */
  card?: { title: string; total: string; detail?: string; rows: { name: string; amount: string }[]; foot?: string };
}

/** What came in over the period, by source, largest first. */
export function incomeBySource(m: OverviewModel, r: Pick<RangeFigures, "months">): { id: string; name: string; amount: number }[] {
  const total = new Map<string, number>();
  for (const e of m.data.incomeEntries) if (e.status === "Received" && e.receivedDate && r.months.has(e.receivedDate.slice(0, 7))) total.set(e.incomeSourceId, (total.get(e.incomeSourceId) ?? 0) + e.amount);
  const names = new Map(m.data.incomeSources.map((s) => [s.id, s.alias || s.name]));
  return [...total].sort((a, b) => b[1] - a[1]).map(([id, amount]) => ({ id, name: names.get(id) ?? "Income", amount }));
}

/** What is owed, as a tile shows it: "−₹7.5L", or "₹0" when nothing is. */
const owed = (n: number) => (n === 0 ? "₹0" : `−${formatInrCompact(n)}`);
const upDown = (amount: number, when: string) => `${amount >= 0 ? "up" : "down"} ${formatInrCompact(Math.abs(amount))} ${when}`;

/**
 * Each tile over the period. A balance keeps its headline (what it is now, or at the end of a period that is over) and says how it moved; a
 * flow becomes the period's total. A tile with nothing to say over the period (no month to compare, nothing worked out) is left as it is.
 */
export function tileRanges(m: OverviewModel, r: RangeFigures): Partial<Record<TileKey, TileRange>> {
  const start = m.series.length >= 2 ? m.series[0] : null;
  const end = m.series.length >= 2 ? m.series[m.series.length - 1] : null;
  const out: Partial<Record<TileKey, TileRange>> = {};
  // Past the end of a period that's over, a balance is what it was then.
  const past = (value: string) => (r.includesToday ? {} : { value });

  if (start && end) {
    out.accounts = { ...past(formatInrCompact(end.bank)), sub: upDown(end.bank - start.bank, r.when) };
    if (start.investments !== null && end.investments !== null) out.invest = { ...past(formatInrCompact(end.investments)), sub: upDown(end.investments - start.investments, r.when) };
    out.fixed = { ...past(formatInrCompact(end.fixedIncome)), sub: upDown(end.fixedIncome - start.fixedIncome, r.when) };
    out.lent = { ...past(formatInrCompact(end.lentOut)), sub: upDown(end.lentOut - start.lentOut, r.when) };
  }
  if (end) {
    out.cards = { ...past(owed(end.cards)), sub: `${formatInrCompact(r.cards)} paid in bills ${r.when}` };
    out.loans = { ...past(owed(end.loanTotal)), sub: `${formatInrCompact(r.emis)} in EMIs ${r.when}` };
  }
  out.income = {
    value: formatInrCompact(r.cameIn),
    per: "",
    tag: r.label,
    sub: `avg ${formatInrCompact(r.incomeAverage)} a month`,
    card: { title: "Income", total: formatInr(r.cameIn), detail: `${r.when}, an average of ${formatInr(r.incomeAverage)} a month`, rows: incomeBySource(m, r).slice(0, 6).map((x) => ({ name: x.name, amount: formatInr(x.amount) })), foot: "Income received in the period, by source." },
  };
  out.subs = { sub: `${formatInrCompact(r.subsPaid)} paid ${r.when}` };
  out.goals = { sub: `${formatInrCompact(Math.abs(r.goalsAdded))} ${r.goalsAdded < 0 ? "taken back" : "added"} ${r.when}` };
  out.ins = { sub: `${formatInrCompact(r.premiums)} in premiums ${r.when}` };
  if (r.spent !== null && r.spentAverage !== null) {
    out.spent = {
      value: formatInrCompact(r.spent),
      tag: r.label,
      sub: `avg ${formatInrCompact(r.spentAverage)} a month`,
      card: { title: `Spent ${r.when}`, total: formatInr(r.spent), detail: `over the ${r.spentMonths} ${r.spentMonths === 1 ? "month" : "months"} that ${r.spentMonths === 1 ? "has" : "have"} ended`, rows: PART_KEYS.filter((k) => r.spentParts[k] !== 0).map((k) => ({ name: PART_NAMES[k], amount: formatInr(r.spentParts[k]) })), foot: "Worked out from your accounts: what came in, less what was invested, lent and kept." },
    };
  }
  return out;
}
