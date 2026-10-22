// Shared data, math, formatting and building blocks for the Subscriptions canvas.
// Every figure here is made up. "Today" is Oct 20, 2026.

export const TODAY = "2026-10-20";

// ---------- Recurring dates (a port of src/lib/aggregate/recurring.ts) ----------
export const STEP = { Monthly: 1, Quarterly: 3, Yearly: 12 };

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
export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}
export function nextOccurrence(anchor, cycle, from) {
  const step = STEP[cycle];
  let occ = anchor;
  for (let i = 1; i <= 10000 && occ < from; i++) occ = addMonthsUTC(anchor, i * step);
  return occ;
}
/** Every occurrence from the anchor on, up to and including `to`. */
export function occurrences(anchor, cycle, to) {
  const out = [];
  for (let i = 0; i < 10000; i++) {
    const occ = addMonthsUTC(anchor, i * STEP[cycle]);
    if (occ > to) break;
    out.push(occ);
  }
  return out;
}
export const monthlyEq = (s) => s.amount / STEP[s.billingCycle];

// ---------- Sample data (made up) ----------
export const CARDS = {
  mil: { name: "Millennia", issuer: "HDFC Bank", color: "teal", last4: "4417" },
  ace: { name: "Ace", issuer: "Axis Bank", color: "violet", last4: "2093" },
  cor: { name: "Coral", issuer: "ICICI Bank", color: "copper", last4: "7781" },
};
export const ACCOUNTS = { kot: { name: "Kotak Savings", bank: "Kotak" } };

/** Category → tile colour. Colour comes from the category, so subscriptions need no colour field. */
export const CATEGORIES = [
  { name: "Streaming", sheet: "Streaming", color: "ruby" },
  { name: "Music", sheet: "Music", color: "teal" },
  { name: "Software", sheet: "Software", color: "sapphire" },
  { name: "Cloud storage", sheet: "Cloud-Storage", color: "violet" },
  { name: "Fitness", sheet: "Fitness", color: "copper" },
  { name: "Food", sheet: "Food", color: "teal" },
  { name: "Shopping", sheet: "Shopping", color: "onyx" },
  { name: "News", sheet: "News", color: "onyx" },
  { name: "Other", sheet: "Other", color: "onyx" },
];
export const catColor = (c) => CATEGORIES.find((x) => x.name === c)?.color ?? "onyx";

// prices: [fromDate, amountCharged]. `amount` is the plan's price in the Sheet.
export const SUBS = [
  { id: "netflix", name: "Netflix Premium", alias: "Netflix", category: "Streaming", amount: 649, billingCycle: "Monthly", billingAnchorDate: "2024-02-23", startDate: "2024-02-23", status: "Active", via: { card: "mil" }, prices: [["2024-02-23", 499], ["2026-07-23", 649]] },
  { id: "icloud", name: "iCloud+ 200 GB", alias: "iCloud+", category: "Cloud storage", amount: 219, billingCycle: "Monthly", billingAnchorDate: "2025-04-24", startDate: "2025-04-24", status: "Active", via: { card: "ace" }, skip: ["2026-09-24"] },
  { id: "spotify", name: "Spotify Premium", alias: "Spotify", category: "Music", amount: 119, billingCycle: "Monthly", billingAnchorDate: "2023-06-28", startDate: "2023-06-28", status: "Active", via: { card: "mil" }, prices: [["2023-06-28", 119], ["2026-09-28", 139]] },
  { id: "timesprime", name: "Times Prime", alias: "Times Prime", category: "Shopping", amount: 1199, billingCycle: "Yearly", billingAnchorDate: "2024-10-30", startDate: "2024-10-30", status: "Active", via: { card: "cor" } },
  { id: "youtube", name: "YouTube Premium", alias: "YouTube", category: "Streaming", amount: 149, billingCycle: "Monthly", billingAnchorDate: "2025-01-02", startDate: "2025-01-02", status: "Active", via: { card: "ace" }, prices: [["2025-01-02", 129], ["2026-03-02", 149]] },
  { id: "chatgpt", name: "ChatGPT Plus", alias: "ChatGPT", category: "Software", amount: 1999, billingCycle: "Monthly", billingAnchorDate: "2025-06-08", startDate: "2025-06-08", status: "Active", via: { card: "cor" } },
  { id: "swiggy", name: "Swiggy One", alias: "Swiggy One", category: "Food", amount: 549, billingCycle: "Quarterly", billingAnchorDate: "2025-09-01", startDate: "2025-09-01", status: "Active", via: { account: "kot" } },
  { id: "prime", name: "Amazon Prime", alias: "Prime", category: "Shopping", amount: 1499, billingCycle: "Yearly", billingAnchorDate: "2022-12-15", startDate: "2022-12-15", status: "Active", via: { card: "cor" } },
  { id: "cult", name: "Cult.fit Elite", alias: "Cult.fit", category: "Fitness", amount: 4500, billingCycle: "Quarterly", billingAnchorDate: "2026-01-10", startDate: "2026-01-10", status: "Active", via: { account: "kot" } },
  { id: "m365", name: "Microsoft 365 Family", alias: "Microsoft 365", category: "Software", amount: 6199, billingCycle: "Yearly", billingAnchorDate: "2025-03-03", startDate: "2025-03-03", status: "Active", via: { card: "mil" } },
  { id: "headspace", name: "Headspace", alias: "Headspace", category: "Fitness", amount: 299, billingCycle: "Monthly", billingAnchorDate: "2025-11-12", startDate: "2025-11-12", status: "Paused", via: { card: "ace" }, lastDate: "2026-07-12" },
  { id: "sonyliv", name: "SonyLIV Premium", alias: "SonyLIV", category: "Streaming", amount: 999, billingCycle: "Yearly", billingAnchorDate: "2024-11-03", startDate: "2024-11-03", status: "Cancelled", endDate: "2026-09-14", via: { card: "mil" } },
];
export const sub = (id) => SUBS.find((s) => s.id === id);
export const isOn = (s) => s.status === "Active";

