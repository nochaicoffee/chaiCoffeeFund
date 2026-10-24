// Sample data, money math, formatting and the shell for the Income canvas.
// Every source, amount and date here is made up. "Today" is Oct 24, 2026.
// The shapes are the app's own (src/lib/sheets/types.ts: IncomeSource, IncomeEntry); the money math is what
// lib/aggregate/income.ts will hold, written here only so every figure on a board agrees with every other.

export const TODAY = "2026-10-24";
export const ON_TIME_DAYS = 3; // received within this many days of its expected date counts as on time

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
export const monthKey = (iso) => iso.slice(0, 7);
export function monthsFrom(startKey, n) {
  const out = [];
  let d = `${startKey}-01`;
  for (let i = 0; i < n; i++) { out.push(d.slice(0, 7)); d = addMonthsUTC(d, 1); }
  return out;
}
export const YEAR = monthsFrom("2026-01", 12);
export const NOW_KEY = monthKey(TODAY);
export const dayOfYear = (iso) => daysBetween("2026-01-01", iso);

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
export const fmtDow = (iso) => `${DOW[dt(iso).getUTCDay()]}, ${fmt(iso)}`;
export const dow = (iso) => DOW[dt(iso).getUTCDay()];
export const monName = (key) => MON[Number(key.slice(5, 7)) - 1];
export const monFull = (key) => MONTH[Number(key.slice(5, 7)) - 1];
export const monYear = (key) => `${monName(key)} ${key.slice(0, 4)}`;
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
export const pctOf = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const inDays = (iso) => { const n = daysBetween(TODAY, iso); return n === 0 ? "today" : n === 1 ? "tomorrow" : n > 0 ? `in ${n} days` : `${-n} days ago`; };

// ---------- Sample data (made up) ----------
/** The accounts income lands in (a subset of the Accounts page's sample). */
export const ACCOUNTS = {
  hdfc: { name: "HDFC Salary", initial: "H", color: "sapphire" },
  icici: { name: "ICICI Invest", initial: "I", color: "violet" },
  kotak: { name: "Kotak Savings", initial: "K", color: "ruby" },
};
/**
 * IncomeSource: name, alias, category (Salary | Investment | Other), frequency, expectedAmount, status.
 * RSU vests and ESPP purchases are not income: they live in Investments (decision 7, 2026-10-24).
 * `color`, `icon` and `acct` (where it usually lands) are proposed new columns, like Subscriptions' colour and charged-to.
 */
export const SOURCES = [
  { id: "salary", name: "NetApp Salary", alias: "Salary", category: "Salary", frequency: "Monthly", expectedAmount: 138500, status: "Active", color: "sapphire", icon: "briefcase", acct: "hdfc", day: 1, since: "Jun 2019" },
  { id: "fd", name: "FD interest", alias: "FD interest", category: "Investment", frequency: "Quarterly", expectedAmount: 18400, status: "Active", color: "teal", icon: "lock", acct: "kotak", day: 5, since: "Jan 2024" },
  { id: "div", name: "Dividends", alias: "Dividends", category: "Investment", frequency: "Quarterly", expectedAmount: 6200, status: "Active", color: "copper", icon: "pie", acct: "icici", day: 10, since: "Oct 2023" },
  { id: "tax", name: "Tax refund", alias: "Tax refund", category: "Other", frequency: "One-Time", expectedAmount: 23400, status: "Inactive", color: "ruby", icon: "receipt", acct: "hdfc", day: 31, since: "Jul 2026" },
];
export const src = (id) => SOURCES.find((s) => s.id === id);
export const ACTIVE = SOURCES.filter((s) => s.status === "Active");
export const MONTHS_IN_CYCLE = { Monthly: 1, Quarterly: 3, Yearly: 12 };
/** Monthly equivalent of a source: expected amount over the months in its cycle. A one-time source has none. */
export const monthlyEq = (s) => (s.status === "Active" && MONTHS_IN_CYCLE[s.frequency] ? s.expectedAmount / MONTHS_IN_CYCLE[s.frequency] : 0);

