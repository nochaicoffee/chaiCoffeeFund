/**
 * Fills a separate, empty demo spreadsheet with a made-up person's money (docs/walkthrough.md), so the app can be shown, recorded
 * and screenshotted without a single real figure. Every name, number and date here is invented, and the dates are counted back
 * from today, so seeding again months later still gives a current-looking year.
 *
 * Safety: it writes only to DEMO_SPREADSHEET_ID, never to GOOGLE_SHEETS_SPREADSHEET_ID, and refuses a spreadsheet whose title
 * doesn't contain "demo" or whose Accounts tab already has rows. Every record is checked against the app's own create schemas
 * before the first write.
 *
 * Unlike the other scripts it imports the Sheets code directly (one append per tab instead of one request per row, which the
 * 60-writes-a-minute quota wouldn't allow), so it runs with the react-server condition that makes `server-only` a no-op.
 *
 * Usage: npm run seed-demo            (reads .env.demo.local: DEMO_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_KEY_FILE)
 *        npm run seed-demo -- --dry-run (checks every record, writes nothing)
 */
import { existsSync, readFileSync } from "node:fs";
import type { z } from "zod";

/** KEY=value lines, as in .env files. Read by hand: process.loadEnvFile needs Node 20.12, and the setup asks for 20.9. A variable already set wins. */
function loadEnv(file: string) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
}
if (existsSync(".env.demo.local")) loadEnv(".env.demo.local");
const DEMO_ID = process.env.DEMO_SPREADSHEET_ID;
const DRY = process.argv.includes("--dry-run");
if (!DEMO_ID && !DRY) throw new Error("Set DEMO_SPREADSHEET_ID (in .env.demo.local) to the demo spreadsheet's id.");
// Whatever .env files say, this process only ever talks to the demo spreadsheet.
process.env.GOOGLE_SHEETS_SPREADSHEET_ID = DEMO_ID ?? "dry-run";

type Repo<T> = { sheetName: string; createMany(inputs: Omit<T, "id">[]): Promise<T[]>; list(): Promise<T[]> };
type Item = { key?: string; data: Record<string, unknown> };

// ---------- dates, counted from today ----------
const now = new Date();
const TY = now.getFullYear();
const TM = now.getMonth();
const TODAY = ymd(TY, TM, now.getDate());
function ymd(y: number, m0: number, d: number): string {
  const last = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m0, Math.min(d, last))).toISOString().slice(0, 10);
}
/** Day `day` of the month `offset` months from this one (clamped to the month's end). */
const mon = (offset: number, day: number) => ymd(TY, TM + offset, day);
const monthKey = (offset: number) => mon(offset, 1).slice(0, 7);
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function addMonths(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return ymd(y, m - 1 + n, d);
}
const past = (date: string) => date <= TODAY;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** The same made-up numbers every run. */
function rng(seed: number) {
  let a = seed;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)), pick: <T>(xs: T[]) => xs[Math.floor(next() * xs.length)] };
}
const round = (n: number, step = 1) => Math.round(n / step) * step;

// ---------- writing ----------
const ids = new Map<string, string>();
function id(key: string): string {
  const found = ids.get(key);
  if (found) return found;
  if (DRY || !DEMO_ID) return `dry-${key}`;
  throw new Error(`No record written yet for ${key}`);
}
let written = 0;
const filled: string[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pause = () => sleep(1100);
let isQuotaError: (error: unknown) => boolean = () => false;

/**
 * Runs one write, waiting out the Sheets quota (60 writes a minute) and trying again: a refused write wrote nothing, so a retry can't
 * double a row. Any other failure stops the run, saying what was already written, since an append that timed out may have landed.
 */
async function withQuotaRetry<T>(what: string, run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (isQuotaError(error) && attempt < 5) {
        console.log(`  … ${what}: the Sheets quota is used up for this minute, trying again in ${20 * attempt} s`);
        await sleep(20_000 * attempt);
        continue;
      }
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`${what} failed: ${reason}\nAlready written: ${filled.join(", ") || "nothing"}. Make a fresh demo spreadsheet and run it again.`);
    }
  }
}

async function write<T extends { id: string }>(repo: Repo<T>, schema: z.ZodType, items: Item[], write: boolean) {
  const parsed = items.map((item, n) => {
    const result = schema.safeParse(item.data);
    if (!result.success) throw new Error(`${repo.sheetName} #${n} (${item.key ?? ""}): ${JSON.stringify(result.error.issues)}`);
    return result.data as Omit<T, "id">;
  });
  if (!write) {
    items.forEach((item) => item.key && ids.set(item.key, `dry-${item.key}`));
    console.log(`  ✓ ${repo.sheetName}: ${parsed.length} rows check out`);
    return;
  }
  const created = await withQuotaRetry(repo.sheetName, () => repo.createMany(parsed));
  created.forEach((record, n) => items[n].key && ids.set(items[n].key!, record.id));
  written += created.length;
  filled.push(repo.sheetName);
  console.log(`  + ${repo.sheetName}: ${created.length} rows`);
  await pause();
}

