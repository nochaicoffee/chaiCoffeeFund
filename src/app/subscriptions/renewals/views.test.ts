import { describe, expect, it } from "vitest";
import { demoSubscriptionData } from "@/lib/demo/subscriptionsDemo";
import type { SpendPeriod } from "@/lib/aggregate/cardSpend";
import { sentenceText } from "../../cards/summarySentence";
import { renewalsPageView, type GroupView } from "./views";

// The design's "today", so the figures are the design's (design/subscriptions/SubsRenewals*.dc.html).
const TODAY = "2026-10-20";
const data = demoSubscriptionData(TODAY);
const THIS_YEAR: SpendPeriod = { kind: "year", year: 2026 };
const view = renewalsPageView(data, { period: THIS_YEAR }, TODAY);
const summary = (g: GroupView) => g.summary.map((b) => b.text).join(" · ");
const row = (g: GroupView, subscriptionId: string) => g.rows.find((r) => r.subscriptionId === subscriptionId)!;

describe("the Renewals page on the design's sample data", () => {
  it("opens with the design's sentence", () => {
    expect(sentenceText(view.lede)).toBe("Every renewal in one place: 79 in 2026 across 12 subscriptions. 1 isn't recorded, and 16 are still to come.");
    expect(view.lede.filter((p) => p.strong).map((p) => p.text)).toEqual(["79 in 2026", "1 isn't recorded", "16"]);
  });

  it("shows the design's tiles", () => {
    expect(view.tiles.map((t) => [t.label, t.value, t.unit ?? "", sentenceText(t.caption)])).toEqual([
      ["Next 30 days", "₹4,334", "", "6 renewals · next Fri, Oct 23"],
      ["Not recorded", "₹219", "", "1 renewal · iCloud+ on Sep 24"],
      ["Paid this year", "₹57,163", "", "61 payments · ₹5,716 a month on average"],
      ["Price changes", "3", "this year", "₹190 more a month: Spotify, Netflix, YouTube"],
    ]);
    expect(view.tiles[1].warning).toBe(true);
  });

  it("counts each filter as the design does", () => {
    expect(view.statuses.map((s) => `${s.label} ${s.count}`)).toEqual(["All 79", "Upcoming 16", "Paid 61", "Not recorded 1"]);
    expect(view.subscriptions[0]).toEqual({ value: "", label: "All subscriptions", meta: "79" });
    expect(view.subscriptions.slice(1, 4).map((s) => s.label)).toEqual(["Netflix", "iCloud+", "Spotify"]);
    expect(view.places.map((p) => `${p.label} (${p.meta ?? ""})`)).toEqual(["Any card or account ()", "Millennia (HDFC Bank)", "Ace (Axis Bank)", "Coral (ICICI Bank)", "Kotak Savings (Account)"]);
  });

  it("groups the first page as the design does", () => {
    expect(view.groups.map((g) => [g.title, summary(g), g.more])).toEqual([
      ["Coming up · next 30 days", "7 renewals · ₹4,334 to come", null],
      ["Later this year", "10 renewals · ₹6,170 to come", "10 more later this year"],
      ["October 2026", "3 renewals · ₹6,648 paid", null],
      ["September 2026", "6 renewals · ₹3,485 paid · 1 not recorded", null],
      ["August 2026", "5 renewals · ₹3,135 paid", null],
    ]);
    expect(view.groups[3].summary.at(-1)).toEqual({ text: "1 not recorded", warning: true });
    expect(view.groups.map((g) => `${g.phoneTitle}: ${g.phoneSummary}`)).toEqual(["Next 30 days: ₹4,334", "Later this year: ₹6,170", "Oct 2026: ₹6,648 paid", "Sep 2026: ₹3,485 paid", "Aug 2026: ₹3,135 paid"]);
    expect(view.page).toEqual({ page: 1, pages: 4 });
  });

  it("writes each kind of row as the design does", () => {
    const [coming, , october, september] = view.groups;
    expect(row(coming, "demo-netflix")).toMatchObject({
      date: "Fri, Oct 23",
      dateNote: { text: "in 3 days", tone: "due" },
      amount: "₹649",
      amountNote: "the plan's price",
      amountMuted: true,
      status: { label: "In 3 days", tone: "due" },
      paidOn: null,
      chargedTo: { kind: "card", name: "Millennia", color: "teal" },
      chargedToExpected: true,
      action: "mark-paid",
      phoneLine: "Fri, Oct 23 · in 3 days",
    });
    expect(row(coming, "demo-icloud").status).toEqual({ label: "In 4 days", tone: "soon" });
    expect(row(coming, "demo-icloud").action).toBeNull();
    expect(row(coming, "demo-spotify").status).toEqual({ label: "Upcoming", tone: "off" });
    expect(row(coming, "demo-sonyliv")).toMatchObject({
      date: "Tue, Nov 3",
      dateNote: { text: "cancelled Sep 14" },
      amount: "₹999",
      amountNote: "not charged",
      status: { label: "Won't renew", tone: "off", stopped: true },
      chargedTo: null,
      stopped: true,
      action: null,
      phoneLine: "Nov 3 · cancelled",
    });
    expect(row(october, "demo-cult")).toMatchObject({
      detail: "Fitness · Quarterly",
      date: "Oct 10, 2026",
      dateNote: null,
      amount: "₹4,500",
      amountMuted: false,
      status: { label: "Paid", tone: "paid" },
      paidOn: "Oct 10",
      chargedTo: { kind: "account", name: "Kotak Savings" },
      chargedToExpected: false,
      action: "payment-menu",
      phoneLine: "Oct 10 · Kotak Savings",
    });
    expect(row(september, "demo-spotify")).toMatchObject({ amount: "₹139", change: { text: "₹20 over plan", up: true, plan: true }, phoneChange: null });
    expect(row(september, "demo-icloud")).toMatchObject({
      date: "Sep 24, 2026",
      dateNote: { text: "26 days ago", tone: "warning" },
      amount: "₹219",
      amountNote: "the plan's price",
      status: { label: "Not recorded", tone: "warning" },
      chargedTo: null,
      action: "record-payment",
      phoneLine: "Sep 24 · no payment",
    });
  });

  it("explains the table under it", () => {
    expect(sentenceText(view.footer)).toBe(
      "Showing 21 of 79 renewals in 2026. Upcoming ones come from each subscription's schedule, at the plan's price; nothing is saved until a payment is recorded. Change compares a payment with the one before it, or the latest one with the plan.",
    );
    expect(view.empty).toBeNull();
    expect(view.strip).toBeNull();
  });

  it("opens the later renewals under the coming-up ones, with a way to fold them away", () => {
    const opened = renewalsPageView(data, { period: THIS_YEAR, showLater: true }, TODAY);
    expect(opened.groups[1]).toMatchObject({ title: "Later this year", more: null, less: "Show only the next 30 days" });
    expect(opened.groups[1].rows.map((r) => `${r.mark.alias} ${r.date}`).slice(0, 3)).toEqual(["Netflix Mon, Nov 23", "iCloud+ Tue, Nov 24", "Spotify Sat, Nov 28"]);
  });
});

