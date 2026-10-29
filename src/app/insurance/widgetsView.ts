import { daysBetween, monthOf, type MonthKey } from "@/lib/aggregate/cardSpend";
import { cashPaidIn, isLive, nextNcb, nextRenewal, premiumOverCover, premiumRunway, priceChanges, upcomingRenewals, yearlyCover, byRenewal, monthlyCover, type PolicyView } from "@/lib/aggregate/insurance";
import { addMonthsUTC } from "@/lib/aggregate/recurring";
import { addDays } from "@/lib/aggregate/subscriptionRenewals";
import { toClientPolicy } from "@/lib/forms/clientPolicy";
import type { ColorKey } from "@/lib/format/colors";
import { formatDate, formatMonthShort, formatShortDate } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { NCB_STEPS } from "@/lib/sheets/types";
import { ALL, allViews, coverWord, dayIn, inDays, lapsedAgo, paidFromName, paidText, percent, plural, policyColor, tileIcon, type InsuranceData, type TileIcon } from "./views";

/**
 * The widgets under the Insurance cover map (docs/design/insurance.md, InsFinal), in the page's order: the premium runway beside
 * Coming up, the policies table, Premiums paid beside Policy details (both follow the pick), the cover timeline beside the no-claim
 * bonus, then What cover costs. Plain, already-formatted data; the numbers come from lib/aggregate/insurance.ts. A widget that
 * follows the pick is keyed by pick id (`all`, or a policy's id). Nothing here carries a whole policy number.
 */

export interface PolicyBadge {
  id: string;
  name: string;
  colorKey: ColorKey;
}
const badge = (v: PolicyView): PolicyBadge => ({ id: v.policy.id, name: v.policy.name, colorKey: policyColor(v.policy) });

// ---------- The premium runway ----------

export interface RunwayItem {
  policyId: string;
  name: string;
  colorKey: ColorKey;
  amount: number;
  /** The money left (solid) or is a renewal still to come at the last premium (dashed). */
  paid: boolean;
  /** The day it left or falls due, and a note when that day is a guess or the premium buys several years. */
  on: string;
  note?: string;
}

export interface RunwayMonth {
  key: MonthKey;
  /** "Jul 2026". */
  label: string;
  /** The month's first letter, and its year under January (or the first month). */
  letter: string;
  year?: string;
  items: RunwayItem[];
  total: number;
  now: boolean;
}

export interface RunwayRange {
  months: RunwayMonth[];
  top: number;
}

export interface RunwayView {
  /** The whole span, and the next twelve months. */
  ranges: { all: RunwayRange; next: RunwayRange };
  allLabel: string;
  legend: PolicyBadge[];
  /** A year of cover spread evenly over twelve months. */
  monthly: number;
  monthlyText: string;
  /** How far through the current month today is, 0 to 1: where the Today line sits in its column. */
  monthShare: number;
  note: string;
}

const monthAdd = (key: MonthKey, n: number): MonthKey => addMonthsUTC(`${key}-01`, n).slice(0, 7);
const MAX_MONTHS = 48;

function runwayRange(views: PolicyView[], from: MonthKey, to: MonthKey, today: string): RunwayRange {
  const nowKey = monthOf(today);
  const byId = new Map(views.map((v) => [v.policy.id, v]));
  const months = premiumRunway(views, from, to).map((m, k): RunwayMonth => {
    return {
      key: m.month,
      label: `${formatMonthShort(m.month)} ${m.month.slice(0, 4)}`,
      letter: formatMonthShort(m.month).slice(0, 1),
      year: k === 0 || m.month.endsWith("-01") ? m.month.slice(0, 4) : undefined,
      items: m.items
        .map((i): RunwayItem => {
          const v = byId.get(i.policyId)!;
          const years = (i.paid ? v.terms.find((t) => t.cashDay === i.on && t.payment.amount === i.amount) : v.latest)?.payment.years ?? 1;
          return { policyId: i.policyId, name: v.policy.name, colorKey: policyColor(v.policy), amount: i.amount, paid: i.paid, on: formatDate(i.on), note: [i.assumed ? "day assumed" : "", years > 1 ? `${years} years` : ""].filter(Boolean).join(" · ") || undefined };
        })
        .sort((a, b) => b.amount - a.amount),
      total: m.total,
      now: m.month === nowKey,
    };
  });
  return { months, top: Math.max(1, ...months.map((m) => m.total)) };
}

