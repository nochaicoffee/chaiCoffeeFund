// Sample data and money math for the Fixed Income canvas. Every deposit, rate and balance here is made up (his FixedDeposits tab is empty).
// "Today" is Wed Nov 4, 2026. The deposit shape is the real one (src/lib/sheets/fixedDeposits.ts); current value is the same linear estimate as
// lib/aggregate/fixedDeposits.ts (estimatedCurrentValue), and everything else (RD, passbook holdings, cover, tax year, real return) is a PROPOSAL
// written here only so every figure on a board agrees with every other.
import { addMonthsUTC, addDays, daysBetween } from "./lib.mjs";
export { daysBetween, addDays, addMonthsUTC };

export const TODAY = "2026-11-04";
export const FY_START = "2026-04-01";
export const FY_END = "2027-03-31";

// ---------- Settings he would set (proposed, each editable) ----------
export const SETTINGS = { slab: 0.3, inflation: 0.05, cover: 500000, tdsBank: 50000, tdsCompany: 5000 };

// ---------- Banks ----------
export const BANKS = {
  HDFC: { name: "HDFC Bank", short: "HDFC", color: "sapphire", covered: true, savings: 184000 },
  SBI: { name: "State Bank of India", short: "SBI", color: "sky", covered: true, savings: 62000 },
  ICICI: { name: "ICICI Bank", short: "ICICI", color: "copper", covered: true, savings: 210000 },
  AXIS: { name: "Axis Bank", short: "Axis", color: "ruby", covered: true, savings: 38000 },
  KOTAK: { name: "Kotak Mahindra Bank", short: "Kotak", color: "violet", covered: true, savings: 0 },
  BAJAJ: { name: "Bajaj Finance", short: "Bajaj", color: "plum", covered: false, company: true, savings: 0 },
  POST: { name: "India Post", short: "Post", color: "forest", covered: false, sovereign: true, savings: 0 },
};

// ---------- Maths (pure) ----------
/** A bank-quoted style maturity: quarterly compounding on actual days. Only used to MAKE the sample's "bank-quoted" figure. */
const quoted = (p, r, start, end) => Math.round(p * (1 + r / 4) ** (4 * (daysBetween(start, end) / 365)));

// ---------- Deposits (the real FixedDeposit shape, plus kind and bank key) ----------
const fd = (o) => {
  const maturityAmount = o.compoundingType === "Non-Cumulative" ? o.principalAmount : quoted(o.principalAmount, o.interestRate / 100, o.startDate, o.maturityDate);
  return { kind: "FD", ...o, maturityAmount };
};
export const DEPOSITS = [
  fd({ id: "d1", name: "HDFC 2-year", bank: "HDFC", principalAmount: 500000, interestRate: 7.25, compoundingType: "Cumulative", startDate: "2025-01-15", maturityDate: "2027-01-15", status: "Active" }),
  fd({ id: "d2", name: "SBI tax-saver", bank: "SBI", principalAmount: 150000, interestRate: 6.5, compoundingType: "Cumulative", startDate: "2023-03-20", maturityDate: "2028-03-20", status: "Active", lock: "Tax-saver: locked 5 years" }),
  fd({ id: "d3", name: "ICICI 1-year", bank: "ICICI", principalAmount: 300000, interestRate: 7.0, compoundingType: "Cumulative", startDate: "2025-12-10", maturityDate: "2026-12-10", status: "Active" }),
  fd({ id: "d4", name: "Axis quarterly payout", bank: "AXIS", principalAmount: 800000, interestRate: 7.1, compoundingType: "Non-Cumulative", payoutFrequency: "Quarterly", startDate: "2025-06-01", maturityDate: "2028-06-01", status: "Active" }),
  fd({ id: "d5", name: "Bajaj company FD", bank: "BAJAJ", principalAmount: 200000, interestRate: 8.05, compoundingType: "Cumulative", startDate: "2025-04-10", maturityDate: "2028-04-10", status: "Active", note: "Company FD: not covered by DICGC" }),
  fd({ id: "d6", name: "Kotak 3-year", bank: "KOTAK", principalAmount: 400000, interestRate: 7.2, compoundingType: "Cumulative", startDate: "2024-08-20", maturityDate: "2027-08-20", status: "Active" }),
  fd({ id: "d7", name: "SBI 1-year", bank: "SBI", principalAmount: 100000, interestRate: 6.8, compoundingType: "Cumulative", startDate: "2025-10-01", maturityDate: "2026-10-01", status: "Matured" }),
  fd({ id: "d8", name: "ICICI 1-year (2024)", bank: "ICICI", principalAmount: 250000, interestRate: 7.1, compoundingType: "Cumulative", startDate: "2024-04-15", maturityDate: "2025-04-15", status: "Closed" }),
];

