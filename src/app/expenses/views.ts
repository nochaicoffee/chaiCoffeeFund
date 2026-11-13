import type { SentencePart } from "@/app/cards/summarySentence";
import type { GreetingRowData } from "@/components/shell/GreetingParts";
import { addMonths, monthOf, type MonthKey } from "@/lib/aggregate/cardSpend";
import { expenseMonths, goalBigSpends, PART_KEYS, placeBigSpends, totalsOf, usualParts, usualSpent, type ExpenseData, type MonthExpenses, type PartKey, type PlacedBigSpend } from "@/lib/aggregate/expenses";
import { formatMonthShort, formatMonthYear, formatShortDate, MONTH_NAMES } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import type { BigSpendCategory } from "@/lib/sheets/types";

/**
 * Everything the Expenses page shows (docs/design/expenses.md, ExF1: E1 Split), worked out once from lib/aggregate/expenses and handed to the
 * components as plain, already-worded data. The greeting's cards read the same month as its sentence, so the two always agree.
 */

/** How many months the page looks back over, the month today is in included. */
export const MONTHS_SHOWN = 12;

export const PART_NAMES: Record<PartKey, string> = { card: "Card bills", emi: "EMIs", subs: "Subscriptions", ins: "Insurance", big: "Big spends", cash: "Cash and UPI" };
export const PART_SHORT: Record<PartKey, string> = { card: "Cards", emi: "EMIs", subs: "Subs", ins: "Insurance", big: "Big", cash: "Cash, UPI" };
const PART_NOTES: Record<PartKey, string> = { card: "statements paid this month", emi: "interest and principal", subs: "not charged to a card", ins: "premiums not on a card", big: "bought from your accounts", cash: "worked out: what's left" };
/** Colour token keys (`var(--card-<key>)`). */
export const PART_COLORS: Record<PartKey, string> = { card: "ruby", emi: "teal", subs: "plum", ins: "amber", big: "magenta", cash: "copper" };
export const CATEGORY_COLORS: Record<BigSpendCategory, string> = { Travel: "azure", Shopping: "raspberry", Electronics: "indigo", Home: "forest", Health: "coral", Gifts: "orchid", Vehicle: "spruce", Education: "honey", Other: "slate" };

export interface ExpenseModel {
  today: string;
  months: MonthExpenses[];
  picked: MonthExpenses;
  usual: number | null;
  usualParts: Record<PartKey, number> | null;
  /** Every big spend, newest first, placed in its month (null while its card bill isn't paid). */
  placed: PlacedBigSpend[];
  accountName: Map<string, string>;
  cardName: Map<string, string>;
}

/** The month the page opens on: the one asked for if it's shown, else the latest worked out, else the month today is in. */
export function expenseModel(data: ExpenseData, today: string, requested?: string): ExpenseModel {
  const current = monthOf(today);
  const months = expenseMonths(data, addMonths(current, -(MONTHS_SHOWN - 1)), current, today);
  const asked = months.find((m) => m.month === requested);
  const latestDone = [...months].reverse().find((m) => m.status === "done");
  const picked = asked ?? latestDone ?? months[months.length - 1];
  const past = months.filter((m) => m.month !== current);
  return {
    today,
    months,
    picked,
    usual: usualSpent(past),
    usualParts: usualParts(past),
    // Counted in a month shown, or still waiting in a card bill and bought since the first month shown.
    placed: placeBigSpends([...data.bigSpends, ...goalBigSpends(data.goals ?? [])], data.statements).filter((p) => (p.month ? p.month >= months[0].month && p.month <= current : p.spend.date >= `${months[0].month}-01`)),
    accountName: new Map(data.accounts.map((a) => [a.id, a.name])),
    cardName: new Map(data.cards.map((c) => [c.id, c.alias || c.name])),
  };
}