// ---------- the made-up person ----------
// Goal set-asides stay below the balance of the account they sit in, or Goals warns that the earmarks exceed it.
const accounts = (): Item[] => [
  { key: "hdfc", data: { name: "HDFC Salary", bank: "HDFC Bank", accountType: "Savings", purpose: "Spending", startDate: "2019-04-01", status: "Active", color: "Sapphire", last4: "4821" } },
  { key: "sbi", data: { name: "SBI Rainy Day", bank: "State Bank of India", accountType: "Savings", purpose: "Emergency-Fund", startDate: "2018-06-12", status: "Active", color: "Teal", last4: "0377" } },
  { key: "kotak", data: { name: "Kotak Everyday", bank: "Kotak Mahindra Bank", accountType: "Savings", purpose: "Spending", startDate: "2021-02-03", status: "Active", color: "Ruby", last4: "9150" } },
  { key: "icici", data: { name: "ICICI Invest", bank: "ICICI Bank", accountType: "Savings", purpose: "Investment", startDate: "2020-11-09", status: "Active", color: "Violet", last4: "2284" } },
  { key: "zerodha", data: { name: "Zerodha", bank: "Zerodha", accountType: "Brokerage", purpose: "Investment", startDate: "2021-07-01", status: "Active", color: "Amber" } },
];

function balanceSnapshots(): Item[] {
  const r = rng(11);
  const plan: [string, number, number, number, number][] = [
    // account, day of month, start, monthly drift, noise
    ["hdfc", 28, 165000, 8500, 18000],
    ["sbi", 2, 560000, 7500, 0],
    ["kotak", 5, 42000, 0, 6000],
    ["icici", 15, 92000, 3200, 4000],
    ["zerodha", 10, 6000, 0, 4000],
  ];
  const out: Item[] = [];
  for (const [account, day, start, drift, noise] of plan) {
    for (const m of range(-12, 0)) {
      const date = mon(m, day);
      if (!past(date)) continue;
      const step = m + 12;
      const balance = round(start + drift * step + (noise ? r.int(-noise, noise) : 0), 100);
      out.push({ data: { accountId: id(account), date, balance: Math.max(balance, 1500), source: "Manual" } });
    }
  }
  return out;
}

const transfers = (): Item[] =>
  range(-12, 0)
    .map((m) => mon(m, 3))
    .filter(past)
    .map((date) => ({ data: { date, fromAccountId: id("hdfc"), toAccountId: id("zerodha"), amount: 15000, source: "Manual" } }));

const cards = (): Item[] => [
  { key: "millennia", data: { name: "HDFC Millennia", alias: "Millennia", issuer: "HDFC-Bank", cardType: "Cashback", creditLimit: 150000, statementDay: 6, dueDayBuffer: 20, status: "Active", last4: "4417", color: "Teal", defaultPaidFromAccountId: id("hdfc") } },
  { key: "amazon", data: { name: "ICICI Amazon Pay", alias: "Amazon Pay", issuer: "ICICI-Bank", cardType: "Cashback", creditLimit: 200000, statementDay: 18, dueDayBuffer: 18, status: "Active", last4: "7042", color: "Copper", defaultPaidFromAccountId: id("hdfc") } },
];

function statements(): Item[] {
  const r = rng(22);
  const out: Item[] = [];
  const plan: [string, number, number, number, number][] = [
    ["millennia", 6, 20, 18000, 42000],
    ["amazon", 18, 18, 5000, 16000],
  ];
  for (const [card, day, buffer, lo, hi] of plan) {
    for (const m of range(-12, 0)) {
      const statementDate = mon(m, day);
      if (!past(statementDate)) continue;
      const dueDate = addDays(statementDate, buffer);
      // The month with the new phone on the Amazon card runs high.
      const total = round(r.int(lo, hi) + (card === "amazon" && m === -3 ? 64999 : 0), 1) + r.int(0, 99) / 100;
      const paid = past(addDays(dueDate, -2));
      out.push({
        data: {
          cardId: id(card), statementDate, dueDate, totalAmountDue: total, minimumAmountDue: round(total * 0.05),
          status: paid ? "Paid" : "Pending",
          ...(paid ? { amountPaid: total, paidDate: addDays(dueDate, -2), paidFromAccountId: id("hdfc") } : {}),
        },
      });
    }
  }
  return out;
}