describe("row actions, through the Subscriptions forms (#128)", () => {
  // A day later than the design: iCloud's Oct 24 is within 3 days, but its Sep 24 isn't recorded.
  const later = renewalsPageView(demoSubscriptionData("2026-10-21"), { period: THIS_YEAR }, "2026-10-21");
  const all = later.groups.flatMap((g) => g.rows);
  const at = (id: string, date: string) => all.find((r) => r.subscriptionId === id && r.renewalDate === date)!;

  it("offers Mark paid only on the renewal it pays, and not while an earlier one isn't recorded", () => {
    expect(at("demo-netflix", "2026-10-23").action).toBe("mark-paid");
    expect(at("demo-icloud", "2026-10-24")).toMatchObject({ action: null, status: { label: "In 3 days" } });
    expect(at("demo-icloud", "2026-09-24").action).toBe("record-payment");
  });

  it("carries a recorded renewal's payment for Edit payment and Delete payment", () => {
    expect(at("demo-cult", "2026-10-10").payment).toEqual({
      id: "demo-cult-2026-10-10",
      subscriptionId: "demo-cult",
      alias: "Cult.fit",
      renewalDate: "2026-10-10",
      paymentDate: "2026-10-10",
      amount: 4500,
      status: "Paid",
      chargedTo: "account:demo-kotak",
      place: { kind: "account", name: "Kotak Savings", color: "emerald" },
    });
    expect(at("demo-icloud", "2026-09-24").payment).toBeNull();
  });

  it("names a payment's card only while the card exists, so Edit payment asks for another", () => {
    const gone = demoSubscriptionData("2026-10-21");
    const view = renewalsPageView({ ...gone, cards: gone.cards.filter((c) => c.id !== "demo-coral") }, { period: THIS_YEAR }, "2026-10-21");
    const chatgpt = view.groups.flatMap((g) => g.rows).find((r) => r.subscriptionId === "demo-chatgpt" && r.renewalDate === "2026-10-08")!;
    expect(chatgpt.payment).toMatchObject({ chargedTo: "card:demo-coral", place: null });
    expect(chatgpt.chargedTo).toMatchObject({ name: "Unknown card" });
  });
});