const rupees = (n: number) => formatInr(Math.round(n));
const monthWord = (month: MonthKey) => MONTH_NAMES[Number(month.slice(5, 7)) - 1];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** Came in, in the sense the page uses: income, a disbursal, and what came back. */
export const allIn = (m: MonthExpenses) => m.cameIn + m.borrowed + m.cameBack;

// --- The greeting ---

export type ExpensePoint = "spent" | "cash" | "invested" | "kept" | "big" | "explained" | "cameIn";

export function summarySentence(model: ExpenseModel): SentencePart[] {
  const m = model.picked;
  // The year too when it isn't this year's, since twelve months can hold the same month name twice.
  const name = m.month.slice(0, 4) === model.today.slice(0, 4) ? monthWord(m.month) : formatMonthYear(m.month);
  const bigs = m.bigSpends.length;
  const waitingNow = model.placed.filter((p) => p.month === null).length;
  const bigLine: SentencePart[] = [];
  if (bigs > 0 || waitingNow > 0) {
    if (bigs > 0) bigLine.push({ text: plural(bigs, "big spend", "big spends"), strong: true, point: "big" }, { text: " this month" });
    if (waitingNow > 0) bigLine.push({ text: `${bigs > 0 ? ", and " : ""}${waitingNow === 1 ? "one is" : `${waitingNow} are`} waiting in a card bill not paid yet` });
    bigLine.push({ text: "." });
  }

  if (m.status === "done") {
    const kept = m.kept ?? 0;
    return [
      { text: `In ${name} you spent ` },
      { text: rupees(m.spent ?? 0), strong: true, point: "spent" },
      { text: ", " },
      { text: rupees(m.parts.cash), strong: true, point: "cash" },
      { text: " of it in cash and UPI. " },
      ...(m.invested >= 0
        ? [{ text: rupees(m.invested), strong: true, point: "invested" }, { text: " went into investments" }]
        : [{ text: rupees(-m.invested), strong: true, point: "invested" }, { text: " more came out of investments than went in" }]),
      ...(kept >= 0 ? [{ text: " and " }, { text: rupees(kept), strong: true, point: "kept" }, { text: " stayed in your accounts. " }] : [{ text: ", and " }, { text: rupees(-kept), strong: true, point: "kept" }, { text: " came out of savings. " }]),
      ...bigLine,
    ];
  }
  const recorded: SentencePart[] = [
    { text: rupees(m.explained), strong: true, point: "explained" },
    { text: " of card bills, EMIs, subscriptions and insurance is paid, and " },
    { text: rupees(allIn(m)), strong: true, point: "cameIn" },
    { text: " came in. " },
  ];
  if (m.status === "progress") {
    return [{ text: `${name} so far: ` }, ...recorded, { text: "What went on cash and UPI is worked out when the month ends and every balance is in. " }, ...bigLine];
  }
  return [{ text: `${formatMonthYear(m.month)} can't be worked out: ${m.reason ?? "a balance is missing"}. What's recorded: ` }, ...recorded, ...bigLine];
}

export interface GreetingCard {
  title: string;
  total: string;
  rows: GreetingRowData[];
  note?: string;
}
export type ExpenseGreetingCards = Partial<Record<ExpensePoint, GreetingCard>>;