// NSC (a certificate, fixed rate, annual compounding) is deposit-like: it has a quoted maturity and no schedule.
export const NSC = { id: "n1", kind: "NSC", name: "NSC VIII issue", bank: "POST", principalAmount: 100000, interestRate: 7.7, compoundingType: "Cumulative", startDate: "2024-01-12", maturityDate: "2029-01-12", maturityAmount: Math.round(100000 * 1.077 ** 5), status: "Active", lock: "Locked 5 years" };

// RD: a monthly deposit on the 5th, a bank-quoted maturity amount (proposal: an FD plus a generated schedule).
export const RD = { id: "r1", kind: "RD", name: "SBI recurring", bank: "SBI", monthly: 10000, interestRate: 6.5, startDate: "2025-07-05", months: 24, status: "Active" };
RD.maturityDate = addMonthsUTC(RD.startDate, RD.months);
RD.dates = Array.from({ length: RD.months }, (_, i) => addMonthsUTC(RD.startDate, i));
const rdAt = (asOf) => RD.dates.filter((d) => d <= asOf).reduce((s, d) => s + RD.monthly * (1 + RD.interestRate / 400) ** (4 * (daysBetween(d, asOf) / 365)), 0);
RD.paid = RD.dates.filter((d) => d <= TODAY).length;
RD.deposited = RD.paid * RD.monthly;
RD.maturityAmount = Math.round(RD.dates.reduce((s, d) => s + RD.monthly * (1 + RD.interestRate / 400) ** (4 * (daysBetween(d, RD.maturityDate) / 365)), 0));
RD.principalAmount = RD.months * RD.monthly;
RD.value = Math.round(rdAt(TODAY));
RD.accrued = RD.value - RD.deposited;
RD.nextInstallment = RD.dates.find((d) => d > TODAY);
RD.compoundingType = "Cumulative";

// ---------- The linear estimate the code already has ----------
export function estValue(x, asOf = TODAY) {
  if (x.kind === "RD") return asOf === TODAY ? RD.value : Math.round(rdAt(asOf));
  if (x.status === "Closed") return 0;
  if (asOf <= x.startDate) return x.principalAmount;
  if (asOf >= x.maturityDate) return x.maturityAmount;
  const f = daysBetween(x.startDate, asOf) / daysBetween(x.startDate, x.maturityDate);
  return Math.round(x.principalAmount + (x.maturityAmount - x.principalAmount) * f);
}

export const ALL = [...DEPOSITS, NSC, RD];
export const HELD = ALL.filter((x) => x.status !== "Closed"); // still holds money (Active or Matured, not yet Closed)
export const ACTIVE = HELD.filter((x) => x.status === "Active");

// Non-cumulative: interest paid out so far (proposal: tracked as income entries).
export function payouts(x) {
  if (x.compoundingType !== "Non-Cumulative") return [];
  const step = x.payoutFrequency === "Monthly" ? 1 : x.payoutFrequency === "Quarterly" ? 3 : 12;
  const out = [];
  for (let i = step, d = addMonthsUTC(x.startDate, step); d <= x.maturityDate; i += step, d = addMonthsUTC(x.startDate, i)) out.push({ date: d, amount: Math.round((x.principalAmount * x.interestRate) / 100 / (12 / step)) });
  return out;
}

export const principalOf = (x) => (x.kind === "RD" ? RD.deposited : x.principalAmount);
export const valueOf = (x) => (x.status === "Closed" ? 0 : estValue(x));
export const accruedOf = (x) => (x.kind === "RD" ? RD.accrued : valueOf(x) - x.principalAmount);
const totalDays = (x) => daysBetween(x.startDate, x.maturityDate);
/** Interest per day right now, the same linear idea: a cumulative deposit's whole interest over its term; a payout deposit's rate on its principal. */
export function perDay(x) {
  if (x.status !== "Active") return 0;
  if (x.kind === "RD") return (RD.value * RD.interestRate) / 100 / 365;
  if (x.compoundingType === "Non-Cumulative") return (x.principalAmount * x.interestRate) / 100 / 365;
  return (x.maturityAmount - x.principalAmount) / totalDays(x);
}
/** The yearly rate it really works out to, from principal, maturity amount and dates (the "typo guard" in system-design.md). */
export const effectiveYield = (x) => (x.kind === "RD" ? (1 + x.interestRate / 400) ** 4 - 1 : x.compoundingType === "Non-Cumulative" ? (1 + x.interestRate / 100 / (x.payoutFrequency === "Monthly" ? 12 : x.payoutFrequency === "Quarterly" ? 4 : 1)) ** (x.payoutFrequency === "Monthly" ? 12 : x.payoutFrequency === "Quarterly" ? 4 : 1) - 1 : (x.maturityAmount / x.principalAmount) ** (365 / totalDays(x)) - 1);