describe("the design's states", () => {
  it("filtered to one subscription for all time, is its whole history, with its strip", () => {
    const netflix = renewalsPageView(data, { period: { kind: "all" }, subscriptionId: "demo-netflix" }, TODAY);
    expect(netflix.picked).toMatchObject({ id: "demo-netflix", alias: "Netflix" });
    expect(netflix.statuses.map((s) => `${s.label} ${s.count}`)).toEqual(["All 35", "Upcoming 3", "Paid 32", "Not recorded 0"]);
    expect(netflix.strip).toMatchObject({
      name: "Netflix Premium",
      detail: "Streaming · Monthly · since Feb 23, 2024",
      figures: [
        { label: "Paid so far", value: "₹16,418" },
        { label: "Payments", value: "32" },
        { label: "Now", value: "₹649", unit: "/mo" },
      ],
      lastChange: { text: "₹150 (30%) on Jul 23, 2026", up: true },
      changes: [{ date: "2026-07-23", from: 499, to: 649 }],
    });
    expect(netflix.groups.slice(0, 3).map((g) => [g.title, summary(g)])).toEqual([
      ["Coming up · next 30 days", "1 renewal · ₹649 to come"],
      ["Later this year", "2 renewals · ₹1,298 to come"],
      ["September 2026", "1 renewal · ₹649 paid"],
    ]);
    expect(row(netflix.groups.find((g) => g.key === "2026-07")!, "demo-netflix").change).toEqual({ text: "₹150 vs last", up: true, plan: false });
    expect(sentenceText(netflix.footer)).toMatch(/^Showing 25 of 35\. Every Netflix renewal since Feb 23, 2024\. Upcoming ones/);
  });

  it("shows only what isn't recorded", () => {
    const missing = renewalsPageView(data, { period: THIS_YEAR, status: "not-recorded" }, TODAY);
    expect(missing.groups.map((g) => [g.title, summary(g), g.rows.map((r) => r.mark.alias)])).toEqual([["September 2026", "1 renewal · 1 not recorded", ["iCloud+"]]]);
    expect(sentenceText(missing.footer)).toBe("Showing 1 of 1 renewal that match, of 79 in 2026.");
  });

  it("says why a period has nothing, and offers all time", () => {
    const early = renewalsPageView(data, { period: { kind: "range", from: "2022-01", to: "2022-03" } }, TODAY);
    expect(early.groups).toEqual([]);
    expect(early.empty).toEqual({ title: "No renewals from Jan to Mar 2022", body: "None of your subscriptions had started yet. Amazon Prime is the oldest, from Dec 15, 2022.", action: "show-all-time" });
    expect(sentenceText(early.lede)).toBe("Every renewal in one place: none from January to March 2022.");
    expect(early.footer).toEqual([]);
  });

  it("names the coming-up window when the period ends inside the next 30 days", () => {
    const quarter = renewalsPageView(data, { period: { kind: "range", from: "2026-08", to: "2026-10", last: 3 } }, TODAY);
    expect(quarter.groups[0]).toMatchObject({ title: "Coming up · to Oct 31", phoneTitle: "Coming up · to Oct 31" });
    expect(quarter.groups[0].rows.map((r) => r.mark.alias)).toEqual(["Netflix", "iCloud+", "Spotify", "Times Prime"]);
    const december = renewalsPageView(demoSubscriptionData("2026-12-15"), { period: THIS_YEAR }, "2026-12-15");
    expect(december.groups[0].title).toBe("Coming up · to Dec 31");
  });

  it("offers nothing more when all time is already empty", () => {
    const paused = { ...data, subscriptions: [{ ...data.subscriptions[10], startDate: "2027-02-01", billingAnchorDate: "2027-02-01" }], payments: [] };
    expect(renewalsPageView(paused, { period: { kind: "all" } }, TODAY).empty).toMatchObject({ action: null });
  });

  it("offers to clear filters that match nothing", () => {
    const none = renewalsPageView(data, { period: THIS_YEAR, search: "nothing like this" }, TODAY);
    expect(none.empty).toMatchObject({ title: "No renewals match these filters", action: "clear-filters" });
  });

  it("reads sensibly with no subscriptions at all", () => {
    const blank = renewalsPageView({ subscriptions: [], payments: [], cards: [], accounts: [] }, { period: THIS_YEAR }, TODAY);
    expect(sentenceText(blank.lede)).toBe("Every renewal in one place, once you add a subscription.");
    expect(blank.empty).toMatchObject({ title: "No subscriptions yet", action: "add-subscription" });
    expect(blank.tiles.map((t) => `${t.label}: ${t.value} · ${sentenceText(t.caption)}`)).toEqual([
      "Next 30 days: ₹0 · nothing coming up",
      "Not recorded: ₹0 · every renewal is recorded",
      "Paid this year: ₹0 · no payments yet",
      "Price changes: 0 · no price changes",
    ]);
  });

  it("names other periods in the tiles and the sentence", () => {
    const lastYear = renewalsPageView(data, { period: { kind: "year", year: 2025 } }, TODAY);
    expect(lastYear.tiles[2].label).toBe("Paid in 2025");
    expect(lastYear.tiles[3].unit).toBe("in 2025");
    expect(sentenceText(lastYear.lede)).toMatch(/^Every renewal in one place: \d+ in 2025 across \d+ subscriptions\. Every one is recorded\.$/);
    const quarter = renewalsPageView(data, { period: { kind: "range", from: "2026-08", to: "2026-10", last: 3 } }, TODAY);
    expect(quarter.tiles[2].label).toBe("Paid in the last 3 months");
    expect(quarter.tiles[3].unit).toBe("in the last 3 months");
    expect(renewalsPageView(data, { period: { kind: "range", from: "2026-01", to: "2026-03" } }, TODAY).tiles[3].unit).toBe("in Jan – Mar 2026");
    expect(renewalsPageView(data, { period: { kind: "all" } }, TODAY).tiles[2].label).toBe("Paid so far");
  });
});