export function runwayView(data: InsuranceData, today: string): RunwayView {
  const views = allViews(data, today);
  const live = views.filter(isLive);
  const nowKey = monthOf(today);
  const year = Number(today.slice(0, 4));
  const from = `${year}-01`;
  const lastRenewal = live.reduce((last, v) => (v.renewsOn && monthOf(v.renewsOn) > last ? monthOf(v.renewsOn) : last), monthAdd(nowKey, 11));
  let to = lastRenewal;
  if (monthsSpan(from, to) > MAX_MONTHS) to = monthAdd(from, MAX_MONTHS - 1);
  const all = runwayRange(views, from, to, today);
  const next = runwayRange(views, nowKey, monthAdd(nowKey, 11), today);
  const monthly = monthlyCover(live);
  const paidThisYear = cashPaidIn(year, data.payments, today);
  const biggest = views.flatMap((v) => v.terms.filter((t) => cashPaidIn(year, [t.payment], today).total > 0).map((t) => ({ v, t }))).sort((a, b) => b.t.payment.amount - a.t.payment.amount)[0];
  const coming = upcomingRenewals(live, addMonthsUTC(today, 24)).filter((r) => r.on > today).sort((a, b) => (a.on < b.on ? -1 : 1)).slice(0, 2);
  const notes: string[] = [];
  if (biggest && paidThisYear.total > 0 && biggest.t.payment.years > 1) {
    notes.push(`${percent(biggest.t.payment.amount / paidThisYear.total)} of what left in ${year} was the ${biggest.v.policy.name.toLowerCase()} premium, paid once for ${biggest.t.payment.years} years: ${formatInr(paidThisYear.total)} left against ${formatInr(yearlyCover(live))} a year of cover.`);
  }
  if (coming.length) notes.push(`${coming.length === 1 ? "The next bill is" : "The next bills are"} ${coming.map((r) => `${formatInr(r.amount)} in ${formatMonthShort(monthOf(r.on))} ${r.on.slice(0, 4)}`).join(", then ")}.`);
  notes.push("The dashed line is a year of cover spread evenly.");
  return {
    ranges: { all, next },
    allLabel: `${from.slice(0, 4)} to ${to.slice(0, 4)}`,
    legend: views.filter((v) => v.terms.length > 0).map(badge),
    monthly,
    monthlyText: `${formatInr(Math.round(monthly))} a month if spread evenly`,
    monthShare: Number(today.slice(8)) / daysBetween(`${nowKey}-01`, addMonthsUTC(`${nowKey}-01`, 1)),
    note: notes.join(" "),
  };
}

const monthsSpan = (from: MonthKey, to: MonthKey) => (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7)) + 1;

// ---------- Coming up ----------

export interface ComingUpRow {
  id: string;
  policyId: string;
  day: string;
  month: string;
  title: string;
  when: string;
  soon: boolean;
  detail: string;
  amount: string;
}

export interface ComingUpView {
  rows: ComingUpRow[];
  foot: string;
}

export function comingUpView(data: InsuranceData, today: string): ComingUpView {
  const live = allViews(data, today).filter(isLive);
  const ordered = byRenewal(live);
  const rows = ordered.map((v): ComingUpRow => {
    const last = v.latest!.payment;
    const ncb = last.ncb !== undefined ? ` · NCB ${last.ncb}% → ${nextNcb(last.ncb)}%` : "";
    const days = v.daysLeft as number;
    return {
      id: v.policy.id,
      policyId: v.policy.id,
      day: String(Number((v.renewsOn as string).slice(8))),
      month: formatMonthShort((v.renewsOn as string).slice(0, 7)).toUpperCase(),
      title: `${v.policy.name} · ${v.policy.insurer}`,
      when: inDays(days),
      soon: v.state === "Renew soon",
      detail: `${(v.renewsOn as string).slice(0, 4)} · last paid ${formatInr(last.amount)}${last.years > 1 ? ` for ${last.years} years` : ""}${ncb}`,
      amount: formatInr(last.amount),
    };
  });
  const within = upcomingRenewals(live, addDays(today, 90));
  const sum = within.reduce((t, r) => t + r.amount, 0);
  return { rows, foot: within.length ? `Next 90 days: ${formatInr(sum)} from ${plural(within.length, "renewal")}` : "Next 90 days: nothing falls due" };
}