export function priceOn(s, date) {
  let p = s.amount;
  for (const [from, amt] of s.prices ?? []) if (from <= date) p = amt;
  return p;
}

/** The made-up payment log: one Paid payment per renewal, except the skipped ones. */
export function paymentsFor(s) {
  const until = s.status === "Paused" ? s.lastDate : s.status === "Cancelled" ? s.endDate : TODAY;
  return occurrences(s.billingAnchorDate, s.billingCycle, until)
    .filter((d) => d >= s.startDate && !(s.skip ?? []).includes(d))
    .map((d) => ({ subId: s.id, date: d, amount: priceOn(s, d), via: s.via, status: "Paid" }))
    .reverse();
}
export const PAYMENTS = SUBS.flatMap(paymentsFor).sort((a, b) => (a.date < b.date ? 1 : -1));

export function nextRenewal(s) {
  return nextOccurrence(s.billingAnchorDate, s.billingCycle, TODAY);
}
/** Renewals that came and went with no payment recorded (made-up rule: no payment on that date). */
export function unrecorded(s) {
  if (!isOn(s)) return [];
  return (s.skip ?? []).filter((d) => d < TODAY);
}

// ---------- Totals ----------
export const ACTIVE = SUBS.filter(isOn);
export const MONTHLY = ACTIVE.reduce((t, s) => t + monthlyEq(s), 0);
export const YEARLY = ACTIVE.reduce((t, s) => t + s.amount * (12 / STEP[s.billingCycle]), 0);
export const byCost = [...ACTIVE].sort((a, b) => monthlyEq(b) - monthlyEq(a));
export const byNext = [...ACTIVE].sort((a, b) => (nextRenewal(a) < nextRenewal(b) ? -1 : 1));

export function byCategory() {
  const m = new Map();
  for (const s of ACTIVE) m.set(s.category, (m.get(s.category) ?? 0) + monthlyEq(s));
  return [...m.entries()].map(([name, v]) => ({ name, v, color: catColor(name), subs: ACTIVE.filter((s) => s.category === name) })).sort((a, b) => b.v - a.v);
}
export function byPayer() {
  const m = new Map();
  for (const s of ACTIVE) {
    const key = s.via.card ? `card:${s.via.card}` : `account:${s.via.account}`;
    m.set(key, (m.get(key) ?? 0) + monthlyEq(s));
  }
  return [...m.entries()].map(([key, v]) => {
    const [kind, id] = key.split(":");
    return { kind, id, v, name: kind === "card" ? CARDS[id].name : ACCOUNTS[id].name, color: kind === "card" ? CARDS[id].color : "emerald", subs: ACTIVE.filter((s) => (kind === "card" ? s.via.card === id : s.via.account === id)) };
  }).sort((a, b) => b.v - a.v);
}

