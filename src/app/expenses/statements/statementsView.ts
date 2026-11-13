import type { SentencePart } from "@/app/cards/summarySentence";
import { lastDayOfMonth } from "@/lib/aggregate/accounts";
import { addMonths, type MonthKey } from "@/lib/aggregate/cardSpend";
import { PART_KEYS, totalsOf, type ExpensePayment, type MonthExpenses, type PartKey } from "@/lib/aggregate/expenses";
import { formatMonthShort, formatMonthYear, formatShortDate } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import type { BigSpendCategory } from "@/lib/sheets/types";
import { allIn, CATEGORY_COLORS, PART_COLORS, PART_NAMES, PART_SHORT, type ExpenseModel } from "../views";

/**
 * The two Statements pages (docs/design/expenses.md, ExS1 and ExS2), from the same model as the Expenses page: every payment month by month,
 * and one month as a statement. Plain, already-worded data for the components.
 */

const rupees = (n: number) => formatInr(Math.round(n));
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface Tile {
  label: string;
  value: string;
  note: string;
}

export interface StatementTag {
  key: string;
  name: string;
  amount: string;
  category: BigSpendCategory;
  colorKey: string;
  bought: string;
}

export interface StatementRow {
  key: string;
  date: string;
  day: string;
  mon: string;
  part: PartKey;
  label: string;
  detail?: string;
  worked: boolean;
  from: string;
  amount: string;
  tags: StatementTag[];
  /** Lower-case text to match a search on: the label, the detail, where from, the amount with and without its commas. */
  search: string;
}

export interface StatementMonth {
  month: MonthKey;
  title: string;
  status: MonthExpenses["status"];
  summary: string;
  rows: StatementRow[];
  /** Big spends from an account in a month not worked out: they have no cash and UPI line to sit on yet. */
  loose: StatementTag[];
}

/** A month's payments as statement rows, newest first, each big spend on the bill or cash line it sits in. */
function rowsOf(model: ExpenseModel, m: MonthExpenses): StatementRow[] {
  return [...m.payments]
    .sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key))
    .map((p) => {
      const tags = tagsFor(m, p);
      const from = p.part === "cash" ? "From every account" : p.accountId ? `From ${model.accountName.get(p.accountId) ?? "an account"}` : "Account not recorded";
      const amount = rupees(p.amount);
      return {
        key: p.key,
        date: p.date,
        day: String(Number(p.date.slice(8, 10))),
        mon: formatMonthShort(p.date.slice(0, 7)),
        part: p.part,
        label: p.label,
        detail: p.detail,
        worked: p.part === "cash",
        from,
        amount,
        tags,
        search: [p.label, p.detail, from, amount, amount.replace(/[₹,]/g, ""), ...tags.map((t) => t.name)].filter(Boolean).join(" ").toLowerCase(),
      };
    });
}

const toTag = (b: MonthExpenses["bigSpends"][number]): StatementTag => ({ key: b.spend.id, name: b.spend.name, amount: rupees(b.spend.amount), category: b.spend.category, colorKey: CATEGORY_COLORS[b.spend.category], bought: `bought ${formatShortDate(b.spend.date)}` });

function tagsFor(m: MonthExpenses, p: ExpensePayment): StatementTag[] {
  return m.bigSpends.filter((b) => (p.part === "card" ? b.part === "card" && p.key === `card:${b.statementId}` : p.part === "cash" && b.part === "cash")).map(toTag);
}

/** Big spends from an account when the month has no cash and UPI line (not worked out yet): shown on their own so none goes missing. */
function looseOf(m: MonthExpenses): StatementTag[] {
  return m.payments.some((p) => p.part === "cash") ? [] : m.bigSpends.filter((b) => b.part === "cash").map(toTag);
}