// ---------- The policies table ----------

export interface TableRow {
  id: string;
  name: string;
  sub: string;
  colorKey: ColorKey;
  icon: TileIcon;
  cover: string;
  coverWord: string;
  paid: string;
  paidSub: string;
  year: string;
  yearSub: string;
  elapsed: number;
  warn: boolean;
  off: boolean;
  termSub: string;
  renews: string;
  renewsSub: string;
  renewsTone: "soon" | "lapsed" | "off" | "plain";
  state: PolicyView["state"];
}

export interface TableView {
  rows: TableRow[];
  foot: string;
}

const kindIcon = (v: PolicyView): TileIcon => tileIcon(v.policy.covers, v.policy.kind);

export function tableView(data: InsuranceData, today: string): TableView {
  const views = allViews(data, today);
  const rows = views.map((v): TableRow => {
    const p = v.policy;
    const cur = v.current;
    const off = v.state === "Cancelled";
    const warn = v.state === "Renew soon" || v.state === "Lapsed";
    const payment = cur?.payment;
    const termSub = off
      ? `Cancelled${p.endedOn ? ` ${formatShortDate(p.endedOn)}` : ""} · payments kept`
      : v.state === "Lapsed"
        ? `Lapsed ${plural(lapsedAgo(v, today), "day")} ago`
        : v.state === "Not started"
          ? `Starts ${formatShortDate(v.terms[0].start)}`
          : cur && v.daysLeft !== null
            ? `${plural(v.daysLeft, "day")} left · to ${formatDate(cur.end)}`
            : "No term recorded";
    return {
      id: p.id,
      name: p.name,
      sub: `${p.insurer} · ${p.covers}`,
      colorKey: policyColor(p),
      icon: kindIcon(v),
      cover: formatInrCompact(p.sumInsured),
      coverWord: coverWord(p),
      paid: payment ? formatInr(payment.amount) : "—",
      paidSub: payment ? (payment.years > 1 ? `once, for ${payment.years} years` : "for the year") : "",
      year: v.yearly !== null ? formatInr(v.yearly) : "—",
      yearSub: v.monthly !== null ? `${formatInr(Math.round(v.monthly))} a month` : "",
      elapsed: v.elapsed,
      warn,
      off,
      termSub,
      renews: off ? "Cancelled" : v.renewsOn ? formatDate(v.renewsOn) : "—",
      renewsSub: off || v.daysLeft === null ? "" : v.state === "Lapsed" && v.latest && v.latest.start > today ? `next term starts ${formatShortDate(v.latest.start)}` : inDays(v.daysLeft),
      renewsTone: off ? "off" : v.state === "Lapsed" ? "lapsed" : v.state === "Renew soon" ? "soon" : "plain",
      state: v.state,
    };
  });
  const live = views.filter(isLive);
  const yearly = yearlyCover(live);
  return { rows, foot: `${plural(views.length, "policy", "policies")} · ${formatInr(yearly)} a year of cover · ${formatInr(Math.round(yearly / 12))} a month` };
}

// ---------- Premiums paid (follows the pick) ----------

export interface PaymentRow {
  id: string;
  policyId: string;
  /** "Jul 5" and its year, with "assumed" when the day paid isn't recorded. */
  day: string;
  year: string;
  assumed: boolean;
  name: string;
  insurer: string;
  colorKey: ColorKey;
  period: string;
  years: string;
  amount: string;
  change: { text: string; tone: "up" | "down" | "flat" | "first" };
  from: string | null;
}

export interface PaymentsView {
  rows: PaymentRow[];
  /** Under a picked policy: what it has cost in all. */
  tiles: { label: string; value: string }[] | null;
  foot: string;
}