// [source, expected, received (null = not yet), amount, tag]. Tags: Regular, Bonus, Other.
const d26 = (m, d) => `2026-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const salaryRecv = [1, 2, 1, 1, 4, 1, 1, 3, 1, 1];
const RAW_2026 = [
  ...salaryRecv.map((r, i) => ["salary", d26(i + 1, 1), d26(i + 1, r), i < 3 ? 125000 : 138500, "Regular"]),
  ["salary", d26(3, 20), d26(3, 31), 160000, "Bonus"],
  ["fd", d26(1, 5), d26(1, 5), 18400, "Regular"], ["fd", d26(4, 5), d26(4, 6), 18400, "Regular"], ["fd", d26(7, 5), d26(7, 5), 18400, "Regular"], ["fd", d26(10, 5), d26(10, 6), 18400, "Regular"],
  ["div", d26(1, 10), d26(1, 12), 5100, "Regular"], ["div", d26(4, 10), d26(4, 11), 5900, "Regular"], ["div", d26(7, 10), d26(7, 10), 6300, "Regular"], ["div", d26(10, 10), null, 6200, "Regular"],
  ["tax", d26(7, 31), d26(8, 6), 23400, "Other"],
];
const d25 = (m, d = 1) => `2025-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const RAW_2025 = [
  ...Array.from({ length: 12 }, (_, i) => ["salary", d25(i + 1), d25(i + 1), i < 3 ? 112000 : 125000, "Regular"]),
  ["salary", d25(3, 20), d25(3, 28), 135000, "Bonus"],
  ["fd", d25(1, 5), d25(1, 6), 16200, "Regular"], ["fd", d25(4, 5), d25(4, 5), 16200, "Regular"], ["fd", d25(7, 5), d25(7, 7), 16200, "Regular"], ["fd", d25(10, 5), d25(10, 5), 16200, "Regular"],
  ["div", d25(1, 10), d25(1, 11), 4300, "Regular"], ["div", d25(4, 10), d25(4, 14), 4800, "Regular"], ["div", d25(7, 10), d25(7, 10), 5200, "Regular"], ["div", d25(10, 10), d25(10, 12), 5600, "Regular"],
];
/** IncomeEntry rows. `status` is the stored Received | Pending; `stateOf` (below) is what the page shows. */
export const ENTRIES = [...RAW_2025, ...RAW_2026].map(([sourceId, expectedDate, receivedDate, amount, tag], i) => ({
  id: `e${i}`, sourceId, expectedDate, receivedDate, amount, tag, accountId: src(sourceId).acct, status: receivedDate ? "Received" : "Pending",
}));
export const delay = (e) => daysBetween(e.expectedDate, e.receivedDate ?? TODAY);
/** Received (on time), Late (received more than 3 days after it was expected), Pending (expected by today, not received). */
export const stateOf = (e) => (e.receivedDate ? (delay(e) > ON_TIME_DAYS ? "Late" : "Received") : "Pending");
export const cashDate = (e) => e.receivedDate ?? e.expectedDate;

/** Upcoming expected income, from each active source's schedule: nothing is stored until it's received. */
export const UPCOMING = (() => {
  const out = [];
  const lastOf = (s) => ENTRIES.filter((e) => e.sourceId === s.id && !(s.id === "salary" && e.tag === "Bonus")).map((e) => e.expectedDate).sort().at(-1);
  for (const s of ACTIVE) {
    const step = MONTHS_IN_CYCLE[s.frequency];
    let d = lastOf(s);
    for (let n = 0; n < 24; n++) {
      d = addMonthsUTC(d, step);
      if (d <= TODAY) continue;
      if (d > "2027-04-30") break;
      out.push({ id: `u-${s.id}-${d}`, sourceId: s.id, expectedDate: d, receivedDate: null, amount: s.expectedAmount, tag: "Regular", accountId: s.acct, status: "Upcoming" });
    }
  }
  return out.sort((a, b) => (a.expectedDate < b.expectedDate ? -1 : 1));
})();
export const NEXT_30 = UPCOMING.filter((u) => daysBetween(TODAY, u.expectedDate) <= 29);

