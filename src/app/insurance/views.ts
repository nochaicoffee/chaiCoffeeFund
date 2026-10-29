import type { SentencePart } from "@/app/cards/summarySentence";
import type { GreetingRowData } from "@/components/shell/GreetingParts";
import { daysBetween } from "@/lib/aggregate/cardSpend";
import { cashPaidIn, coverByKind, isLive, nextRenewal, renewingWithin, uninsuredLoans, viewPolicies, yearlyCover, RENEW_SOON_DAYS, type PolicyView } from "@/lib/aggregate/insurance";
import { addDays } from "@/lib/aggregate/subscriptionRenewals";
import { cardColorKey, type ColorKey } from "@/lib/format/colors";
import { formatDate, formatShortDate } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import type { Loan, Policy, PolicyKind, PolicyPayment } from "@/lib/sheets/types";

/**
 * What the Insurance page shows (docs/design/insurance.md, InsFinal), as plain, already-formatted data: the greeting's sentence and
 * the cards its figures point at, the attention strip, and the cover map. The numbers come from lib/aggregate/insurance.ts. Nothing
 * here carries a policy number: the page's client components get these views, never a Policy.
 */

export const ALL = "all";

/** An Insurance page's address, keeping `?demo` bare (or `?demo=lapsed`) and leaving out the default pick (all policies). */
export function insuranceHref(path: "/insurance" | "/insurance/payments", { demo, policy }: { demo: string | null; policy?: string }): string {
  const q = new URLSearchParams();
  if (demo !== null) q.set("demo", demo);
  if (policy && policy !== ALL) q.set("policy", policy);
  const text = q.toString().replace(/(^|&)demo=(&|$)/, "$1demo$2");
  return `${path}${text ? `?${text}` : ""}`;
}

export interface InsuranceData {
  policies: Policy[];
  payments: PolicyPayment[];
  /** Only what the gap check reads: an Auto or Home loan with nothing against it. */
  loans: Pick<Loan, "id" | "name" | "lenderName" | "category" | "status">[];
  /** Names only, for where a premium was paid from. */
  accounts: { id: string; name: string }[];
  cards: { id: string; name: string; color: ColorKey }[];
}

const viewsOf = new WeakMap<InsuranceData, Map<string, PolicyView[]>>();