function paymentRows(data: InsuranceData, views: PolicyView[]): { row: PaymentRow; day: string; amount: number; years: number }[] {
  return views.flatMap((v) => {
    const changes = priceChanges(v.terms);
    return v.terms.map((t, k) => {
      const c = changes[k];
      const place = paidFromName(data, t.payment) ?? paidFromName(data, v.policy);
      const row: PaymentRow = {
        id: t.payment.id,
        policyId: v.policy.id,
        day: formatShortDate(t.cashDay),
        year: t.cashDay.slice(0, 4),
        assumed: t.assumed,
        name: v.policy.name,
        insurer: v.policy.insurer,
        colorKey: policyColor(v.policy),
        period: `${formatShortDate(t.start)} to ${formatDate(t.end)}`,
        years: t.payment.years === 1 ? "1 year" : `${t.payment.years} years`,
        amount: formatInr(t.payment.amount),
        change: c === null ? { text: "first", tone: "first" } : Math.abs(c) < 0.0005 ? { text: "same", tone: "flat" } : { text: `${c > 0 ? "+" : "−"}${Math.abs(c * 100).toFixed(Math.abs(c) < 0.1 ? 1 : 0)}%`, tone: c > 0 ? "up" : "down" },
        from: place ?? null,
      };
      return { row, day: t.cashDay, amount: t.payment.amount, years: t.payment.years };
    });
  });
}

export function paymentsView(data: InsuranceData, today: string, pickId: string): PaymentsView {
  const views = allViews(data, today).filter((v) => pickId === ALL || v.policy.id === pickId);
  const all = paymentRows(data, views).sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  const total = all.reduce((t, r) => t + r.amount, 0);
  const years = all.reduce((t, r) => t + r.years, 0);
  const since = all.length ? all[all.length - 1].day : null;
  return {
    rows: all.map((r) => r.row),
    tiles: pickId !== ALL && all.length ? [{ label: "Paid in all", value: formatInr(total) }, { label: "Years of cover bought", value: String(years) }, { label: "A year of it", value: formatInr(total / years) }] : null,
    foot: all.length ? `${plural(all.length, "payment")} · ${formatInr(total)} paid since ${formatDate(since!)}` : "Nothing paid yet",
  };
}

// ---------- Policy details (follows the pick) ----------

export interface DetailField {
  key: string;
  label: string;
  value: string;
  /** A link to open, for the policy document. */
  href?: string;
  /** Spans both columns. */
  full?: boolean;
  /** Drawn quiet: nothing recorded. */
  quiet?: boolean;
}

export interface DetailsView {
  policyId: string;
  name: string;
  sub: string;
  colorKey: ColorKey;
  icon: TileIcon;
  state: PolicyView["state"];
  stateText: string;
  fields: DetailField[];
  addOns: string[];
  foot: string;
  /** Under All policies: which one is shown. */
  note?: string;
}

function detailsOf(data: InsuranceData, v: PolicyView, today: string): DetailsView {
  const p = v.policy;
  const client = toClientPolicy(p);
  const cur = v.current;
  const payment = cur?.payment;
  const place = (payment && paidFromName(data, payment)) ?? paidFromName(data, p);
  const field = (key: string, label: string, value: string | undefined, extra: Partial<DetailField> = {}): DetailField => ({ key, label, value: value ?? "Not recorded", quiet: value === undefined, ...extra });
  const ncbText = payment?.ncb !== undefined ? `${payment.ncb}% now${nextNcb(payment.ncb) !== payment.ncb ? `, ${nextNcb(payment.ncb)}% at renewal` : ", the top step"}` : undefined;
  const fields: DetailField[] = [
    field("number", "Policy number", client.policyNumber),
    field("cover", coverWord(p), formatInr(p.sumInsured)),
    field("term", "This term", cur ? `${formatShortDate(cur.start)} to ${formatDate(cur.end)}` : undefined),
    field("paid", "Paid", payment ? (payment.years > 1 ? `${formatInr(payment.amount)} once, ${formatInr(payment.amount / payment.years)} a year` : `${formatInr(payment.amount)} for the year`) : undefined),
    field("insured", "Insured", p.coversDetail ? `${p.covers} · ${p.coversDetail}` : p.covers),
    field("from", "Paid from", place),
    ...(p.kind === "Motor" ? [field("ncb", "No-claim bonus", ncbText)] : []),
    ...(p.claimsPhone ? [field("phone", "Claims helpline", p.claimsPhone)] : []),
    ...(p.notes ? [field("notes", "Notes", p.notes, { full: true })] : []),
    p.documentUrl ? field("doc", "Policy document", "Open the PDF", { href: p.documentUrl }) : field("doc", "Policy document", undefined),
  ];
  const stateText = v.state === "Lapsed" ? `Lapsed ${plural(lapsedAgo(v, today), "day")} ago` : v.state === "Renew soon" ? `Renews ${inDays(v.daysLeft as number)}` : v.state;
  return {
    policyId: p.id,
    name: p.name,
    sub: `${p.insurer} · ${p.covers}${p.coversDetail ? ` · ${p.coversDetail}` : ""}`,
    colorKey: policyColor(p),
    icon: kindIcon(v),
    state: v.state,
    stateText,
    fields,
    addOns: (p.addOns ?? "").split(",").map((a) => a.trim()).filter(Boolean),
    foot: v.terms.length ? `Started ${formatDate(v.terms[0].start)} · ${plural(v.terms.length, "term")} paid` : "No term recorded",
  };
}

