import { financialYearOf } from "@/lib/aggregate/epf";
import { daysBetween } from "@/lib/aggregate/cardSpend";
import { expectedAtMaturity, type FixedIncome, type FixedIncomeInput } from "@/lib/aggregate/fixedIncome";
import { comingUp, creditTiming, creditYears, growthPath, moneyInByMonth, moneyInStats, passbookChecks, type MonthMoney } from "@/lib/aggregate/fixedIncomeWidgets";
import { tenureBetween } from "@/lib/aggregate/fixedDeposits";
import { formatDate, formatMonthShort, MONTH_NAMES } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { formatLakh, ordinal } from "./views";

/**
 * What the Fixed Income page's widgets show (docs/design/fixed-income.md, J1), as plain, already-formatted data. The numbers come
 * from lib/aggregate/fixedIncomeWidgets.ts and fixedIncome.ts. A widget with nothing to say is null, and the page leaves it out.
 */

const rupees = (n: number) => formatInr(Math.round(n));
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const monthName = (month: string) => MONTH_NAMES[Number(month.slice(5, 7)) - 1];

/** How far away a day is, as a person says it: "in 13 days", "in 5 months", "in 1.9 years". */
export function inPhrase(date: string, today: string): string {
  const days = daysBetween(today, date);
  if (days <= 0) return "today";
  if (days < 60) return `in ${plural(days, "day", "days")}`;
  const months = Math.round(days / 30.4);
  return months < 23 ? `in ${plural(months, "month", "months")}` : `in ${(days / 365).toFixed(1)} years`;
}

// ---------- Money in each month ----------
export interface MoneyCell {
  month: string;
  /** "25k", or "" for a month with nothing. */
  label: string;
  /** 0 nothing, 1 to 3 darker with more. */
  tier: 0 | 1 | 2 | 3;
  /** A deposit was placed. */
  dot: boolean;
  /** This month, which isn't over. */
  now: boolean;
  /** A month that hasn't come, or is before the first money. */
  blank: boolean;
  title: string;
}
export interface MoneyInView {
  years: { year: string; cells: MoneyCell[] }[];
  legend: { tier: 1 | 2 | 3; text: string }[];
  stats: { label: string; value: string; note: string }[];
}

export function moneyInView(input: Pick<FixedIncomeInput, "epfEntries" | "deposits">, today: string): MoneyInView | null {
  const months = moneyInByMonth(input.epfEntries, input.deposits, today);
  if (months.length === 0) return null;
  const top = Math.max(...months.map((m) => m.total), 1);
  const byMonth = new Map(months.map((m) => [m.month, m]));
  const t1 = Math.round((top * 0.45) / 1000) * 1000;
  const t2 = Math.round((top * 0.8) / 1000) * 1000;
  const tier = (total: number): 0 | 1 | 2 | 3 => (total <= 0 ? 0 : total < t1 ? 1 : total < t2 ? 2 : 3);
  const firstYear = Number(months[0].month.slice(0, 4));
  const years = [];
  for (let y = firstYear; y <= Number(today.slice(0, 4)); y++) {
    const cells: MoneyCell[] = Array.from({ length: 12 }, (_, i) => {
      const month = `${y}-${String(i + 1).padStart(2, "0")}`;
      const m: MonthMoney | undefined = byMonth.get(month);
      const label = m && m.total > 0 ? (m.total < 1000 ? formatInr(m.total) : `${Math.round(m.total / 1000)}k`) : "";
      return {
        month,
        label,
        tier: m ? tier(m.total) : 0,
        dot: (m?.depositCount ?? 0) > 0,
        now: month === today.slice(0, 7),
        blank: !m,
        title: m ? `${formatMonthShort(month)} ${y}: ${m.total > 0 ? rupees(m.total) : "nothing"}${m.epf ? `, EPF ${rupees(m.epf)}` : ""}${m.deposits ? `, ${plural(m.depositCount, "deposit", "deposits")} ${rupees(m.deposits)}` : ""}` : "",
      };
    });
    years.push({ year: String(y), cells });
  }
  const s = moneyInStats(months, today);
  const stats = [];
  if (s.perMonth) stats.push({ label: "A month, this year", value: rupees(s.perMonth.amount), note: `EPF${input.deposits.length ? " plus deposits" : ""}, ${formatMonthShort(s.perMonth.from)} to ${formatMonthShort(s.perMonth.to)} ${s.perMonth.to.slice(0, 4)}` });
  if (s.depositMonths) {
    const without = s.depositMonths.without.map((m) => formatMonthShort(m));
    stats.push({ label: "A deposit in", value: `${s.depositMonths.count} of ${plural(s.depositMonths.of, "month", "months")}`, note: `since ${monthName(s.depositMonths.since)}${without.length ? `; none in ${without.join(" or ")} so far` : ""}` });
  }
  if (s.biggest) stats.push({ label: "Biggest month", value: rupees(s.biggest.total), note: `${formatMonthShort(s.biggest.month)} ${s.biggest.month.slice(0, 4)}: ${[s.biggest.epf ? "the credit" : "", s.biggest.deposits ? (s.biggest.depositCount === 1 ? `the ${formatInr(s.biggest.deposits)} deposit` : `${plural(s.biggest.depositCount, "deposit", "deposits")}`) : ""].filter(Boolean).join(" and ")}` });
  return {
    years,
    legend: [
      { tier: 1, text: `under ${formatInrCompact(t1)}` },
      { tier: 2, text: `${formatInrCompact(t1)}–${formatInrCompact(t2)}` },
      { tier: 3, text: `${formatInrCompact(t2)}+` },
    ],
    stats,
  };
}