function monthSummary(m: MonthExpenses): string {
  const n = m.payments.filter((p) => p.part !== "cash").length;
  const bits = [plural(n, "payment", "payments")];
  if (m.status === "done") bits.push(`spent ${rupees(m.spent ?? 0)}`, `cash and UPI ${rupees(m.parts.cash)}`);
  else bits.push(m.status === "progress" ? `${rupees(m.explained)} paid so far` : `${rupees(m.explained)} recorded, spent not worked out`);
  if (m.bigSpends.length) bits.push(plural(m.bigSpends.length, "big spend", "big spends"));
  return bits.join(" · ");
}

// --- ExS1: every month ---

export interface LedgerView {
  sentence: SentencePart[];
  tiles: Tile[];
  months: StatementMonth[];
  counts: Record<"all" | PartKey, number>;
  bigCount: number;
}

export function ledgerView(model: ExpenseModel): LedgerView {
  const months = [...model.months].reverse().map((m) => ({ month: m.month, title: formatMonthYear(m.month), status: m.status, summary: monthSummary(m), rows: rowsOf(model, m), loose: looseOf(m) }));
  const counts = { all: 0, card: 0, emi: 0, subs: 0, ins: 0, big: 0, cash: 0 } as Record<"all" | PartKey, number>;
  for (const row of months.flatMap((x) => x.rows)) {
    counts.all += 1;
    counts[row.part] += 1;
  }
  const t = totalsOf(model.months);
  const latest = [...model.months].reverse().find((m) => m.status === "done");
  const big = model.placed.filter((p) => p.month !== null);
  const bigTotal = big.reduce((s, p) => s + p.spend.amount, 0);
  const biggest = [...big].sort((a, b) => b.spend.amount - a.spend.amount)[0];
  const spentMonths = model.months.filter((m) => m.status === "done").map((m) => m.spent ?? 0);

  const sentence: SentencePart[] =
    t.months > 0
      ? [
          { text: "Every month's spending in one place: " },
          { text: rupees(t.spent), strong: true },
          { text: ` over ${plural(t.months, "month", "months")} worked out, a usual month ` },
          { text: formatInrCompact(model.usual ?? 0), strong: true },
          { text: `. ${rupees(t.parts.cash)} of it is cash and UPI, worked out from your balances.` },
        ]
      : [{ text: "Every payment in one place, month by month. What was spent in all shows for each month once its balances are in: none of these months can be worked out yet." }];

  return {
    sentence,
    tiles: [
      latest
        ? { label: `Spent in ${formatMonthShort(latest.month)}`, value: rupees(latest.spent ?? 0), note: `${plural(latest.payments.filter((p) => p.part !== "cash").length, "payment", "payments")} · ${latest.invested >= 0 ? `${rupees(latest.invested)} invested` : `${rupees(-latest.invested)} more sold than bought`}` }
        : { label: `Paid in ${formatMonthShort(model.picked.month)}`, value: rupees(model.picked.explained), note: model.picked.status === "progress" ? "so far: card bills, EMIs, subscriptions, insurance" : "recorded" },
      { label: "A usual month", value: model.usual !== null ? formatInrCompact(model.usual) : "—", note: spentMonths.length > 1 ? `average of ${spentMonths.length} months · ${formatInrCompact(Math.min(...spentMonths))} to ${formatInrCompact(Math.max(...spentMonths))}` : spentMonths.length === 1 ? "one month worked out so far" : "needs a month worked out" },
      { label: "Cash and UPI", value: t.months ? formatInrCompact(t.parts.cash) : "—", note: t.months && t.spent > 0 ? `${Math.round((t.parts.cash / t.spent) * 100)}% of everything spent · worked out` : "worked out once a month ends" },
      { label: "Big spends", value: big.length ? formatInrCompact(bigTotal) : "—", note: big.length ? `${plural(big.length, "big spend", "big spends")} · biggest ${biggest.spend.name}` : "none logged in these months" },
    ],
    months,
    counts,
    bigCount: months.reduce((s, x) => s + x.rows.filter((r) => r.tags.length > 0 || r.part === "big").length + (x.loose.length ? 1 : 0), 0),
  };
}