// ---------- Passbook holdings (proposal): contributions plus a dated "passbook says" balance, interest declared yearly ----------
export const PASSBOOKS = [
  { id: "p1", kind: "EPF", name: "EPF", where: "EPFO", color: "teal", rate: 8.25, rateNote: "declared for FY 25-26", monthly: 10800, balance: 712400, balanceDate: "2026-03-31", since: "2018-07", note: "Interest is credited once a year, after the rate is declared" },
  { id: "p2", kind: "PPF", name: "PPF", where: "India Post", color: "forest", rate: 7.1, rateNote: "set by the government each quarter", yearly: 150000, deposits: [{ date: "2026-04-04", amount: 150000 }], balance: 1024600, balanceDate: "2026-03-31", since: "2020-04", matures: "2036-03-31", note: "Interest is credited on 31 March" },
  { id: "p3", kind: "NPS", name: "NPS Tier 1", where: "NPS Trust", color: "gold", rate: null, rateNote: "market-linked, no rate", monthly: 5000, balance: 348000, balanceDate: "2026-10-31", since: "2021-09", note: "Market-linked: the app keeps your statement's balance, never a computed one" },
];
for (const p of PASSBOOKS) {
  const after = (d) => (d > p.balanceDate && d <= TODAY);
  const added = p.deposits ? p.deposits.filter((d) => after(d.date)).reduce((s, d) => s + d.amount, 0) : p.monthly ? p.monthly * Math.max(0, Math.round(daysBetween(p.balanceDate, TODAY) / 30.4)) : 0;
  p.added = p.id === "p2" ? 150000 : added;
  p.value = p.balance + p.added;
}
PASSBOOKS[1].value = PASSBOOKS[1].balance + 150000;

// ---------- Sums ----------
export const sum = (a) => a.reduce((s, x) => s + x, 0);
export const DEP_VALUE = sum(HELD.map(valueOf));
export const DEP_PUT = sum(HELD.map(principalOf));
export const DEP_ACCRUED = DEP_VALUE - DEP_PUT;
export const PASS_VALUE = sum(PASSBOOKS.map((p) => p.value));
export const TOTAL = DEP_VALUE + PASS_VALUE;
export const PER_DAY = sum(ACTIVE.map(perDay));
export const AVG_RATE = sum(ACTIVE.map((x) => (x.interestRate * valueOf(x)))) / sum(ACTIVE.map(valueOf));
export const byBank = (k) => HELD.filter((x) => x.bank === k);
export const bankDeposits = (k) => sum(byBank(k).map(valueOf));

/** What is next to mature, among deposits still Active. */
export const UPCOMING = ACTIVE.map((x) => ({ x, date: x.maturityDate, days: daysBetween(TODAY, x.maturityDate), amount: x.maturityAmount })).sort((a, b) => a.days - b.days);
export const NEXT = UPCOMING[0];
export const MATURED_WAITING = HELD.filter((x) => x.status === "Matured");

// ---------- DICGC cover (proposal): ₹5L per depositor per bank, principal and interest together, savings balance included ----------
export const COVER = Object.entries(BANKS).filter(([, b]) => b.covered).map(([k, b]) => {
  const dep = bankDeposits(k);
  const total = dep + b.savings;
  return { key: k, bank: b, dep, savings: b.savings, total, over: Math.max(0, total - SETTINGS.cover), covered: Math.min(total, SETTINGS.cover) };
}).sort((a, b) => b.total - a.total);
export const OVER_TOTAL = sum(COVER.map((c) => c.over));
export const OVER_BANKS = COVER.filter((c) => c.over > 0);