// ---------- Credits on time ----------
export interface CreditDotView {
  wageMonth: string;
  /** The days, "26", or "?" for the next one due, "!" for a late one, "" for a month to come or before the first. */
  label: string;
  tone: "ok" | "warn" | "late" | "due" | "none";
  typed: boolean;
  title: string;
}
export interface CreditsView {
  rows: { label: string; dots: CreditDotView[] }[];
  note: string | null;
  checks: { label: string; equation: string; status: "adds up" | "typed" | "so far"; detail: string }[];
}

export function creditsView(input: Pick<FixedIncomeInput, "epfEntries">, confirmedThrough: string | null, today: string): CreditsView | null {
  const years = creditYears(input.epfEntries, confirmedThrough, today);
  if (years.length === 0) return null;
  let dueMarked = false;
  const rows = years.map((y) => ({
    label: `FY ${y.financialYear.slice(2, 4)}-${y.financialYear.slice(5)}`,
    dots: y.dots.map<CreditDotView>((d) => {
      const name = `${formatMonthShort(d.wageMonth)} ${d.wageMonth.slice(0, 4)}`;
      if (d.lagDays !== null) {
        const tone = d.lagDays <= 2 ? "ok" : d.lagDays <= 20 ? "warn" : "late";
        return { wageMonth: d.wageMonth, label: String(d.lagDays), tone, typed: d.state === "Typed", title: `${name} wages: credited ${plural(d.lagDays, "day", "days")} after the month${d.state === "Typed" ? " (typed)" : ""}` };
      }
      if (d.state === "Late") return { wageMonth: d.wageMonth, label: "!", tone: "late", typed: false, title: `${name} wages: the credit is late` };
      if (d.state === "Expected" && !dueMarked) {
        dueMarked = true;
        return { wageMonth: d.wageMonth, label: "?", tone: "due", typed: false, title: `${name} wages: due` };
      }
      return { wageMonth: d.wageMonth, label: "", tone: "none", typed: false, title: d.state === "Before" ? "" : `${name} wages: not due yet` };
    }),
  }));
  const timing = creditTiming(input.epfEntries);
  let note: string | null = null;
  if (timing) {
    note = timing.since && timing.usualDay
      ? `From ${monthName(timing.since)}'s wages the credit comes about the ${ordinal(timing.usualDay)}, not the ${ordinal(Math.max(1, timing.earlierLag ?? 1))}: ${timing.lagRange.min} to ${timing.lagRange.max} days after the month, against ${plural(timing.earlierLag ?? 1, "day", "days")} before. Worth knowing when a month looks missing.`
      : `Credits come ${timing.lagRange.min === timing.lagRange.max ? plural(timing.lagRange.min, "day", "days") : `${timing.lagRange.min} to ${timing.lagRange.max} days`} after the wage month${timing.usualDay ? `, around the ${ordinal(timing.usualDay)}` : ""}.`;
  }
  const checks = passbookChecks(input.epfEntries, today).map((c) => ({
    label: `FY ${c.financialYear.slice(2, 4)}-${c.financialYear.slice(5)}`,
    equation: `${rupees(c.opening)} + ${rupees(c.credits)} + ${rupees(c.interest)} = ${rupees(c.closing)}`,
    status: (c.typed > 0 ? "typed" : c.running ? "so far" : "adds up") as "adds up" | "typed" | "so far",
    detail: c.typed > 0 ? `${plural(c.typed, "row", "rows")} typed, not from a passbook` : c.running ? "the year's interest isn't credited yet" : "every row from a passbook",
  }));
  return { rows, note, checks };
}