export function greetingView(model: ExpenseModel): ExpenseGreetingCards {
  const m = model.picked;
  const cards: ExpenseGreetingCards = {};
  const partRows = (keys: readonly PartKey[]): GreetingRowData[] =>
    keys
      .filter((k) => m.parts[k] !== 0)
      .map((k) => ({ key: k, name: PART_NAMES[k], colorKey: PART_COLORS[k], amount: rupees(m.parts[k]), note: PART_NOTES[k], fraction: m.spent ? Math.max(0, Math.min(1, m.parts[k] / m.spent)) : undefined }));
  const flowRows = (): GreetingRowData[] =>
    [
      { key: "in", name: "Came in", amount: m.cameIn, note: "salary and other income" },
      { key: "borrowed", name: "Borrowed", amount: m.borrowed, note: "a loan paid into your account" },
      { key: "back", name: "Came back", amount: m.cameBack, note: "deposits paid out, money lent repaid" },
      { key: "sold", name: "Back from brokers", amount: m.sold, note: "money your brokers sent back" },
      { key: "bought", name: "Sent to brokers", amount: -m.bought, note: "and new deposits" },
      { key: "lent", name: "Lent out", amount: -m.lentOut, note: "money lent to people" },
      { key: "kept", name: "Kept", amount: -(m.kept ?? 0), note: "what stayed in your accounts" },
    ]
      .filter((r) => r.amount !== 0)
      .map((r) => ({ key: r.key, name: r.name, colorKey: r.amount >= 0 ? "jade" : "slate", amount: `${r.amount >= 0 ? "+" : ""}${rupees(r.amount)}`, note: r.note }));

  if (m.status === "done") {
    cards.spent = { title: `Spent in ${formatMonthYear(m.month)}`, total: rupees(m.spent ?? 0), rows: partRows(PART_KEYS), note: model.usual !== null ? `A usual month is ${rupees(model.usual)}, the average of the months worked out.` : undefined };
    cards.cash = { title: "How cash and UPI is worked out", total: rupees(m.parts.cash), rows: [...flowRows(), ...partRows(["card", "emi", "subs", "ins"]).map((r) => ({ ...r, amount: `−${r.amount}`, fraction: undefined }))], note: m.parts.cash < 0 ? "Below zero: the records explain more than left your accounts. An income entry may be missing, or a balance typed wrong." : "What's left when everything recorded is taken away: UPI, cash, transfers to people, fees." };
    const kept = m.kept ?? 0;
    cards.kept = {
      title: kept >= 0 ? "What stayed in your accounts" : "What came out of savings",
      total: rupees(Math.abs(kept)),
      rows: m.accounts
        .filter((a) => a.changeInr !== 0)
        .map((a) => ({ key: a.account.id, name: a.account.name, colorKey: a.changeInr >= 0 ? "jade" : "coral", amount: `${a.changeInr >= 0 ? "+" : ""}${rupees(a.changeInr)}` })),
      note: `Your accounts held ${rupees(m.poolStart ?? 0)} at the start and ${rupees(m.poolEnd ?? 0)} at the end${m.usdInr && m.accounts.some((a) => a.account.currency === "USD") ? `, dollars at ₹${m.usdInr.toFixed(2)}` : ""}.`,
    };
  } else {
    cards.explained = {
      title: `${m.status === "progress" ? "Paid so far in" : "Paid in"} ${formatMonthYear(m.month)}`,
      total: rupees(m.explained),
      rows: partRows(["card", "emi", "subs", "ins"]),
      note: m.status === "progress" ? "Cash and UPI isn't in this: it needs the month's end balances." : "Cash and UPI isn't in this: the month can't be worked out.",
    };
    cards.cameIn = { title: "What came in", total: rupees(allIn(m)), rows: flowRows().filter((r) => !r.amount.startsWith("−")), note: m.status === "unknown" ? `Spent can't be worked out: ${m.reason}.` : undefined };
  }
  if (m.bought !== 0 || m.sold !== 0) {
    cards.invested = {
      title: "Into investments",
      total: rupees(m.invested),
      rows: [
        { key: "bought", name: "Sent to brokers", colorKey: "sapphire", amount: rupees(m.bought), note: "transfers to brokers, and new deposits" },
        { key: "sold", name: "Back from brokers", colorKey: "slate", amount: `−${rupees(m.sold)}`, note: "the money stays with you until spent" },
      ].filter((r) => r.amount !== "₹0" && r.amount !== "−₹0"),
      note: "RSU vests and ESPP purchases aren't here: no money of yours moved.",
    };
  }
  if (m.bigSpends.length > 0) {
    cards.big = {
      title: `Big spends counted in ${monthWord(m.month)}`,
      total: rupees(m.bigSpends.reduce((t, b) => t + b.spend.amount, 0)),
      rows: m.bigSpends.map((b) => ({ key: b.spend.id, name: b.spend.name, colorKey: CATEGORY_COLORS[b.spend.category], amount: rupees(b.spend.amount), note: `${b.spend.category} · bought ${formatShortDate(b.spend.date)}` })),
      note: "They're already inside the month's card bills or cash and UPI: they explain it, they don't add to it.",
    };
  }
  return cards;
}