type Sub = { key: string; name: string; alias: string; category: string; amount: number; cycle: "Monthly" | "Quarterly" | "Yearly"; start: string; color: string; from: ["account" | "card", string]; endDate?: string };
const subs = (): Sub[] => [
  { key: "netflix", name: "Netflix Standard", alias: "Netflix", category: "Streaming", amount: 499, cycle: "Monthly", start: mon(-20, 12), color: "Ruby", from: ["card", "millennia"] },
  { key: "spotify", name: "Spotify Premium", alias: "Spotify", category: "Music", amount: 139, cycle: "Monthly", start: mon(-30, 3), color: "Emerald", from: ["card", "amazon"] },
  { key: "icloud", name: "iCloud+ 200 GB", alias: "iCloud", category: "Cloud-Storage", amount: 219, cycle: "Monthly", start: mon(-16, 20), color: "Sky", from: ["card", "millennia"] },
  { key: "cult", name: "Cult.fit Elite", alias: "Cult", category: "Fitness", amount: 1499, cycle: "Monthly", start: mon(-7, 1), color: "Coral", from: ["account", "hdfc"] },
  { key: "fiber", name: "Airtel Xstream Fiber", alias: "Airtel", category: "Utilities", amount: 1178, cycle: "Monthly", start: mon(-26, 8), color: "Olive", from: ["account", "hdfc"] },
  { key: "prime", name: "Amazon Prime", alias: "Prime", category: "Shopping", amount: 1499, cycle: "Yearly", start: mon(-33, 14), color: "Navy", from: ["card", "amazon"] },
  { key: "hotstar", name: "JioHotstar Premium", alias: "Hotstar", category: "Streaming", amount: 499, cycle: "Quarterly", start: mon(-14, 25), color: "Indigo", from: ["card", "millennia"], endDate: mon(-3, 24) },
];
const paidFrom = (from: Sub["from"], prefix = "paidFrom") => (from[0] === "account" ? { [`${prefix}AccountId`]: id(from[1]) } : { [`${prefix}CardId`]: id(from[1]) });
const subscriptions = (): Item[] =>
  subs().map((s) => ({
    key: s.key,
    data: {
      name: s.name, alias: s.alias, category: s.category, amount: s.amount, billingCycle: s.cycle, billingAnchorDate: s.start, startDate: s.start,
      status: s.endDate ? "Cancelled" : "Active", ...(s.endDate ? { endDate: s.endDate } : {}), color: s.color, ...paidFrom(s.from, "defaultPaidFrom"),
    },
  }));
function subscriptionPayments(): Item[] {
  const out: Item[] = [];
  const since = mon(-13, 1);
  for (const s of subs()) {
    const step = s.cycle === "Monthly" ? 1 : s.cycle === "Quarterly" ? 3 : 12;
    for (let k = 0; ; k++) {
      const date = addMonths(s.start, k * step);
      if (!past(date) || (s.endDate && date > s.endDate)) break;
      if (date >= since) out.push({ data: { subscriptionId: id(s.key), paymentDate: date, amount: s.amount, status: "Paid", ...paidFrom(s.from) } });
    }
  }
  return out;
}

const incomeSources = (): Item[] => [
  { key: "salary", data: { name: "Acme Technologies", alias: "Salary", category: "Salary", frequency: "Monthly", expectedAmount: 168000, status: "Active", scheduleDate: mon(0, 28), color: "Sapphire", icon: "Briefcase", accountId: id("hdfc"), statementMatch: "ACME TECH" } },
  { key: "dividends", data: { name: "Dividends", alias: "Dividends", category: "Investment", frequency: "Quarterly", expectedAmount: 2400, status: "Active", scheduleDate: mon(-1, 15), color: "Jade", icon: "Pie", accountId: id("icici") } },
  { key: "freelance", data: { name: "Freelance design work", alias: "Freelance", category: "Other", frequency: "One-Time", expectedAmount: 35000, status: "Active", scheduleDate: mon(-4, 10), color: "Orchid", icon: "Receipt", accountId: id("kotak") } },
];
function incomeEntries(): Item[] {
  const out: Item[] = [];
  for (const m of range(-12, 0)) {
    const date = mon(m, 28);
    if (!past(date)) continue;
    // A raise five months ago, so Pay changes has something to show.
    out.push({ data: { incomeSourceId: id("salary"), expectedDate: date, receivedDate: date, amount: m >= -5 ? 168000 : 152000, status: "Received", accountId: id("hdfc"), tag: "Regular", origin: "Manual" } });
  }
  out.push({ data: { incomeSourceId: id("salary"), expectedDate: mon(-5, 15), receivedDate: mon(-5, 15), amount: 120000, status: "Received", accountId: id("hdfc"), tag: "Bonus", origin: "Manual" } });
  for (const m of [-10, -7, -4, -1]) out.push({ data: { incomeSourceId: id("dividends"), expectedDate: mon(m, 15), receivedDate: mon(m, 16), amount: 2100 + (m + 10) * 60, status: "Received", accountId: id("icici"), tag: "Regular", origin: "Manual" } });
  out.push({ data: { incomeSourceId: id("freelance"), expectedDate: mon(-4, 10), receivedDate: mon(-4, 12), amount: 35000, status: "Received", accountId: id("kotak"), tag: "Regular", origin: "Manual" } });
  return out;
}

