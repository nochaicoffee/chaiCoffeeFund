// Sample data, money math, formatting and the shell for the Accounts canvas.
// Every name, balance and date here is made up. "Today" is Oct 21, 2026.

export const TODAY = "2026-10-21";
export const STALE_DAYS = 30;

// ---------- Dates ----------
export function addMonthsUTC(iso, months) {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() !== day) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}
export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
export const monthEnd = (key) => addDays(addMonthsUTC(`${key}-01`, 1), -1);
export function monthsFrom(startKey, n) {
  const out = [];
  let d = `${startKey}-01`;
  for (let i = 0; i < n; i++) { out.push(d.slice(0, 7)); d = addMonthsUTC(d, 1); }
  return out;
}
export const monthKey = (iso) => iso.slice(0, 7);
/** Every month of the sample's history, Nov 2024 to Oct 2026. */
export const HISTORY = monthsFrom("2024-11", 24);
/** The page's default period: this year, Jan to this month. */
export const YEAR = monthsFrom("2026-01", 10);
export const LAST12 = monthsFrom("2025-11", 12);

// ---------- Sample data (made up) ----------
/**
 * The accounts. `color` is a proposed new field (the Cards tile colours); without it, colour would come
 * from purpose. "Inactive" is shown as Closed, with a final ₹0 balance on the day it closed.
 */
export const ACCOUNTS = [
  { id: "hdfc", name: "HDFC Salary", bank: "HDFC Bank", accountType: "Savings", purpose: "Spending", startDate: "2019-07-01", status: "Active", color: "sapphire" },
  { id: "kotak", name: "Kotak Savings", bank: "Kotak Mahindra Bank", accountType: "Savings", purpose: "Spending", startDate: "2021-03-15", status: "Active", color: "ruby" },
  { id: "icici", name: "ICICI Invest", bank: "ICICI Bank", accountType: "Savings", purpose: "Investment", startDate: "2022-01-10", status: "Active", color: "violet" },
  { id: "sbi", name: "SBI Rainy Day", bank: "SBI", accountType: "Savings", purpose: "Emergency-Fund", startDate: "2018-05-02", status: "Active", color: "teal" },
  { id: "axis", name: "Axis EMI", bank: "Axis Bank", accountType: "Current", purpose: "Loan-Payments", startDate: "2025-04-01", status: "Active", color: "copper" },
  { id: "yes", name: "YES Old Salary", bank: "YES Bank", accountType: "Savings", purpose: "Spending", startDate: "2017-08-01", status: "Inactive", color: "onyx" },
];
export const acc = (id) => ACCOUNTS.find((a) => a.id === id);
export const isOn = (a) => a.status === "Active";
export const ACTIVE = ACCOUNTS.filter(isOn);
export const CLOSED = ACCOUNTS.filter((a) => !isOn(a));