// --- The hero: E1 Split ---

export interface SplitSegment {
  key: string;
  label: string;
  amount: string;
  /** Share of the row's width, 0–1. */
  share: number;
  colorKey: string;
  hatched?: boolean;
}

export interface MonthChip {
  month: MonthKey;
  label: string;
  amount: string;
  /** 0–1 against the highest month shown, for the little bar. */
  level: number;
  status: MonthExpenses["status"];
  picked: boolean;
  hasBig: boolean;
}

export interface HeroView {
  eyebrow: string;
  /** The big number: spent, or what's recorded so far. */
  value: number;
  pills: { key: string; strong: string; text: string; tone: "good" | "bad" | "plain" }[];
  /** Why there's no spent yet, for a month in progress or not worked out. */
  notice?: string;
  cameIn: { label: string; amount: string } | null;
  split: SplitSegment[];
  /** What the split leaves out because it's below zero: taken from savings, more back from brokers than sent. */
  splitNote?: string;
  parts: SplitSegment[];
  chips: MonthChip[];
}

export function heroView(model: ExpenseModel): HeroView {
  const m = model.picked;
  const done = m.status === "done";
  const value = done ? (m.spent ?? 0) : m.explained;
  const pills: HeroView["pills"] = [];
  if (done && model.usual !== null && m.spent !== null) {
    const diff = m.spent - model.usual;
    pills.push({ key: "usual", strong: formatInrCompact(Math.abs(diff)), text: `${diff <= 0 ? "less" : "more"} than your usual ${formatInrCompact(model.usual)}`, tone: diff <= 0 ? "good" : "bad" });
  }
  // Only on a worked-out month: there the number holds every big spend. A recorded total leaves out one paid from a bank account.
  const biggest = !done ? undefined : [...m.bigSpends].sort((a, b) => b.spend.amount - a.spend.amount)[0];
  if (biggest) pills.push({ key: "big", strong: formatInrCompact(biggest.spend.amount), text: `of it: ${biggest.spend.name}`, tone: "plain" });

  const positive = (n: number | null) => Math.max(0, n ?? 0);
  const splitRaw = done
    ? [
        { key: "spent", label: "Spent", value: positive(m.spent), colorKey: "coral" },
        { key: "invested", label: "Invested", value: positive(m.invested), colorKey: "sky" },
        { key: "lent", label: "Lent out", value: positive(m.lentOut), colorKey: "honey" },
        { key: "kept", label: "Kept", value: positive(m.kept), colorKey: "jade" },
      ]
    : [];
  const splitTotal = splitRaw.reduce((t, s) => t + s.value, 0);
  const split = splitRaw.filter((s) => s.value > 0).map((s) => ({ key: s.key, label: s.label, amount: formatInrCompact(s.value), share: s.value / splitTotal, colorKey: s.colorKey }));
  const notes: string[] = [];
  if (done && (m.kept ?? 0) < 0) notes.push(`${rupees(-(m.kept ?? 0))} came out of savings`);
  if (done && m.invested < 0) notes.push(`${rupees(-m.invested)} more came back from brokers than was sent`);

  const partTotal = PART_KEYS.reduce((t, k) => t + Math.max(0, m.parts[k]), 0);
  const parts = PART_KEYS.filter((k) => m.parts[k] > 0).map((k) => ({ key: k, label: PART_SHORT[k], amount: formatInrCompact(m.parts[k]), share: m.parts[k] / partTotal, colorKey: PART_COLORS[k], hatched: k === "cash" }));

  const top = Math.max(1, ...model.months.map((x) => (x.status === "done" ? (x.spent ?? 0) : x.explained)));
  const chips = model.months.map((x) => {
    const amount = x.status === "done" ? (x.spent ?? 0) : x.explained;
    return { month: x.month, label: formatMonthShort(x.month), amount: x.status === "done" ? formatInrCompact(amount) : x.status === "progress" ? "so far" : "—", level: x.status === "unknown" ? 0 : Math.max(0, amount) / top, status: x.status, picked: x.month === m.month, hasBig: x.bigSpends.length > 0 };
  });

  return {
    eyebrow: done ? `Spent in ${formatMonthYear(m.month)}` : m.status === "progress" ? `Paid so far in ${formatMonthYear(m.month)}` : `Paid in ${formatMonthYear(m.month)}`,
    value,
    pills,
    notice: done
      ? undefined
      : m.status === "progress"
        ? "Card bills, EMIs, subscriptions and insurance paid so far. What was spent in all, cash and UPI with it, is worked out once the month ends and its balances are in."
        : `What was spent in all can't be worked out: ${m.reason}. These are the payments recorded.`,
    cameIn: done ? { label: "Came in", amount: rupees(allIn(m)) } : null,
    split,
    splitNote: notes.length > 0 ? `Not in the bar: ${notes.join(", and ")}.` : undefined,
    parts,
    chips,
  };
}

