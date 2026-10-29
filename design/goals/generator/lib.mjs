// Sample data, money math, formatting and the shell for the Goals canvas.
// Every goal, amount and date here is made up. "Today" is Oct 29, 2026.
// The shapes are the proposed ones (docs/design/goals.md: Goals, GoalContributions); the sums are what lib/aggregate/goals.ts will hold,
// written here only so every figure on a board agrees with every other.

export const TODAY = "2026-10-29";
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

// Icons for the loans
I.home = (s) => ic('<path d="M3 11 12 4l9 7"></path><path d="M5 10v10h14V10"></path><path d="M10 20v-6h4v6"></path>', s ?? 14);
I.car = (s) => ic('<path d="M5 16V11l2-5h10l2 5v5"></path><path d="M3 16h18v3H3z"></path><circle cx="7.5" cy="16" r="0.6"></circle><circle cx="16.5" cy="16" r="0.6"></circle>', s ?? 14);
I.user = (s) => ic('<circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"></path>', s ?? 14);
I.laptop = (s) => ic('<rect x="4" y="5" width="16" height="11" rx="1.5"></rect><path d="M2 20h20"></path>', s ?? 14);
I.flag = (s) => ic('<path d="M5 21V4"></path><path d="M5 4h12l-2 4 2 4H5"></path>', s ?? 12);
I.hourglass = (s) => ic('<path d="M6 3h12"></path><path d="M6 21h12"></path><path d="M7 3c0 5 5 6 5 9s-5 4-5 9"></path><path d="M17 3c0 5-5 6-5 9s5 4 5 9"></path>', s ?? 14);
// ---------- Small parts ----------
export const grad = (c, a = 155) => `linear-gradient(${a}deg,var(--card-${c}-from),var(--card-${c}-to))`;
/** A mark's fill (bars, ribbons): the colour, a touch lighter on top. */
export const fill = (s, a = 180) => `linear-gradient(${a}deg,color-mix(in oklch,var(--card-${typeof s === "string" ? s : s.color}) 80%,white),var(--card-${typeof s === "string" ? s : s.color}))`;
export const col = (s) => `var(--card-${typeof s === "string" ? s : s.color})`;
/** A loan's tile: its icon on its card gradient. */
export const sampleTag = (extra = "") => `<span class="sample">Sample data, made up${extra}</span>`;
export const derivedTag = (t = "Worked out") => `<span class="pill pill-derived">${I.link(10)} ${t}</span>`;