// Month-end-ish balances, one per month of HISTORY (null: no snapshot that month).
const B = {
  hdfc: [168400, 181200, 174600, 189300, 183900, 171500, 196800, 203400, 187600, 178200, 192500, 199800, 185300, 176400, 188900, 194700, 349600, 201300, 189400, 212800, 198500, 184700, 191900, 204300],
  kotak: [48200, 41700, 55300, 62100, 39800, 44600, 51200, 47900, 58300, 43100, 49700, 53400, 46800, 61200, 44300, 50900, 57600, 42800, 48100, 55400, 46200, 51800, 44900, 52800],
  icici: [132000, 141500, 128300, 155600, 149200, 163800, 158400, 172900, 181300, 166700, 178500, 192100, 185600, 199300, 188700, 204500, 197200, 318400, 276900, 262300, 248800, 255100, 239600, 231500],
  sbi: [562000, 566400, 571500, 575800, 580300, 586900, 591200, 595800, 601400, 605900, 611300, 616800, 620400, 625900, 630300, 634800, 640200, 644700, 648300, 652800, 655900, 658000, null, null],
  axis: [null, null, null, null, null, null, 4800, 7350, 9900, 12450, 15000, 17550, 20100, 22650, 3200, 5750, 8300, 10850, 13400, 15950, 18500, 21050, 23600, 18900],
  yes: [18200, null, null, 12100, null, null, 9800, null, null, 7400, null, null, 5200, null, null, 3100, 0, null, null, null, null, null, null, null],
};
// The day of the month each one is usually updated: they're not all done on the same day.
const DAY = { hdfc: "end", kotak: 2, icici: 28, sbi: 9, axis: 6, yes: 15 };
const OVERRIDE = { "hdfc:2026-10": "2026-10-20", "icici:2026-10": "2026-10-15", "yes:2026-03": "2026-03-31" };
function snapDate(id, key) {
  if (OVERRIDE[`${id}:${key}`]) return OVERRIDE[`${id}:${key}`];
  const day = DAY[id];
  return day === "end" ? monthEnd(key) : `${key}-${String(day).padStart(2, "0")}`;
}
export const SNAPSHOTS = ACCOUNTS.flatMap((a) => HISTORY.map((key, i) => (B[a.id][i] == null ? null : { accountId: a.id, date: snapDate(a.id, key), balance: B[a.id][i] })).filter(Boolean));
export const snapsOf = (id) => SNAPSHOTS.filter((s) => s.accountId === id).sort((x, y) => (x.date < y.date ? -1 : 1));
export const latest = (id) => snapsOf(id).at(-1) ?? null;
export const previous = (id) => snapsOf(id).at(-2) ?? null;
export const closedOn = (a) => (isOn(a) ? null : latest(a.id)?.date ?? null);

/** Carry forward: an account counts at its latest snapshot on or before the date; nothing before its first. */
export function balanceOn(id, date) {
  let b = null;
  for (const s of snapsOf(id)) if (s.date <= date) b = s.balance;
  return b;
}
export const totalOn = (date, ids = ACCOUNTS.map((a) => a.id)) => ids.reduce((t, id) => t + (balanceOn(id, date) ?? 0), 0);
export const TOTAL = totalOn(TODAY, ACTIVE.map((a) => a.id));
export const isStale = (a) => isOn(a) && latest(a.id) && daysBetween(latest(a.id).date, TODAY) > STALE_DAYS;
export const STALE = ACTIVE.filter(isStale);
export const change = (id) => { const l = latest(id), p = previous(id); return l && p ? l.balance - p.balance : null; };
/** The value at the end of a month (today for this month), carried forward. */
export const atMonth = (id, key) => balanceOn(id, key === monthKey(TODAY) ? TODAY : monthEnd(key));
export const totalAtMonth = (key, ids) => (ids ?? ACCOUNTS.map((a) => a.id)).reduce((t, id) => t + (atMonth(id, key) ?? 0), 0);
export const yearStart = (id) => (id ? balanceOn(id, "2025-12-31") ?? 0 : totalOn("2025-12-31"));
export const sinceJan = (id) => (id ? (balanceOn(id, TODAY) ?? 0) - yearStart(id) : TOTAL - yearStart());
export function rangeIn(id, keys = YEAR) {
  const vals = keys.map((k) => ({ k, v: id ? atMonth(id, k) : totalAtMonth(k) })).filter((x) => x.v != null);
  const hi = vals.reduce((m, x) => (x.v > m.v ? x : m), vals[0]);
  const lo = vals.reduce((m, x) => (x.v < m.v ? x : m), vals[0]);
  return { hi, lo, avg: vals.reduce((t, x) => t + x.v, 0) / vals.length };
}