// --- Where the month went ---

export interface WhereRow {
  key: PartKey;
  name: string;
  note: string;
  amount: string;
  /** 0–1 of the biggest part. */
  fraction: number;
  /** 0–1 of the bar that is big spends. */
  bigFraction: number;
  share: string;
  bigs: { key: string; name: string; amount: string; category: BigSpendCategory }[];
  negative: boolean;
}

export interface UsualCell {
  key: PartKey;
  name: string;
  amount: string;
  diff: string;
  tone: "good" | "bad" | "plain";
}

export interface WhereView {
  title: string;
  /** The month's statement: "October's statement". */
  statement: { href: string; label: string };
  total: string;
  rows: WhereRow[];
  usual: UsualCell[] | null;
  foot: string;
}

export function whereView(model: ExpenseModel): WhereView {
  const m = model.picked;
  const done = m.status === "done";
  const keys = PART_KEYS.filter((k) => (done ? true : k !== "cash"));
  const top = Math.max(1, ...keys.map((k) => Math.abs(m.parts[k])));
  const total = done ? (m.spent ?? 0) : m.explained;
  const rows = keys
    .filter((k) => m.parts[k] !== 0 || k === "card" || k === "cash")
    .map((k) => {
      const bigs = m.bigSpends.filter((b) => b.part === k);
      const bigSum = bigs.reduce((t, b) => t + b.spend.amount, 0);
      return {
        key: k,
        name: PART_NAMES[k],
        note: PART_NOTES[k],
        amount: rupees(m.parts[k]),
        fraction: Math.abs(m.parts[k]) / top,
        bigFraction: m.parts[k] > 0 ? Math.min(1, bigSum / m.parts[k]) : 0,
        share: total > 0 ? `${Math.round((m.parts[k] / total) * 100)}%` : "",
        bigs: bigs.map((b) => ({ key: b.spend.id, name: b.spend.name, amount: rupees(b.spend.amount), category: b.spend.category })),
        negative: m.parts[k] < 0,
      };
    });
  const usual =
    done && model.usualParts
      ? PART_KEYS.map((k) => {
          const u = (model.usualParts as Record<PartKey, number>)[k];
          const diff = m.parts[k] - u;
          const close = Math.abs(diff) < Math.max(500, u * 0.05);
          return { key: k, name: PART_SHORT[k], amount: formatInrCompact(m.parts[k]), diff: close ? "about usual" : `${diff > 0 ? "+" : "−"}${formatInrCompact(Math.abs(diff)).replace("−", "")} vs ${formatInrCompact(u)}`, tone: close ? ("plain" as const) : diff > 0 ? ("bad" as const) : ("good" as const) };
        })
      : null;
  return {
    title: `Where ${monthWord(m.month)} went`,
    statement: { href: `/expenses/statements?month=${m.month}`, label: `${monthWord(m.month)}'s statement` },
    total: rupees(total),
    rows,
    usual,
    foot: done ? "The light end of a bar is the month's big spends. Cash and UPI is worked out: what's left." : m.status === "progress" ? "So far this month. Cash and UPI joins when the month ends." : "Only what's recorded: the month can't be worked out.",
  };
}