// ---------- Shell ----------
export function rail() {
  const items = ["overview", "accounts", "cards", "subs", "income", "loans", "fixed", "invest", "goals"];
  return `<nav class="rail glass-strong">${items.map((k) => `<span class="rail-item${k === "goals" ? " active" : ""}">${I[k]()}</span>`).join("")}<span class="rail-me">P</span></nav>`;
}
export function desktop({ w = 1600, h, body, note = "" }) {
  return `<div class="chai-app desk" style="width:${w}px;height:${h === "auto" ? "__H__" : h === "fit" ? "auto" : `${h}px`}">${rail()}<main class="main glass">${body}</main>${note}</div>`;
}
export function header({ eyebrow = "Goals · Today", title = "Good afternoon, Prathik", lede, actions, back }) {
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

// ---------- More icons ----------
I.goals = (s) => ic('<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1.2"></circle>', s ?? 17);
I.tablet = (s) => ic('<rect x="5" y="3" width="14" height="18" rx="2.5"></rect><line x1="11" y1="18" x2="13" y2="18"></line>', s ?? 14);
I.fridge = (s) => ic('<rect x="6" y="2" width="12" height="20" rx="2"></rect><line x1="6" y1="10" x2="18" y2="10"></line><line x1="9" y1="5.5" x2="9" y2="7.5"></line><line x1="9" y1="13" x2="9" y2="16"></line>', s ?? 14);
I.plane = (s) => ic('<path d="M2 16l20-6-20-6 4 6-4 6Z"></path><path d="M6 10h8"></path>', s ?? 14);
I.cap = (s) => ic('<path d="M2 9l10-5 10 5-10 5Z"></path><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"></path>', s ?? 14);
I.phones = (s) => ic('<path d="M4 15v-3a8 8 0 0 1 16 0v3"></path><rect x="3" y="14" width="4" height="6" rx="1.5"></rect><rect x="17" y="14" width="4" height="6" rx="1.5"></rect>', s ?? 14);
I.camera = (s) => ic('<path d="M4 8h3l2-3h6l2 3h3v12H4Z"></path><circle cx="12" cy="13.5" r="3.5"></circle>', s ?? 14);
I.bolt = (s) => ic('<path d="M13 2 4 14h7l-1 8 9-12h-7Z"></path>', s ?? 14);
I.pause = (s) => ic('<rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect>', s ?? 12);
I.pin = (s) => ic('<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11Z"></path><circle cx="12" cy="10" r="2"></circle>', s ?? 12);
I.undo = (s) => ic('<path d="M9 14 4 9l5-5"></path><path d="M4 9h10a6 6 0 0 1 0 12h-3"></path>', s ?? 12, 2.2);
I.wheel = (s) => ic('<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="3" x2="12" y2="9"></line><line x1="12" y1="15" x2="12" y2="21"></line><line x1="3" y1="12" x2="9" y2="12"></line><line x1="15" y1="12" x2="21" y2="12"></line>', s ?? 14);
I.pencilTool = (s) => ic('<path d="M3 21l3-1 12-12-2-2L4 18Z"></path><path d="M14 6l2 2"></path>', s ?? 14);
I.speaker = (s) => ic('<rect x="6" y="2" width="12" height="20" rx="2.5"></rect><circle cx="12" cy="14.5" r="3.5"></circle><circle cx="12" cy="7" r="1"></circle>', s ?? 14);
I.shield = (s) => ic('<path d="M12 3 4 6v6c0 4.5 3.3 8 8 9 4.7-1 8-4.5 8-9V6Z"></path>', s ?? 14);

// ---------- Sample data (made up) ----------
export const SALARY = 138500;       // Income's sample salary
export const OBLIGATIONS = 71000;   // EMIs, subscriptions and card bills this month (Overview's monthly obligations; a made-up figure)
export const LEFT = SALARY - OBLIGATIONS; // "income less obligations": not a true surplus, UPI and cash spending aren't tracked

/** The fixed category list: each has the colour a goal falls back to, and its icon. */
export const CATEGORIES = {
  Vehicle: { color: "copper", icon: "car" }, Gadget: { color: "violet", icon: "tablet" }, Appliance: { color: "teal", icon: "fridge" },
  Travel: { color: "ruby", icon: "plane" }, Education: { color: "sapphire", icon: "cap" }, Other: { color: "onyx", icon: "goals" },
};

/**
 * Goal: id, name, parentId (a top-level goal; one level only), category, necessity (Need | Want), scale (Minor | Major: the time horizon,
 * picked by Prathik), amount (this goal's own part; a parent's can be 0), targetDate (blank = someday), dateType (Fixed | Flexible),
 * startDate, plannedMonthly, status (Active | Paused | Done | Dropped), doneOn / actualCost when Done.
 */
const g = (o) => ({ parentId: null, dateType: "Flexible", status: "Active", plannedMonthly: 0, targetDate: null, color: null, ...o });
export const GOALS = [
  g({ id: "car", name: "Car upgrade", category: "Vehicle", necessity: "Want", scale: "Major", amount: 150000, targetDate: "2028-06-30", startDate: "2026-03-01", plannedMonthly: 4000, ownLabel: "Body work and paint, still to be quoted" }),
  g({ id: "susp", parentId: "car", name: "Suspension", category: "Vehicle", necessity: "Need", scale: "Minor", amount: 45000, targetDate: "2027-04-15", startDate: "2026-03-01", plannedMonthly: 5000 }),
  g({ id: "tyres", parentId: "car", name: "New tyres", category: "Vehicle", necessity: "Need", scale: "Minor", amount: 38000, targetDate: "2027-01-10", startDate: "2026-03-01", plannedMonthly: 5000 }),
  g({ id: "alloy", parentId: "car", name: "Alloy wheels", category: "Vehicle", necessity: "Want", scale: "Minor", amount: 52000, targetDate: "2027-12-31", startDate: "2026-06-01", plannedMonthly: 3500 }),
  g({ id: "music", parentId: "car", name: "Music system", category: "Vehicle", necessity: "Want", scale: "Minor", amount: 60000, targetDate: "2028-03-31", startDate: "2026-10-01" }),
  g({ id: "dash", parentId: "car", name: "Dashcam", category: "Vehicle", necessity: "Want", scale: "Minor", amount: 9000, targetDate: "2026-12-31", startDate: "2026-05-01", status: "Dropped" }),
  g({ id: "ipad", name: "iPad Pro", category: "Gadget", necessity: "Want", scale: "Minor", amount: 68900, targetDate: "2027-02-28", startDate: "2026-07-01", plannedMonthly: 8000 }),
  g({ id: "pencil", parentId: "ipad", name: "Apple Pencil", category: "Gadget", necessity: "Want", scale: "Minor", amount: 11900, targetDate: "2027-02-28", startDate: "2026-09-01", plannedMonthly: 1500 }),
  g({ id: "fridge", name: "New fridge", category: "Appliance", necessity: "Need", scale: "Minor", amount: 62000, targetDate: "2026-12-20", dateType: "Fixed", startDate: "2026-08-15", plannedMonthly: 15000 }),
  g({ id: "goa", name: "Goa trip", category: "Travel", necessity: "Want", scale: "Minor", amount: 85000, targetDate: "2027-06-10", startDate: "2026-08-01", plannedMonthly: 8000 }),
  g({ id: "masters", name: "Masters course", category: "Education", necessity: "Want", scale: "Major", amount: 600000, targetDate: "2029-06-30", startDate: "2026-01-01", plannedMonthly: 15000 }),
  g({ id: "camera", name: "Mirrorless camera", category: "Gadget", necessity: "Want", scale: "Minor", amount: 75000, startDate: "2026-04-01", status: "Paused" }),
  g({ id: "phones", name: "Noise-cancelling headphones", category: "Gadget", necessity: "Want", scale: "Minor", amount: 28000, targetDate: "2026-09-30", startDate: "2026-06-01", status: "Done", doneOn: "2026-09-12", actualCost: 26499, paidFrom: "HDFC Regalia (card)" }),
];
export const goal = (id) => GOALS.find((x) => x.id === id);
export const kids = (id) => GOALS.filter((x) => x.parentId === id);
export const tops = () => GOALS.filter((x) => !x.parentId);
export const gColor = (x) => x.color ?? CATEGORIES[x.category].color;
export const gIcon = (x) => I[CATEGORIES[x.category].icon];

/** GoalContribution: goalId, date, amount, kind (Set-aside | Take-back). Spread over months with the helper below. */
const spread = (goalId, from, n, each, rest = {}) => Array.from({ length: n }, (_, i) => ({ goalId, date: addMonthsUTC(from, i), amount: each, kind: "Set-aside", ...rest }));
export const CONTRIBUTIONS = [
  ...spread("car", "2026-03-05", 7, 3000),                        // the pot for the whole upgrade: 21,000
  ...spread("susp", "2026-03-05", 4, 5000),                       // 20,000
  ...spread("tyres", "2026-03-05", 7, 4000, { accountId: "hdfc" }), // 28,000
  ...spread("alloy", "2026-06-05", 3, 2500),                      // 7,500
  ...spread("dash", "2026-05-05", 2, 2000),
  { goalId: "dash", date: "2026-08-14", amount: 4000, kind: "Take-back", note: "Dropped; back to the car pot" },
  ...spread("ipad", "2026-07-05", 4, 9000, { accountId: "icici" }), // 36,000
  ...spread("pencil", "2026-09-05", 2, 3000),                     // 6,000
  ...spread("fridge", "2026-08-20", 3, 15000, { accountId: "hdfc" }), // 45,000
  ...spread("goa", "2026-08-05", 3, 7000),                        // 21,000
  ...spread("masters", "2026-01-05", 10, 13000, { accountId: "icici" }), // 130,000
  ...spread("camera", "2026-04-05", 3, 4000),                     // 12,000
  ...spread("phones", "2026-06-05", 4, 7000),                     // 28,000
];

// ---------- The math (what lib/aggregate/goals.ts will hold; each gets a test there) ----------
export const sum = (a) => a.reduce((s, x) => s + x, 0);
/** Saved in this goal itself: Set-aside less Take-back, never below 0. */
export const savedOwn = (id) => Math.max(0, sum(CONTRIBUTIONS.filter((c) => c.goalId === id).map((c) => (c.kind === "Set-aside" ? c.amount : -c.amount))));
const live = (id) => kids(id).filter((k) => k.status !== "Dropped");
/** A goal's target: its own part plus its sub-goals' (Dropped ones leave). */
export const targetOf = (x) => x.amount + sum(live(x.id).map(targetOf));
/** Saved: its own contributions plus its sub-goals'. */
export const savedOf = (x) => savedOwn(x.id) + sum(live(x.id).map(savedOf));
export const plannedOf = (x) => x.plannedMonthly + sum(live(x.id).map(plannedOf));
export const leftOf = (x) => Math.max(0, targetOf(x) - savedOf(x));
export const excessOf = (x) => Math.max(0, savedOf(x) - targetOf(x));
export const pctOfGoal = (x) => (targetOf(x) ? Math.min(1, savedOf(x) / targetOf(x)) : 0);
/** The date a parent is due: its own date, or the latest of its sub-goals'. */
export const dueOf = (x) => x.targetDate ?? live(x.id).map(dueOf).filter(Boolean).sort().at(-1) ?? null;
/** Whole months from today to a date, at least 1 while it's ahead (rule to confirm: the date's own month isn't counted). */
export const monthsTo = (iso) => { let m = 0; while (addMonthsUTC(TODAY, m + 1) <= iso) m++; return m; };
export const monthsLeft = (iso) => (iso < TODAY ? 0 : Math.max(1, monthsTo(iso)));
/** The required monthly: what's left over the whole months left, rounded up to the rupee. Overdue goals owe it all now. */
export function requiredMonthly(x) {
  const left = leftOf(x), d = dueOf(x);
  if (left === 0 || !d) return 0;
  return Math.ceil(left / Math.max(1, monthsLeft(d)));
}
/** Own required monthly for a goal that has sub-goals: the sum over its leaves, since each has its own date. */
export const requiredAll = (x) => (kids(x.id).length ? requiredOwn(x) + sum(live(x.id).map(requiredAll)) : requiredMonthly(x));
export function requiredOwn(x) {
  const left = Math.max(0, x.amount - savedOwn(x.id)), d = dueOf(x);
  return left === 0 || !d ? 0 : Math.ceil(left / Math.max(1, monthsLeft(d)));
}
/** Where a goal stands: Funded | Overdue | Behind | On track | No plan | Paused | Done | Dropped (derived, never stored). */
export function standing(x) {
  if (x.status !== "Active") return x.status;
  if (targetOf(x) > 0 && savedOf(x) >= targetOf(x)) return "Funded";
  const d = dueOf(x);
  if (d && d < TODAY) return "Overdue";
  const req = requiredAll(x), plan = plannedOf(x);
  if (!d) return "Someday";
  if (!plan) return "No plan";
  return plan >= req ? "On track" : "Behind";
}
/** Where saving should be by now if it were a straight line from the start date to the target date. */
export function expectedPct(x) {
  const d = dueOf(x); if (!d) return null;
  const a = daysBetween(x.startDate, TODAY), b = daysBetween(x.startDate, d);
  return b <= 0 ? 1 : Math.max(0, Math.min(1, a / b));
}
export const necessitySplit = (x) => {
  const parts = [x, ...live(x.id)];
  const need = sum(parts.filter((p) => p.necessity === "Need").map((p) => (p === x ? p.amount : targetOf(p))));
  return { need, want: targetOf(x) - need };
};
export const ACTIVE = GOALS.filter((x) => x.status === "Active");
export const TOPS = ACTIVE.filter((x) => !x.parentId);
/** Active leaves (a goal with no live sub-goal): the units that get funded. A parent with an own part counts that part as a leaf of its own. */
export const UNITS = TOPS.flatMap((x) => {
  const ks = live(x.id).filter((k) => k.status === "Active");
  if (!kids(x.id).length) return [x];
  return [...(x.amount > 0 ? [{ ...x, id: x.id, own: true, name: `${x.name} (${x.id === "ipad" ? "the iPad itself" : "the rest"})` }] : []), ...ks].filter(Boolean);
}).map((u) => ({ ...u, left: Math.max(0, u.amount - savedOwn(u.id)), due: u.targetDate ?? dueOf(goal(u.parentId ?? u.id)) }));
export const SAVED = sum(TOPS.map(savedOf));
export const TARGET = sum(TOPS.map(targetOf));
export const REQ_TOTAL = sum(UNITS.map((u) => (u.left && u.due ? Math.ceil(u.left / Math.max(1, monthsLeft(u.due))) : 0)));
export const PLAN_TOTAL = sum(ACTIVE.filter((x) => x.plannedMonthly).map((x) => x.plannedMonthly));
export const NEXT_DUE = TOPS.filter((x) => dueOf(x) && dueOf(x) >= TODAY).sort((a, b) => (dueOf(a) < dueOf(b) ? -1 : 1))[0];

/**
 * The funding plan (proposed rule, to confirm): month by month, goals are served in order (Fixed dates, then Needs, then earliest date, then
 * the smaller left). Pass 1 gives each goal at most what it needs this month to reach its date (left over the months left); pass 2 hands
 * whatever is left to the goals still open, in the same order. Returns each unit's finish month and the month-by-month allocation.
 */
export function fundingPlan(budget, months = 48) {
  const order = [...UNITS].sort((a, b) => (a.dateType === "Fixed" ? 0 : 1) - (b.dateType === "Fixed" ? 0 : 1) || (a.necessity === "Need" ? 0 : 1) - (b.necessity === "Need" ? 0 : 1) || (a.due ?? "9") .localeCompare(b.due ?? "9") || a.left - b.left);
  const left = Object.fromEntries(order.map((u) => [u.id, u.left]));
  const done = {}; const rows = [];
  for (let m = 1; m <= months; m++) {
    const day = addMonthsUTC(TODAY, m); let pool = budget; const give = {};
    for (const u of order) {
      if (!left[u.id] || !u.due) continue;
      const ml = Math.max(1, monthsTo(u.due) - (m - 1));
      const need = Math.min(left[u.id], Math.ceil(left[u.id] / ml));
      const a = Math.min(pool, need); give[u.id] = (give[u.id] ?? 0) + a; pool -= a; left[u.id] -= a;
    }
    for (const u of order) { if (!pool) break; if (!left[u.id]) continue; const a = Math.min(pool, left[u.id]); give[u.id] = (give[u.id] ?? 0) + a; pool -= a; left[u.id] -= a; }
    for (const u of order) if (!left[u.id] && done[u.id] == null) done[u.id] = m;
    rows.push({ m, day, give, spent: budget - pool });
    if (order.every((u) => !left[u.id])) break;
  }
  return { order, done, rows, left };
}
