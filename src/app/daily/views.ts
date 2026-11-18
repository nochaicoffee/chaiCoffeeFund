import type { SentencePart } from "@/app/cards/summarySentence";
import type { GreetingRowData } from "@/components/shell/GreetingParts";
import { budgetView, diaryStart, limitFor, methodShare, monthOf, monthRows, monthView, periodView, readMonth, shiftMonth, usualMonth, type BudgetView, type CategoryRow, type MonthView, type PeriodView } from "@/lib/aggregate/dailySpends";
import { resolveCategories, type CategoryDef } from "@/lib/daily/categories";
import { PENDING_PREFIX } from "@/lib/daily/pendingAdds";
import { cardColorKey, type ColorKey } from "@/lib/format/colors";
import { formatDayDate, formatMonthShort, formatMonthYear, formatShortDate, MONTH_NAMES } from "@/lib/format/date";
import { formatInrCompact, formatInrExact } from "@/lib/format/money";
import type { DailyBudget, DailyCategory, DailySpend, DailySpendMethod } from "@/lib/sheets/types";

/**
 * Everything the Daily page shows (docs/design/daily.md, round 3), worked out once from lib/aggregate/dailySpends and handed to the components as plain,
 * already-worded data. The greeting's cards read the same figures as its sentence, so the two always agree.
 */

const money = formatInrExact;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;
const dayLabel = formatDayDate;
const dayRange = (from: string, to: string) => (from === to ? String(Number(from.slice(8))) : `${Number(from.slice(8))}–${Number(to.slice(8))}`);

export const METHOD_NAMES: Record<DailySpendMethod, string> = { UPI: "UPI", Card: "Credit card" };
/** Colour token keys (`var(--card-<key>)`): UPI and credit card. */
export const METHOD_COLORS: Record<DailySpendMethod, ColorKey> = { UPI: "teal", Card: "ruby" };

export interface CategoryView {
  id: string;
  name: string;
  colorKey: ColorKey;
  hidden: boolean;
  builtIn: boolean;
}

export interface DailyModel {
  today: string;
  /** The month the calendar shows (`?month=`, else the month today is in). */
  picked: MonthView;
  /** The month today is in: the strip and Right now are always about it. */
  current: MonthView;
  limit: number | null;
  budget: BudgetView | null;
  period: PeriodView;
  periodLabel: string;
  categories: CategoryDef[];
  spends: DailySpend[];
  budgets: DailyBudget[];
  /** What a category id reads as; a spend with none, or one that isn't known, reads as grey. */
  nameOf: (id: string | null | undefined) => string;
  colorOf: (id: string | null | undefined) => ColorKey;
  limitOf: (month: string) => number | null;
}

export function dailyModel(input: { spends: DailySpend[]; budgets: DailyBudget[]; categoryRows: DailyCategory[]; today: string; month?: string; period?: string }): DailyModel {
  const { spends, budgets, today } = input;
  const categories = resolveCategories(input.categoryRows);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const pickedKey = readMonth(input.month) ?? monthOf(today);
  const limitOf = (month: string) => limitFor(budgets, month);
  const current = monthView(spends, monthOf(today), today);
  const limit = limitOf(current.month);
  const asked = input.period;
  const kind = asked === "month" ? "month" : "year";
  const year = /^\d{4}$/.test(asked ?? "") ? (asked as string) : today.slice(0, 4);
  const period = periodView(spends, kind, kind === "month" ? pickedKey : year, today, limitOf);
  return {
    today,
    picked: monthView(spends, pickedKey, today),
    current,
    limit,
    budget: limit === null ? null : budgetView(current, limit, today),
    period,
    periodLabel: kind === "month" ? formatMonthYear(pickedKey) : year,
    categories,
    spends,
    budgets,
    nameOf: (id) => (id ? (byId.get(id)?.name ?? "Unknown") : "No category"),
    colorOf: (id) => (id && byId.has(id) ? cardColorKey(byId.get(id)?.color) : "slate"),
    limitOf,
  };
}

// ---------- The greeting ----------

export type DailyPoint = "spent" | "upi" | "card" | "perDay" | "left" | "allowance";