// ---------- Cards and flows (made up) ----------
// Money that leaves or reaches an account and is recorded somewhere else in the app: card bills paid from it
// (Statement.paidFromAccountId), subscriptions charged straight to it (SubscriptionPayment.paidFromAccountId),
// EMIs (LoanInstallment.paidFromAccountId), trades (InvestmentTransaction.settlementAccountId) and income
// (IncomeEntry.accountId). Everything else is the balance change these don't explain.
export const CARDS = {
  mil: { name: "Millennia", issuer: "HDFC Bank", color: "teal", last4: "4417" },
  cor: { name: "Coral", issuer: "ICICI Bank", color: "copper", last4: "7781" },
  ace: { name: "Ace", issuer: "Axis Bank", color: "violet", last4: "2093" },
};
export const KINDS = {
  income: { name: "Income", color: "var(--positive)", dir: "in" },
  card: { name: "Card bills", color: "var(--card-sapphire)", dir: "out" },
  sub: { name: "Subscriptions", color: "var(--card-ruby)", dir: "out" },
  emi: { name: "Loan EMIs", color: "var(--card-copper)", dir: "out" },
  invest: { name: "Investments", color: "var(--card-violet)", dir: "out" },
};
const BILL = { mil: [36120, 41280, 29840, 38990, 44210, 31760, 35480, 39950, 42600, 33870, 37410, 38240], cor: [21480, 18930, 26710, 24050, 19880, 28340, 22760, 25190, 20470, 27330, 23980, 24615], ace: [8420, 11260, 9730, 12840, 7980, 10450, 13210, 9060, 11740, 8890, 10330, 9870] };
export const FLOWS = (() => {
  const out = [];
  LAST12.forEach((key, i) => {
    out.push({ date: `${key}-01`, account: "hdfc", kind: "income", label: "Salary", amount: 138500 });
    if (key === "2026-03") out.push({ date: "2026-03-15", account: "hdfc", kind: "income", label: "Bonus", amount: 160000 });
    out.push({ date: `${key}-12`, account: "hdfc", kind: "card", ref: "mil", label: "Millennia bill", amount: BILL.mil[i] });
    out.push({ date: `${key}-06`, account: "hdfc", kind: "card", ref: "cor", label: "Coral bill", amount: BILL.cor[i] });
    out.push({ date: `${key}-18`, account: "kotak", kind: "card", ref: "ace", label: "Ace bill", amount: BILL.ace[i] });
    out.push({ date: `${key}-05`, account: "axis", kind: "emi", label: "Car loan EMI", amount: 22450 });
    if (["2025-12", "2026-03", "2026-06", "2026-09"].includes(key)) out.push({ date: `${key}-01`, account: "kotak", kind: "sub", ref: "swiggy", label: "Swiggy One", amount: 549 });
    if (["2026-01", "2026-04", "2026-07", "2026-10"].includes(key)) out.push({ date: `${key}-10`, account: "kotak", kind: "sub", ref: "cult", label: "Cult.fit", amount: 4500 });
  });
  for (const [date, amount] of [["2026-04-20", 40000], ["2026-05-08", 20000], ["2026-07-14", 15000], ["2026-09-09", 18000], ["2026-10-07", 12000]]) out.push({ date, account: "icici", kind: "invest", label: "Shares bought", amount });
  out.push({ date: "2026-08-21", account: "icici", kind: "income", label: "Dividends", amount: 3200 });
  return out.filter((f) => f.date <= TODAY).sort((a, b) => (a.date < b.date ? -1 : 1));
})();
export const flowsIn = (id, from, to) => FLOWS.filter((f) => (!id || f.account === id) && f.date > from && f.date <= to);
export const sumKind = (list, kind) => list.filter((f) => f.kind === kind).reduce((t, f) => t + f.amount, 0);
export const sumOut = (list) => list.filter((f) => KINDS[f.kind].dir === "out").reduce((t, f) => t + f.amount, 0);
export const sumIn = (list) => list.filter((f) => KINDS[f.kind].dir === "in").reduce((t, f) => t + f.amount, 0);
/** One month for one account (or all): what's recorded in and out, the change, and what that leaves unexplained. */
export function monthFlows(key, id) {
  const ids = id ? [id] : ACCOUNTS.map((a) => a.id);
  const prevKey = addMonthsUTC(`${key}-01`, -1).slice(0, 7);
  const list = flowsIn(id, monthEnd(prevKey), key === monthKey(TODAY) ? TODAY : monthEnd(key));
  const start = ids.reduce((t, x) => t + (atMonth(x, prevKey) ?? 0), 0), end = ids.reduce((t, x) => t + (atMonth(x, key) ?? 0), 0);
  const inn = sumIn(list), outt = sumOut(list), delta = end - start;
  return { key, list, start, end, delta, in: inn, out: outt, other: delta - inn + outt };
}
/** Between an account's last two snapshots: the bridge from one to the next. */
export function lastInterval(id) {
  const l = latest(id), p = previous(id);
  if (!l || !p) return null;
  const list = flowsIn(id, p.date, l.date);
  const inn = sumIn(list), outt = sumOut(list), delta = l.balance - p.balance;
  return { from: p, to: l, list, in: inn, out: outt, delta, other: delta - inn + outt };
}
export const outByMonth = (id, keys = YEAR) => keys.map((k) => { const m = monthFlows(k, id); return { key: k, card: sumKind(m.list, "card"), sub: sumKind(m.list, "sub"), emi: sumKind(m.list, "emi"), invest: sumKind(m.list, "invest") }; });

