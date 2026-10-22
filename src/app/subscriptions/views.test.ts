import { describe, expect, it } from "vitest";
import { demoSubscriptionData } from "@/lib/demo/subscriptionsDemo";
import { lastMonths } from "@/lib/aggregate/period";
import type { SpendPeriod } from "@/lib/aggregate/cardSpend";
import { formatInr } from "@/lib/format/money";
import { sentenceText } from "../cards/summarySentence";
import type { SubscriptionData } from "@/lib/aggregate/subscriptionPage";
import type { Subscription, SubscriptionPayment } from "@/lib/sheets/types";
import { ALL, greetingView, subscriptionsPageView, summarySentence } from "./views";

// The design's "today", so the figures are the design's (design/subscriptions/SubsFinal.dc.html).
const TODAY = "2026-10-20";
const data = demoSubscriptionData(TODAY);
const view = subscriptionsPageView(data, TODAY);
const pick = (id: string) => view.picks.find((p) => p.id === id)!;
const stats = (id: string) => pick(id).stats.map((s) => `${s.label}: ${s.value} · ${s.sub}`);
// The period pill's "all time", where each figure is what it was before the pill: everything since the start.
const lifetime = subscriptionsPageView(data, TODAY, { kind: "all" });
const lifetimePick = (id: string) => lifetime.picks.find((p) => p.id === id)!;
const lifetimeStats = (id: string) => lifetimePick(id).stats.map((s) => `${s.label}: ${s.value} · ${s.sub}`);

describe("summarySentence", () => {
  it("reads as the design's greeting", () => {
    expect(sentenceText(summarySentence(data, TODAY))).toBe(
      "You've paid ₹57,163 for subscriptions so far in 2026, about ₹5,716 a month. Mar 2026 was the biggest month at ₹10,032. 6 renewals come up in the next 30 days, totalling ₹4,334.",
    );
  });

  it("leaves out payments whose subscription is gone", () => {
    const orphan = { id: "gone-1", subscriptionId: "deleted", paymentDate: "2026-03-05", amount: 5000, status: "Paid" as const };
    expect(sentenceText(summarySentence({ ...data, payments: [...data.payments, orphan] }, TODAY))).toBe(sentenceText(summarySentence(data, TODAY)));
  });

  it("says so when there's nothing yet", () => {
    expect(sentenceText(summarySentence({ subscriptions: [], payments: [], cards: [], accounts: [] }, TODAY))).toMatch(/^No subscriptions yet\./);
  });

  it("marks each figure with the card it points at (7A)", () => {
    const points = summarySentence(data, TODAY).filter((p) => p.point).map((p) => `${p.point}: ${p.text}`);
    expect(points).toEqual(["paid: ₹57,163", "average: ₹5,716", "biggest: Mar 2026", "biggest: ₹10,032", "next: 6 renewals", "next: ₹4,334"]);
  });
});

describe("the greeting's cards", () => {
  const cards = greetingView(data, TODAY);

  it("agree with the sentence", () => {
    expect(cards.paid).toMatchObject({ title: "Paid in 2026", total: "₹57,163", note: "10 months so far, January to October" });
    expect(greetingView(data, "2026-01-20").paid?.note).toBe("January so far");
    expect(cards.average).toMatchObject({ total: "₹5,716", note: "₹57,163 over 10 months" });
    expect(cards.biggest).toMatchObject({ title: "Mar 2026", total: "₹10,032" });
    expect(cards.next).toMatchObject({ title: "The next 30 days", total: "₹4,334" });
    expect(cards.next!.rows).toHaveLength(6);
  });

  it("lay the year out as twelve months, lit as each card points", () => {
    expect(cards.paid!.months.map((m) => m.initial).join("")).toBe("JFMAMJJASOND");
    expect(cards.paid!.months.filter((m) => m.lit)).toHaveLength(10);
    expect(cards.paid!.months.filter((m) => m.future).map((m) => m.key)).toEqual(["2026-11", "2026-12"]);
    expect(cards.biggest!.months.filter((m) => m.lit).map((m) => m.key)).toEqual(["2026-03"]);
    expect(cards.paid!.months.reduce((t, m) => t + m.paid, 0)).toBeCloseTo(57163, 0);
  });

  it("split the biggest month by subscription, biggest first, adding up to it", () => {
    const amounts = cards.biggest!.rows.map((r) => Number(r.amount.replace(/[₹,]/g, "")));
    expect(amounts.reduce((t, a) => t + a, 0)).toBe(10032);
    for (let i = 1; i < amounts.length; i++) expect(amounts[i - 1]).toBeGreaterThanOrEqual(amounts[i]);
  });

  it("have nothing to show with no subscriptions", () => {
    expect(greetingView({ subscriptions: [], payments: [], cards: [], accounts: [] }, TODAY)).toEqual({});
  });
});