// ---------- Money math ----------
const sum = (xs) => xs.reduce((t, x) => t + x, 0);
export const inYear = (y) => ENTRIES.filter((e) => e.receivedDate && e.receivedDate.startsWith(String(y)));
export const received = (y = 2026, sid) => inYear(y).filter((e) => !sid || e.sourceId === sid);
export const YTD = sum(received(2026).map((e) => e.amount));
export const ytdOf = (sid) => sum(received(2026, sid).map((e) => e.amount));
export const monthReceived = (key, sid) => sum(ENTRIES.filter((e) => e.receivedDate && monthKey(e.receivedDate) === key && (!sid || e.sourceId === sid)).map((e) => e.amount));
export const monthEntries = (key) => [...ENTRIES.filter((e) => monthKey(cashDate(e)) === key), ...UPCOMING.filter((u) => monthKey(u.expectedDate) === key)];
export const MONTHLY = YEAR.map((k) => monthReceived(k));
export const ELAPSED = 10; // Jan to Oct, this month included
export const AVG_MONTH = YTD / ELAPSED;
export const BEST = (() => { let b = null; YEAR.forEach((k, i) => { if (!b || MONTHLY[i] > b.v) b = { k, v: MONTHLY[i] }; }); return b; })();
/** Cumulative received through each month of a year. */
export const cumulative = (y) => { let t = 0; return Array.from({ length: 12 }, (_, i) => { t += monthReceived(`${y}-${String(i + 1).padStart(2, "0")}`); return t; }); };
export const YTD_LAST = sum(ENTRIES.filter((e) => e.receivedDate && e.receivedDate.startsWith("2025") && e.receivedDate <= "2025-10-24").map((e) => e.amount));
export const GROWTH = (YTD - YTD_LAST) / YTD_LAST;
export const RUN_RATE = sum(SOURCES.map(monthlyEq));
export const PENDING = ENTRIES.filter((e) => e.status === "Pending");
export const PENDING_SUM = sum(PENDING.map((e) => e.amount));
export const byTag = (tag) => sum(received(2026).filter((e) => e.tag === tag).map((e) => e.amount));
export const byAcct = (id) => sum(received(2026).filter((e) => e.accountId === id).map((e) => e.amount));
export const rcv26 = received(2026);
export const onTimeCount = rcv26.filter((e) => delay(e) <= ON_TIME_DAYS).length;
export const avgDelay = sum(rcv26.map((e) => Math.max(0, delay(e)))) / rcv26.length;
export const entriesOf = (sid, y = 2026) => ENTRIES.filter((e) => e.sourceId === sid && cashDate(e).startsWith(String(y)));
export const lastReceived = (sid) => ENTRIES.filter((e) => e.sourceId === sid && e.receivedDate).sort((a, b) => (a.receivedDate < b.receivedDate ? 1 : -1))[0];
export const nextOf = (sid) => PENDING.find((p) => p.sourceId === sid) ?? UPCOMING.find((u) => u.sourceId === sid) ?? null;
// India's financial year runs Apr 1 to Mar 31.
export const FY = { start: "2026-04-01", end: "2027-03-31", prevStart: "2025-04-01", prevEnd: "2026-03-31", name: "FY 2026-27", prevName: "FY 2025-26" };
const recvBetween = (a, b) => sum(ENTRIES.filter((e) => e.receivedDate && e.receivedDate >= a && e.receivedDate <= b).map((e) => e.amount));
export const FY_RECEIVED = recvBetween(FY.start, TODAY);
export const FY_PENDING = PENDING.filter((e) => e.expectedDate >= FY.start).reduce((t, e) => t + e.amount, 0);
export const FY_EXPECTED = sum(UPCOMING.filter((u) => u.expectedDate <= FY.end).map((u) => u.amount));
export const FY_PROJECTED = FY_RECEIVED + FY_PENDING + FY_EXPECTED;
export const FY_LAST = recvBetween(FY.prevStart, FY.prevEnd);
export const FY_LAST_SAME = recvBetween(FY.prevStart, "2025-10-24");
export const fyMonths = monthsFrom("2026-04", 12);
export const SALARY_SHARE = pctOf(ytdOf("salary"), YTD);
export const monthlyOf = (sid) => YEAR.map((k) => monthReceived(k, sid));

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
  x: (s) => ic('<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>', s ?? 14, 2.2),
  plus: (s) => ic('<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>', s ?? 14, 2.5),
  refresh: (s) => ic('<path d="M21 12a9 9 0 1 1-2.64-6.36"></path><polyline points="21 3 21 9 15 9"></polyline>', s ?? 15),
  chev: (s) => ic('<polyline points="6 9 12 15 18 9"></polyline>', s ?? 12, 2.5),
  chevR: (s) => ic('<polyline points="9 6 15 12 9 18"></polyline>', s ?? 12, 2.5),
  chevL: (s) => ic('<polyline points="15 6 9 12 15 18"></polyline>', s ?? 12, 2.5),
  arrowR: (s) => ic('<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="13 6 19 12 13 18"></polyline>', s ?? 13, 2.5),
  check: (s) => ic('<polyline points="20 6 9 17 4 12"></polyline>', s ?? 12, 3),
  up: (s) => ic('<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="6 11 12 5 18 11"></polyline>', s ?? 11, 2.6),
  down: (s) => ic('<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="6 13 12 19 18 13"></polyline>', s ?? 11, 2.6),
  search: (s) => ic('<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>', s ?? 13, 2.2),
  cal: (s) => ic('<rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>', s ?? 14),
  info: (s) => ic('<circle cx="12" cy="12" r="9"></circle><line x1="12" y1="11" x2="12" y2="16"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>', s ?? 12, 2.2),
  alert: (s) => ic('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>', s ?? 14, 2.2),
  clock: (s) => ic('<circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 14"></polyline>', s ?? 12, 2.2),
  menu: (s) => ic('<line x1="4" y1="7" x2="20" y2="7"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="17" x2="20" y2="17"></line>', s ?? 20),
  more: (s) => ic('<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>', s ?? 16, 2.6),
  link: (s) => ic('<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"></path><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"></path>', s ?? 13),
  lock: (s) => ic('<rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>', s ?? 12),
  pencil: (s) => ic('<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>', s ?? 13, 2.2),
  briefcase: (s) => ic('<rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="3" y1="13" x2="21" y2="13"></line>', s ?? 14),
  trend: (s) => ic('<polyline points="3 17 9 11 13 15 21 7"></polyline><polyline points="14 7 21 7 21 14"></polyline>', s ?? 14),
  sprout: (s) => ic('<path d="M12 21v-8"></path><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6Z"></path><path d="M12 15c0-3-2-5-6-5 0 3 2 5 6 5Z"></path>', s ?? 14),
  pie: (s) => ic('<path d="M21 12A9 9 0 1 1 12 3v9Z"></path><path d="M15 3.5A9 9 0 0 1 20.5 9H15Z"></path>', s ?? 14),
  receipt: (s) => ic('<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z"></path><line x1="9" y1="8" x2="15" y2="8"></line><line x1="9" y1="12" x2="15" y2="12"></line>', s ?? 14),
};
export const srcIcon = (s, size = 14) => I[s.icon](size);