// ---------- The growth path ----------
export interface GrowthView {
  steps: { years: number; year: string; total: string; now: string; putIn: string; interest: string; split: [number, number, number]; /** Interest as a share of what the growth is made of (put in plus interest), 0-1. */ interestOfGrowth: number }[];
  perCredit: string;
  rate: string;
  extra: string | null;
}

export function growthView(entries: FixedIncomeInput["epfEntries"], rates: FixedIncomeInput["epfRates"], projectionCredit: number | undefined, today: string): GrowthView | null {
  const g = growthPath(entries, rates, projectionCredit, today);
  if (!g) return null;
  return {
    steps: g.steps.map((s) => {
      const p = s.projection;
      return { years: s.years, year: s.year, total: formatLakh(p.total), now: formatLakh(g.balanceNow), putIn: formatLakh(p.contributed), interest: formatLakh(p.interest), split: [g.balanceNow / p.total, p.contributed / p.total, p.interest / p.total], interestOfGrowth: p.interest / (p.contributed + p.interest) };
    }),
    perCredit: formatInr(g.perCredit),
    rate: `${g.ratePercent}%`,
    extra: g.extra ? `If each month's credit were ${formatInr(g.extra.amount)} higher, EPF would be ${formatLakh(g.extra.adds)} more in ${g.extra.years} years. A raise that lifts contributions does this; nothing here assumes one.` : null,
  };
}

// ---------- The deposits table ----------
export interface DepositTableRow {
  id: string;
  name: string;
  /** "18 months 1 day · started 13 Mar 2026" */
  sub: string;
  rate: string;
  rateNote: string;
  placed: string;
  worth: string;
  gain: string;
  matures: string;
  maturesIn: string;
  maturesAt: string;
  maturesAtNote: string;
  through: number;
  due: boolean;
}

const tenureText = (start: string, maturity: string): string => {
  const { months, days } = tenureBetween(start, maturity);
  if (days === 0 && months % 12 === 0 && months >= 12) return plural(months / 12, "year", "years");
  return `${months ? plural(months, "month", "months") : ""}${months && days ? " " : ""}${days ? plural(days, "day", "days") : ""}`;
};

export function depositsTableView(f: FixedIncome, today: string): DepositTableRow[] | null {
  if (f.deposits.held.length === 0) return null;
  const rows = [...f.deposits.held]
    .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : a.id < b.id ? -1 : 1))
    .map<DepositTableRow>((d) => {
      const worth = f.deposits.worthOf[d.id];
      const e = expectedAtMaturity(d);
      const total = daysBetween(d.startDate, d.maturityDate);
      return {
        id: d.id,
        name: d.name,
        sub: `${tenureText(d.startDate, d.maturityDate)} · started ${formatDate(d.startDate)}`,
        rate: `${d.interestRate}%`,
        rateNote: d.compoundingType === "Cumulative" ? "compounds quarterly" : `pays out ${(d.payoutFrequency ?? "").toLowerCase()}`,
        placed: formatInr(d.principalAmount),
        worth: rupees(worth),
        gain: `+${formatInr(Math.round((worth - d.principalAmount) * 100) / 100)}`,
        matures: formatDate(d.maturityDate),
        maturesIn: d.maturityDate <= today ? "matured: close it" : inPhrase(d.maturityDate, today),
        maturesAt: rupees(e.amount),
        maturesAtNote: e.estimate ? "an estimate" : "the bank's figure",
        through: total > 0 ? Math.min(1, Math.max(0, daysBetween(d.startDate, today) / total)) : 1,
        due: d.maturityDate <= today,
      };
    });
  return rows;
}

// ---------- Coming up ----------
export interface ComingUpRow {
  key: string;
  day: string;
  month: string;
  title: string;
  note: string;
  amount: string;
  when: string;
  late: boolean;
}