describe("the carousel and hero", () => {
  it("puts All first, then active ones by next renewal, then paused and cancelled", () => {
    expect(view.picks.map((p) => p.alias)).toEqual(["All", "Netflix", "iCloud+", "Spotify", "Times Prime", "YouTube", "ChatGPT", "Swiggy One", "Prime", "Cult.fit", "Microsoft 365", "Headspace", "SonyLIV"]);
  });

  it("shows All as the design does", () => {
    expect(pick(ALL)).toMatchObject({ cover: { corner: "10 active", price: "₹5,559 / month" }, eyebrow: "Everything", bar: { start: "Oct 1", middle: "Next is Netflix, Fri, Oct 23", end: "Oct 31" } });
    expect(stats(ALL)).toEqual(["A month: ₹5,559 · 10 active", "Renews next: Netflix · Fri, Oct 23", "Paid this year: ₹57,163 · 61 payments", "Prices: 3 went up · ₹190 more a month"]);
  });

  it("shows a subscription due in 3 days, with its cycle and price change", () => {
    expect(pick("demo-netflix")).toMatchObject({ dueSoon: true, eyebrow: "Streaming · since Feb 23, 2024", bar: { start: "Sep 23", middle: "Renews Fri, Oct 23 · in 3 days", end: "Oct 23", fraction: 0.9 } });
    expect(lifetimeStats("demo-netflix")).toEqual(["Monthly: ₹649 · ₹649 a month", "Renews: Fri, Oct 23 · in 3 days", "Paid so far: ₹16,418 · 32 payments", "Price: ↑ ₹150 · ₹499 → ₹649 on Jul 23"]);
    // With this year's pill, its paid figure is this year's.
    expect(stats("demo-netflix")[2]).toBe("Paid this year: ₹4,941 · 9 payments");
  });

  it("puts the year on both ends of a cycle that spans two", () => {
    expect(pick("demo-timesprime").bar).toMatchObject({ start: "Oct 30, 2025", end: "Oct 30, 2026" });
  });

  it("says when a renewal paid ahead was actually paid, with the year on a date in another year", () => {
    const yearly = { id: "y", name: "Yearly Plan", alias: "Yearly", category: "Software" as const, amount: 1200, billingCycle: "Yearly" as const, billingAnchorDate: "2025-10-23", startDate: "2025-10-23", status: "Active" as const };
    const paid = (paymentDate: string) => ({ id: paymentDate, subscriptionId: "y", paymentDate, amount: 1200, status: "Paid" as const });
    const ahead = subscriptionsPageView({ subscriptions: [yearly], payments: [paid("2025-10-23"), paid("2026-10-19")], cards: [], accounts: [] }, "2026-10-21");
    expect(ahead.picks[1].bar).toMatchObject({ start: "Oct 23, 2026", middle: "Paid Oct 19 · next Sat, Oct 23, 2027", end: "Oct 23, 2027", fraction: 0 });
    expect(ahead.picks[1].stats[1]).toEqual({ label: "Renews", value: "Sat, Oct 23, 2027", sub: "in 12 months" });
  });

  it("gives the money stats their amounts, so they roll to the next pick's", () => {
    // A month is the plans' monthly shares added up, so it isn't whole; the digits show it rounded, as the value does.
    expect(pick(ALL).stats.map((s) => s.money ?? null)).toEqual([{ amount: 66713 / 12, prefix: "" }, null, { amount: 57163, prefix: "" }, null]);
    expect(lifetimePick("demo-netflix").stats.map((s) => s.money ?? null)).toEqual([{ amount: 649, prefix: "" }, null, { amount: 16418, prefix: "" }, { amount: 150, prefix: "↑ " }]);
    // The value is the same text the rolling digits draw.
    for (const p of view.picks) for (const s of p.stats) if (s.money) expect(s.value).toBe(`${s.money.prefix}${formatInr(s.money.amount)}`);
  });

  it("says on each cover what a peek at it shows, and which ones renew within 3 days", () => {
    expect(pick("demo-netflix").cover.next).toBe("Renews Oct 23 · in 3 days");
    expect(pick("demo-timesprime").cover.next).toBe("Renews Oct 30 · in 10 days");
    expect(pick("demo-headspace").cover.next).toBe("Paused · last paid Jul 12");
    expect(pick(ALL).cover.next).toBe("Next is Netflix, Fri, Oct 23");
    expect(view.picks.filter((p) => p.dueIn !== null).map((p) => `${p.alias} ${p.dueIn}`)).toEqual(["Netflix 3"]);
    const onTheDay = subscriptionsPageView(data, "2026-10-23");
    expect(onTheDay.picks.find((p) => p.id === "demo-netflix")).toMatchObject({ dueIn: 0, cover: { next: "Renews Oct 23 · today" } });
  });

  it("says what the cycle bar reads at its ends: what started it, and what the renewal will charge and where", () => {
    expect(pick("demo-netflix").cycle).toEqual({
      from: "2026-09-23",
      to: "2026-10-23",
      today: TODAY,
      withYear: false,
      start: "paid ₹649",
      end: "renews ₹649 on the Millennia card",
      label: "Netflix's cycle, Sep 23 to Oct 23",
    });
    expect(pick("demo-timesprime").cycle).toMatchObject({ withYear: true, label: "Times Prime's cycle, Oct 30, 2025 to Oct 30, 2026" });
    expect(pick(ALL).cycle).toBeNull();
    expect(pick("demo-headspace").cycle).toBeNull();
  });

  it("reads a cycle paid ahead from the renewal it paid, and one that started unrecorded or skipped as such", () => {
    const plan = { id: "m", name: "Monthly Plan", alias: "Plan", category: "Software" as const, amount: 300, billingCycle: "Monthly" as const, billingAnchorDate: "2026-08-23", startDate: "2026-08-23", status: "Active" as const, defaultPaidFromAccountId: "acc" };
    const accounts = [{ id: "acc", name: "Kotak Savings" }] as SubscriptionData["accounts"];
    const pay = (paymentDate: string, status: SubscriptionPayment["status"] = "Paid", amount = 300) => ({ id: paymentDate, subscriptionId: "m", paymentDate, amount, status });
    const at = (payments: SubscriptionPayment[], today: string) => subscriptionsPageView({ subscriptions: [plan], payments, cards: [], accounts }, today).picks[1];
    // Paid ahead on Oct 21 for Oct 23: the bar is the next cycle, starting with that payment.
    expect(at([pay("2026-08-23"), pay("2026-09-23"), pay("2026-10-21")], "2026-10-21")).toMatchObject({ dueIn: null, cycle: { from: "2026-10-23", to: "2026-11-23", start: "paid ₹300", end: "renews ₹300 from Kotak Savings" } });
    expect(at([pay("2026-08-23")], "2026-10-01").cycle).toMatchObject({ from: "2026-09-23", start: "not recorded" });
    expect(at([pay("2026-08-23"), pay("2026-09-23", "Skipped", 0)], "2026-10-01").cycle).toMatchObject({ start: "didn't charge" });
    expect(at([pay("2026-08-23"), pay("2026-09-23", "Pending")], "2026-10-01").cycle).toMatchObject({ start: "₹300 pending" });
    // On the renewal day, before it's paid, the cycle it starts is due.
    expect(at([pay("2026-08-23"), pay("2026-09-23")], "2026-10-23")).toMatchObject({ dueIn: 0, cycle: { from: "2026-10-23", start: "renews ₹300 from Kotak Savings" } });
    // Charged nowhere in particular: the renewal says only what it costs.
    const nowhere = subscriptionsPageView({ subscriptions: [{ ...plan, defaultPaidFromAccountId: undefined }], payments: [pay("2026-08-23")], cards: [], accounts }, "2026-10-01");
    expect(nowhere.picks[1].cycle).toMatchObject({ end: "renews ₹300" });
  });

  it("rolls a price drop with its down arrow", () => {
    const plan = { id: "d", name: "Dropped", alias: "Drop", category: "Music" as const, amount: 250, billingCycle: "Monthly" as const, billingAnchorDate: "2026-08-05", startDate: "2026-08-05", status: "Active" as const };
    const pay = (paymentDate: string, amount: number) => ({ id: paymentDate, subscriptionId: "d", paymentDate, amount, status: "Paid" as const });
    const drop = subscriptionsPageView({ subscriptions: [plan], payments: [pay("2026-08-05", 300), pay("2026-09-05", 250)], cards: [], accounts: [] }, "2026-10-01");
    expect(drop.picks[1].stats[3]).toMatchObject({ label: "Price", value: "↓ ₹50", money: { amount: 50, prefix: "↓ " } });
  });

  it("shows paused and cancelled ones with no cycle bar", () => {
    expect(pick("demo-headspace")).toMatchObject({ muted: true, cover: { corner: "Paused" }, bar: { middle: "Paused · last paid Jul 12", fraction: null } });
    expect(lifetimeStats("demo-headspace")[2]).toBe("Paid so far: ₹2,691 · 9 payments");
    expect(pick("demo-sonyliv")).toMatchObject({ cover: { corner: "Cancelled", price: "₹999 / year" }, bar: { middle: "Cancelled Sep 14 · won't renew", fraction: null } });
  });
});