const loan = () => ({
  name: "Car loan", lenderName: "HDFC Bank", category: "Auto", repaymentStructure: "Standard-Emi", principalAmount: 600000, annualInterestRate: 9.5, tenureMonths: 60,
  paymentFrequency: "Monthly", processingFee: 4720, disbursementDate: mon(-14, 20), status: "Active", firstEmiDate: mon(-13, 5), stampDuty: 500, preEmiInterest: 2342,
  prepaymentEffect: "Reduce-Tenure", color: "Copper", emiPaidFromAccountId: id("hdfc"), prepaymentChargePercent: 4, prepaymentMaxPercent: 25, prepaymentAfterEmis: 1, disbursedTo: "Seller",
});

const policies = (): Item[] => [
  { key: "health", data: { name: "Health cover", kind: "Health", insurer: "Star Health", policyNumber: "DEMO000123451", covers: "You", sumInsured: 1000000, status: "Active", color: "Coral", paidFromCardId: id("millennia"), addOns: "Room rent waiver, Restore benefit", claimsPhone: "1800 000 0000", notes: "Made-up policy for the demo. 2-year wait for listed illnesses." } },
  { key: "parents", data: { name: "Parents' health", kind: "Health", insurer: "Niva Bupa", policyNumber: "DEMO000123452", covers: "Parents", sumInsured: 500000, status: "Active", color: "Plum", paidFromAccountId: id("hdfc") } },
  { key: "life", data: { name: "Term life", kind: "Life", insurer: "HDFC Life", policyNumber: "DEMO000123453", covers: "You", sumInsured: 10000000, status: "Active", color: "Indigo", paidFromAccountId: id("hdfc") } },
  { key: "motor", data: { name: "Car insurance", kind: "Motor", insurer: "ICICI Lombard", policyNumber: "DEMO000123454", covers: "Car", coversDetail: "Hatchback, bought with the car loan", sumInsured: 560000, status: "Active", color: "Slate", paidFromCardId: id("amazon"), addOns: "Zero depreciation, Engine protect" } },
];
const policyPayments = (): Item[] => [
  { data: { policyId: id("health"), periodStart: mon(-22, 1), years: 1, amount: 17200, paidOn: mon(-22, 1), status: "Paid", paidFromCardId: id("millennia") } },
  { data: { policyId: id("health"), periodStart: mon(-10, 1), years: 1, amount: 18500, paidOn: addDays(mon(-10, 1), -3), status: "Paid", paidFromCardId: id("millennia") } },
  { data: { policyId: id("parents"), periodStart: mon(-11, 12), years: 1, amount: 28400, paidOn: mon(-11, 10), status: "Paid", paidFromAccountId: id("hdfc") } },
  { data: { policyId: id("life"), periodStart: mon(-20, 5), years: 1, amount: 14200, paidOn: mon(-20, 5), status: "Paid", paidFromAccountId: id("hdfc") } },
  { data: { policyId: id("life"), periodStart: mon(-8, 5), years: 1, amount: 14200, paidOn: mon(-8, 4), status: "Paid", paidFromAccountId: id("hdfc") } },
  { data: { policyId: id("motor"), periodStart: mon(-14, 20), years: 1, amount: 31800, paidOn: mon(-14, 20), status: "Paid", paidFromCardId: id("amazon"), sumInsured: 620000, ncb: 0 } },
  { data: { policyId: id("motor"), periodStart: mon(-2, 20), years: 1, amount: 26500, paidOn: mon(-2, 18), status: "Paid", paidFromCardId: id("amazon"), sumInsured: 560000, ncb: 20 } },
];

const goals = (): Item[] => [
  { key: "house", data: { name: "Home down payment", category: "Home", necessity: "Need", scale: "Major", amount: 1500000, targetDate: mon(36, 1), dateType: "Flexible", startDate: mon(-12, 1), plannedMonthly: 30000, status: "Active", color: "Pine" } },
  { key: "trip", data: { name: "Goa trip", category: "Travel", necessity: "Want", scale: "Minor", amount: 60000, targetDate: mon(2, 15), dateType: "Fixed", startDate: mon(-6, 1), plannedMonthly: 10000, status: "Active", color: "Sky" } },
  { key: "laptop", data: { name: "New laptop", category: "Gadget", necessity: "Want", scale: "Minor", amount: 120000, targetDate: mon(5, 1), dateType: "Flexible", startDate: mon(-3, 1), plannedMonthly: 15000, status: "Active", color: "Violet" } },
  { key: "wedding", data: { name: "Sister's wedding", category: "Family", necessity: "Need", scale: "Major", amount: 100000, targetDate: mon(10, 20), dateType: "Fixed", startDate: mon(-8, 1), plannedMonthly: 20000, status: "Active", color: "Raspberry" } },
  { key: "phone", data: { name: "Phone upgrade", category: "Gadget", necessity: "Want", scale: "Minor", amount: 65000, targetDate: mon(-3, 10), dateType: "Flexible", startDate: mon(-9, 1), plannedMonthly: 11000, status: "Done", doneOn: mon(-3, 10), actualCost: 64999, paidFromCardId: id("amazon"), color: "Graphite" } },
];
const subGoals = (): Item[] => [
  { key: "gift", data: { name: "Gift", parentId: id("wedding"), category: "Family", necessity: "Need", scale: "Major", amount: 150000, targetDate: mon(10, 20), dateType: "Fixed", startDate: mon(-8, 1), status: "Active" } },
  { key: "travel", data: { name: "Family travel", parentId: id("wedding"), category: "Travel", necessity: "Need", scale: "Major", amount: 50000, targetDate: mon(10, 20), dateType: "Fixed", startDate: mon(-8, 1), status: "Active" } },
];
function goalContributions(): Item[] {
  const out: Item[] = [];
  const plan: [string, number, number, string][] = [
    ["house", -12, 30000, "sbi"],
    ["trip", -6, 9000, "hdfc"],
    ["laptop", -3, 15000, "hdfc"],
    ["wedding", -8, 8000, "sbi"],
    ["gift", -8, 9000, "sbi"],
    ["travel", -6, 4000, "sbi"],
  ];
  for (const [goal, from, amount, account] of plan) {
    for (const m of range(from, 0)) {
      const date = mon(m, 2);
      if (past(date)) out.push({ data: { goalId: id(goal), date, amount, kind: "Set-aside", accountId: id(account) } });
    }
  }
  for (const m of range(-9, -4)) out.push({ data: { goalId: id("phone"), date: mon(m, 2), amount: 11000, kind: "Set-aside", accountId: id("hdfc") } });
  out.push({ data: { goalId: id("house"), date: mon(-4, 20), amount: 25000, kind: "Take-back", accountId: id("sbi"), note: "Moved to the wedding fund" } });
  return out;
}