export function comingUpView(f: FixedIncome, input: FixedIncomeInput, today: string): { items: ComingUpRow[]; note: string | null } | null {
  const items = comingUp(f, input.epfEntries, input.epfRates, today);
  if (items.length === 0) return null;
  const rows = items.map<ComingUpRow>((i) => ({
    key: `${i.kind}-${i.date}-${i.title}`,
    day: String(Number(i.date.slice(8, 10))),
    month: MONTH_NAMES[Number(i.date.slice(5, 7)) - 1].slice(0, 3).toUpperCase(),
    title: i.kind === "epf-credit" ? "EPF contribution" : i.title,
    note: i.kind === "epf-credit" && i.wageMonth ? `${monthName(i.wageMonth)} wages, about the ${ordinal(Number(i.date.slice(8, 10)))}` : i.kind === "maturity" ? maturityNote(f, i.depositId) : i.note,
    amount: `${i.estimate && i.kind !== "maturity" ? "≈ " : ""}${rupees(i.amount)}`,
    when: i.late ? "late" : inPhrase(i.date, today),
    late: Boolean(i.late),
  }));
  const holding = f.epf.holdings[0];
  const note = holding?.nextCredit
    ? `EPF contributions arrive about a month after the wage month, around the ${ordinal(Number(holding.nextCredit.due.slice(8, 10)))} lately. The year-end figure is the estimate so far plus the rest of the year at today's contribution.`
    : null;
  return { items: rows, note };
}

const maturityNote = (f: FixedIncome, depositId: string | undefined): string => {
  const d = f.deposits.held.find((x) => x.id === depositId);
  return `${d ? `${tenureText(d.startDate, d.maturityDate)}, ` : ""}interest included`;
};

// ---------- The EPF card ----------
export interface EpfCardView {
  account: string;
  tiles: { label: string; value: string; note: string }[];
  rows: { label: string; note: string; value: string }[];
}

export function epfCardView(f: FixedIncome, input: Pick<FixedIncomeInput, "epfEntries">, today: string): EpfCardView | null {
  const h = f.epf.holdings[0];
  if (!h || f.epf.total === 0) return null;
  const fy = financialYearOf(today);
  const credited = input.epfEntries
    .filter((e) => e.epfAccountId === h.accountId && e.kind === "Interest")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((e) => ({ label: `Interest credited, FY ${financialYearOf(e.date)}`, note: formatDate(e.date), value: formatInr(e.employee + e.employer) }));
  return {
    account: h.name,
    tiles: [
      { label: "Employee", value: formatLakh(f.epf.employee), note: formatInr(f.epf.employee) },
      { label: "Employer", value: formatLakh(f.epf.employer), note: formatInr(f.epf.employer) },
      { label: "Pension (EPS)", value: formatLakh(f.epf.pension), note: f.epf.pension === 0 ? "none credited" : formatInr(f.epf.pension) },
    ],
    rows: [
      { label: "This year's contributions", note: `${plural(h.putInThisYear.count, "credit", "credits")}${h.lastCredit ? `, ${formatInr(h.lastCredit.amount)} a month now` : ""}`, value: formatInr(h.putInThisYear.amount) },
      ...(h.estimate.amount > 0 && h.ratePercent ? [{ label: "Interest not credited yet", note: `${formatMonthShort(`${fy.slice(0, 4)}-04`)} to ${formatMonthShort(addMonth(`${fy.slice(0, 4)}-04`, h.estimate.months - 1))} at ${h.ratePercent}%, an estimate`, value: `≈ ${rupees(h.estimate.amount)}` }] : []),
      ...credited,
    ],
  };
}
const addMonth = (month: string, n: number): string => {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};

// ---------- The year's interest arriving against its estimate ----------
export interface InterestView {
  financialYear: string;
  tiles: { label: string; value: string; note: string }[];
  note: string;
  /** The rate for the year now running: declared, or still assumed. */
  rate: { value: string; note: string };
}

export function interestView(f: FixedIncome): InterestView | null {
  const h = f.epf.holdings[0];
  const r = h?.recentInterest;
  if (!h || !r) return null;
  const diff = r.estimated !== null ? r.credited - r.estimated : null;
  return {
    financialYear: r.financialYear,
    tiles: [
      { label: "Estimated", value: r.estimated !== null ? `≈ ${rupees(r.estimated)}` : "no rate known", note: r.ratePercent !== null ? `${r.ratePercent}% on each month's balance` : "" },
      { label: "Credited", value: rupees(r.credited), note: formatDate(r.date) },
      { label: "Difference", value: diff !== null ? rupees(Math.abs(diff)) : "—", note: diff === null ? "nothing to compare" : diff === 0 ? "to the rupee" : "shown, never hidden" },
    ],
    note: `What EPFO credited is what the page shows${r.typed ? "; you typed it, so importing the passbook that has it confirms it" : ""}. If the credited rate differs from the one in settings, the page says so.`,
    rate: h.ratePercent === null ? { value: "not known", note: "add a rate in EPF settings" } : h.rateSource === "Declared" ? { value: `${h.ratePercent}% declared`, note: "estimates use it" } : { value: "not declared yet", note: `estimates use the last one, ${h.ratePercent}%, and are marked as estimates` },
  };
}