/** The details of each policy, and under `all` the next to renew (or the first policy when none is held). */
export function detailsView(data: InsuranceData, today: string): Record<string, DetailsView | null> {
  const views = allViews(data, today);
  const out: Record<string, DetailsView | null> = {};
  const shown = nextRenewal(views) ?? views[0];
  out[ALL] = shown ? { ...detailsOf(data, shown, today), note: "Showing the next to renew" } : null;
  for (const v of views) out[v.policy.id] = detailsOf(data, v, today);
  return out;
}

// ---------- The cover timeline ----------

export interface TimelineBar {
  key: string;
  left: number;
  width: number;
  label: string;
  tip: { head: string; total: string; detail: string; rows: { name: string; amount: string }[]; foot: string };
}

export interface TimelineRow extends PolicyBadge {
  icon: TileIcon;
  off: boolean;
  bars: TimelineBar[];
}

export interface TimelineView {
  years: { label: string; left: number }[];
  rows: TimelineRow[];
  /** Today's place on the axis, as a share. */
  nowAt: number;
  note: string;
}

export function timelineView(data: InsuranceData, today: string): TimelineView {
  const views = allViews(data, today).filter((v) => v.terms.length > 0);
  const startYear = Math.min(Number(today.slice(0, 4)), ...views.map((v) => Number(v.terms[0].start.slice(0, 4))));
  const endYear = Math.max(startYear + 2, ...views.map((v) => Number((v.renewsOn as string).slice(0, 4))));
  const from = `${startYear}-01-01`;
  const to = `${endYear + 1}-01-01`;
  const span = daysBetween(from, to);
  const at = (iso: string) => Math.min(100, Math.max(0, (daysBetween(from, iso) / span) * 100));
  const rows = views.map((v): TimelineRow => ({
    ...badge(v),
    icon: kindIcon(v),
    off: v.state === "Cancelled",
    // A cancelled policy's cover stops the day it was cancelled, whatever its last term had left to run.
    bars: v.terms.filter((t) => !v.policy.endedOn || v.state !== "Cancelled" || t.start <= v.policy.endedOn).map((t) => ({
      key: t.payment.id,
      left: at(t.start),
      width: Math.max(1, at(v.state === "Cancelled" && v.policy.endedOn && v.policy.endedOn < t.renewsOn ? addDays(v.policy.endedOn, 1) : t.renewsOn) - at(t.start)),
      label: `${t.payment.years === 1 ? "1 year" : `${t.payment.years} years`} · ${formatInr(t.payment.amount)}`,
      tip: {
        head: v.policy.name,
        total: `${t.payment.years === 1 ? "1 year" : `${t.payment.years} years`} of cover`,
        detail: `${formatDate(t.start)} to ${formatDate(t.end)}`,
        rows: [
          { name: "Paid", amount: paidText(t.payment) },
          { name: "A year of it", amount: formatInr(t.perYear) },
        ],
        foot: `Renews ${formatDate(t.renewsOn)} · ${inDays(daysBetween(today, t.renewsOn))}`,
      },
    })),
  }));
  const multi = views.filter((v) => isLive(v) && v.latest!.payment.years > 1);
  return {
    years: Array.from({ length: endYear - startYear + 1 }, (_, k) => ({ label: String(startYear + k), left: at(`${startYear + k}-01-01`) })),
    rows,
    nowAt: at(today),
    note: `The line at the end of a bar is the renewal day.${multi.length ? ` A single premium buys the whole bar, so the ${multi.map((v) => v.policy.name.toLowerCase()).join(" and ")} ${multi.length === 1 ? "is" : "are"} paid for until ${multi.map((v) => formatDate(addDays(v.renewsOn as string, -1))).join(" and ")}.` : ""}`,
  };
}