// ---------- Small parts ----------
export const grad = (c, a = 155) => `linear-gradient(${a}deg,var(--card-${c}-from),var(--card-${c}-to))`;
/** A mark's fill (bars, beads, bars of a list): the colour, a touch lighter on top. */
export const fill = (s, a = 180) => `linear-gradient(${a}deg,color-mix(in oklch,var(--card-${typeof s === "string" ? s : s.color}) 80%,white),var(--card-${typeof s === "string" ? s : s.color}))`;
export const col = (s) => `var(--card-${typeof s === "string" ? s : s.color})`;
/** A source's tile: its icon on its card gradient. */
export const mono = (s, size = 32) => `<span class="mono" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;background:${grad(s.color)};${s.status === "Inactive" ? "filter:grayscale(.85);opacity:.6" : ""}">${srcIcon(s, Math.round(size * 0.5))}</span>`;
export const allMono = (size = 32) => `<span class="mono" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;background:${grad("emerald", 150)}">${I.income(Math.round(size * 0.5))}</span>`;
export const acctChip = (id) => { const a = ACCOUNTS[id]; return `<span class="via"><span class="minibank" style="background:${grad(a.color)}">${a.initial}</span>${a.name}</span>`; };
export const sampleTag = (extra = "") => `<span class="sample">Sample data, made up${extra}</span>`;
export const derivedTag = (t = "Derived") => `<span class="pill pill-derived">${I.link(10)} ${t}</span>`;