export function summarySentence(model: DailyModel): SentencePart[] {
  const m = model.current;
  const name = formatMonthYear(m.month);
  if (m.count === 0) return [{ text: `Nothing written down for ${name} yet. Add what you spent today, and this page fills in as you go.` }];
  const parts: SentencePart[] = [
    { text: "You've spent " },
    { text: money(m.total), strong: true, point: "spent" },
    { text: ` in ${name} so far: ` },
    { text: money(m.upi), strong: true, point: "upi" },
    { text: " on UPI and " },
    { text: money(m.card), strong: true, point: "card" },
    { text: " on credit cards, about " },
    { text: money(m.perDay), strong: true, point: "perDay" },
    { text: " a day." },
  ];
  const b = model.budget;
  if (b) {
    if (b.over) parts.push({ text: " You're " }, { text: money(-b.left), strong: true, point: "left" }, { text: ` over your ${money(b.limit)} limit.` });
    else {
      parts.push({ text: " " }, { text: money(b.left), strong: true, point: "left" }, { text: ` of your ${money(b.limit)} limit is left` });
      if (b.today) parts.push({ text: ", and today's allowance is " }, { text: money(b.today.allowance), strong: true, point: "allowance" });
      parts.push({ text: "." });
    }
  }
  return parts;
}

export interface GreetingCard {
  title: string;
  total: string;
  rows: GreetingRowData[];
  note?: string;
}
export type DailyGreetingCards = Partial<Record<DailyPoint, GreetingCard>>;

const methodRow = (method: DailySpendMethod, amount: number, of: number): GreetingRowData => ({ key: method, name: METHOD_NAMES[method], colorKey: METHOD_COLORS[method], amount: money(amount), note: of > 0 ? `${percent(amount / of)} of the month` : undefined, fraction: of > 0 ? amount / of : undefined });

/** The cards the greeting's figures open, from the same figures as the sentence. A figure with nothing behind it has none and stays plain bold. */
export function greetingView(model: DailyModel): DailyGreetingCards {
  const m = model.current;
  if (m.count === 0) return {};
  const month = formatMonthYear(m.month);
  const cards: DailyGreetingCards = {};
  // The usual month is about the earlier months, not the period picked, so the greeting doesn't move with the picker.
  const usual = usualMonth(model.spends, model.today)?.total ?? null;
  cards.spent = {
    title: `Spent in ${month}`,
    total: money(m.total),
    rows: (["UPI", "Card"] as const).filter((x) => (x === "UPI" ? m.upi : m.card) > 0).map((x) => methodRow(x, x === "UPI" ? m.upi : m.card, m.total)),
    note: usual !== null ? `${plural(m.count, "spend")} written down. A usual month is ${money(usual)}, the average of the earlier months.` : `${plural(m.count, "spend")} written down.`,
  };
  const share = (method: DailySpendMethod): GreetingCard => ({ title: `${METHOD_NAMES[method]} in ${month}`, total: money(method === "UPI" ? m.upi : m.card), rows: [{ key: method, name: `${percent(methodShare(m, method))} of the month`, colorKey: METHOD_COLORS[method], amount: money(method === "UPI" ? m.upi : m.card), fraction: methodShare(m, method) }] });
  if (m.upi > 0) cards.upi = share("UPI");
  if (m.card > 0) cards.card = share("Card");
  cards.perDay = {
    title: "Spent each day",
    total: money(m.perDay),
    rows: [...(m.biggestDay ? [{ key: "biggest", name: "Biggest day", colorKey: "ruby", amount: money(m.biggestDay.total), note: dayLabel(m.biggestDay.date) }] : []), { key: "quiet", name: "Days with nothing written", colorKey: "slate", amount: String(m.quietDays), note: `of ${m.daysCounted}` }],
    note: `${money(m.total)} over ${plural(m.daysCounted, "day")}, the days with nothing written down counted.`,
  };
  const b = model.budget;
  if (b && !b.over) cards.left = { title: `Left of your ${money(b.limit)} limit`, total: money(b.left), rows: [{ key: "spent", name: "Spent so far", colorKey: "ruby", amount: money(m.total) }, { key: "expected", name: `Expected by the ${Number(model.today.slice(8))}th`, colorKey: "slate", amount: money(b.expected) }, { key: "pace", name: b.overPace > 0 ? "Over the pace by" : "Under the pace by", colorKey: b.overPace > 0 ? "amber" : "emerald", amount: money(Math.abs(b.overPace)) }], note: `${plural(b.daysLeft, "day")} left in the month.` };
  if (b && b.over) cards.left = { title: `Over your ${money(b.limit)} limit`, total: money(-b.left), rows: [{ key: "spent", name: "Spent so far", colorKey: "ruby", amount: money(m.total) }], note: "Anything more adds to it." };
  if (b?.today) cards.allowance = { title: "Today's allowance", total: money(b.today.allowance), rows: [{ key: "spent", name: "Spent today", colorKey: "ruby", amount: money(b.today.spent) }, { key: "left", name: b.today.left < 0 ? "Past it by" : "Left today", colorKey: b.today.left < 0 ? "ruby" : "emerald", amount: money(Math.abs(b.today.left)) }], note: `What's left of the limit before today, shared over the ${plural(b.daysLeft + 1, "day")} to go counting today. It moves as you spend.` };
  return cards;
}