describe("the map, payments and charged to", () => {
  it("sizes the map's blocks by monthly cost, with a pill for renewals within a week", () => {
    const netflix = view.blocks.find((b) => b.id === "demo-netflix")!;
    expect(netflix).toMatchObject({ monthly: 649, pill: { text: "Oct 23 · 3d", due: true } });
    expect(view.blocks.find((b) => b.id === "demo-icloud")?.pill).toEqual({ text: "Oct 24 · 4d", due: false });
    expect(view.blocks.find((b) => b.id === "demo-chatgpt")?.pill).toBeNull();
    expect(view.blocks.reduce((t, b) => t + b.share, 0)).toBeCloseTo(1, 9);
    expect(view.stopped.map((s) => `${s.alias} ${s.label}`)).toEqual(["Headspace paused", "SonyLIV cancelled"]);
  });

  it("gives each block a hover card: its price, its share of the total, its next renewal, where it's charged and what's been paid", () => {
    expect(view.blocks.find((b) => b.id === "demo-netflix")!.card).toEqual({
      name: "Netflix Premium",
      price: "₹649 a month",
      share: "12% of your ₹5,559 a month",
      renews: "Oct 23 · in 3 days",
      chargedTo: { kind: "card", name: "Millennia", color: expect.any(String) },
      paid: "₹16,418 · 32 payments",
      change: { text: "₹150 more since Jul 23", up: true },
    });
    const icloud = view.blocks.find((b) => b.id === "demo-icloud")!.card;
    expect(icloud).toMatchObject({ price: "₹219 a month", share: "4% of your ₹5,559 a month", change: null });
  });

  it("gives each block its category, for By category", () => {
    expect(view.blocks.find((b) => b.id === "demo-icloud")).toMatchObject({ category: "Cloud-Storage", categoryLabel: "Cloud storage", categoryColor: "violet" });
  });

  it("says what a paused or cancelled one would add a month if it started again, for its ghost", () => {
    expect(view.stopped.map((s) => `${s.alias} ${Math.round(s.monthly)} ${s.ghost}`)).toEqual(["Headspace 299 if you resume it", "SonyLIV 83 if you restart it"]);
  });


  it("gives each pick its payments, newest first", () => {
    expect(lifetime.payments[ALL].footer).toBe("The 6 most recent of 156");
    expect(view.payments[ALL].footer).toBe("The 6 most recent of 61 this year");
    expect(view.payments[ALL].rows[0]).toMatchObject({ mark: { alias: "Cult.fit" }, date: "Oct 10", amount: "₹4,500", chargedTo: { kind: "account", name: "Kotak Savings" } });
    expect(lifetime.payments["demo-netflix"].footer).toBe("Showing 6 of 32 · ₹16,418 paid since Feb 23, 2024");
    expect(view.payments["demo-netflix"].footer).toBe("Showing 6 of 9 · ₹4,941 paid this year");
    expect(view.payments["demo-netflix"].history?.changes).toEqual(["₹499 → ₹649 on Jul 23, 2026"]);
    const july = view.payments["demo-netflix"].rows.find((r) => r.date === "Jul 23, 2026");
    expect(july?.change).toEqual({ text: "₹150 more", up: true });
  });

  it("gives each Charged to row its subscriptions and what lands next there", () => {
    const coral = view.chargedTo.find((c) => c.chip.name === "Coral")!;
    expect(coral.members.map((m) => m.alias)).toEqual(["ChatGPT", "Prime", "Times Prime"]);
    expect(coral.next).toMatchObject({ title: "Next statement Nov 2", total: "₹3,198" });
    expect(coral.next.rows.map((r) => `${r.mark.alias} ${r.date} ${r.amount} ${r.note}`)).toEqual(["ChatGPT Oct 8 ₹1,999 charged", "Times Prime Oct 30 ₹1,199 in 10 days"]);
    const kotak = view.chargedTo.find((c) => c.chip.name === "Kotak Savings")!;
    expect(kotak.next).toMatchObject({ title: "Next from Kotak Savings", total: null });
    expect(kotak.next.rows[0]).toMatchObject({ date: "Dec 1", amount: "₹549" });
  });

  it("says whose each payment is, so a row can point at its block", () => {
    expect(view.payments[ALL].rows[0]).toMatchObject({ subscriptionId: "demo-cult" });
  });

  it("splits the monthly total by where it's charged, as the design does", () => {
    expect(view.chargedTo.map((c) => `${c.chip.name} ${c.count} ${Math.round(c.monthly)}`)).toEqual(["Coral 3 2224", "Kotak Savings 2 1683", "Millennia 3 1285", "Ace 2 368"]);
    expect(view.chargedTo[0].fraction).toBe(1);
  });
});