const instruments = (): Item[] => [
  { data: { symbol: "NIFTYBEES", market: "IND", name: "Nippon India Nifty 50 BeES", assetType: "ETF", priceTicker: "NIFTYBEES.NS", color: "Teal" } },
  { data: { symbol: "GOLDBEES", market: "IND", name: "Nippon India Gold BeES", assetType: "Gold", priceTicker: "GOLDBEES.NS", color: "Amber" } },
  { data: { symbol: "PPFCF", market: "IND", name: "Parag Parikh Flexi Cap (Direct)", assetType: "Mutual-Fund", priceTicker: "122639", color: "Violet" } },
  { data: { symbol: "INFY", market: "IND", name: "Infosys", assetType: "Equity", priceTicker: "INFY.NS", color: "Sapphire" } },
  { data: { symbol: "VOO", market: "US", name: "Vanguard S&P 500 ETF", assetType: "ETF", priceTicker: "VOO", color: "Ruby" } },
];
function investmentTransactions(): Item[] {
  const r = rng(33);
  const out: Item[] = [];
  const trade = (tradeDate: string, symbol: string, assetType: string, tradeType: "Buy" | "Sell", quantity: number, price: number, extra: Record<string, unknown> = {}) => {
    const us = extra.market === "US";
    out.push({
      data: {
        tradeDate, symbol, market: "IND", currency: us ? "USD" : "INR", tradeType, source: "Market", quantity, price, total: Math.round(quantity * price * 100) / 100, assetType,
        broker: us ? "INDmoney" : "Zerodha", ...(us ? {} : { settlementAccountId: id("zerodha") }), ...extra,
      },
    });
  };
  for (const m of range(-12, 0)) {
    const date = mon(m, 5);
    if (!past(date)) continue;
    trade(date, "NIFTYBEES", "ETF", "Buy", 30, round(268 + (m + 12) * 1.6 + r.int(-6, 6), 0.01));
    trade(mon(m, 7), "PPFCF", "Mutual-Fund", "Buy", Math.round((10000 / (84 + (m + 12) * 0.5)) * 1000) / 1000, round(84 + (m + 12) * 0.5 + r.next(), 0.0001));
  }
  for (const m of [-11, -7, -3]) trade(mon(m, 12), "GOLDBEES", "Gold", "Buy", 100, round(72 + (m + 12) * 2.4, 0.01));
  trade(mon(-8, 14), "INFY", "Equity", "Buy", 20, 1552.4);
  trade(mon(-2, 9), "INFY", "Equity", "Sell", 5, 1618.75);
  trade(mon(-10, 21), "VOO", "ETF", "Buy", 2, 541.2, { market: "US", fxRateToInr: 85.42 });
  trade(mon(-4, 18), "VOO", "ETF", "Buy", 1, 577.9, { market: "US", fxRateToInr: 87.1 });
  return out;
}
const investmentTargets = (): Item[] => [
  ...([["India-Equity", 55], ["US-Equity", 15], ["Debt", 20], ["Gold", 10]] as const).map(([name, percent]) => ({ data: { kind: "Target", name, percent } })),
  ...([["One-Holding", 35], ["Dollars", 25], ["Debt-Floor", 15]] as const).map(([name, percent]) => ({ data: { kind: "Limit", name, percent } })),
];