// ---------- The pinned strip ----------

export interface StripView {
  hasLimit: boolean;
  month: string;
  label: string;
  value: string;
  ofLimit: string;
  /** Spent over the limit, 0 to 1 (capped), and where the pace is. */
  fraction: number;
  paceFraction: number;
  tone: "ok" | "warn" | "neg";
  pill: { tone: "on" | "warn" | "due"; text: string };
  todayLabel: string;
  todayValue: string;
  todayNegative: boolean;
  daysLeft: string;
}

export function stripView(model: DailyModel): StripView {
  const b = model.budget;
  const month = model.current.month;
  if (!b) return { hasLimit: false, month, label: "", value: "", ofLimit: "", fraction: 0, paceFraction: 0, tone: "ok", pill: { tone: "warn", text: "" }, todayLabel: "", todayValue: "", todayNegative: false, daysLeft: "" };
  const t = b.today;
  const pill = b.over ? ({ tone: "due", text: `${money(-b.left)} over the limit` } as const) : b.overPace > 0 ? ({ tone: "warn", text: `${money(b.overPace)} over pace` } as const) : ({ tone: "on", text: `${money(-b.overPace)} under pace` } as const);
  return {
    hasLimit: true,
    month,
    label: b.over ? "Over the limit" : "Left to spend",
    value: money(Math.abs(b.left)),
    ofLimit: `of ${money(b.limit)}`,
    fraction: Math.min(1, b.used),
    paceFraction: Math.min(1, b.expected / b.limit),
    tone: b.over ? "neg" : b.overPace > 0 ? "warn" : "ok",
    pill,
    todayLabel: t && t.left < 0 ? "Over today by" : "Left today",
    todayValue: t ? money(Math.abs(t.left)) : "",
    todayNegative: !!t && t.left < 0,
    daysLeft: `${plural(b.daysLeft, "day")} to go`,
  };
}

// ---------- The hero ----------

export interface CalendarCell {
  date: string;
  day: number;
  total: string;
  /** ₹4.9k, for a phone's small square. */
  compact: string;
  upi: boolean;
  card: boolean;
  count: number;
  /** 0 nothing, 1 to 4 by size of the day. */
  level: 0 | 1 | 2 | 3 | 4;
  today: boolean;
  /** A day to come. */
  future: boolean;
  /** A day gone by that the diary was being kept, with nothing written. */
  quiet: boolean;
}

export interface DayDetail {
  date: string;
  label: string;
  rel: string;
  total: string;
  upi: string;
  card: string;
  rows: { id: string; title: string; /** The category's name, for its tile. */ tile: string; sub: string; amount: string; method: DailySpendMethod; colorKey: ColorKey; /** Added a moment ago and still being saved to the Sheet. */ saving: boolean }[];
  isToday: boolean;
  /** A day to come can't have a spend added to it. */
  canAdd: boolean;
}

export interface HeroView {
  isCurrent: boolean;
  monthLabel: string;
  dateLabel: string;
  dayOf: string;
  spentToday: string | null;
  spentMonth: string;
  spentMonthLabel: string;
  ofLimit: string | null;
  prevHref: string;
  nextHref: string | null;
  backHref: string | null;
  /** Monday first; null is a blank square. */
  weeks: (CalendarCell | null)[][];
  details: Record<string, DayDetail>;
  /** The day the panel opens on (defaultSelectedDay). */
  defaultSelected: string;
}