// ---------- Formatting ----------
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dt = (iso) => new Date(`${iso}T00:00:00Z`);
export const inr = (n) => `${n < 0 ? "−" : ""}₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
export const signed = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
export const inrL = (n) => (Math.abs(n) >= 100000 ? `₹${(n / 100000).toFixed(2).replace(/\.?0+$/, "")}L` : Math.abs(n) >= 1000 ? `₹${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : inr(n));
export const inrS = (n) => (Math.abs(n) >= 100000 ? `₹${(n / 100000).toFixed(1).replace(/\.0$/, "")}L` : Math.abs(n) >= 1000 ? `₹${Math.round(n / 1000)}k` : inr(n));
export const fmt = (iso) => `${MON[dt(iso).getUTCMonth()]} ${dt(iso).getUTCDate()}`;
export const fmtY = (iso) => `${fmt(iso)}, ${dt(iso).getUTCFullYear()}`;
export const fmtSmart = (iso) => (iso.slice(0, 4) === TODAY.slice(0, 4) ? fmt(iso) : fmtY(iso));
export const fmtDow = (iso) => `${DOW[dt(iso).getUTCDay()]}, ${fmt(iso)}`;
export const monName = (key) => MON[Number(key.slice(5, 7)) - 1];
export const monFull = (key) => MONTH[Number(key.slice(5, 7)) - 1];
export const monYear = (key) => `${monName(key)} ${key.slice(0, 4)}`;
export function ago(iso) {
  const n = daysBetween(iso, TODAY);
  if (n === 0) return "today";
  if (n === 1) return "yesterday";
  return `${n} days ago`;
}
export const pct = (a, b) => `${Math.round((a / b) * 100)}%`;
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
export const purposeName = (p) => ({ Spending: "Spending", Investment: "Investment", "Emergency-Fund": "Emergency fund", "Loan-Payments": "Loan payments" })[p];
export const PURPOSES = ["Spending", "Investment", "Emergency-Fund", "Loan-Payments"];
/** Without a colour field, an account's colour would come from its purpose. */
export const PURPOSE_COLOR = { Spending: "sapphire", Investment: "violet", "Emergency-Fund": "teal", "Loan-Payments": "copper" };
export const COLORS = ["sapphire", "ruby", "onyx", "violet", "teal", "copper"];
export const colorName = (c) => c[0].toUpperCase() + c.slice(1);