const fixedDeposits = (): Item[] => [
  { data: { name: "SBI 1-year FD", bankName: "State Bank of India", principalAmount: 200000, interestRate: 7.1, compoundingType: "Cumulative", startDate: mon(-5, 6), maturityDate: addMonths(mon(-5, 6), 12), maturityAmount: 214584, accountId: id("sbi"), status: "Active" } },
  { data: { name: "HDFC tax saver", bankName: "HDFC Bank", principalAmount: 150000, interestRate: 7.0, compoundingType: "Cumulative", startDate: mon(-23, 18), maturityDate: addMonths(mon(-23, 18), 60), maturityAmount: 212240, accountId: id("hdfc"), status: "Active" } },
  { data: { name: "ICICI 6-month FD", bankName: "ICICI Bank", principalAmount: 100000, interestRate: 6.75, compoundingType: "Cumulative", startDate: mon(-10, 4), maturityDate: addMonths(mon(-10, 4), 6), maturityAmount: 103370, accountId: id("icici"), status: "Closed", closedDate: addMonths(mon(-10, 4), 6), receivedAmount: 103370, closeKind: "Matured" } },
];

/** The financial year (April to March) a date falls in, "2026-27". */
const fy = (date: string) => {
  const [y, m] = date.split("-").map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
};
const fyStart = (date: string) => `${fy(date).slice(0, 4)}-04-01`;
const epfAccounts = (): Item[] => [{ key: "epf", data: { name: "Acme Technologies", establishment: "Acme Technologies Pvt Ltd", memberIdLast4: "4410", status: "Active" } }];
function epfEntries(): Item[] {
  const opening = fyStart(mon(-12, 1));
  const out: Item[] = [{ data: { epfAccountId: id("epf"), kind: "Opening", date: opening, employee: 286000, employer: 88000, pension: 0, source: "Typed" } }];
  // Every wage month from the opening's April to last month, each credited on the 15th of the month after: no month left out.
  for (let wage = opening; wage.slice(0, 7) <= monthKey(-1); wage = addMonths(wage, 1)) {
    const date = addMonths(wage, 1).slice(0, 8) + "15";
    if (past(date)) out.push({ data: { epfAccountId: id("epf"), kind: "Contribution", date, wageMonth: wage.slice(0, 7), employee: 7200, employer: 5950, pension: 1250, source: "Typed" } });
  }
  const interestDay = `${Number(opening.slice(0, 4)) + 1}-03-31`;
  if (past(interestDay)) out.push({ data: { epfAccountId: id("epf"), kind: "Interest", date: interestDay, employee: 27800, employer: 9600, pension: 0, source: "Typed" } });
  return out;
}
const epfRates = (): Item[] => [
  { data: { epfAccountId: id("epf"), financialYear: fy(TODAY), ratePercent: 8.25, source: "Assumed" } },
];

const lentLoans = (): Item[] => [
  { key: "rahul", data: { borrowerName: "Karan (made up)", principalAmount: 50000, startDate: mon(-8, 10), interestMode: "Accruing", interestRate: 10, status: "Active", color: "Orchid", paidFromAccountId: id("hdfc") } },
  { key: "meera", data: { borrowerName: "Meera (made up)", principalAmount: 30000, startDate: mon(-11, 2), interestMode: "Accruing", interestRate: 8, status: "Repaid", closedDate: mon(-3, 2), color: "Jade", paidFromAccountId: id("kotak") } },
];
const lentRepayments = (): Item[] => [
  { data: { lentLoanId: id("rahul"), date: mon(-5, 10), amount: 10000, kind: "Principal" } },
  { data: { lentLoanId: id("rahul"), date: mon(-2, 10), amount: 10000, kind: "Principal" } },
  { data: { lentLoanId: id("meera"), date: mon(-6, 2), amount: 15000, kind: "Principal" } },
  { data: { lentLoanId: id("meera"), date: mon(-3, 2), amount: 15000, kind: "Principal" } },
  { data: { lentLoanId: id("meera"), date: mon(-3, 2), amount: 1600, kind: "Interest" } },
];

const bigSpends = (): Item[] => [
  { data: { date: mon(-1, 9), amount: 18500, name: "Flights home for Diwali", category: "Travel", paidFromCardId: id("amazon") } },
  { data: { date: mon(-3, 10), amount: 64999, name: "New phone", category: "Electronics", paidFromCardId: id("amazon"), note: "The Phone upgrade goal" } },
  { data: { date: mon(-6, 14), amount: 42000, name: "Sofa", category: "Home", paidFromAccountId: id("hdfc") } },
  { data: { date: mon(-8, 22), amount: 12500, name: "Dental treatment", category: "Health", paidFromAccountId: id("kotak") } },
];