/** Renewals of active subscriptions from `from` to `to`, inclusive, at the plan's price. */
export function renewalsBetween(from, to, list = ACTIVE) {
  const out = [];
  for (const s of list) for (const d of occurrences(s.billingAnchorDate, s.billingCycle, to)) if (d >= from && d >= s.startDate) out.push({ s, date: d, amount: s.amount });
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}
export const monthKey = (iso) => iso.slice(0, 7);
export function monthsFrom(startKey, n) {
  const out = [];
  let d = `${startKey}-01`;
  for (let i = 0; i < n; i++) { out.push(d.slice(0, 7)); d = addMonthsUTC(d, 1); }
  return out;
}
export function paidByMonth(key) { return PAYMENTS.filter((p) => monthKey(p.date) === key).reduce((t, p) => t + p.amount, 0); }
export function expectedByMonth(key) { return renewalsBetween(addDays(TODAY, 1), `${key}-31`).filter((r) => monthKey(r.date) === key).reduce((t, r) => t + r.amount, 0); }

// ---------- Formatting ----------
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dt = (iso) => new Date(`${iso}T00:00:00Z`);
export const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export const inrK = (n) => (n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : inr(n));
export const fmt = (iso) => `${MON[dt(iso).getUTCMonth()]} ${dt(iso).getUTCDate()}`;
export const fmtY = (iso) => `${fmt(iso)}, ${dt(iso).getUTCFullYear()}`;
export const fmtSmart = (iso) => (iso.slice(0, 4) === TODAY.slice(0, 4) ? fmt(iso) : fmtY(iso));
export const dow = (iso) => DOW[dt(iso).getUTCDay()];
export const fmtDow = (iso) => `${dow(iso)}, ${fmt(iso)}`;
export const monName = (key) => MON[Number(key.slice(5, 7)) - 1];
export const monYear = (key) => `${monName(key)} ${key.slice(0, 4)}`;
export function rel(iso) {
  const n = daysBetween(TODAY, iso);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n > 0) return n < 45 ? `in ${n} days` : `in ${Math.round(n / 30)} months`;
  return `${-n} days ago`;
}
export const cycleWord = (c) => ({ Monthly: "month", Quarterly: "quarter", Yearly: "year" })[c];
export const perCycle = (s) => `${inr(s.amount)} / ${cycleWord(s.billingCycle)}`;
export const viaName = (via) => (via.card ? CARDS[via.card].name : ACCOUNTS[via.account].name);
export const pct = (a, b) => `${Math.round((a / b) * 100)}%`;
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