// --- Big spends ---

export interface BigSpendRow {
  id: string;
  name: string;
  category: BigSpendCategory;
  colorKey: string;
  sub: string;
  when: string;
  amount: string;
  waiting: boolean;
  picked: boolean;
}

export interface BigSpendsView {
  note: string;
  strip: { category: BigSpendCategory; colorKey: string; amount: string; share: number }[];
  rows: BigSpendRow[];
  more: number;
}

export const BIG_SPENDS_SHOWN = 5;

export function bigSpendsView(model: ExpenseModel): BigSpendsView | null {
  const all = model.placed;
  if (all.length === 0) return null;
  const total = all.reduce((t, p) => t + p.spend.amount, 0);
  const byCat = new Map<BigSpendCategory, number>();
  for (const p of all) byCat.set(p.spend.category, (byCat.get(p.spend.category) ?? 0) + p.spend.amount);
  const strip = [...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, colorKey: CATEGORY_COLORS[category], amount: formatInrCompact(amount), share: amount / total }));
  const sorted = [...all].sort((a, b) => b.spend.date.localeCompare(a.spend.date));
  const rows = sorted.slice(0, BIG_SPENDS_SHOWN).map((p) => {
    const from = p.spend.paidFromCardId ? model.cardName.get(p.spend.paidFromCardId) : p.spend.paidFromAccountId ? model.accountName.get(p.spend.paidFromAccountId) : undefined;
    return {
      id: p.spend.id,
      name: p.spend.name,
      category: p.spend.category,
      colorKey: CATEGORY_COLORS[p.spend.category],
      sub: [p.spend.category, from, `bought ${formatShortDate(p.spend.date)}`].filter(Boolean).join(" · "),
      when: p.month ? `counts in ${formatMonthShort(p.month)}` : "in a card bill not paid yet",
      amount: rupees(p.spend.amount),
      waiting: p.month === null,
      picked: p.month === model.picked.month,
    };
  });
  return { note: `${plural(all.length, "big spend", "big spends")} in ${MONTHS_SHOWN} months · ${formatInrCompact(total)}`, strip, rows, more: Math.max(0, all.length - BIG_SPENDS_SHOWN) };
}

// --- Month by month ---

export interface MonthRow {
  month: MonthKey;
  label: string;
  status: MonthExpenses["status"];
  picked: boolean;
  cameIn: string;
  invested: string;
  lentOut: string;
  kept: string;
  keptTone: "good" | "bad" | "plain";
  spent: string;
  card: string;
  emi: string;
  subsIns: string;
  bigSpent: string;
  cash: string;
  bigs: { key: string; category: BigSpendCategory; colorKey: string }[];
  bigLabel?: string;
}

export interface MonthsView {
  rows: MonthRow[];
  total: Omit<MonthRow, "month" | "status" | "picked" | "bigs" | "bigLabel" | "keptTone"> & { keptTone: MonthRow["keptTone"] };
  doneCount: number;
}

const dash = (n: number) => (Math.round(n) === 0 ? "–" : rupees(n));