describe("the map's hover cards, at the edges", () => {
  const sub = (over: Partial<Subscription> & Pick<Subscription, "id">): Subscription => ({
    name: over.id,
    alias: over.id,
    category: "Software",
    amount: 100,
    billingCycle: "Monthly",
    billingAnchorDate: "2026-01-05",
    startDate: "2026-01-05",
    status: "Active",
    color: "Ruby",
    ...over,
  });
  const paid = (subscriptionId: string, paymentDate: string, amount: number): SubscriptionPayment => ({ id: `${subscriptionId}-${paymentDate}`, subscriptionId, paymentDate, amount, status: "Paid" });
  const edges = subscriptionsPageView(
    {
      subscriptions: [sub({ id: "Big", amount: 50000 }), sub({ id: "Tiny", name: "Tiny Plan", category: "Music" }), sub({ id: "Cheaper", amount: 1000 })],
      payments: [paid("Cheaper", "2026-08-05", 1200), paid("Cheaper", "2026-09-05", 1000), paid("Cheaper", "2026-10-05", 1000)],
      cards: [],
      accounts: [],
    },
    TODAY,
  );
  const card = (id: string) => edges.blocks.find((b) => b.id === id)!.card;

  it("says Under 1% for a sliver of the total, rather than rounding it to 0", () => {
    expect(card("Tiny").share).toBe("Under 1% of your ₹51,100 a month");
  });

  it("says Nothing yet before the first payment, and where it isn't charged", () => {
    expect(card("Tiny")).toMatchObject({ name: "Tiny Plan", paid: "Nothing yet", chargedTo: { kind: "none" } });
  });

  it("shows a price that went down as less", () => {
    expect(card("Cheaper")).toMatchObject({ paid: "₹3,200 · 3 payments", change: { text: "₹200 less since Sep 5", up: false } });
  });

  it("spells out only the latest three price changes, and counts the rest", () => {
    const steps = subscriptionsPageView(
      { subscriptions: [sub({ id: "Steps", amount: 600 })], payments: [100, 200, 300, 400, 500, 600].map((a, i) => paid("Steps", `2026-0${i + 4}-05`, a)), cards: [], accounts: [] },
      TODAY,
    );
    expect(steps.payments.Steps.history).toMatchObject({
      changes: ["₹300 → ₹400 on Jul 5, 2026", "₹400 → ₹500 on Aug 5, 2026", "₹500 → ₹600 on Sep 5, 2026"],
      earlier: "and 2 earlier changes",
    });
    expect(view.payments["demo-netflix"].history?.earlier).toBeNull();
  });
});