/** Every policy's view today, worked out once per page's data. */
export function allViews(data: InsuranceData, today: string): PolicyView[] {
  const byDay = viewsOf.get(data) ?? new Map<string, PolicyView[]>();
  viewsOf.set(data, byDay);
  const known = byDay.get(today);
  if (known) return known;
  const views = viewPolicies(data.policies, data.payments, today);
  byDay.set(today, views);
  return views;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const percent = (share: number) => `${Math.round(share * 100)}%`;
const WORD: Record<number, string> = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five" };

const KIND_COLOR: Record<PolicyKind, ColorKey> = { Health: "teal", Life: "sapphire", Motor: "copper", Home: "emerald", Accident: "violet" };
/** A policy's colour: the one it was given, or its kind's. */
export const policyColor = (policy: Pick<Policy, "color" | "kind">): ColorKey => (policy.color ? cardColorKey(policy.color) : KIND_COLOR[policy.kind]);

/** What a policy is called in a sentence: "the health cover", or for a vehicle what it covers ("the car cover"). */
export const coverName = (policy: Pick<Policy, "kind" | "covers">) => `${policy.kind === "Motor" ? policy.covers.toLowerCase() : policy.kind.toLowerCase()} cover`;
export const coverWord = (policy: Pick<Policy, "kind">) => (policy.kind === "Motor" ? "IDV" : policy.kind === "Life" ? "Sum assured" : "Sum insured");
export const paidText = (payment: Pick<PolicyPayment, "amount" | "years">) => (payment.years > 1 ? `${formatInr(payment.amount)} once, for ${payment.years} years` : `${formatInr(payment.amount)} for the year`);
export const inDays = (n: number) => (n === 0 ? "today" : n === 1 ? "tomorrow" : n > 0 ? `in ${n} days` : n === -1 ? "yesterday" : `${-n} days ago`);
/** A day without its year when it falls in this one. */
export const dayIn = (today: string, date: string) => (date.slice(0, 4) === today.slice(0, 4) ? formatShortDate(date) : formatDate(date));
/** Days since a lapsed policy lapsed: cover ended the day before its term's renewal date, and the lapse is counted from that date. */
export const lapsedAgo = (view: PolicyView, today: string) => (view.current ? daysBetween(view.current.renewsOn, today) : 0);

// ---------- The greeting ----------

export type InsurancePoint = "policies" | "health" | "life" | "accident" | "home" | "vehicles" | "year" | "paid" | "next" | "gap";
export type InsuranceGreetingCards = Partial<Record<InsurancePoint, { title: string; total: string; rows: GreetingRowData[]; note?: string }>>;

const NON_VEHICLE_KINDS = ["Health", "Life", "Accident", "Home"] as const;

/** The policies bought for several years at once whose cash left in `year`, for the "paid this year" clause. */
function multiYearPaid(live: PolicyView[], year: number, today: string): PolicyView[] {
  return live.filter((v) => v.terms.some((t) => t.payment.years > 1 && cashPaidIn(year, [t.payment], today).total > 0));
}

export function summarySentence(data: InsuranceData, today: string): SentencePart[] {
  const views = allViews(data, today);
  const live = views.filter(isLive);
  if (data.policies.length === 0) return [{ text: "No policies yet. Add one, and this page shows what you're covered for, what it costs and when each one renews." }];
  const lapsed = views.filter((v) => v.state === "Lapsed");
  const lapsedText = lapsed.length ? ` The ${lapsed.map((v) => `${coverName(v.policy)} lapsed ${inDays(-lapsedAgo(v, today))}`).join(" and the ")}.` : "";
  if (live.length === 0) return [{ text: `Nothing is in force right now.${lapsedText}${lapsed.length ? " Renew to be covered again." : ` ${plural(data.policies.length, "policy", "policies")} on record, none of them current.`}` }];

  const year = Number(today.slice(0, 4));
  const yearly = yearlyCover(live);
  const covers = coverByKind(live);
  const parts: SentencePart[] = [{ text: "You're covered by " }, { text: plural(live.length, "policy", "policies"), strong: true, point: "policies" }];
  const phrases: SentencePart[][] = [];
  for (const kind of NON_VEHICLE_KINDS) {
    if (covers[kind] > 0) phrases.push([{ text: formatInrCompact(covers[kind]), strong: true, point: kind.toLowerCase() }, { text: ` of ${kind.toLowerCase()} cover` }]);
  }
  const vehicles = live.filter((v) => v.policy.kind === "Motor");
  if (vehicles.length) {
    const figures = vehicles.flatMap((v, k): SentencePart[] => [{ text: k === 0 ? "" : k === vehicles.length - 1 ? " and " : ", " }, { text: formatInrCompact(v.policy.sumInsured), strong: true, point: "vehicles" }]);
    phrases.push([{ text: `the ${vehicles.map((v) => v.policy.covers.toLowerCase()).join(" and ")} insured up to ` }, ...figures]);
  }
  phrases.forEach((phrase, k) => parts.push({ text: k === 0 ? ": " : k === phrases.length - 1 ? ", and " : ", " }, ...phrase));
  parts.push({ text: ". A year of cover costs " }, { text: formatInr(yearly), strong: true, point: "year" }, { text: `, ${formatInr(Math.round(yearly / 12))} a month` });

  const paid = cashPaidIn(year, data.payments, today).total;
  const bulk = multiYearPaid(live, year, today);
  if (paid > 0 && bulk.length) {
    const years = [...new Set(bulk.flatMap((v) => v.terms.filter((t) => t.payment.years > 1).map((t) => WORD[t.payment.years] ?? String(t.payment.years))))];
    parts.push({ text: ", though " }, { text: formatInr(paid), strong: true, point: "paid" }, { text: ` left your accounts this year because the ${bulk.map((v) => coverName(v.policy).replace(/ cover$/, "")).join(" and ")} cover${bulk.length === 1 ? " was" : " were"} bought for ${years.join(" and ")} years at once` });
  } else if (paid > 0) parts.push({ text: ", and " }, { text: formatInr(paid), strong: true, point: "paid" }, { text: " of it is paid so far this year" });
  parts.push({ text: "." });

  const next = nextRenewal(live)!;
  parts.push({ text: ` The next renewal is the ${coverName(next.policy)} on ` }, { text: dayIn(today, next.renewsOn as string), strong: true, point: "next" }, { text: ` (${inDays(next.daysLeft as number)}).` });
  const closeBehind = renewingWithin(live).length - 1;
  if (closeBehind > 0) parts.push({ text: ` ${plural(closeBehind, "more")} within a month.` });
  if (lapsedText) parts.push({ text: lapsedText });
  const gaps = uninsuredLoans(data.loans, views);
  if (gaps.length) parts.push({ text: " Your " }, { text: gaps[0].name, strong: true, point: "gap" }, { text: `${gaps.length > 1 ? ` and ${plural(gaps.length - 1, "other loan")}` : ""} ha${gaps.length > 1 ? "ve" : "s"} no policy recorded.` });
  return parts;
}

export function greetingView(data: InsuranceData, today: string): InsuranceGreetingCards {
  const views = allViews(data, today);
  const live = views.filter(isLive);
  if (live.length === 0) return {};
  const year = Number(today.slice(0, 4));
  const yearly = yearlyCover(live);
  const covers = coverByKind(live);
  const row = (v: PolicyView, amount: string, note?: string, fraction?: number): GreetingRowData => ({ key: v.policy.id, name: v.policy.name, colorKey: policyColor(v.policy), amount, note, fraction });
  const cards: InsuranceGreetingCards = {
    policies: {
      title: "Policies in force",
      total: plural(live.length, "policy", "policies"),
      rows: live.map((v) => row(v, formatInrCompact(v.policy.sumInsured), `${v.policy.insurer} · ${v.policy.covers}`)),
      note: "Cover is the sum insured, or the IDV for a vehicle.",
    },
  };
  for (const kind of NON_VEHICLE_KINDS) {
    const ofKind = live.filter((v) => v.policy.kind === kind);
    if (!ofKind.length) continue;
    cards[kind.toLowerCase() as InsurancePoint] = {
      title: `${kind} cover`,
      total: formatInrCompact(covers[kind]),
      rows: ofKind.map((v) => row(v, formatInr(v.current!.payment.amount), `${v.policy.insurer} · ${v.current!.payment.years > 1 ? `paid once for ${v.current!.payment.years} years` : "paid for the year"}`)),
      note: `A year of it: ${formatInr(ofKind.reduce((t, v) => t + (v.yearly ?? 0), 0))}.`,
    };
  }
  const vehicles = live.filter((v) => v.policy.kind === "Motor");
  if (vehicles.length) {
    cards.vehicles = {
      title: "Insured declared value",
      total: vehicles.map((v) => formatInrCompact(v.policy.sumInsured)).join(" · "),
      rows: vehicles.map((v) => row(v, formatInr(v.policy.sumInsured), `${v.policy.insurer}${v.policy.coversDetail ? ` · ${v.policy.coversDetail}` : ""}`)),
      note: "The most the insurer pays if the vehicle is stolen or written off. It falls with the vehicle's age, so it's worth checking at each renewal.",
    };
  }
  cards.year = {
    title: "A year of cover",
    total: formatInr(yearly),
    rows: live.map((v) => row(v, formatInr(v.yearly ?? 0), v.current!.payment.years > 1 ? `${paidText(v.current!.payment)}, spread` : "Paid each year", yearly ? (v.yearly ?? 0) / yearly : 0)),
    note: "What every policy costs a year, with a premium paid once for several years spread over them.",
  };
  const paid = cashPaidIn(year, data.payments, today);
  if (paid.total > 0) {
    const paidRows = views.flatMap((v) => v.terms.filter((t) => cashPaidIn(year, [t.payment], today).total > 0).map((t) => ({ v, t }))).sort((a, b) => (a.t.cashDay < b.t.cashDay ? -1 : 1));
    cards.paid = {
      title: `Paid in ${year}`,
      total: formatInr(paid.total),
      rows: paidRows.map(({ v, t }) => row(v, formatInr(t.payment.amount), `${formatShortDate(t.cashDay > today ? today : t.cashDay)}${t.assumed ? " (assumed)" : ""}${t.payment.years > 1 ? ` · ${t.payment.years} years` : ""}`)),
      note: paid.assumed > 0 ? `${formatInr(paid.assumed)} of it is dated by the day its cover began, because the day paid isn't recorded.` : "Cash that left your accounts in the calendar year. A premium for several years is all in the year it was paid.",
    };
  }
  const next = nextRenewal(live)!;
  cards.next = {
    title: `${next.policy.name} · ${next.policy.insurer}`,
    total: dayIn(today, next.renewsOn as string),
    rows: [
      { key: "cover", name: coverWord(next.policy), colorKey: policyColor(next.policy), amount: formatInrCompact(next.policy.sumInsured) },
      { key: "term", name: "Last term", colorKey: policyColor(next.policy), amount: next.latest!.payment.years === 1 ? "1 year" : `${next.latest!.payment.years} years`, note: `Paid ${formatInr(next.latest!.payment.amount)}` },
    ],
    note: `${inDays(next.daysLeft as number)[0].toUpperCase()}${inDays(next.daysLeft as number).slice(1)}. The insurer's quote may differ from the last premium.`,
  };
  const gaps = uninsuredLoans(data.loans, views);
  if (gaps.length) {
    cards.gap = {
      title: "Loans with no policy recorded",
      total: plural(gaps.length, "loan"),
      rows: gaps.map((l) => ({ key: l.id, name: l.name, colorKey: "slate", amount: l.category, note: `${l.lenderName} · on your Loans page` })),
      note: "Worked out from your loans. The app can't tell which one a loan financed, and doesn't say whether you need a policy.",
    };
  }
  return cards;
}

// ---------- The attention strip ----------

/** A note that says owner-driver cover is left out, excluded or already had from another policy: not one that only mentions it (an included owner-driver cover). */
export const LEAVES_OWNER_DRIVER_OUT = /owner[- ]driver[^.;]*\b(left out|leaves? out|excluded|exempt(ed)?|not (included|covered)|relies|already (have|having|has))\b|\b(left out|excludes?|exempt(ed)?)\b[^.;]*owner[- ]driver|already having PA cover/i;

export interface AttentionItem {
  policyId: string;
  name: string;
  /** Bold lead-in, then the sentence. */
  text: string;
  tone: "lapsed" | "soon";
}

/** A line for each policy that has lapsed (first) and each one due to renew within the window, soonest first. */
export function attentionView(data: InsuranceData, today: string): AttentionItem[] {
  const views = allViews(data, today);
  const lapsed = views
    .filter((v) => v.state === "Lapsed")
    .map((v): AttentionItem => {
      const on = v.current!.renewsOn;
      const later = v.latest && v.latest.start > today ? ` The next term starts ${formatDate(v.latest.start)}.` : " No renewal is recorded.";
      // Motor policies whose notes say they leave owner-driver cover out (or rely on a PA cover): with this accident cover lapsed, nothing covers you as their driver.
      const relying = v.policy.kind === "Accident" ? views.filter((o) => isLive(o) && o.policy.kind === "Motor" && LEAVES_OWNER_DRIVER_OUT.test(o.policy.notes ?? "")) : [];
      const bare = relying.map((o) => o.policy.covers.toLowerCase());
      const effect =
        v.policy.kind === "Motor"
          ? " Driving without cover is illegal, and the no-claim bonus can be lost."
          : bare.length
            ? ` The ${bare.join(" and ")} ${bare.length === 1 ? "policy leaves" : "policies leave"} owner-driver cover out because of this one, so nothing covers you as ${bare.length === 1 ? "its" : "their"} driver.`
            : " Cover stopped when the term ended.";
      return { policyId: v.policy.id, name: v.policy.name, tone: "lapsed", text: `lapsed on ${formatDate(on)} (${inDays(-lapsedAgo(v, today))}).${later}${v.latest && v.latest.start > today ? "" : effect}` };
    });
  const soon = renewingWithin(views, RENEW_SOON_DAYS).map(
    (v): AttentionItem => ({ policyId: v.policy.id, name: `${v.policy.name} · ${v.policy.insurer}`, tone: "soon", text: `renews ${formatDate(v.renewsOn as string)} (${inDays(v.daysLeft as number)}). Last paid ${formatInr(v.latest!.payment.amount)}; the insurer's quote may differ.` }),
  );
  return [...lapsed, ...soon];
}

// ---------- The cover map ----------

export interface TipCard {
  head: string;
  total: string;
  detail: string;
  rows: { name: string; amount: string }[];
  foot: string;
}

export interface PolicyBox {
  id: string;
  name: string;
  insurer: string;
  colorKey: ColorKey;
  cover: string;
  coverWord: string;
  /** Shown beside the name when it needs a look. */
  badge: "lapsed" | "soon" | "cancelled" | null;
  /** How much of the term has gone by, 0 to 1. */
  elapsed: number;
  footLeft: string;
  footRight: string;
  /** Left in amber: renews soon, or has lapsed. */
  warn: boolean;
  costLeft: string;
  costRight: string;
  tip: TipCard;
}

export type TileIcon = "user" | "car" | "bike" | "home" | "shield" | "heart";

export interface CoverTile {
  key: string;
  name: string;
  sub: string;
  icon: TileIcon;
  /** A year across the tile's policies, when it holds more than one. */
  yearly: string | null;
  boxes: PolicyBox[];
  /** A financed thing with no policy: the tile says so instead of holding boxes. */
  /** `start` is what Add policy begins with for it: a home loan's policy is a Home one covering the home. */
  gap?: { title: string; text: string; start: { policyKind: PolicyKind; covers?: string } };
}

export interface CoverFigure {
  key: string;
  label: string;
  value: string;
  sub: string;
}

export interface CoverView {
  count: number;
  delta: { text: string; tone: "ok" | "bad" };
  sub: string;
  figures: CoverFigure[];
  tiles: CoverTile[];
  /** Every pick's id: all policies, then each policy. */
  picks: string[];
}

const YOU = "you";

function daysLeftText(view: PolicyView, today: string): string {
  if (view.policy.status === "Cancelled") return `Cancelled${view.policy.endedOn ? ` ${formatShortDate(view.policy.endedOn)}` : ""}`;
  if (view.state === "No term") return "No term recorded";
  if (view.state === "Not started") return `Starts ${formatShortDate(view.terms[0].start)}`;
  if (view.state === "Lapsed") return `Lapsed ${plural(lapsedAgo(view, today), "day")} ago`;
  const d = view.daysLeft as number;
  return d >= 700 ? `${(d / 365).toFixed(1).replace(/\.0$/, "")} years left` : `${plural(d, "day")} left`;
}

function boxOf(view: PolicyView, today: string): PolicyBox {
  const { policy, current } = view;
  const k = view.terms.length;
  const cancelled = view.state === "Cancelled";
  const warn = view.state === "Renew soon" || view.state === "Lapsed";
  const payment = current?.payment;
  const gone = payment ? `${formatDate(current.start)} to ${formatDate(current.end)} · ${payment.years === 1 ? "1 year" : `${payment.years} years`}` : "";
  return {
    id: policy.id,
    name: policy.name,
    insurer: policy.insurer,
    colorKey: policyColor(policy),
    cover: formatInrCompact(policy.sumInsured),
    coverWord: coverWord(policy),
    badge: cancelled ? "cancelled" : view.state === "Lapsed" ? "lapsed" : view.state === "Renew soon" ? "soon" : null,
    elapsed: view.elapsed,
    footLeft: daysLeftText(view, today),
    footRight: cancelled ? "stays on record" : view.renewsOn ? formatDate(view.renewsOn) : "",
    warn,
    costLeft: payment ? (payment.years > 1 ? `${formatInr(payment.amount)} once` : `${formatInr(payment.amount)} a year`) : "",
    costRight: payment && payment.years > 1 ? `${formatInr(payment.amount / payment.years)} a year` : "",
    tip: {
      head: current ? `${policy.name} · term ${view.terms.indexOf(current) + 1} of ${k}` : policy.name,
      total: isLive(view) ? `${plural(view.daysLeft as number, "day")} left` : daysLeftText(view, today),
      detail: gone,
      rows: payment
        ? [
            { name: "Gone by", amount: percent(view.elapsed) },
            { name: current.assumed ? "Paid (day assumed)" : "Paid", amount: paidText(payment) },
            { name: "Renews on", amount: view.renewsOn ? formatDate(view.renewsOn) : "" },
          ]
        : [],
      foot: view.state === "Lapsed" ? "No renewal is recorded for the next term" : cancelled ? "Cancelled: it stays on record" : "Cover ends the day before the renewal date",
    },
  };
}

/** A thing's icon: by what it covers ("You", "Car"), else by the kind of its policy. */
export const tileIcon = (covers: string, kind: PolicyKind): TileIcon => {
  const key = covers.trim().toLowerCase();
  if (key === YOU) return "user";
  if (key === "car" || key === "bike" || key === "home") return key;
  return kind === "Health" ? "heart" : kind === "Motor" ? "car" : kind === "Home" ? "home" : "shield";
};

export function coverView(data: InsuranceData, today: string): CoverView {
  const views = allViews(data, today);
  const live = views.filter(isLive);
  // What a policy covers is typed into the Sheet, so "Car" and "car " are one tile; the first spelling is the one shown.
  const groups = new Map<string, PolicyView[]>();
  for (const v of views) {
    const key = v.policy.covers.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), v]);
  }
  // You first, then in the order the Policies tab lists them.
  const ordered = [...groups.entries()].sort(([a], [b]) => Number(b === YOU) - Number(a === YOU));
  const tiles: CoverTile[] = ordered.map(([key, group]) => {
    const covers = group[0].policy.covers.trim();
    const heldYearly = group.reduce((t, v) => t + (v.yearly ?? 0), 0);
    return {
      key,
      name: covers,
      sub: group.find((v) => v.policy.coversDetail)?.policy.coversDetail ?? (key === YOU ? "Self" : plural(group.length, "policy", "policies")),
      icon: tileIcon(covers, group[0].policy.kind),
      yearly: group.filter(isLive).length > 1 ? formatInr(heldYearly) : null,
      boxes: group.map((v) => boxOf(v, today)),
    };
  });
  for (const loan of uninsuredLoans(data.loans, views)) {
    tiles.push({
      key: `gap-${loan.id}`,
      name: loan.category === "Home" ? "Home" : "Vehicle",
      sub: `${loan.lenderName} · ${loan.name}`,
      icon: loan.category === "Home" ? "home" : "car",
      yearly: null,
      boxes: [],
      gap: { title: "No policy recorded", text: `${loan.lenderName}'s ${loan.name.toLowerCase()} is on your Loans page, and nothing here insures it.`, start: loan.category === "Home" ? { policyKind: "Home", covers: "Home" } : { policyKind: "Motor" } },
    });
  }

  const lapsedCount = views.filter((v) => v.state === "Lapsed").length;
  const next = nextRenewal(live);
  const soon = renewingWithin(live).length;
  const figures: CoverFigure[] = [];
  const covers = coverByKind(live);
  for (const kind of NON_VEHICLE_KINDS) {
    const ofKind = live.filter((v) => v.policy.kind === kind);
    if (!ofKind.length) continue;
    const latest = ofKind.reduce((a, b) => ((b.renewsOn as string) > (a.renewsOn as string) ? b : a));
    figures.push({ key: kind, label: `${kind} cover`, value: formatInrCompact(covers[kind]), sub: ofKind.length === 1 ? `to ${formatDate(addDays(latest.renewsOn as string, -1))}` : `${ofKind.length} policies` });
  }
  for (const v of live.filter((x) => x.policy.kind === "Motor")) {
    figures.push({ key: v.policy.id, label: `${v.policy.covers} insured up to`, value: formatInrCompact(v.policy.sumInsured), sub: `IDV${v.policy.coversDetail ? `, ${v.policy.coversDetail.split(" · ")[0]}` : ""}` });
  }
  return {
    count: live.length,
    delta: lapsedCount ? { text: `${lapsedCount} ${lapsedCount === 1 ? "has" : "have"} lapsed`, tone: "bad" } : { text: "nothing has lapsed", tone: "ok" },
    sub: next ? `${soon === 0 ? "no renewal" : plural(soon, "renewal")} within a month · next ${formatDate(next.renewsOn as string)}` : "nothing to renew",
    figures,
    tiles,
    picks: pickIds(data),
  };
}

/** The picks: all policies, then each policy (any state: a lapsed one is worth opening). */
export function pickIds(data: InsuranceData): string[] {
  return [ALL, ...data.policies.map((p) => p.id)];
}

/** Where a premium was paid from, by name; undefined when it isn't recorded. */
export function paidFromName(data: Pick<InsuranceData, "accounts" | "cards">, place: { paidFromAccountId?: string; paidFromCardId?: string }): string | undefined {
  if (place.paidFromCardId) {
    const card = data.cards.find((c) => c.id === place.paidFromCardId);
    return card ? `${card.name} (card)` : "A card";
  }
  if (place.paidFromAccountId) return data.accounts.find((a) => a.id === place.paidFromAccountId)?.name ?? "An account";
  return undefined;
}