const level = (t: number): CalendarCell["level"] => (t <= 0 ? 0 : t < 500 ? 1 : t < 1500 ? 2 : t < 3000 ? 3 : 4);

function relative(date: string, today: string): string {
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000);
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : days > 1 ? `${days} days ago` : days === -1 ? "Tomorrow" : `In ${-days} days`;
}

const monthHref = (month: string, today: string, period?: string) => {
  const q = new URLSearchParams();
  if (month !== monthOf(today)) q.set("month", month);
  if (period) q.set("period", period);
  const s = q.toString();
  return s ? `/daily?${s}` : "/daily";
};

/** The day the calendar opens on: today in the current month, else the month's biggest day, else its 1st. */
export function defaultSelectedDay(model: DailyModel): string {
  const m = model.picked;
  return m.isCurrent ? model.today : (m.biggestDay?.date ?? `${m.month}-01`);
}

export function heroView(model: DailyModel, periodParam?: string): HeroView {
  const m = model.picked;
  const today = model.today;
  const details: Record<string, DayDetail> = {};
  for (const d of m.days) {
    details[d.date] = {
      date: d.date,
      label: dayLabel(d.date),
      rel: relative(d.date, today),
      total: money(d.total),
      upi: money(d.upi),
      card: money(d.card),
      rows: d.spends.map((s) => ({ id: s.id, title: s.note ?? model.nameOf(s.category), tile: model.nameOf(s.category), sub: [s.note ? model.nameOf(s.category) : undefined, METHOD_NAMES[s.method]].filter(Boolean).join(" · "), amount: money(s.amount), method: s.method, colorKey: model.colorOf(s.category), saving: s.id.startsWith(PENDING_PREFIX) })).reverse(),
      isToday: d.date === today,
      canAdd: d.date <= today,
    };
  }
  const weeks = m.weeks.map((w) => w.cells.map((c): CalendarCell | null => (c ? { date: c.date, day: c.day, total: c.total > 0 ? money(c.total) : "", compact: c.total > 0 ? formatInrCompact(c.total) : "", upi: c.upi > 0, card: c.card > 0, count: c.spends.length, level: level(c.total), today: c.date === today, future: !c.elapsed, quiet: c.kept && c.spends.length === 0 && c.date !== today } : null)));
  const defaultSelected = defaultSelectedDay(model);
  const next = shiftMonth(m.month, 1);
  const limit = model.limitOf(m.month);
  return {
    isCurrent: m.isCurrent,
    monthLabel: formatMonthYear(m.month),
    dateLabel: `${formatDayDate(today)}, ${today.slice(0, 4)}`,
    dayOf: `day ${Number(today.slice(8))} of ${m.length}`,
    spentToday: m.isCurrent ? money(m.days.find((d) => d.date === today)?.total ?? 0) : null,
    spentMonth: money(m.total),
    spentMonthLabel: m.isCurrent ? "Spent this month" : `Spent in ${MONTH_NAMES[Number(m.month.slice(5, 7)) - 1]}`,
    ofLimit: limit === null ? null : `${percent(m.total / limit)} of ${money(limit)}`,
    prevHref: monthHref(shiftMonth(m.month, -1), today, periodParam),
    nextHref: next > monthOf(today) ? null : monthHref(next, today, periodParam),
    backHref: m.isCurrent ? null : monthHref(monthOf(today), today, periodParam),
    weeks,
    details,
    defaultSelected,
  };
}

// ---------- The widgets ----------

export type WidgetVisual =
  | { kind: "bar"; fraction: number; tone: "ok" | "warn" | "neg" }
  | { kind: "track"; fraction: number; tick: number; tone: "ok" | "warn" | "neg" }
  | { kind: "week"; days: { label: string; height: number; today: boolean; future: boolean }[] }
  | { kind: "columns"; bars: { height: number; className: "" | "cur" | "fut" | "q"; label: string }[]; line?: number }
  | { kind: "stack"; segments: { width: number; colorKey: ColorKey }[]; legend: { name: string; percent: string; colorKey: ColorKey }[] }
  | { kind: "bigs"; rows: { title: string; tile: string; sub: string; amount: string; colorKey: ColorKey }[] }
  | { kind: "split"; upi: number; card: number; legend: { name: string; percent: string; colorKey: ColorKey }[] }
  | { kind: "pills"; pills: { text: string; state: "ok" | "mid" | "bad" | "cur" | "fut" | "none" }[] };