// ---------- Shell ----------
export function rail() {
  const items = ["overview", "accounts", "cards", "subs", "income", "loans", "fixed", "invest"];
  return `<nav class="rail glass-strong">${items.map((k) => `<span class="rail-item${k === "income" ? " active" : ""}">${I[k]()}</span>`).join("")}<span class="rail-me">P</span></nav>`;
}
export function desktop({ w = 1600, h, body, note = "" }) {
  return `<div class="chai-app desk" style="width:${w}px;height:${h === "auto" ? "__H__" : h === "fit" ? "auto" : `${h}px`}">${rail()}<main class="main glass">${body}</main>${note}</div>`;
}
export function header({ eyebrow = "Income · Today", title = "Good afternoon, Prathik", lede, actions, back }) {
  return `<header class="pg-head"><div class="pg-text"><div class="eyebrow">${back ? `<span style="display:inline-flex;align-items:center;gap:6px">${I.chevL(11)}${eyebrow}</span>` : eyebrow}</div><h1>${title}</h1>${lede ? `<div class="lede">${lede}</div>` : ""}</div>${actions ? `<div class="pg-actions">${actions}</div>` : ""}</header>`;
}
export const btn = (label, { kind = "ghost", icon = "", cls = "", style = "" } = {}) => `<span class="btn btn-${kind} ${cls}"${style ? ` style="${style}"` : ""}>${icon}${label}</span>`;
export const iconBtn = (icon, label, cls = "") => `<span class="btn btn-icon ${cls}" aria-label="${label}">${icon}</span>`;
export function select({ value, options = [], open = false, kind = "pill", icon = "", align = "", width = "" }) {
  const opts = options.map((o) => (o === "-" ? `<div class="lb-divider"></div>` : o.group ? `<div class="lb-group">${o.group}</div>` : `<div class="opt" ${o.on ? 'aria-selected="true"' : ""}><span class="opt-label">${o.label}</span>${o.meta ? `<span class="opt-meta">${o.meta}</span>` : ""}<span class="opt-check">${I.check(12)}</span></div>`)).join("");
  return `<details class="sel sel--${kind}"${open ? " open" : ""}${width ? ` style="width:${width}"` : ""}><summary class="sel-trigger">${icon ? `<span class="sel-icon">${icon}</span>` : ""}<span class="sel-value">${value}</span><span class="sel-chev">${I.chev()}</span></summary><div class="pop${align ? ` ${align}` : ""}"><div class="lb">${opts}</div></div></details>`;
}
export function seg(items, { cls = "" } = {}) {
  return `<span class="seg ${cls}">${items.map((it) => `<span class="seg-i${it.on ? " on" : ""}">${it.label}${it.count != null ? `<em>${it.count}</em>` : ""}</span>`).join("")}</span>`;
}
export const periodPill = () => select({ value: "This year", kind: "pill", icon: I.cal(14), align: "align-end", options: [{ label: "This year", on: true }, { label: "Last 3 months" }, { label: "Last 6 months" }, { label: "Last 12 months" }, "-", { label: "2025" }, { label: "All time" }, "-", { label: "Custom range…" }] });
export const greetingActions = () => `${periodPill()}${btn("Add source", { icon: I.plus() })}${btn("Record income", { kind: "primary", icon: I.plus() })}`;