// ---------- Rings (a port of src/components/rings.ts) ----------
export function ringRadii(cx, cy, box, { first, step, count = Infinity }) {
  const left = box.x, right = box.x + box.width, top = box.y, bottom = box.y + box.height;
  const near = Math.hypot(Math.max(left - cx, 0, cx - right), Math.max(top - cy, 0, cy - bottom));
  const far = Math.hypot(Math.max(cx - left, right - cx), Math.max(cy - top, bottom - cy));
  const firstShown = Math.max(0, Math.ceil((near - first) / step));
  const lastShown = Math.min(count - 1, Math.floor((far - first) / step), firstShown + 199);
  const r = [];
  for (let i = firstShown; i <= lastShown; i++) r.push(first + i * step);
  return r;
}
/** RingTexture: circles centred (dx, dy) past the bottom-right corner, stretched over the element. */
export function rings(w, h, { dx = 10, dy = 20, first = 40, step = 26, stroke = "var(--rings-ink)", opacity = 0.1, sheen = "", count } = {}) {
  const cx = w + dx, cy = h + dy;
  const circles = ringRadii(cx, cy, { x: 0, y: 0, width: w, height: h }, { first, step, count }).map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}"></circle>`).join("");
  return `<span class="tex" aria-hidden="true">${sheen ? `<span class="sheen" style="background:${sheen}"></span>` : ""}<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><g fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="1">${circles}</g></svg></span>`;
}
/** The same circles drawn inside an SVG, clipped to a box (RingCircles). */
export function ringCircles(x, y, w, h, { dx = 10, dy = 20, first = 30, step = 18, stroke = "var(--rings-light)", opacity = 0.16, count = 14 } = {}) {
  const cx = x + w + dx, cy = y + h + dy;
  return ringRadii(cx, cy, { x, y, width: w, height: h }, { first, step, count }).map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-opacity="${opacity}"></circle>`).join("");
}

// ---------- Icons ----------
const ic = (d, s = 16, w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const I = {
  overview: (s) => ic('<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect>', s ?? 17),
  accounts: (s) => ic('<path d="M3 21h18"></path><path d="M5 21V10"></path><path d="M19 21V10"></path><path d="M3 10l9-6 9 6"></path><path d="M9 21v-6"></path><path d="M15 21v-6"></path>', s ?? 17),
  cards: (s) => ic('<rect x="2" y="6" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line>', s ?? 17),
  subs: (s) => ic('<path d="M17 2l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 22l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>', s ?? 17),
  income: (s) => ic('<polyline points="3 17 9 11 13 15 21 7"></polyline><polyline points="14 7 21 7 21 14"></polyline>', s ?? 17),
  loans: (s) => ic('<line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle>', s ?? 17),
  fixed: (s) => ic('<rect x="4" y="10" width="16" height="10" rx="2"></rect><path d="M7 10V7a5 5 0 0 1 10 0v3"></path>', s ?? 17),
  invest: (s) => ic('<line x1="4" y1="20" x2="4" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="20" y1="20" x2="20" y2="14"></line>', s ?? 17),
  plus: (s) => ic('<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>', s ?? 14, 2.5),
  refresh: (s) => ic('<path d="M21 12a9 9 0 1 1-2.64-6.36"></path><polyline points="21 3 21 9 15 9"></polyline>', s ?? 15),
  chev: (s) => ic('<polyline points="6 9 12 15 18 9"></polyline>', s ?? 12, 2.5),
  chevR: (s) => ic('<polyline points="9 6 15 12 9 18"></polyline>', s ?? 12, 2.5),
  chevL: (s) => ic('<polyline points="15 6 9 12 15 18"></polyline>', s ?? 12, 2.5),
  arrowR: (s) => ic('<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="13 6 19 12 13 18"></polyline>', s ?? 13, 2.5),
  check: (s) => ic('<polyline points="20 6 9 17 4 12"></polyline>', s ?? 12, 3),
  x: (s) => ic('<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>', s ?? 14, 2.2),
  up: (s) => ic('<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="6 11 12 5 18 11"></polyline>', s ?? 11, 2.6),
  down: (s) => ic('<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="6 13 12 19 18 13"></polyline>', s ?? 11, 2.6),
  edit: (s) => ic('<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>', s ?? 13, 2.2),
  search: (s) => ic('<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>', s ?? 13, 2.2),
  trash: (s) => ic('<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>', s ?? 13, 2.2),
  cal: (s) => ic('<rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>', s ?? 14),
  info: (s) => ic('<circle cx="12" cy="12" r="9"></circle><line x1="12" y1="11" x2="12" y2="16"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>', s ?? 12, 2.2),
  alert: (s) => ic('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>', s ?? 14, 2.2),
  clock: (s) => ic('<circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 14"></polyline>', s ?? 12, 2.2),
  menu: (s) => ic('<line x1="4" y1="7" x2="20" y2="7"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="17" x2="20" y2="17"></line>', s ?? 20),
  more: (s) => ic('<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>', s ?? 16, 2.6),
  bank: (s) => ic('<path d="M3 21h18"></path><path d="M5 21V10"></path><path d="M19 21V10"></path><path d="M3 10l9-6 9 6"></path>', s ?? 12),
  wallet: (s) => ic('<path d="M20 7H5a2 2 0 0 1 0-4h13v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h15V7"></path><circle cx="16" cy="14" r="1.3"></circle>', s ?? 14),
  shield: (s) => ic('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"></path>', s ?? 14),
  sprout: (s) => ic('<polyline points="3 17 9 11 13 15 21 7"></polyline><polyline points="14 7 21 7 21 14"></polyline>', s ?? 14),
  link: (s) => ic('<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"></path><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"></path>', s ?? 13),
  lock: (s) => ic('<rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>', s ?? 12),
  play: (s) => ic('<polygon points="7 4 19 12 7 20 7 4"></polygon>', s ?? 12, 2.2),
};
export const purposeIcon = (p, s = 14) => ({ Spending: I.wallet(s), Investment: I.sprout(s), "Emergency-Fund": I.shield(s), "Loan-Payments": I.loans(s) })[p] ?? I.bank(s);

// ---------- Small parts ----------
export const grad = (c, a = 155) => `linear-gradient(${a}deg,var(--card-${c}-from),var(--card-${c}-to))`;
/** The square that stands in for a bank logo, in the account's colour. */
export function mono(a, size = 30) {
  const r = Math.round(size * 0.3);
  return `<span class="mono${isOn(a) ? "" : " mono-off"}" style="width:${size}px;height:${size}px;border-radius:${r}px;font-size:${Math.round(size * 0.44)}px;background:${grad(a.color)}">${esc(a.bank[0])}</span>`;
}
export const allMono = (size = 30) => `<span class="mono" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;background:${grad("emerald", 150)}">${I.accounts(Math.round(size * 0.5))}</span>`;
export const swatch = (c, size = 10) => `<i style="display:inline-block;flex-shrink:0;width:${size}px;height:${size}px;border-radius:3px;background:var(--card-${c})"></i>`;
export const cardChip = (id) => { const c = CARDS[id]; return `<span class="via"><span class="minitile" style="background:${grad(c.color)}"></span>${c.name}</span>`; };
export function freshPill(a, { small = false } = {}) {
  const l = latest(a.id);
  if (!isOn(a)) return `<span class="pill pill-off">${I.lock(10)} Closed</span>`;
  if (!l) return `<span class="pill pill-warn">No balance yet</span>`;
  if (isStale(a)) return `<span class="pill pill-stale">${I.clock(10)} ${small ? fmt(l.date) : `Updated ${fmt(l.date)}`}</span>`;
  return `<span class="pill pill-off">${small ? fmt(l.date) : `Updated ${fmt(l.date)}`}</span>`;
}
export const chg = (n, { suffix = "" } = {}) => (n == null ? "" : `<span class="chg ${n >= 0 ? "chg-up" : "chg-down"}">${n >= 0 ? I.up(10) : I.down(10)}${inr(Math.abs(n))}${suffix}</span>`);
export const sampleTag = (extra = "") => `<span class="sample">Sample data, made up${extra}</span>`;
export const derivedTag = (t = "Derived") => `<span class="pill pill-derived">${I.link(10)} ${t}</span>`;

// ---------- Shell ----------
export function rail() {
  const items = ["overview", "accounts", "cards", "subs", "income", "loans", "fixed", "invest"];
  return `<nav class="rail glass-strong">${items.map((k) => `<span class="rail-item${k === "accounts" ? " active" : ""}">${I[k]()}</span>`).join("")}<span class="rail-me">P</span></nav>`;
}
export function desktop({ w = 1600, h, body, note = "" }) {
  return `<div class="chai-app desk" style="width:${w}px;height:${h === "auto" ? "__H__" : h === "fit" ? "auto" : `${h}px`}">${rail()}<main class="main glass">${body}</main>${note}</div>`;
}
export function phone({ h, body, label = "" }) {
  return `<div class="chai-app ph" style="width:390px;height:${h === "auto" ? "__H__" : h === "fit" ? "auto" : `${h}px`}"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${I.menu()}</span></header><div class="ph-body">${body}</div>${label}</div>`;
}
export function header({ eyebrow = "Bank accounts · Today", title = "Good morning, Prathik", lede, actions, phone: ph = false }) {
  return `<header class="pg-head${ph ? " ph-head" : ""}"><div class="pg-text"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${lede ? `<p class="lede">${lede}</p>` : ""}</div>${actions ? `<div class="pg-actions">${actions}</div>` : ""}</header>`;
}
export const btn = (label, { kind = "ghost", icon = "", cls = "", style = "" } = {}) => `<span class="btn btn-${kind} ${cls}"${style ? ` style="${style}"` : ""}>${icon}${label}</span>`;
export const iconBtn = (icon, label, cls = "") => `<span class="btn btn-icon ${cls}" aria-label="${label}">${icon}</span>`;
/** The app's own dropdown (as in #112), closed or open. Built on <details> so it opens without script. */
export function select({ value, options = [], open = false, kind = "pill", icon = "", align = "", width = "" }) {
  const opts = options.map((o) => (o === "-" ? `<div class="lb-divider"></div>` : o.group ? `<div class="lb-group">${o.group}</div>` : `<div class="opt" ${o.on ? 'aria-selected="true"' : ""}><span class="opt-label">${o.label}</span>${o.meta ? `<span class="opt-meta">${o.meta}</span>` : ""}<span class="opt-check">${I.check(12)}</span></div>`)).join("");
  return `<details class="sel sel--${kind}"${open ? " open" : ""}${width ? ` style="width:${width}"` : ""}><summary class="sel-trigger">${icon ? `<span class="sel-icon">${icon}</span>` : ""}<span class="sel-value">${value}</span><span class="sel-chev">${I.chev()}</span></summary><div class="pop${align ? ` ${align}` : ""}"><div class="lb">${opts}</div></div></details>`;
}
export function seg(items, { cls = "" } = {}) {
  return `<span class="seg ${cls}">${items.map((it) => `<span class="seg-i${it.on ? " on" : ""}">${it.label}${it.count != null ? `<em>${it.count}</em>` : ""}</span>`).join("")}</span>`;
}
export const periodPill = () => select({ value: "This year", kind: "pill", icon: I.cal(14), align: "align-end", options: [{ label: "This year", on: true }, { label: "Last 3 months" }, { label: "Last 6 months" }, { label: "Last 12 months" }, "-", { label: "2025" }, { label: "All time" }, "-", { label: "Custom range…" }] });