// ---------- Price changes ----------
/** Each time a payment differed from the one before it. */
export function priceChanges(s) {
  const pays = paymentsFor(s).slice().reverse();
  const out = [];
  for (let i = 1; i < pays.length; i++) if (pays[i].amount !== pays[i - 1].amount) out.push({ date: pays[i].date, from: pays[i - 1].amount, to: pays[i].amount });
  return out;
}
export const lastPayment = (s) => paymentsFor(s)[0];
export const planMismatch = (s) => { const p = lastPayment(s); return p && isOn(s) && p.amount !== s.amount ? p : null; };
export const paidSoFar = (s) => paymentsFor(s).reduce((t, p) => t + p.amount, 0);

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
  arrowR: (s) => ic('<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="13 6 19 12 13 18"></polyline>', s ?? 13, 2.5),
  check: (s) => ic('<polyline points="20 6 9 17 4 12"></polyline>', s ?? 12, 3),
  x: (s) => ic('<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>', s ?? 14, 2.2),
  up: (s) => ic('<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="6 11 12 5 18 11"></polyline>', s ?? 11, 2.6),
  down: (s) => ic('<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="6 13 12 19 18 13"></polyline>', s ?? 11, 2.6),
  pause: (s) => ic('<line x1="9" y1="5" x2="9" y2="19"></line><line x1="15" y1="5" x2="15" y2="19"></line>', s ?? 13, 2.4),
  play: (s) => ic('<polygon points="7 4 19 12 7 20 7 4"></polygon>', s ?? 12, 2.2),
  stop: (s) => ic('<circle cx="12" cy="12" r="9"></circle><line x1="6" y1="18" x2="18" y2="6"></line>', s ?? 13, 2.2),
  edit: (s) => ic('<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>', s ?? 13, 2.2),
  search: (s) => ic('<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>', s ?? 13, 2.2),
  cal: (s) => ic('<rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>', s ?? 14),
  info: (s) => ic('<circle cx="12" cy="12" r="9"></circle><line x1="12" y1="11" x2="12" y2="16"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>', s ?? 12, 2.2),
  alert: (s) => ic('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>', s ?? 14, 2.2),
  menu: (s) => ic('<line x1="4" y1="7" x2="20" y2="7"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="17" x2="20" y2="17"></line>', s ?? 20),
  more: (s) => ic('<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>', s ?? 16, 2.6),
  bank: (s) => ic('<path d="M3 21h18"></path><path d="M5 21V10"></path><path d="M19 21V10"></path><path d="M3 10l9-6 9 6"></path>', s ?? 12),
};