function dailySpends(): Item[] {
  const r = rng(44);
  const kinds: [string, string[], number, number, number][] = [
    // category, notes, low, high, weight
    ["food", ["Lunch", "Coffee", "Dinner out", "Snacks", "Swiggy order"], 60, 650, 6],
    ["groceries", ["Groceries", "Vegetables", "Zepto order"], 250, 2200, 3],
    ["transport", ["Auto to office", "Metro card top-up", "Cab home", "Petrol"], 40, 900, 4],
    ["shopping", ["T-shirt", "Shoes", "Gift for a friend"], 400, 3200, 1],
    ["bills", ["Mobile recharge", "Electricity bill", "Gas cylinder"], 300, 1800, 1],
    ["health", ["Pharmacy", "Doctor visit"], 150, 900, 1],
    ["fun", ["Movie", "Bowling", "Concert ticket"], 300, 1500, 1],
    ["other", ["Haircut", "Donation", "Laundry"], 100, 600, 1],
  ];
  const bag = kinds.flatMap((k) => Array(k[4]).fill(k) as (typeof kinds)[number][]);
  const out: Item[] = [];
  for (let date = addDays(TODAY, -75); date < TODAY; date = addDays(date, 1)) {
    for (let n = r.int(1, 4); n > 0; n--) {
      const [category, notes, lo, hi] = r.pick(bag);
      const method = r.next() < 0.7 ? "UPI" : r.next() < 0.6 ? "Card" : "Cash";
      out.push({ data: { date, amount: round(r.int(lo, hi), 5), method, category, note: r.pick(notes) } });
    }
  }
  return out;
}
const dailyBudgets = (): Item[] => [{ data: { month: monthKey(-3), limit: 55000 } }];
const dailyCategoryLimits = (): Item[] => [{ data: { category: "food", month: monthKey(-2), limit: 16000 } }];

