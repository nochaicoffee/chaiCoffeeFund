import { describe, expect, it } from "vitest";
import { AMFI_NAV_URL, frankfurterRangeUrl, parseAmfiNavAll, parseFrankfurterRange, parseYahooChart, priceOnOrBefore, sourceFor, yahooChartUrl, type PricePoint } from "./history";

// The shape Yahoo really sends (NIFTYBEES.NS, 5 days): India's offset 19800 s, and the last close null while the market is open.
const nse = {
  chart: {
    result: [
      {
        meta: { currency: "INR", symbol: "NIFTYBEES.NS", gmtoffset: 19800 },
        timestamp: [1793331900, 1793591100, 1793677500, 1793763900, 1793850300],
        indicators: { quote: [{ close: [262.8900146484375, 265.8999938964844, 270.1199951171875, 272.80999755859375, null] }] },
      },
    ],
    error: null,
  },
};

describe("yahooChartUrl", () => {
  it("builds the daily chart URL and escapes the ticker", () => {
    expect(yahooChartUrl("NIFTYBEES.NS")).toBe("https://query1.finance.yahoo.com/v8/finance/chart/NIFTYBEES.NS?range=5y&interval=1d");
    expect(yahooChartUrl("^NSEI", "1y")).toContain("%5ENSEI?range=1y");
    expect(yahooChartUrl("USDINR=X")).toContain("USDINR%3DX");
  });
});

describe("parseYahooChart", () => {
  it("reads the closes oldest first, as the exchange's own days, and leaves out a day with no close", () => {
    const series = parseYahooChart(nse);
    expect(series.ok && series.currency).toBe("INR");
    expect(series.ok && series.points).toHaveLength(4);
    // 1793331900 s is 2026-10-30 03:45 UTC = 09:15 in India.
    expect(series.ok && series.points[0]).toEqual({ date: "2026-10-30", close: 262.89 });
    expect(series.ok && series.points.map((p) => p.date)).toEqual(["2026-10-30", "2026-11-02", "2026-11-03", "2026-11-04"]);
  });

  it("uses the exchange's day, not UTC's, when they differ", () => {
    // 2026-11-04 23:30 UTC is 2026-11-05 05:00 in India.
    const body = { chart: { result: [{ meta: { currency: "INR", gmtoffset: 19800 }, timestamp: [Date.UTC(2026, 10, 4, 23, 30) / 1000], indicators: { quote: [{ close: [100] }] } }], error: null } };
    const series = parseYahooChart(body);
    expect(series.ok && series.points[0].date).toBe("2026-11-05");
  });

  it("keeps the later close when a day comes twice", () => {
    const t = Date.UTC(2026, 10, 3, 10) / 1000;
    const body = { chart: { result: [{ meta: { currency: "USD", gmtoffset: 0 }, timestamp: [t, t + 60], indicators: { quote: [{ close: [10, 11] }] } }], error: null } };
    const series = parseYahooChart(body);
    expect(series.ok && series.points).toEqual([{ date: "2026-11-03", close: 11 }]);
  });

  it("puts days in order even if Yahoo sends them out of order", () => {
    const body = { chart: { result: [{ meta: { currency: "USD", gmtoffset: 0 }, timestamp: [Date.UTC(2026, 10, 4, 12) / 1000, Date.UTC(2026, 10, 3, 12) / 1000], indicators: { quote: [{ close: [2, 1] }] } }], error: null } };
    const series = parseYahooChart(body);
    expect(series.ok && series.points.map((p) => p.date)).toEqual(["2026-11-03", "2026-11-04"]);
  });

  it("reports Yahoo's own message when the ticker isn't found", () => {
    const series = parseYahooChart({ chart: { result: null, error: { code: "Not Found", description: "No data found, symbol may be delisted" } } });
    expect(series).toEqual({ ok: false, reason: "Yahoo said: No data found, symbol may be delisted" });
  });

  it("is an empty series, not a failure, for a ticker with a currency and no days", () => {
    const series = parseYahooChart({ chart: { result: [{ meta: { currency: "USD" } }], error: null } });
    expect(series).toEqual({ ok: true, currency: "USD", points: [] });
  });

  it.each([
    ["not an object", "oops"],
    ["no chart", {}],
    ["no result", { chart: { result: [], error: null } }],
    ["no currency", { chart: { result: [{ meta: {}, timestamp: [1], indicators: { quote: [{ close: [1] }] } }], error: null } }],
    ["days and prices of different lengths", { chart: { result: [{ meta: { currency: "USD" }, timestamp: [1, 2], indicators: { quote: [{ close: [1] }] } }], error: null } }],
    ["a price of zero", { chart: { result: [{ meta: { currency: "USD" }, timestamp: [1], indicators: { quote: [{ close: [0] }] } }], error: null } }],
    ["a price that is text", { chart: { result: [{ meta: { currency: "USD" }, timestamp: [1], indicators: { quote: [{ close: ["5"] }] } }], error: null } }],
  ])("fails on %s", (_name, body) => {
    expect(parseYahooChart(body).ok).toBe(false);
  });
});

const amfi = `Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Plan;Option;Net Asset Value;Date

Open Ended Schemes(Children's Fund - Children's Fund)

135762;INF846K01WO1;-;Axis Children's Fund;Direct Plan;Growth Option;30.5281;05-Nov-2026
135765;INF846K01WP8;-;Axis Children's Fund;Direct Plan;IDCW Option;N.A.;05-Nov-2026
135759;INF846K01WJ1;-;Axis Children's Fund;Regular Plan;Growth Option;26.5521;05-Nov-2026
broken;line;here
`;