export interface WidgetView {
  key: string;
  title: string;
  /** "Now" or the period's label. */
  tag: string;
  isNow: boolean;
  value: string;
  /** A category's colour, for Top category, drawn as a tile before the value. */
  valueColor?: ColorKey;
  valueTone?: "neg" | "warn";
  sub: string;
  visual: WidgetVisual;
}

/** The three about right now (this month): they stay put when the period changes. Null without a limit, since all three are about it. */
export function nowWidgets(model: DailyModel): WidgetView[] | null {
  const b = model.budget;
  const t = b?.today;
  const w = b?.week;
  if (!b || !t || !w) return null;
  const m = model.current;
  const week = m.weeks.find((x) => x.inProgress);
  const maxDay = Math.max(b.limit / m.length, ...(week?.cells.map((c) => c?.total ?? 0) ?? [0]));
  const scale = b.limit * 1.4;
  return [
    { key: "left-today", title: "Left today", tag: "Now", isNow: true, value: t.left < 0 ? `−${money(-t.left)}` : money(t.left), valueTone: t.left < 0 ? "neg" : undefined, sub: t.left < 0 ? `past today's ${money(t.allowance)}` : `of ${money(t.allowance)} for today`, visual: { kind: "bar", fraction: t.allowance ? t.spent / t.allowance : 1, tone: t.left < 0 ? "neg" : "ok" } },
    { key: "week", title: "Week so far", tag: "Now", isNow: true, value: money(w.spent), sub: `${money(Math.max(0, w.share - w.spent))} left of ${money(w.share)} · ${dayRange(w.from, w.to)} ${formatMonthShort(w.to.slice(0, 7))}`, visual: { kind: "week", days: (week?.cells ?? []).map((c, i) => ({ label: "MTWTFSS"[i], height: c && c.elapsed ? Math.max(6, (c.total / maxDay) * 100) : 6, today: c?.date === model.today, future: !c || !c.elapsed })) } },
    { key: "track", title: "On track to end at", tag: "Now", isNow: true, value: m.pace === null ? "—" : money(m.pace), valueTone: m.pace !== null && m.pace > b.limit ? "warn" : undefined, sub: m.pace === null ? "Nothing written down yet" : m.pace > b.limit ? `${money(m.pace - b.limit)} over your ${money(b.limit)}` : `${money(b.limit - m.pace)} under your ${money(b.limit)}`, visual: { kind: "track", fraction: Math.min(1, (m.pace ?? 0) / scale), tick: b.limit / scale, tone: m.pace !== null && m.pace > b.limit ? "warn" : "ok" } },
  ];
}

const legendOf = (rows: CategoryRow[], model: DailyModel, from: number, to: number) => rows.slice(from, to).map((c) => ({ name: model.nameOf(c.category), percent: percent(c.share), colorKey: model.colorOf(c.category) }));