// ---------- run ----------
async function main() {
  const S = {
    accounts: await import("@/lib/sheets/accounts"),
    balanceSnapshots: await import("@/lib/sheets/balanceSnapshots"),
    transfers: await import("@/lib/sheets/transfers"),
    cards: await import("@/lib/sheets/cards"),
    statements: await import("@/lib/sheets/statements"),
    subscriptions: await import("@/lib/sheets/subscriptions"),
    subscriptionPayments: await import("@/lib/sheets/subscriptionPayments"),
    incomeSources: await import("@/lib/sheets/incomeSources"),
    incomeEntries: await import("@/lib/sheets/incomeEntries"),
    loans: await import("@/lib/sheets/loans"),
    loanInstallments: await import("@/lib/sheets/loanInstallments"),
    policies: await import("@/lib/sheets/policies"),
    policyPayments: await import("@/lib/sheets/policyPayments"),
    goals: await import("@/lib/sheets/goals"),
    goalContributions: await import("@/lib/sheets/goalContributions"),
    instruments: await import("@/lib/sheets/instruments"),
    investmentTransactions: await import("@/lib/sheets/investmentTransactions"),
    investmentTargets: await import("@/lib/sheets/investmentTargets"),
    fixedDeposits: await import("@/lib/sheets/fixedDeposits"),
    epfAccounts: await import("@/lib/sheets/epfAccounts"),
    epfEntries: await import("@/lib/sheets/epfEntries"),
    epfRates: await import("@/lib/sheets/epfRates"),
    lentLoans: await import("@/lib/sheets/lentLoans"),
    lentRepayments: await import("@/lib/sheets/lentRepayments"),
    bigSpends: await import("@/lib/sheets/bigSpends"),
    dailySpends: await import("@/lib/sheets/dailySpends"),
    dailyBudgets: await import("@/lib/sheets/dailyBudgets"),
    dailyCategoryLimits: await import("@/lib/sheets/dailyCategoryLimits"),
  };

  /** Every tab in the order references need. Run once to check, then again to write. */
  async function seed(doWrite: boolean) {
    ids.clear();
    await write(S.accounts.accountsRepository, S.accounts.createAccountSchema, accounts(), doWrite);
    await write(S.balanceSnapshots.balanceSnapshotsRepository, S.balanceSnapshots.createBalanceSnapshotSchema, balanceSnapshots(), doWrite);
    await write(S.transfers.transfersRepository, S.transfers.createTransferSchema, transfers(), doWrite);
    await write(S.cards.cardsRepository, S.cards.createCardSchema, cards(), doWrite);
    await write(S.statements.statementsRepository, S.statements.createStatementSchema, statements(), doWrite);
    await write(S.subscriptions.subscriptionsRepository, S.subscriptions.createSubscriptionSchema, subscriptions(), doWrite);
    await write(S.subscriptionPayments.subscriptionPaymentsRepository, S.subscriptionPayments.createSubscriptionPaymentSchema, subscriptionPayments(), doWrite);
    await write(S.incomeSources.incomeSourcesRepository, S.incomeSources.createIncomeSourceSchema, incomeSources(), doWrite);
    await write(S.incomeEntries.incomeEntriesRepository, S.incomeEntries.createIncomeEntrySchema, incomeEntries(), doWrite);

    const loanInput = S.loans.createLoanSchema.parse(loan());
    if (doWrite) {
      // The app's own create: the loan and its whole EMI schedule. Then the EMIs already due are marked paid from HDFC.
      const { installments } = await withQuotaRetry("Loans", () => S.loans.createLoanWithSchedule(loanInput));
      filled.push("Loans", "LoanInstallments");
      await pause();
      const due = installments.filter((i) => past(i.dueDate));
      await withQuotaRetry("LoanInstallments (marking EMIs paid)", () =>
        S.loanInstallments.loanInstallmentsRepository.updateMany(
          due.map((i) => ({ id: i.id, patch: { status: "Paid" as const, amountPaid: i.totalDue, paidDate: i.dueDate, paidFromAccountId: id("hdfc") } })),
        ),
      );
      written += 1 + installments.length;
      console.log(`  + Loans: 1 loan, ${installments.length} EMIs (${due.length} marked paid)`);
      await pause();
    } else console.log("  ✓ Loans: 1 loan checks out");

    await write(S.policies.policiesRepository, S.policies.createPolicySchema, policies(), doWrite);
    await write(S.policyPayments.policyPaymentsRepository, S.policyPayments.createPolicyPaymentSchema, policyPayments(), doWrite);
    await write(S.goals.goalsRepository, S.goals.createGoalSchema, goals(), doWrite);
    await write(S.goals.goalsRepository, S.goals.createGoalSchema, subGoals(), doWrite);
    await write(S.goalContributions.goalContributionsRepository, S.goalContributions.createGoalContributionSchema, goalContributions(), doWrite);
    await write(S.instruments.instrumentsRepository, S.instruments.createInstrumentSchema, instruments(), doWrite);
    await write(S.investmentTransactions.investmentTransactionsRepository, S.investmentTransactions.createInvestmentTransactionSchema, investmentTransactions(), doWrite);
    await write(S.investmentTargets.investmentTargetsRepository, S.investmentTargets.createInvestmentTargetSchema, investmentTargets(), doWrite);
    await write(S.fixedDeposits.fixedDepositsRepository, S.fixedDeposits.createFixedDepositSchema, fixedDeposits(), doWrite);
    await write(S.epfAccounts.epfAccountsRepository, S.epfAccounts.createEpfAccountSchema, epfAccounts(), doWrite);
    await write(S.epfEntries.epfEntriesRepository, S.epfEntries.createEpfEntrySchema, epfEntries(), doWrite);
    await write(S.epfRates.epfRatesRepository, S.epfRates.createEpfRateSchema, epfRates(), doWrite);
    await write(S.lentLoans.lentLoansRepository, S.lentLoans.createLentLoanSchema, lentLoans(), doWrite);
    await write(S.lentRepayments.lentRepaymentsRepository, S.lentRepayments.createLentRepaymentSchema, lentRepayments(), doWrite);
    await write(S.bigSpends.bigSpendsRepository, S.bigSpends.createBigSpendSchema, bigSpends(), doWrite);
    await write(S.dailySpends.dailySpendsRepository, S.dailySpends.createDailySpendSchema, dailySpends(), doWrite);
    await write(S.dailyBudgets.dailyBudgetsRepository, S.dailyBudgets.createDailyBudgetSchema, dailyBudgets(), doWrite);
    await write(S.dailyCategoryLimits.dailyCategoryLimitsRepository, S.dailyCategoryLimits.createDailyCategoryLimitSchema, dailyCategoryLimits(), doWrite);
  }

  console.log(`Checking every made-up record (today is ${TODAY})…`);
  await seed(false);
  if (DRY) return console.log("Dry run: nothing written.");

  ({ isQuotaError } = await import("@/lib/sheets/errors"));
  const { getSheetsClient } = await import("@/lib/sheets/client");
  const sheets = getSheetsClient();
  const { data } = await sheets.spreadsheets.get({ spreadsheetId: DEMO_ID!, fields: "properties(title),sheets(properties(title))" });
  const title = data.properties?.title ?? "";
  if (!/demo/i.test(title)) throw new Error(`Refusing: the spreadsheet is called "${title}". Only a spreadsheet with "demo" in its title is seeded.`);

  // Before anything is written, not even a tab: every tab already there must be empty below its header row.
  const existing = (data.sheets ?? []).map((sheet) => sheet.properties?.title ?? "").filter(Boolean);
  if (existing.length > 0) {
    const quoted = (tab: string) => `'${tab.replace(/'/g, "''")}'!A2:Z3`;
    const read = await sheets.spreadsheets.values.batchGet({ spreadsheetId: DEMO_ID!, ranges: existing.map(quoted) });
    const withRows = existing.filter((_, n) => (read.data.valueRanges?.[n]?.values ?? []).some((row) => row.some((cell) => String(cell).trim() !== "")));
    if (withRows.length > 0) throw new Error(`Refusing: "${title}" already has rows in ${withRows.join(", ")}. Seed a fresh, empty demo spreadsheet.`);
  }

  const { createMissingTabs } = await import("@/lib/sheets/createSheet");
  const tabs = await withQuotaRetry("Building the tabs", () => createMissingTabs());
  console.log(`Tabs: ${tabs.created.length} created, ${tabs.existing.length} already there.`);
  await pause();

  console.log(`Writing to "${title}"…`);
  await seed(true);
  console.log(`Done: ${written} rows of made-up data.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