// ---------- Small parts ----------
/** The monogram square that stands in for a logo, in its category's card colour. */
export function mono(s, size = 30) {
  const c = catColor(s.category);
  const r = Math.round(size * 0.3);
  return `<span class="mono${isOn(s) ? "" : " mono-off"}" style="width:${size}px;height:${size}px;border-radius:${r}px;font-size:${Math.round(size * 0.44)}px;background:linear-gradient(155deg,var(--card-${c}-from),var(--card-${c}-to))">${esc(s.alias[0])}</span>`;
}
export function cardChip(via, { small = false } = {}) {
  if (via.card) {
    const c = CARDS[via.card];
    return `<span class="via"><span class="minitile" style="background:linear-gradient(155deg,var(--card-${c.color}-from),var(--card-${c.color}-to))"></span>${c.name}</span>`;
  }
  const a = ACCOUNTS[via.account];
  return `<span class="via"><span class="minibank">${I.bank(10)}</span>${small ? a.name.split(" ")[0] : a.name}</span>`;
}
export function duePill(s, date = nextRenewal(s)) {
  const n = daysBetween(TODAY, date);
  if (n <= 3) return `<span class="pill pill-due">${n === 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`}</span>`;
  if (n <= 7) return `<span class="pill pill-soon">In ${n} days</span>`;
  return "";
}
export function statusPill(s) {
  if (s.status === "Paused") return `<span class="pill pill-off">${I.pause(10)} Paused</span>`;
  if (s.status === "Cancelled") return `<span class="pill pill-off">${I.stop(10)} Cancelled</span>`;
  return `<span class="pill pill-on">Active</span>`;
}
export function changeChip(s) {
  const ch = priceChanges(s).at(-1);
  if (!ch || daysBetween(ch.date, TODAY) > 200) return "";
  const up = ch.to > ch.from;
  return `<span class="chg ${up ? "chg-up" : "chg-down"}">${up ? I.up(10) : I.down(10)}${inr(Math.abs(ch.to - ch.from))} since ${fmt(ch.date)}</span>`;
}
export const sampleTag = (extra = "") => `<span class="sample">Sample data, made up${extra}</span>`;

// ---------- Shell ----------
export function rail() {
  const items = ["overview", "accounts", "cards", "subs", "income", "loans", "fixed", "invest"];
  return `<nav class="rail glass-strong">${items.map((k) => `<span class="rail-item${k === "subs" ? " active" : ""}">${I[k]()}</span>`).join("")}<span class="rail-me">P</span></nav>`;
}
export function desktop({ w = 1600, h, body, note = "" }) {
  return `<div class="chai-app desk" style="width:${w}px;height:${h === "auto" ? "__H__" : h === "fit" ? "auto" : `${h}px`}">${rail()}<main class="main glass">${body}</main>${note}</div>`;
}
export function phone({ h, body, label = "" }) {
  return `<div class="chai-app ph" style="width:390px;height:${h === "auto" ? "__H__" : h === "fit" ? "auto" : `${h}px`}"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${I.menu()}</span></header><div class="ph-body">${body}</div>${label}</div>`;
}
export function header({ eyebrow = "Subscriptions · Today", title = "Subscriptions", lede, actions, phone: ph = false }) {
  return `<header class="pg-head${ph ? " ph-head" : ""}"><div class="pg-text"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${lede ? `<p class="lede">${lede}</p>` : ""}</div>${actions ? `<div class="pg-actions">${actions}</div>` : ""}</header>`;
}
export const btn = (label, { kind = "ghost", icon = "", cls = "" } = {}) => `<span class="btn btn-${kind} ${cls}">${icon}${label}</span>`;
export const iconBtn = (icon, label) => `<span class="btn btn-icon" aria-label="${label}">${icon}</span>`;
export function headerActions({ ph = false } = {}) {
  return `${iconBtn(I.refresh(), "Refresh")}${btn("Record payment", { icon: I.check(12) })}${btn("Add subscription", { kind: "primary", icon: I.plus() })}`;
}
/** The app's own dropdown (as in #112), closed or open. Built on <details> so it opens without script. */
export function select({ value, options = [], open = false, kind = "pill", icon = "", align = "", width = "" }) {
  const opts = options.map((o) => (o === "-" ? `<div class="lb-divider"></div>` : o.group ? `<div class="lb-group">${o.group}</div>` : `<div class="opt" ${o.on ? 'aria-selected="true"' : ""}><span class="opt-label">${o.label}</span>${o.meta ? `<span class="opt-meta">${o.meta}</span>` : ""}<span class="opt-check">${I.check(12)}</span></div>`)).join("");
  return `<details class="sel sel--${kind}"${open ? " open" : ""}${width ? ` style="width:${width}"` : ""}><summary class="sel-trigger">${icon ? `<span class="sel-icon">${icon}</span>` : ""}<span class="sel-value">${value}</span><span class="sel-chev">${I.chev()}</span></summary><div class="pop${align ? ` ${align}` : ""}"><div class="lb">${opts}</div></div></details>`;
}
export function seg(items, { cls = "" } = {}) {
  return `<span class="seg ${cls}">${items.map((it) => `<span class="seg-i${it.on ? " on" : ""}">${it.label}${it.count != null ? `<em>${it.count}</em>` : ""}</span>`).join("")}</span>`;
}

// ---------- Renewals (every renewal date, paid or not, for the Renewals page) ----------
/**
 * One row per renewal date from `from` to `to`, newest first.
 * status: "paid" (a payment on that date), "missing" (passed, no payment), "upcoming" (today or later),
 * "wont" (the first one after a cancellation). Paused subscriptions stop after their last payment.
 */
export function renewalRows(from, to, list = SUBS) {
  const rows = [];
  for (const s of list) {
    const pays = paymentsFor(s);
    const byDate = new Map(pays.map((p) => [p.date, p]));
    const occ = occurrences(s.billingAnchorDate, s.billingCycle, to).filter((d) => d >= s.startDate);
    for (const d of occ) {
      if (d < from) continue;
      const p = byDate.get(d);
      let status;
      if (p) status = "paid";
      else if (s.status === "Paused" && d > s.lastDate) continue;
      else if (s.status === "Cancelled" && d > s.endDate) { if (rows.some((r) => r.s === s && r.status === "wont")) continue; status = "wont"; }
      else status = d < TODAY ? "missing" : "upcoming";
      const prev = pays.find((x) => x.date < d);
      rows.push({ s, date: d, plan: status === "paid" ? priceOn(s, d) : s.amount, payment: p ?? null, status, change: p && prev ? p.amount - prev.amount : 0, overPlan: p && isOn(s) && d === pays[0]?.date ? p.amount - s.amount : 0 });
    }
  }
  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.s.alias < b.s.alias ? -1 : 1));
}
export const yearPaid = (y) => PAYMENTS.filter((p) => p.date.startsWith(String(y))).reduce((t, p) => t + p.amount, 0);
export const yearPayments = (y) => PAYMENTS.filter((p) => p.date.startsWith(String(y))).length;