// ---------- The no-claim bonus ----------

export interface NcbRow extends PolicyBadge {
  icon: TileIcon;
  now: number;
  next: number;
  steps: { pct: number; state: "done" | "now" | "next" | "todo" }[];
  text: string;
}

export interface NcbView {
  rows: NcbRow[];
  note: string;
}

/** The ladder of each motor policy whose current term records a no-claim step, or null with none. */
export function ncbView(data: InsuranceData, today: string): NcbView | null {
  const rows = allViews(data, today)
    .filter((v) => isLive(v) && v.policy.kind === "Motor" && v.current?.payment.ncb !== undefined)
    .map((v): NcbRow => {
      const now = v.current!.payment.ncb as number;
      const next = nextNcb(now);
      return {
        ...badge(v),
        icon: kindIcon(v),
        now,
        next,
        steps: NCB_STEPS.map((pct) => ({ pct, state: pct < now ? "done" : pct === now ? "now" : pct === next ? "next" : "todo" })),
        text: next !== now ? `${now}% now, ${next}% on ${dayIn(today, v.renewsOn as string)}` : `${now}% now, the top step`,
      };
    });
  if (rows.length === 0) return null;
  return { rows, note: "A term with no claim moves a policy up a step at renewal, and a claim sends it back to 0%. The app can't see claims, so the step is the one on the insurer's certificate." };
}

// ---------- What cover costs ----------

export interface CostRow extends PolicyBadge {
  icon: TileIcon;
  year: string;
  cover: string;
  rate: string;
  share: number;
}

export interface CostView {
  rows: CostRow[];
  yearText: string;
  monthText: string;
  note: string;
}

export function costView(data: InsuranceData, today: string): CostView | null {
  const live = allViews(data, today).filter(isLive);
  if (live.length === 0) return null;
  const total = yearlyCover(live);
  const rows = live.map((v): CostRow => {
    const rate = premiumOverCover(v);
    return { ...badge(v), icon: kindIcon(v), year: formatInr(v.yearly ?? 0), cover: formatInrCompact(v.policy.sumInsured), rate: rate === null ? "—" : `${(rate * 100).toFixed(rate < 0.01 ? 2 : 1)}%`, share: total ? (v.yearly ?? 0) / total : 0 };
  });
  return {
    rows,
    yearText: `${formatInr(total)} a year`,
    monthText: `${formatInr(Math.round(total / 12))} a month`,
    note: "A year ÷ cover is what each ₹100 of cover costs a year. It's for reading a policy's price against its own history, not for comparing an accident cover with a motor policy. A single premium is spread over the years it bought.",
  };
}

export interface InsuranceWidgets {
  runway: RunwayView;
  comingUp: ComingUpView;
  table: TableView;
  payments: Record<string, PaymentsView>;
  details: Record<string, DetailsView | null>;
  timeline: TimelineView;
  ncb: NcbView | null;
  cost: CostView | null;
}

export function insuranceWidgets(data: InsuranceData, today: string, pickIds: string[]): InsuranceWidgets {
  return {
    runway: runwayView(data, today),
    comingUp: comingUpView(data, today),
    table: tableView(data, today),
    payments: Object.fromEntries(pickIds.map((id) => [id, paymentsView(data, today, id)])),
    details: detailsView(data, today),
    timeline: timelineView(data, today),
    ncb: ncbView(data, today),
    cost: costView(data, today),
  };
}