// Who stands behind the money (for the layers bar).
export const LAYERS = (() => {
  const gov = sum(HELD.filter((x) => BANKS[x.bank].sovereign).map(valueOf)) + PASSBOOKS.filter((p) => p.kind !== "NPS").reduce((s, p) => s + p.value, 0);
  const covered = sum(COVER.map((c) => Math.min(c.dep, Math.max(0, SETTINGS.cover - c.savings))));
  const over = sum(COVER.map((c) => c.dep)) - covered;
  const company = sum(HELD.filter((x) => BANKS[x.bank].company).map(valueOf));
  const market = PASSBOOKS.find((p) => p.kind === "NPS").value;
  return [
    { key: "gov", label: "Government schemes", sub: "EPF, PPF, NSC", v: gov, color: "forest" },
    { key: "cov", label: "Inside the bank cover", sub: `up to ${SETTINGS.cover / 100000}L a bank`, v: covered, color: "sapphire" },
    { key: "over", label: "Above the bank cover", sub: "after your savings there", v: over, color: "ruby" },
    { key: "co", label: "Company deposits", sub: "no cover", v: company, color: "plum" },
    { key: "mkt", label: "Market-linked", sub: "NPS", v: market, color: "gold" },
  ];
})();

// ---------- Interest by tax year (proposal): April to March, per payer ----------
const overlapDays = (a1, a2, b1, b2) => Math.max(0, daysBetween(a1 > b1 ? a1 : b1, a2 < b2 ? a2 : b2));
const dayAfter = (iso) => addDays(iso, 1);
/** Interest of one deposit in a window, as an estimate: linear for a cumulative deposit, payouts that fall in it for a payout deposit. */
export function interestIn(x, from, to) {
  if (x.status === "Closed" && x.id !== "d8") return 0;
  if (x.kind === "RD") {
    const a = RD.dates.reduce((s, d) => s + (d <= to ? RD.monthly * (1 + RD.interestRate / 400) ** (4 * (daysBetween(d, to) / 365)) - RD.monthly : 0), 0);
    const b = RD.dates.reduce((s, d) => s + (d <= from ? RD.monthly * (1 + RD.interestRate / 400) ** (4 * (daysBetween(d, from) / 365)) - RD.monthly : 0), 0);
    return Math.max(0, a - b);
  }
  if (x.compoundingType === "Non-Cumulative") return sum(payouts(x).filter((p) => p.date > from && p.date <= to).map((p) => p.amount));
  const d = overlapDays(from, to, x.startDate, x.maturityDate);
  return ((x.maturityAmount - x.principalAmount) / totalDays(x)) * d;
}
export const FY = (from = FY_START, to = FY_END) => {
  const rows = Object.entries(BANKS).map(([k, b]) => {
    const items = ALL.filter((x) => x.bank === k);
    const so = Math.round(sum(items.map((x) => interestIn(x, addDays(from, -1), TODAY < to ? TODAY : to))));
    const full = Math.round(sum(items.map((x) => interestIn(x, addDays(from, -1), to))));
    const limit = b.company ? SETTINGS.tdsCompany : b.sovereign ? Infinity : SETTINGS.tdsBank;
    return { key: k, bank: b, so, full, limit, over: full > limit, tds: full > limit ? Math.round(full * 0.1) : 0 };
  }).filter((r) => r.full > 0);
  return rows.sort((a, b) => b.full - a.full);
};
export const FYROWS = FY();
export const FY_SO = sum(FYROWS.map((r) => r.so));
export const FY_FULL = sum(FYROWS.map((r) => r.full));
export const FY_TDS = sum(FYROWS.map((r) => r.tds));
export const FY_TAX = Math.round(FY_FULL * SETTINGS.slab);

// ---------- Real return (proposal): stated, effective, after your slab's tax, after inflation ----------
export const realOf = (x) => {
  const eff = effectiveYield(x);
  const after = eff * (1 - SETTINGS.slab);
  return { eff, after, real: after - SETTINGS.inflation };
};
export const WAVG = (f) => sum(ACTIVE.map((x) => f(x) * valueOf(x))) / sum(ACTIVE.map(valueOf));
export const BLEND = { stated: AVG_RATE / 100, eff: WAVG((x) => effectiveYield(x)), after: WAVG((x) => realOf(x).after), real: WAVG((x) => realOf(x).real) };

// ---------- Months for the ladder ----------
export const monthStart = (iso) => `${iso.slice(0, 7)}-01`;
export const LADDER_MONTHS = (() => { const out = []; let d = monthStart(TODAY); for (let i = 0; i < 26; i++) { out.push(d.slice(0, 7)); d = addMonthsUTC(d, 1); } return out; })();

// ---------- Rate display ----------
export const pct = (x, d = 2) => `${(x * 100).toFixed(d)}%`;
export const rate = (r) => `${r.toFixed(2)}%`;