/** The six that follow the period: spent, top category, biggest spend, UPI vs credit card, quiet days, and months (or days) inside the limit. */
export function periodWidgets(model: DailyModel): WidgetView[] {
  const p = model.period;
  const isYear = p.kind === "year";
  const tag = model.periodLabel;
  const empty = p.count === 0;
  const first = p.categories[0];
  const big = p.biggest[0];
  const maxMonth = Math.max(...p.months.map((x) => x.total), 1);
  const limitForLine = p.months.find((x) => x.limit !== null)?.limit ?? null;
  const columnScale = Math.max(maxMonth, (limitForLine ?? 0) * 1.3, 1);
  const dayCols = model.picked.days.filter((d) => d.kept);
  const maxDay = Math.max(...dayCols.map((d) => d.total), 1);
  const w: WidgetView[] = [];

  w.push({
    key: "spent",
    title: isYear ? `Spent in ${tag}` : `Spent in ${MONTH_NAMES[Number(p.key.slice(5, 7)) - 1]}`,
    tag,
    isNow: false,
    value: money(p.total),
    sub: empty ? "Nothing written down yet" : isYear ? (p.average !== null ? `${money(p.average)} a month on average · ${plural(p.completed, "month")} over` : `${plural(p.months.filter((x) => !x.empty).length, "month")} so far`) : `${money(model.picked.perDay)} a day · ${plural(model.picked.daysCounted, "day")}`,
    visual: isYear
      ? { kind: "columns", bars: p.months.map((x) => ({ height: x.isFuture || x.empty ? 6 : Math.max(4, (x.total / columnScale) * 100), className: x.isFuture || x.empty ? "fut" : x.month === model.current.month ? "cur" : "", label: "JFMAMJJASOND"[Number(x.month.slice(5, 7)) - 1] })), line: limitForLine === null ? undefined : (limitForLine / columnScale) * 100 }
      : { kind: "columns", bars: dayCols.map((d) => ({ height: Math.max(4, (d.total / maxDay) * 100), className: d.date === model.today ? "cur" : "", label: "" })) },
  });

  w.push({
    key: "top",
    title: "Top category",
    tag,
    isNow: false,
    value: first ? model.nameOf(first.category) : "—",
    valueColor: first ? model.colorOf(first.category) : undefined,
    sub: first ? `${money(first.amount)} · ${percent(first.share)} of ${isYear ? "the year" : "the month"}` : "Nothing yet",
    visual: first ? { kind: "stack", segments: p.categories.slice(0, 5).map((c) => ({ width: c.share * 100, colorKey: model.colorOf(c.category) })), legend: legendOf(p.categories, model, 1, 4) } : { kind: "stack", segments: [], legend: [] },
  });

  w.push({
    key: "biggest",
    title: "Biggest spend",
    tag,
    isNow: false,
    value: big ? money(big.amount) : "—",
    sub: big ? [big.note ?? model.nameOf(big.category), formatShortDate(big.date), METHOD_NAMES[big.method]].join(" · ") : "Nothing yet",
    visual: { kind: "bigs", rows: p.biggest.slice(1).map((b) => ({ title: b.note ?? model.nameOf(b.category), tile: model.nameOf(b.category), sub: formatShortDate(b.date), amount: money(b.amount), colorKey: model.colorOf(b.category) })) },
  });

  w.push({
    key: "split",
    title: "UPI vs credit card",
    tag,
    isNow: false,
    value: empty ? "—" : `${percent(p.card / p.total)} card`,
    sub: empty ? "Nothing yet" : `${money(p.upi)} UPI · ${money(p.card)} card`,
    visual: { kind: "split", upi: empty ? 0 : p.upi / p.total, card: empty ? 0 : p.card / p.total, legend: empty ? [] : [{ name: "UPI", percent: percent(p.upi / p.total), colorKey: METHOD_COLORS.UPI }, { name: "Credit card", percent: percent(p.card / p.total), colorKey: METHOD_COLORS.Card }] },
  });

  const run = p.longestRun;
  w.push({
    key: "quiet",
    title: "Quiet days",
    tag,
    isNow: false,
    value: plural(p.quiet, "day"),
    sub: run && p.currentRun !== null ? `Longest run under the daily allowance: ${plural(run.run, "day")} (${formatMonthShort(run.month)}) · now ${p.currentRun}` : "Days with nothing written down",
    visual: isYear
      ? { kind: "columns", bars: p.months.map((x) => ({ height: x.isFuture || x.empty ? 6 : Math.max(8, (x.quiet / 4) * 100), className: x.isFuture || x.empty ? "fut" : "q", label: "JFMAMJJASOND"[Number(x.month.slice(5, 7)) - 1] })) }
      : { kind: "pills", pills: dayCols.slice(-12).map((d) => ({ text: String(d.day), state: d.spends.length === 0 ? "none" : "ok" })) },
  });

  if (isYear) {
    w.push({
      key: "inside",
      title: "Months inside the limit",
      tag,
      isNow: false,
      value: p.withLimit ? `${p.inside} of ${p.withLimit}` : "—",
      sub: p.withLimit ? (p.overMonths.length ? `${p.overMonths.map((o) => `${formatMonthShort(o.month)} ${money(o.total)}`).join(" and ")} went over` : "None went over") : model.limit === null ? "Set a limit to see these" : "Counted once a month is over",
      visual: { kind: "pills", pills: p.months.map((x) => ({ text: "JFMAMJJASOND"[Number(x.month.slice(5, 7)) - 1], state: x.isFuture || x.empty ? "fut" : x.month === model.current.month ? "cur" : x.limit === null ? "none" : x.total <= x.limit ? "ok" : "bad" })) },
    });
  } else {
    const du = p.daysUnder;
    w.push({
      key: "inside",
      title: "Days under the allowance",
      tag,
      isNow: false,
      value: du ? `${du.under} of ${du.of}` : "—",
      sub: du ? "Days at or under the limit divided by the days in the month" : "Set a limit to see these",
      visual: { kind: "pills", pills: dayCols.slice(-12).map((d) => { const a = (model.limitOf(p.key) ?? Infinity) / model.picked.length; return { text: String(d.day), state: d.total <= a ? "ok" : d.total <= a * 2 ? "mid" : "bad" }; }) },
    });
  }
  return w;
}