// --- ExS2: one month ---

export interface StatementSection {
  part: PartKey;
  name: string;
  note: string;
  colorKey: string;
  total: string;
  lines: StatementRow[];
}

export interface AddsUpLine {
  key: string;
  label: string;
  note?: string;
  amount: string;
  tone: "in" | "out" | "plain";
}

export interface MonthStatementView {
  month: MonthKey;
  title: string;
  span: string;
  status: MonthExpenses["status"];
  notice?: string;
  tiles: Tile[];
  sections: StatementSection[];
  loose: StatementTag[];
  total: { label: string; amount: string };
  prev: MonthKey | null;
  next: MonthKey | null;
  addsUp: AddsUpLine[] | null;
  /** What the sum lands on: the accounts at the month's end, on a worked-out month. */
  end: string | null;
  split: { key: PartKey; label: string; share: number; pct: string; colorKey: string }[];
  bars: { month: MonthKey; label: string; level: number; picked: boolean; amount: string; done: boolean }[];
  usualLevel: number | null;
  usualLabel: string | null;
  versus: SentencePart[] | null;
}

const NOTES: Record<PartKey, string> = { card: "statements paid this month", emi: "interest and principal", subs: "not charged to a card", ins: "premiums not on a card", big: "bought from your accounts", cash: "worked out: what's left" };

