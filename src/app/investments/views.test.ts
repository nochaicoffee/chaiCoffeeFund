import { describe, expect, it } from "vitest";
import { investmentOverview } from "@/lib/aggregate/investmentOverview";
import type { PricePoint } from "@/lib/prices/history";
import type { Instrument, InvestmentTransaction } from "@/lib/sheets/types";
import { cashView } from "./cashView";
import { greetingView, holdingGroups, holdingsView, lensViews, moneyInView, monthYear, pct, pickerView, recentTradesView, returnsView, sameMoneyView, summarySentence } from "./views";

const trade = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2024-01-02", symbol: "AAA", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 100, price: 100, total: 10000, assetType: "Equity", broker: "B", ...o,
});
const inst = (o: Partial<Instrument>): Instrument => ({ id: "i", symbol: "AAA", market: "IND", name: "Alpha Ltd", assetType: "Equity", priceTicker: "AAA.NS", ...o });
const days = (from: string, n: number, f: (i: number) => number): PricePoint[] =>
  Array.from({ length: n }, (_, i) => ({ date: new Date(Date.parse(`${from}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10), close: f(i) }));
const closes = new Map<string, PricePoint[]>([
  ["AAA.NS", days("2024-01-02", 731, (i) => 100 + i * 0.1)],
  ["BBB", days("2024-01-02", 731, () => 10)],
  ["USDINR", days("2024-01-02", 731, () => 90)],
  ["^NSEI", days("2024-01-02", 731, (i) => 100 + i * 0.01)],
  ["^GSPC", days("2024-01-02", 731, () => 100)],
]);
const trades = [trade({}), trade({ id: "u", symbol: "BBB", market: "US", currency: "USD", quantity: 10, price: 10, total: 100, fxRateToInr: 80 }), trade({ id: "s", tradeType: "Sell", tradeDate: "2025-06-01", quantity: 10, total: 1500 })];
const instruments = [inst({}), inst({ id: "j", symbol: "BBB", market: "US", name: "Beta Inc", priceTicker: "BBB" })];
const o = investmentOverview({ trades, instruments, closes, today: "2026-01-01" });
const text = (parts: { text: string }[]) => parts.map((p) => p.text).join("");

describe("summarySentence and greetingView", () => {
  const parts = summarySentence(o);
  const cards = greetingView(o);

  it("reads as one sentence with the worth, the gain, the biggest holding and the yearly return in bold", () => {
    expect(text(parts)).toMatch(/^Your 2 holdings are worth ₹[\d,.]+(L|Cr)?, up ₹[\d,.]+(L|Cr)? \(\d+\.\d%\) on what they cost\. Alpha Ltd is \d+\.\d% of it\. (Up|Down) ₹[\d,.]+ on the day, with USD\/INR at ₹90\. Over 2\.0 years your money has earned \d+\.\d% a year/);
    expect(parts.filter((p) => p.strong).length).toBeGreaterThanOrEqual(5);
  });

  it("gives every figure that points a card, and no card is left without a figure (the sentence and the cards agree)", () => {
    const pointed = new Set(parts.filter((p) => p.point).map((p) => p.point));
    for (const point of pointed) expect(cards[point as keyof typeof cards], `a card for ${point}`).toBeDefined();
    for (const key of Object.keys(cards)) expect(pointed.has(key), `a figure for ${key}`).toBe(true);
  });

  it("makes the worth card a list that adds up to the whole", () => {
    const worth = cards.worth!;
    expect(worth.rows.map((r) => r.name)).toEqual(["Alpha Ltd", "Beta Inc"]);
    expect(worth.rows.reduce((s, r) => s + (r.fraction ?? 0), 0)).toBeCloseTo(1, 9);
  });

  it("says nothing it can't back with a card: with no trades there is one plain sentence and no cards", () => {
    const empty = investmentOverview({ trades: [], instruments, closes, today: "2026-01-01" });
    expect(summarySentence(empty)).toEqual([expect.objectContaining({ text: expect.stringMatching(/^Nothing here yet/) })]);
    expect(greetingView(empty)).toEqual({});
  });

  it("says too early, with no yearly figure, under a year of history", () => {
    const young = investmentOverview({ trades: [trade({ tradeDate: "2025-10-01" })], instruments, closes, today: "2026-01-01" });
    expect(text(summarySentence(young))).toMatch(/too early for a yearly return/);
    expect(greetingView(young).yearly).toBeUndefined();
  });

  it("says when prices are older than today", () => {
    const old = investmentOverview({ trades, instruments, closes, today: "2026-01-05" });
    expect(text(summarySentence(old))).toMatch(/Prices are from Jan 1, (up|down) ₹[\d,.]+ on the day, with USD\/INR at ₹90\. /);
  });

  it("names a holding counted at cost for want of a price", () => {
    const naked = investmentOverview({ trades, instruments: [inst({})], closes, today: "2026-01-01" });
    expect(text(summarySentence(naked))).toMatch(/1 holding has no price and is counted at cost/);
  });
});

describe("returnsView", () => {
  const cards = returnsView(o);
  const card = (key: string) => cards.find((c) => c.key === key)!;

  it("gives the design's six cards in its order", () => {
    expect(cards.map((c) => c.key)).toEqual(["xirr", "gap", "total", "realised", "dividends", "fall"]);
  });

  it("says the yearly return plainly, the gap to Nifty with a sign and the S&P's gap in a pill", () => {
    expect(card("xirr")).toMatchObject({ small: "a year · XIRR", muted: false });
    expect(card("xirr").value).toMatch(/^\d+\.\d%$/);
    expect(card("gap").value).toMatch(/^[+−]\d+\.\d%$/);
    expect(card("gap").pill).toMatch(/^S&P [+−]\d+\.\d%$/);
  });

  it("adds what is held, what the sales made and (not yet) dividends into the total return, on every buy", () => {
    const total = card("total");
    const allIn = o.gainInr + o.realisedInr;
    expect(total.value).toMatch(/^[+−]₹/);
    expect(total.pill).toBe(`${allIn >= 0 ? "+" : "−"}${Math.abs((allIn / o.moneyBoughtInr) * 100).toFixed(1)}%`);
    expect(total.tip!.rows.map((r) => r.name)).toEqual(["Still held: price", "Still held: the rupee", "Made on shares sold"]);
    expect(total.tip!.foot).toMatch(/Dividends aren't recorded yet/);
  });

  it("counts the sales, and lists what the cover sales and each holding made", () => {
    expect(card("realised").small).toBe("from 1 sale");
    expect(card("realised").value).toMatch(/^\+₹/);
    expect(card("realised").tip!.rows.map((r) => r.name)).toEqual(expect.arrayContaining(["Shares sold to cover tax at a vest", "Every other sale", "Alpha Ltd"]));
  });

  it("leaves Dividends as a quiet card with no hover, since none are recorded", () => {
    expect(card("dividends")).toMatchObject({ value: "—", small: "not recorded yet", muted: true, tip: null });
  });

  it("names the month of the deepest fall, and draws a hover card only for figures that have something behind them", () => {
    expect(card("fall").small).toMatch(/^in [A-Z][a-z]{2} \d{4}$|^it has only risen$/);
    for (const c of cards) if (c.tip) expect(c.tip.total.length).toBeGreaterThan(0);
  });

  it("says Too early instead of a number under a year, with no hover", () => {
    const young = investmentOverview({ trades: [trade({ tradeDate: "2025-10-01" })], instruments, closes, today: "2026-01-01" });
    const c = returnsView(young);
    expect(c.find((x) => x.key === "xirr")).toMatchObject({ value: "Too early", muted: true, tip: null });
    expect(c.find((x) => x.key === "gap")).toMatchObject({ value: "Too early", tip: null });
  });

  it("says None, not a figure, when nothing has been sold", () => {
    const none = investmentOverview({ trades: [trade({})], instruments, closes, today: "2026-01-01" });
    expect(returnsView(none).find((x) => x.key === "realised")).toMatchObject({ value: "None", small: "no sales yet", tip: null });
  });

  it("is empty with nothing held", () => {
    expect(returnsView(investmentOverview({ trades: [], instruments, closes, today: "2026-01-01" }))).toEqual([]);
  });
});

describe("holdingsView", () => {
  const rows = holdingsView(o);

  it("shows each holding in its own currency, biggest first, with its share and gain", () => {
    expect(rows.map((r) => r.name)).toEqual(["Alpha Ltd", "Beta Inc"]);
    expect(rows[1]).toMatchObject({ market: "US", price: "$10.00", quantity: "10", kind: "BBB · Equity · since 2024" });
    expect(rows[0].worth).toMatch(/^₹/);
    expect(rows[0].gainTone).toBe("gain");
  });

  it("shows what he paid a share on average, with the rate for a US holding", () => {
    expect(rows[0].avgCost).toBe("₹100");
    expect(rows[0].avgCostNote).toBeUndefined();
    expect(rows[1].avgCost).toBe("$10.00");
    expect(rows[1].avgCostNote).toBe("at ₹80");
  });

  it("shows the price's move as a percent chip, the rupee move under it, and the worth in dollars for a US holding", () => {
    expect(rows[0].day).toMatch(/^▲ \d\.\d{2}%$/);
    expect(rows[0].dayTone).toBe("gain");
    expect(rows[0].dayInr).toMatch(/^\+₹/);
    expect(rows[1].day).toBe("– 0.00%"); // BBB's price is flat in this sample: no arrow up or down
    expect(rows[1].dayTone).toBe("plain");
    expect(rows[1].worthNote).toBe("$100.00");
    expect(rows[0].worthNote).toBeUndefined();
  });

  it("names where the price is from, tags a share plan and says 'No price' and 'counted at cost' for a holding with none", () => {
    expect(rows[0].priceNote).toBe("Yahoo");
    const withVest = holdingsView(investmentOverview({ trades: [...trades, trade({ id: "v", symbol: "BBB", market: "US", currency: "USD", source: "RSU", tradeDate: "2025-12-01", quantity: 2, price: 11, total: 22, fxRateToInr: 85 })], instruments, closes, today: "2026-01-01" }));
    expect(withVest.find((r) => r.name === "Beta Inc")!.tags).toEqual(["RSU"]);
    const naked = holdingsView(investmentOverview({ trades, instruments: [inst({})], closes, today: "2026-01-01" }));
    expect(naked.find((r) => r.name === "BBB")).toMatchObject({ price: "No price", priceNote: "counted at cost", day: "—" });
  });

  it("tags a holding whose latest close is more than a week old, and says so under its price", () => {
    const old = new Map(closes);
    old.set("AAA.NS", days("2024-01-02", 400, () => 120)); // ends 2025-02-04
    const stale = holdingsView(investmentOverview({ trades, instruments, closes: old, today: "2026-01-01" })).find((r) => r.name === "Alpha Ltd")!;
    expect(stale.tags).toContain("Stale price");
    expect(stale.priceNote).toMatch(/^from Feb 4, out of date$/);
  });

  it("colours the rupee move by its own sign, not the price's, and calls a move that rounds to nothing flat", () => {
    const mixed = new Map(closes);
    mixed.set("BBB", days("2024-01-02", 731, (i) => (i === 730 ? 10.01 : 10))); // up a tenth of a percent in dollars
    mixed.set("USDINR", days("2024-01-02", 731, (i) => (i === 730 ? 89 : 90))); // the dollar down more than that
    const r = holdingsView(investmentOverview({ trades, instruments, closes: mixed, today: "2026-01-01" })).find((x) => x.name === "Beta Inc")!;
    expect(r.dayTone).toBe("gain");
    expect(r.dayInrTone).toBe("loss");
    const tiny = new Map(closes);
    tiny.set("BBB", days("2024-01-02", 731, (i) => (i === 730 ? 10.0001 : 10)));
    const t = holdingsView(investmentOverview({ trades, instruments, closes: tiny, today: "2026-01-01" })).find((x) => x.name === "Beta Inc")!;
    expect(t.day).toBe("– 0.00%");
    expect(t.dayTone).toBe("plain");
  });

  it("gives the rupees worth of each, so a group can add them up", () => {
    expect(rows.reduce((s, r) => s + r.worthInr, 0)).toBeCloseTo(o.valueInr, 6);
  });
});

describe("recentTradesView", () => {
  it("lists the newest first with a plain name for what each was", () => {
    const rows = recentTradesView([...trades, trade({ id: "v", symbol: "BBB", market: "US", currency: "USD", source: "RSU", tradeDate: "2025-12-01", quantity: 2, price: 11, total: 22, fxRateToInr: 85 })], instruments);
    expect(rows[0]).toMatchObject({ kind: "RSU vest", name: "Beta Inc", detail: "2 × $11.00", total: "$22.00" });
    expect(rows.find((r) => r.id === "s")!.kind).toBe("Sold");
  });

  it("keeps a day's sell above its buy and limits the list", () => {
    const rows = recentTradesView([trade({ id: "b", tradeDate: "2025-01-01" }), trade({ id: "s", tradeDate: "2025-01-01", tradeType: "Sell" })], instruments, 1);
    expect(rows.map((r) => r.id)).toEqual(["s"]);
  });
});

describe("pct", () => {
  it("formats a fraction with a typographic minus and an optional plus", () => {
    expect(pct(0.1234)).toBe("12.3%");
    expect(pct(-0.05)).toBe("−5.0%");
    expect(pct(0.05, 0, true)).toBe("+5%");
  });
});

describe("cash at the brokers in the greeting", () => {
  const cash = cashView({ cash: [{ account: { id: "b", name: "IBKR", bank: "IBKR", accountType: "Brokerage", purpose: "Investment", startDate: "2024-01-01", status: "Active", currency: "USD" }, balance: 1000, rupees: 90_000, date: "2025-12-30", source: "Manual" }], holdingsInr: o.valueInr, today: "2026-01-01", usdInr: 90 });

  it("adds one figure that points, saying the cash and how many brokers, and a card for it", () => {
    const parts = summarySentence(o, cash);
    expect(text(parts)).toMatch(/₹90,000 waits as cash at 1 broker\. /);
    expect(parts.find((p) => p.point === "cash")).toMatchObject({ strong: true });
    expect(greetingView(o, cash).cash).toBeDefined();
  });

  it("says nothing of cash with none, and gives no card", () => {
    expect(text(summarySentence(o))).not.toMatch(/cash/);
    expect(greetingView(o).cash).toBeUndefined();
  });
});

describe("lensViews", () => {
  const lenses = lensViews(o);

  it("has a lens for each holding, with the line, his trades and the stats in words", () => {
    expect(lenses.map((l) => l.symbol)).toEqual(["AAA", "BBB"]);
    const a = lenses[0];
    expect(a.points.length).toBeGreaterThan(100);
    expect(a.markers.map((m) => m.tradeType)).toEqual(["Buy", "Sell"]);
    expect(a.stats.map((s) => s.label)).toEqual(expect.arrayContaining(["Shares", "Average cost", "Worth", "Gain", "Yearly return", "Price a year", "Made on sales"]));
    expect(a.stats.find((s) => s.label === "Average cost")!.value).toBe("₹100");
  });

  it("splits a US holding's gain into the price and the rupee, and has no such line for an Indian one", () => {
    expect(lenses[1].stats.find((s) => s.label === "Of the gain")).toBeDefined();
    expect(lenses[0].stats.find((s) => s.label === "Of the gain")).toBeUndefined();
  });

  it("has a header for each holding: its tile, plan tags and one line saying what it is and how long he has traded it", () => {
    const a = lenses[0].header;
    expect(a.tile).toBe("AAA");
    expect(a.kind).toMatch(/^AAA · .+ · India · 2 trades since \d{4}$/);
    expect(lenses[1].header.kind).toContain("United States");
    expect(lenses.map((l) => l.header.colorKey)).toEqual(holdingsView(o).map((r) => r.colorKey));
  });

  it("doesn't count the shares sold at a vest to cover tax as his trades, and tags the plans and a stale price", () => {
    const vest = [
      trade({ id: "v", symbol: "BBB", market: "US", currency: "USD", source: "RSU", quantity: 10, price: 10, total: 100, fxRateToInr: 80, tradeDate: "2025-03-01" }),
      trade({ id: "c", symbol: "BBB", market: "US", currency: "USD", source: "RSU", tradeType: "Sell", quantity: 3, price: 10, total: 30, fxRateToInr: 80, tradeDate: "2025-03-01" }),
      trade({ id: "e", symbol: "BBB", market: "US", currency: "USD", source: "ESPP", quantity: 5, price: 9, total: 45, fxRateToInr: 80, tradeDate: "2025-06-01" }),
    ];
    const old = new Map(closes);
    old.set("BBB", days("2024-01-02", 400, () => 10));
    const header = lensViews(investmentOverview({ trades: vest, instruments, closes: old, today: "2026-01-01" }))[0].header;
    expect(header.kind).toBe("BBB · Equity · United States · 2 trades since 2025");
    expect(header.tags).toEqual(["RSU", "ESPP", "Stale price"]);
  });

  it("says '1 trade' for a holding traded once", () => {
    const once = lensViews(investmentOverview({ trades: [trade({})], instruments, closes, today: "2026-01-01" }))[0];
    expect(once.header.kind).toMatch(/ · 1 trade since 2024$/);
  });

  it("leaves out Made on sales for a holding never sold", () => {
    expect(lenses[1].stats.find((s) => s.label === "Made on sales")).toBeUndefined();
  });
});

describe("the day's move in the greeting", () => {
  it("points the day figure at a card that lists what moved and adds up to it", () => {
    const parts = summarySentence(o);
    expect(parts.some((p) => p.point === "day")).toBe(true);
    const card = greetingView(o).day!;
    expect(card.rows.length).toBeGreaterThan(0);
    expect(card.total).toMatch(/^[+−]₹/);
  });

  it("has no day figure, and no card, when the day can't be told", () => {
    const flat = new Map(closes);
    flat.set("AAA.NS", days("2024-01-02", 731, () => 100));
    const calm = investmentOverview({ trades, instruments, closes: flat, today: "2026-01-01" });
    expect(summarySentence(calm).some((p) => p.point === "day")).toBe(false);
    expect(greetingView(calm).day).toBeUndefined();
  });
});

describe("pickerView", () => {
  const cards = pickerView(o);

  it("starts with Everything, then each holding in the page's order, tiles coloured the same as the table", () => {
    expect(cards.map((c) => c.key)).toEqual(["all", ...o.lenses.map((l) => l.key)]);
    expect(cards[0]).toMatchObject({ title: "Everything", subtitle: "2 holdings", colorKey: null });
    expect(cards.slice(1).map((c) => c.colorKey)).toEqual(holdingsView(o).map((r) => r.colorKey));
  });

  it("says what was put in and the gain on cost for Everything, and what he holds for a holding", () => {
    expect(cards[0].detail).toMatch(/^Put in ₹[\d,.]+L? · \+\d+% on cost$/);
    expect(cards[1].detail).toMatch(/^You hold 90 · \+\d+% on cost$/);
  });

  it("draws the last three months, oldest first, and no more", () => {
    expect(cards[0].spark).toHaveLength(91);
    expect(cards[1].spark.length).toBeGreaterThan(2);
    expect(cards[1].spark.length).toBeLessThanOrEqual(91);
    expect(cards[1].spark[0]).toBeLessThan(cards[1].spark.at(-1)!); // a rising price
  });

  it("says the move as an arrow and a percent, 'today' only when the prices are today's", () => {
    expect(cards[1].day).toMatch(/^▲ \d\.\d{2}% today$/);
    expect(cards[1].dayTone).toBe("gain");
    const old = pickerView(investmentOverview({ trades, instruments, closes, today: "2026-01-05" }));
    expect(old[1].day).toMatch(/last close$/);
  });

  it("is empty with nothing held", () => {
    expect(pickerView(investmentOverview({ trades: [], instruments, closes, today: "2026-01-01" }))).toEqual([]);
  });
});

describe("review fixes", () => {
  it("starts a sentence with the dollar's rate as 'USD/INR is at', not a fragment, when the day's move can't be told", () => {
    const one = new Map(closes);
    one.set("AAA.NS", [{ date: "2026-01-01", close: 150 }]); // one close: no day before to compare with
    const young = investmentOverview({ trades: [trade({})], instruments, closes: one, today: "2026-01-01" });
    expect(young.dayChangeInr).toBeNull();
    expect(text(summarySentence(young))).toMatch(/of it\.|worth/);
    expect(text(summarySentence(young))).toMatch(/\. USD\/INR is at ₹90\. /);
  });

  it("says 'last close' on a holding whose own close isn't from today, even when others' are", () => {
    const mixed = new Map(closes);
    mixed.set("AAA.NS", days("2024-01-02", 700, (i) => 100 + i * 0.1)); // ends 2025-12-02, not 2026-01-01
    const m = investmentOverview({ trades, instruments, closes: mixed, today: "2026-01-01" });
    const cards = pickerView(m);
    const aaa = cards.find((c) => c.title === "AAA")!;
    const bbb = cards.find((c) => c.title === "BBB")!;
    expect(aaa.day).toMatch(/last close$/);
    expect(bbb.day).toMatch(/today$|^—$/);
  });
});

describe("monthYear", () => {
  it("spells every month in three letters, September included", () => {
    expect(monthYear("2025-09-05")).toBe("Sep 2025");
    expect(monthYear("2026-12-31")).toBe("Dec 2026");
    expect(monthYear("2026-01-01")).toBe("Jan 2026");
  });
});

describe("holdingGroups", () => {
  it("puts India first, then the US, each with its count and what it is worth, and leaves out an empty one", () => {
    const groups = holdingGroups(holdingsView(o));
    expect(groups.map((g) => g.market)).toEqual(["IND", "US"]);
    expect(groups[0]).toMatchObject({ title: "India · INR", summary: expect.stringMatching(/^1 holding · ₹/) });
    expect(groups[1].rows.map((r) => r.name)).toEqual(["Beta Inc"]);
    expect(holdingGroups(holdingsView(o).filter((r) => r.market === "US")).map((g) => g.market)).toEqual(["US"]);
    expect(holdingGroups([])).toEqual([]);
  });
});

describe("moneyInView", () => {
  const v = moneyInView(trades, instruments, "2026-01-01")!;
  const cellOf = (key: string) => v.years.flatMap((y) => y.cells).find((c) => c.key === key)!;

  it("gives a cell a month for each year from his first trade, with the month in words", () => {
    expect(v.years.map((y) => y.year)).toEqual([2024, 2025, 2026]);
    expect(cellOf("2024-01")).toMatchObject({ label: "January 2024", state: "on", colorKey: "teal" });
    expect(cellOf("2026-02").state).toBe("future");
  });

  it("opens a card on a month with something in it, listing each line, and none on an empty month", () => {
    const jan = cellOf("2024-01");
    expect(jan.tip).toMatchObject({ head: "January 2024", total: expect.stringMatching(/^₹/), detail: "put in" });
    expect(jan.tip!.rows.map((r) => r.name)).toEqual(["Alpha Ltd", "Beta Inc"]);
    expect(cellOf("2024-04").tip).toBeNull();
  });

  it("marks a month he sold, and says a sale on its own was a sale", () => {
    expect(cellOf("2025-06")).toMatchObject({ sold: true, colorKey: null });
    expect(cellOf("2025-06").tip).toMatchObject({ total: "No buys", detail: "a sale" });
    expect(cellOf("2025-06").tip!.rows[0].amount).toMatch(/^−₹/);
  });

  it("scales each year's bar to the biggest, and says how many months he bought in", () => {
    expect(Math.max(...v.years.map((y) => y.fraction))).toBe(1);
    expect(v.monthsLine).toMatch(/^\d+ of \d+$/);
  });

  it("is null with no trades", () => {
    expect(moneyInView([], instruments, "2026-01-01")).toBeNull();
  });
});

describe("sameMoneyView", () => {
  const rows = sameMoneyView(o);

  it("puts him first, then each line, each with what it is worth against his own", () => {
    expect(rows[0]).toMatchObject({ key: "you", label: "You, as it went", you: true, value: expect.stringMatching(/^₹/) });
    expect(rows.slice(1).map((r) => r.key)).toEqual(expect.arrayContaining(["nifty", "deposit"]));
    for (const r of rows.slice(1)) expect(r.note).toMatch(/(more|less) than you$/);
  });

  it("colours a line that beat him as a loss for him, and one that didn't as a gain", () => {
    for (const r of rows.slice(1)) {
      const worth = o.sameMoney.find((l) => l.key === r.key)!.valueInr;
      expect(r.tone).toBe(worth > o.valueInr ? "loss" : "gain");
    }
  });

  it("draws the biggest as the full bar", () => {
    expect(Math.max(...rows.map((r) => r.fraction))).toBe(1);
  });

  it("is empty with nothing held", () => {
    expect(sameMoneyView(investmentOverview({ trades: [], instruments, closes, today: "2026-01-01" }))).toEqual([]);
  });
});