// ---------- Where it went, Month by month ----------

export interface WhereRow {
  id: string;
  name: string;
  colorKey: ColorKey;
  amount: string;
  share: string;
  fraction: number;
}
export interface WhereView {
  title: string;
  total: string;
  rows: WhereRow[];
}

export function whereView(model: DailyModel): WhereView {
  const p = model.period;
  const top = p.categories[0]?.amount ?? 1;
  return { title: `Where ${model.periodLabel} went`, total: money(p.total), rows: p.categories.map((c) => ({ id: c.category ?? "none", name: model.nameOf(c.category), colorKey: model.colorOf(c.category), amount: money(c.amount), share: percent(c.share), fraction: c.amount / top })) };
}

export interface MonthsRow {
  month: string;
  label: string;
  upi: number;
  card: number;
  total: string;
  diff: string;
  over: boolean;
  on: boolean;
  empty: boolean;
  /** Where the limit is, as a share of the widest bar, or null. */
  limit: number | null;
  href: string;
}
export interface MonthsView {
  title: string;
  note: string;
  limitLabel: string | null;
  rows: MonthsRow[];
}

export function monthsView(model: DailyModel, periodParam?: string): MonthsView {
  const p = model.period;
  const rows =
    p.kind === "year"
      ? p.months.map((x) => ({ month: x.month, upi: x.upi, card: x.card, total: x.total, count: x.count, empty: x.empty }))
      : monthRows(model.spends, model.today, p.key, 6).map((x) => ({ month: x.month, upi: x.upi, card: x.card, total: x.total, count: x.count, empty: x.count === 0 }));
  const max = Math.max(...rows.map((r) => r.total), ...rows.map((r) => model.limitOf(r.month) ?? 0), 1);
  const lim = model.limitOf(model.current.month);
  return {
    title: "Month by month",
    note: p.kind === "year" ? p.key : "the last six months",
    limitLabel: lim === null ? null : `${money(lim)} limit`,
    rows: rows.map((r): MonthsRow => {
      const limit = model.limitOf(r.month);
      const done = !r.empty && r.month <= model.current.month;
      return {
        month: r.month,
        label: p.kind === "year" ? MONTH_NAMES[Number(r.month.slice(5, 7)) - 1].slice(0, 3) : `${formatMonthShort(r.month)} ${r.month.slice(0, 4)}`,
        upi: r.upi / max,
        card: r.card / max,
        total: r.empty ? "—" : money(r.total),
        diff: !done || limit === null ? "" : r.total > limit ? `${money(r.total - limit)} over` : `${money(limit - r.total)} under`,
        over: done && limit !== null && r.total > limit,
        on: r.month === model.picked.month,
        empty: r.empty,
        limit: limit === null ? null : limit / max,
        href: monthHref(r.month, model.today, periodParam),
      };
    }),
  };
}

// ---------- The period picker ----------

export interface PeriodOption {
  value: string;
  label: string;
  meta: string;
  on: boolean;
}

export function periodOptions(model: DailyModel): { options: PeriodOption[]; value: string } {
  const start = diaryStart(model.spends);
  const thisYear = Number(model.today.slice(0, 4));
  const firstYear = start ? Math.min(Number(start.slice(0, 4)), thisYear) : thisYear;
  const isMonth = model.period.kind === "month";
  const options: PeriodOption[] = [{ value: "month", label: model.picked.isCurrent ? "This month" : formatMonthYear(model.picked.month), meta: formatMonthYear(model.picked.month), on: isMonth }];
  for (let y = thisYear; y >= firstYear; y--) options.push({ value: String(y), label: String(y), meta: y === thisYear ? "January to now" : "the whole year", on: !isMonth && model.periodLabel === String(y) });
  return { options, value: isMonth ? "month" : model.periodLabel };
}