describe("parseAmfiNavAll", () => {
  it("reads each scheme's NAV by code and leaves out an N.A. and the lines that aren't schemes", () => {
    const parsed = parseAmfiNavAll(amfi);
    expect(parsed.ok && [...parsed.byCode.keys()]).toEqual(["135762", "135759"]);
    expect(parsed.ok && parsed.byCode.get("135762")).toEqual({ code: "135762", name: "Axis Children's Fund Direct Plan Growth Option", nav: 30.5281, date: "2026-11-05" });
  });

  it("fails on a file with no scheme lines, such as a redirect page", () => {
    expect(parseAmfiNavAll("<head><title>Document Moved</title></head>").ok).toBe(false);
    expect(parseAmfiNavAll("").ok).toBe(false);
  });

  it("has the URL it was written against", () => {
    expect(AMFI_NAV_URL).toBe("https://www.amfiindia.com/spages/NAVAll.txt");
  });
});

describe("sourceFor", () => {
  it("names a fund by its all-digit AMFI code and everything else by its Yahoo ticker", () => {
    expect(sourceFor("135762")).toEqual({ kind: "amfi", code: "135762" });
    expect(sourceFor(" NIFTYBEES.NS ")).toEqual({ kind: "yahoo", ticker: "NIFTYBEES.NS" });
    expect(sourceFor("^GSPC")).toEqual({ kind: "yahoo", ticker: "^GSPC" });
  });
});

describe("priceOnOrBefore", () => {
  const points: PricePoint[] = [
    { date: "2026-10-29", close: 10 },
    { date: "2026-10-30", close: 11 }, // Friday
    { date: "2026-11-03", close: 12 }, // Tuesday
  ];

  it("gives the day's own close", () => {
    expect(priceOnOrBefore(points, "2026-10-30")).toEqual({ date: "2026-10-30", close: 11, ageDays: 0 });
  });

  it("gives Friday's close for a Saturday, a Sunday and a Monday with no price", () => {
    expect(priceOnOrBefore(points, "2026-10-31")).toEqual({ date: "2026-10-30", close: 11, ageDays: 1 });
    expect(priceOnOrBefore(points, "2026-11-02")).toEqual({ date: "2026-10-30", close: 11, ageDays: 3 });
  });

  it("gives the last close for a day after the series ends, with its age", () => {
    expect(priceOnOrBefore(points, "2026-11-10")).toEqual({ date: "2026-11-03", close: 12, ageDays: 7 });
  });

  it("is null before the first price, never a price from the future", () => {
    expect(priceOnOrBefore(points, "2026-10-28")).toBeNull();
    expect(priceOnOrBefore([], "2026-10-28")).toBeNull();
  });
});

describe("parseYahooChart and a market still open", () => {
  const sessionStart = Date.UTC(2026, 10, 5, 14, 30) / 1000; // 9:30 in New York
  const sessionEnd = Date.UTC(2026, 10, 5, 21, 0) / 1000; // 16:00 in New York
  const body = {
    chart: {
      result: [
        {
          meta: { currency: "USD", gmtoffset: -18000, currentTradingPeriod: { regular: { start: sessionStart, end: sessionEnd } } },
          timestamp: [Date.UTC(2026, 10, 4, 14, 30) / 1000, sessionStart],
          indicators: { quote: [{ close: [100, 101.5] }] },
        },
      ],
      error: null,
    },
  };

  it("leaves out today's close while the session is on, since it is only the latest price", () => {
    const during = parseYahooChart(body, (sessionStart + 3600) * 1000);
    expect(during.ok && during.points.map((p) => p.date)).toEqual(["2026-11-04"]);
  });

  it("keeps today's close once the session has ended", () => {
    const after = parseYahooChart(body, (sessionEnd + 60) * 1000);
    expect(after.ok && after.points.map((p) => p.date)).toEqual(["2026-11-04", "2026-11-05"]);
  });

  it("with no session time, leaves out a day dated today on the exchange's clock", () => {
    const noSession = { chart: { result: [{ meta: { currency: "USD", gmtoffset: -18000 }, timestamp: [sessionStart], indicators: { quote: [{ close: [101.5] }] } }], error: null } };
    expect(parseYahooChart(noSession, (sessionStart + 3600) * 1000)).toEqual({ ok: true, currency: "USD", points: [] });
  });
});

describe("parseFrankfurterRange", () => {
  it("reads a rate for each day, oldest first", () => {
    const parsed = parseFrankfurterRange({ rates: { "2026-11-03": { INR: 94.4 }, "2026-11-02": { INR: 94.1 } } });
    expect(parsed).toEqual({ ok: true, currency: "INR", points: [{ date: "2026-11-02", close: 94.1 }, { date: "2026-11-03", close: 94.4 }] });
  });

  it.each([["no rates", {}], ["a zero rate", { rates: { "2026-11-02": { INR: 0 } } }], ["a bad day", { rates: { today: { INR: 94 } } }], ["no INR", { rates: { "2026-11-02": { EUR: 0.9 } } }], ["not an object", null]])("fails on %s", (_n, body) => {
    expect(parseFrankfurterRange(body).ok).toBe(false);
  });

  it("builds the range URL", () => {
    expect(frankfurterRangeUrl("2024-05-28", "2026-11-05")).toBe("https://api.frankfurter.dev/v1/2024-05-28..2026-11-05?base=USD&symbols=INR");
  });
});

describe("parseYahooChart precision", () => {
  it("rounds a 32-bit float close to four places", () => {
    const body = { chart: { result: [{ meta: { currency: "USD", gmtoffset: 0 }, timestamp: [Date.UTC(2026, 3, 6, 12) / 1000], indicators: { quote: [{ close: [100.9000015258789] }] } }], error: null } };
    const series = parseYahooChart(body);
    expect(series.ok && series.points[0].close).toBe(100.9);
  });
});