describe("the period pill", () => {
  const range = (from: string, to: string): SpendPeriod => ({ kind: "range", from, to });
  // What was paid in some months, added up straight from the payments, to check the page's figures against.
  const paidIn = (from: string, to: string) =>
    data.payments.filter((p) => p.status === "Paid" && p.amount > 0 && p.paymentDate.slice(0, 7) >= from && p.paymentDate.slice(0, 7) <= to).reduce((t, p) => t + p.amount, 0);
  const sentence = (period: SpendPeriod) => sentenceText(summarySentence(data, TODAY, period));

  it("opens on this year, so a page with no period reads as it always has", () => {
    expect(sentenceText(summarySentence(data, TODAY, { kind: "year", year: 2026 }))).toBe(sentenceText(summarySentence(data, TODAY)));
    expect(subscriptionsPageView(data, TODAY, { kind: "year", year: 2026 }).picks.map((p) => p.stats)).toEqual(view.picks.map((p) => p.stats));
  });

  it("words the greeting for the last 6 months, adding up what was paid in them", () => {
    const total = paidIn("2026-05", "2026-10");
    expect(sentence(lastMonths(6, TODAY))).toMatch(new RegExp(`^You've paid ${formatInr(total)} for subscriptions in the last 6 months, about ${formatInr(total / 6)} a month\\. `));
    expect(sentence(lastMonths(6, TODAY))).toMatch(/ 6 renewals come up in the next 30 days, totalling ₹4,334\.$/);
  });

  it("says \"paid\", not \"you've paid\", of a year that's over", () => {
    const total = paidIn("2025-01", "2025-12");
    expect(total).toBeGreaterThan(0);
    expect(sentence({ kind: "year", year: 2025 })).toMatch(new RegExp(`^You paid ${formatInr(total)} for subscriptions in 2025, about ${formatInr(total / 12)} a month\\. `));
  });

  it("counts all time from the first payment", () => {
    const total = paidIn("1900-01", "2026-10");
    expect(sentence({ kind: "all" })).toMatch(new RegExp(`^You've paid ${formatInr(total)} for subscriptions since December 2022, about ${formatInr(total / 47)} a month\\. `));
  });

  it("leaves out the average and the biggest month for a period of one month, which would only repeat its total", () => {
    const text = sentence(range("2026-03", "2026-03"));
    expect(text).toMatch(/^You paid ₹10,032 for subscriptions in March 2026\. /);
    expect(text).not.toMatch(/a month|biggest/);
    expect(summarySentence(data, TODAY, range("2026-03", "2026-03")).filter((p) => p.point).map((p) => p.point)).toEqual(["paid", "next", "next"]);
    const cards = greetingView(data, TODAY, range("2026-03", "2026-03"));
    expect(cards.average).toBeUndefined();
    expect(cards.biggest).toBeUndefined();
    expect(cards.paid).toMatchObject({ title: "Paid in Mar 2026", total: "₹10,032", note: "March 2026" });
  });

  it("says so, instead of dividing by nothing, when nothing was paid", () => {
    expect(sentence({ kind: "year", year: 2030 })).toMatch(/^Nothing paid for subscriptions in 2030\. /);
    expect(greetingView(data, TODAY, { kind: "year", year: 2030 }).paid).toBeUndefined();
  });

  it("lays the greeting's strip out as the period's months, a year's twelve or a range's own", () => {
    const strip = (period: SpendPeriod) => greetingView(data, TODAY, period).paid!.months;
    expect(strip({ kind: "year", year: 2025 }).map((m) => m.key)).toHaveLength(12);
    expect(strip({ kind: "year", year: 2025 }).some((m) => m.future)).toBe(false);
    expect(strip(range("2026-03", "2026-08")).map((m) => m.initial).join("")).toBe("MAMJJA");
    expect(strip(lastMonths(6, TODAY)).reduce((t, m) => t + m.paid, 0)).toBe(paidIn("2026-05", "2026-10"));
    // All time is longer than the strip: the latest 12 show, and the card says so.
    expect(strip({ kind: "all" })).toHaveLength(12);
    expect(greetingView(data, TODAY, { kind: "all" }).paid!.note).toMatch(/The bars show the last 12$/);
  });

  it("words a past range's card with its months, and a current one's so far", () => {
    expect(greetingView(data, TODAY, range("2026-03", "2026-08")).paid).toMatchObject({ title: "Paid in Mar – Aug 2026", note: "6 months, March to August" });
    expect(greetingView(data, TODAY, lastMonths(6, TODAY)).paid).toMatchObject({ title: "Paid in the last 6 months", note: "6 months so far, May to October" });
  });

  it("gives the hero's paid figures the period, and its subscriptions add up to All's", () => {
    for (const period of [lastMonths(3, TODAY), { kind: "year", year: 2025 } as SpendPeriod, range("2026-02", "2026-04"), { kind: "all" } as SpendPeriod]) {
      const v = subscriptionsPageView(data, TODAY, period);
      const paidOf = (id: string) => v.picks.find((p) => p.id === id)!.stats.find((s) => s.label.startsWith("Paid "))!;
      const parts = v.picks.filter((p) => p.id !== ALL).reduce((t, p) => t + (paidOf(p.id).money?.amount ?? 0), 0);
      expect(parts).toBeCloseTo(paidOf(ALL).money!.amount, 6);
    }
    expect(pick(ALL).stats[2].label).toBe("Paid this year");
    expect(subscriptionsPageView(data, TODAY, { kind: "year", year: 2025 }).picks[0].stats[2].label).toBe("Paid in 2025");
    expect(subscriptionsPageView(data, TODAY, lastMonths(6, TODAY)).picks[0].stats[2]).toMatchObject({ label: "Paid in the last 6 months", money: { amount: paidIn("2026-05", "2026-10") } });
    expect(lifetimePick(ALL).stats[2].label).toBe("Paid so far");
  });

  it("words the Prices stat for the period too", () => {
    const quiet = subscriptionsPageView(data, TODAY, range("2026-01", "2026-02")).picks[0].stats[3];
    expect(quiet).toEqual({ label: "Prices", value: "No rises", sub: "in Jan – Feb 2026" });
  });

  it("lists only the payments made in the period, newest first, and says when there are none", () => {
    const march = subscriptionsPageView(data, TODAY, range("2026-03", "2026-03"));
    expect(march.payments[ALL].rows.every((r) => r.date.startsWith("Mar"))).toBe(true);
    expect(march.payments[ALL].footer).toBe(`The 6 most recent of ${data.payments.filter((p) => p.paymentDate.startsWith("2026-03")).length} in Mar 2026`);
    const nothing = subscriptionsPageView(data, TODAY, { kind: "year", year: 2030 });
    expect(nothing.payments[ALL]).toMatchObject({ rows: [], footer: "", empty: "No payments in 2030." });
    expect(lifetime.payments[ALL].empty).toBe("No payments recorded yet.");
  });

  it("keeps a payment's change against the one before it, even from before the period", () => {
    // Netflix's ₹499 → ₹649 was on Jul 23 2026; looking at July alone still says so.
    const july = subscriptionsPageView(data, TODAY, range("2026-07", "2026-07")).payments["demo-netflix"].rows;
    expect(july).toHaveLength(1);
    expect(july[0].change).toEqual({ text: "₹150 more", up: true });
  });

  it("leaves a subscription's price history whole, and the map and Charged to as today's plans", () => {
    const march = subscriptionsPageView(data, TODAY, range("2026-03", "2026-03"));
    expect(march.payments["demo-netflix"].history).toEqual(view.payments["demo-netflix"].history);
    expect(march.blocks).toEqual(view.blocks);
    expect(march.chargedTo).toEqual(view.chargedTo);
    expect(march.monthlyTotal).toBe(view.monthlyTotal);
  });

  it("never changes the next 30 days", () => {
    const next = (period: SpendPeriod) => greetingView(data, TODAY, period).next;
    expect(next(range("2026-03", "2026-03"))).toEqual(next({ kind: "all" }));
    expect(next({ kind: "all" })).toMatchObject({ title: "The next 30 days", total: "₹4,334" });
  });

  it("counts a payment marked paid ahead into next month nowhere yet: hero, table and Total paid agree", () => {
    const plan: Subscription = { id: "p", name: "Plan", alias: "Plan", category: "Streaming", amount: 100, billingCycle: "Monthly", billingAnchorDate: "2026-01-02", startDate: "2026-01-02", status: "Active" };
    const pay = (paymentDate: string): SubscriptionPayment => ({ id: paymentDate, subscriptionId: "p", paymentDate, amount: 100, status: "Paid" });
    const ahead = { subscriptions: [plan], payments: [pay("2026-09-02"), pay("2026-10-02"), pay("2026-11-02")], cards: [], accounts: [] };
    const v = subscriptionsPageView(ahead, "2026-10-30");
    expect(v.picks[1].stats[2]).toMatchObject({ label: "Paid this year", money: { amount: 200 } });
    expect(v.payments.p.footer).toBe("Showing 2 of 2 · ₹200 paid this year");
    expect(v.chart.lifetime.rows[0].paid).toBe(200);
  });
});