export function monthStatementView(model: ExpenseModel): MonthStatementView {
  const m = model.picked;
  const done = m.status === "done";
  const rows = rowsOf(model, m).reverse();
  const sections = PART_KEYS.map((k) => {
    const lines = rows.filter((r) => r.part === k);
    return { part: k, name: PART_NAMES[k], note: NOTES[k], colorKey: PART_COLORS[k], total: rupees(m.parts[k]), lines };
  }).filter((s) => s.lines.length > 0);
  const index = model.months.findIndex((x) => x.month === m.month);
  const startLabel = `On ${formatShortDate(lastDayOfMonth(addMonths(m.month, -1)))}`;
  const endLabel = `On ${formatShortDate(lastDayOfMonth(m.month))}`;
  const doneMonths = model.months.filter((x) => x.status === "done");
  const top = Math.max(1, ...doneMonths.map((x) => x.spent ?? 0), model.usual ?? 0);

  const addsUp: AddsUpLine[] | null = done
    ? [
        { key: "start", label: "In your accounts at the start", amount: rupees(m.poolStart ?? 0), tone: "plain" as const },
        { key: "in", label: "Came in", note: "salary and other income", amount: `+${rupees(m.cameIn)}`, tone: "in" as const },
        ...(m.borrowed ? [{ key: "borrowed", label: "Borrowed", note: "a loan paid into an account", amount: `+${rupees(m.borrowed)}`, tone: "in" as const }] : []),
        ...(m.cameBack ? [{ key: "back", label: "Came back", note: "deposits paid out, money lent repaid", amount: `+${rupees(m.cameBack)}`, tone: "in" as const }] : []),
        ...(m.invested !== 0 ? [{ key: "inv", label: m.invested > 0 ? "Moved to investing" : "Came out of investing", note: "sent to brokers less sent back, and new deposits", amount: `${m.invested > 0 ? "−" : "+"}${rupees(Math.abs(m.invested))}`, tone: (m.invested > 0 ? "out" : "in") as "in" | "out" }] : []),
        ...(m.lentOut ? [{ key: "lent", label: "Lent out", note: "money lent to people", amount: `−${rupees(m.lentOut)}`, tone: "out" as const }] : []),
        { key: "spent", label: "Spent", note: "the payments on the left", amount: `−${rupees(m.spent ?? 0)}`, tone: "out" as const },
      ]
    : null;
  const partTotal = PART_KEYS.reduce((s, k) => s + Math.max(0, m.parts[k]), 0);
  const versus: SentencePart[] | null =
    done && model.usual !== null
      ? (() => {
          const diff = (m.spent ?? 0) - model.usual;
          const bigs = m.bigSpends.reduce((s, b) => s + b.spend.amount, 0);
          const parts: SentencePart[] = [{ text: "Against a usual month: " }, { text: `${diff > 0 ? "+" : "−"}${formatInrCompact(Math.abs(diff))}`, strong: true }];
          if (bigs > 0) parts.push({ text: `, or ${formatInrCompact(Math.abs(diff - bigs))} ${diff - bigs > 0 ? "more" : "less"} without its big spends` });
          parts.push({ text: "." });
          return parts;
        })()
      : null;

  return {
    month: m.month,
    title: `${formatMonthYear(m.month)} statement`,
    span: done ? `${formatShortDate(`${m.month}-01`)} to ${formatShortDate(lastDayOfMonth(m.month))} · every account` : m.status === "progress" ? `so far, to ${formatShortDate(model.today)}` : "recorded payments only",
    status: m.status,
    notice: done ? undefined : m.status === "progress" ? "The month isn't over: these are the payments so far. Cash and UPI, and what was spent in all, come once it ends and its balances are in." : `What was spent in all can't be worked out: ${m.reason}. These are the payments recorded.`,
    tiles: done
      ? [
          { label: startLabel, value: rupees(m.poolStart ?? 0), note: "in your bank accounts" },
          { label: "Came in", value: rupees(allIn(m)), note: m.invested > 0 ? `${rupees(m.invested)} of it invested` : "salary and other income" },
          { label: "Spent", value: rupees(m.spent ?? 0), note: `${plural(m.payments.filter((p) => p.part !== "cash").length, "payment", "payments")} · ${m.spent ? Math.round((m.parts.cash / m.spent) * 100) : 0}% cash and UPI` },
          { label: endLabel, value: rupees(m.poolEnd ?? 0), note: `${(m.kept ?? 0) >= 0 ? "+" : "−"}${rupees(Math.abs(m.kept ?? 0))} over the month` },
        ]
      : [
          { label: "Came in", value: rupees(allIn(m)), note: m.status === "progress" ? "so far" : "recorded" },
          { label: m.status === "progress" ? "Paid so far" : "Paid", value: rupees(m.explained), note: "card bills, EMIs, subscriptions, insurance" },
          { label: "Invested", value: rupees(m.invested), note: "sent to brokers less sent back" },
          { label: "Spent", value: "—", note: m.status === "progress" ? "when the month ends" : "can't be worked out" },
        ],
    sections,
    loose: looseOf(m),
    total: done ? { label: "Total spent", amount: rupees(m.spent ?? 0) } : { label: m.status === "progress" ? "Paid so far" : "Recorded", amount: rupees(m.explained) },
    prev: index > 0 ? model.months[index - 1].month : null,
    next: index >= 0 && index < model.months.length - 1 ? model.months[index + 1].month : null,
    addsUp,
    end: done ? rupees(m.poolEnd ?? 0) : null,
    split: PART_KEYS.filter((k) => m.parts[k] > 0).map((k) => ({ key: k, label: PART_SHORT[k], share: m.parts[k] / partTotal, pct: `${Math.round((m.parts[k] / partTotal) * 100)}%`, colorKey: PART_COLORS[k] })),
    bars: model.months.map((x) => ({ month: x.month, label: formatMonthShort(x.month).slice(0, 1), level: x.status === "done" ? Math.max(0, x.spent ?? 0) / top : 0, picked: x.month === m.month, amount: x.status === "done" ? formatInrCompact(x.spent ?? 0) : x.status === "progress" ? "so far" : "not worked out", done: x.status === "done" })),
    usualLevel: model.usual !== null ? model.usual / top : null,
    usualLabel: model.usual !== null ? `usual ${formatInrCompact(model.usual)}` : null,
    versus,
  };
}