export function monthsView(model: ExpenseModel): MonthsView {
  const rows = [...model.months].reverse().map((m): MonthRow => {
    const done = m.status === "done";
    const kept = m.kept ?? 0;
    return {
      month: m.month,
      label: `${formatMonthShort(m.month)} ${m.month.slice(0, 4)}`,
      status: m.status,
      picked: m.month === model.picked.month,
      cameIn: dash(allIn(m)),
      invested: dash(m.invested),
      lentOut: dash(m.lentOut),
      kept: done ? `${kept > 0 ? "+" : ""}${rupees(kept)}` : "–",
      keptTone: !done ? "plain" : kept >= 0 ? "good" : "bad",
      spent: done ? rupees(m.spent ?? 0) : m.status === "progress" ? "so far" : "not worked out",
      card: dash(m.parts.card),
      emi: dash(m.parts.emi),
      subsIns: dash(m.parts.subs + m.parts.ins),
      bigSpent: dash(m.parts.big),
      cash: done ? rupees(m.parts.cash) : "–",
      bigs: m.bigSpends.map((b) => ({ key: b.spend.id, category: b.spend.category, colorKey: CATEGORY_COLORS[b.spend.category] })),
      bigLabel: m.bigSpends.length === 1 ? m.bigSpends[0].spend.name : m.bigSpends.length > 1 ? `${m.bigSpends.length} big spends` : undefined,
    };
  });
  const t = totalsOf(model.months);
  return {
    rows,
    doneCount: t.months,
    total: {
      label: plural(t.months, "month worked out", "months worked out"),
      cameIn: dash(t.cameIn),
      invested: dash(t.invested),
      lentOut: dash(t.lentOut),
      kept: t.months ? `${t.kept > 0 ? "+" : ""}${rupees(t.kept)}` : "–",
      keptTone: t.kept >= 0 ? "good" : "bad",
      spent: dash(t.spent),
      card: dash(t.parts.card),
      emi: dash(t.parts.emi),
      subsIns: dash(t.parts.subs + t.parts.ins),
      bigSpent: dash(t.parts.big),
      cash: dash(t.parts.cash),
    },
  };
}

// --- The Overview's Spent tile ---

export interface SpentTile {
  value: string;
  tag: string;
  sub: string;
  card: { title: string; total: string; rows: { name: string; amount: string }[]; foot: string };
}

/** What the Overview's Spent tile says: the latest month worked out, or what's paid so far when none is yet. */
export function spentTile(model: ExpenseModel): SpentTile {
  const latest = [...model.months].reverse().find((m) => m.status === "done");
  const rows = (m: MonthExpenses, keys: readonly PartKey[]) => keys.filter((k) => m.parts[k] !== 0).map((k) => ({ name: PART_NAMES[k], amount: rupees(m.parts[k]) }));
  if (latest) {
    const usual = model.usual !== null && latest.spent !== null ? latest.spent - model.usual : null;
    return {
      value: formatInrCompact(latest.spent ?? 0),
      tag: `in ${formatMonthShort(latest.month)}`,
      // Short, so it shares one line with the tag like the other tiles.
      sub: usual !== null && model.months.filter((m) => m.status === "done").length > 1 ? `${formatInrCompact(Math.abs(usual))} ${usual <= 0 ? "under" : "over"} usual` : `${formatInrCompact(latest.parts.cash)} cash, UPI`,
      card: { title: `Spent in ${formatMonthYear(latest.month)}`, total: rupees(latest.spent ?? 0), rows: rows(latest, PART_KEYS), foot: "Worked out from your accounts: what came in, less what was invested, lent and kept." },
    };
  }
  const now = model.months[model.months.length - 1];
  return {
    value: formatInrCompact(now.explained),
    tag: "so far",
    sub: `paid in ${formatMonthShort(now.month)}`,
    card: { title: `Paid so far in ${formatMonthYear(now.month)}`, total: rupees(now.explained), rows: rows(now, ["card", "emi", "subs", "ins"]), foot: "Card bills, EMIs, subscriptions and insurance. Cash and UPI, and what was spent in all, come when the month ends." },
  };
}
