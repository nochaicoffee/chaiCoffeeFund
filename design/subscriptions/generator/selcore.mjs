// Shared plumbing for directions Q–Z: a selector picks a subscription (or All), and the hero,
// the cost map and the payments table all follow it. The same radios drive all four, so they stay in sync.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as CORE from "./core.mjs";
const { inr, fmt, fmtY, fmtDow, rel, mono, I, btn, iconBtn, rings, desktop, phone } = L;

export const nowKey = L.TODAY.slice(0, 7);
export const paidNow = L.paidByMonth(nowKey), toCome = L.expectedByMonth(nowKey);
export const STOPPED = L.SUBS.filter((s) => !L.isOn(s));
export const ORDER = [...L.byNext, ...STOPPED];
export const IDS = ["all", ...ORDER.map((s) => s.id)];
export const subOf = (id) => (id === "all" ? null : L.sub(id));

/** Everything a hero shows, for one subscription or for all of them. */
export function facts(s) {
  if (!s) {
    const n = L.byNext[0], nd = L.nextRenewal(n);
    const rises = L.renewalRows("2026-01-01", L.TODAY).filter((r) => r.change > 0);
    return { all: true, id: "all", name: "All subscriptions", alias: "All", color: "emerald", category: `${L.ACTIVE.length} active`, monthly: L.MONTHLY, yearly: L.YEARLY, amount: L.MONTHLY, cycle: "Monthly", cycleWord: "month", on: true,
      next: nd, nextSub: n, left: L.daysBetween(L.TODAY, nd), prev: `${nowKey}-01`, frac: paidNow / (paidNow + toCome), paidSoFar: L.yearPaid(2026), payCount: L.yearPayments(2026), since: "2022-12-15",
      change: rises.length ? { count: rises.length, more: rises.reduce((t, r) => t + r.change, 0) } : null, via: null, share: 1, rank: 0 };
  }
  const on = L.isOn(s);
  const next = L.nextRenewal(s);
  const prev = L.addMonthsUTC(next, -L.STEP[s.billingCycle]);
  const ch = L.priceChanges(s).at(-1);
  return { all: false, id: s.id, s, name: s.name, alias: s.alias, color: L.catColor(s.category), category: s.category, monthly: L.monthlyEq(s), yearly: L.monthlyEq(s) * 12, amount: s.amount, cycle: s.billingCycle, cycleWord: L.cycleWord(s.billingCycle), on, status: s.status,
    next, prev, left: L.daysBetween(L.TODAY, next), frac: on ? Math.max(0, Math.min(1, L.daysBetween(prev, L.TODAY) / L.daysBetween(prev, next))) : 0,
    paidSoFar: L.paidSoFar(s), payCount: L.paymentsFor(s).length, since: s.startDate, change: ch ? { from: ch.from, to: ch.to, date: ch.date } : null, via: s.via, share: on ? L.monthlyEq(s) / L.MONTHLY : 0, rank: on ? L.byCost.indexOf(s) + 1 : 0, last: L.lastPayment(s) };
}

export const whenLine = (f) => (f.all ? `Next is ${f.nextSub.alias}, ${fmtDow(f.next)}` : f.on ? `Renews ${fmtDow(f.next)} · ${rel(f.next)}` : f.status === "Paused" ? `Paused · last paid ${fmt(f.s.lastDate)}` : `Cancelled ${fmt(f.s.endDate)} · won't renew`);
export const changeText = (f) => (f.all ? (f.change ? `${f.change.count} prices went up this year` : "No price changes") : f.change ? `${inr(f.change.from)} → ${inr(f.change.to)} on ${fmt(f.change.date)}` : "Never changed");
export const viaText = (f) => (f.all ? `${L.byPayer().length} cards and accounts` : L.viaName(f.via));
export function icon(f, size = 40) {
  if (!f.all) return mono(f.s, size);
  return `<span class="mono" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;background:linear-gradient(150deg,var(--card-emerald-from),var(--card-emerald-to))">${I.subs(Math.round(size * 0.46))}</span>`;
}
export const grad = (f, a = 155) => `linear-gradient(${a}deg,var(--card-${f.color}-from),var(--card-${f.color}-to))`;
export function actions(f, { cls = "btn-sm" } = {}) {
  if (f.all) return `${btn("Record payment", { kind: "primary", cls, icon: I.check(11) })}${btn("Add subscription", { kind: "soft", cls, icon: I.plus(11) })}`;
  if (f.on) return `${btn("Mark paid", { kind: "primary", cls, icon: I.check(11) })}${btn("Edit", { kind: "soft", cls, icon: I.edit(11) })}${iconBtn(I.more(), "Pause or cancel")}`;
  return `${btn(f.status === "Paused" ? "Resume" : "Restart", { kind: "primary", cls, icon: I.play(10) })}${btn("Edit", { kind: "soft", cls, icon: I.edit(11) })}`;
}
/** A barcode drawn from the subscription's id, so each pass has its own. */
export function barcode(seed, { w = 150, h = 38, color = "currentColor" } = {}) {
  let x = 0, out = "", k = 0;
  const codes = [...(seed + "chaicoffeefund")].map((c) => c.charCodeAt(0));
  while (x < w) { const bw = 1 + (codes[k % codes.length] % 3); const gap = 1 + (codes[(k * 7) % codes.length] % 3); out += `<rect x="${x}" y="0" width="${bw}" height="${h}" fill="${color}"></rect>`; x += bw + gap; k++; }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="display:block">${out}</svg>`;
}
export const stat = (k, v, s = "") => `<div style="display:flex;flex-direction:column;gap:3px;min-width:0"><span style="font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted)">${k}</span><b style="font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v}</b>${s ? `<span style="font-size:12px;font-weight:600;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s}</span>` : ""}</div>`;
export const two = (a, b, ratio = "1.15fr 1fr") => `<div style="display:grid;grid-template-columns:${ratio.split(" ").map((x) => `minmax(0,${x})`).join(" ")};gap:20px;align-items:stretch">${a}${b}</div>`;

/** Selector items carry inline styles, so the picked item's rules are marked !important to win over them. */
const important = (css) => css.replace(/\{([^{}]*)\}/g, (m, body) => `{${body.split(";").map((d) => (d.trim() && !d.includes("!important") ? `${d} !important` : d)).join(";")}}`);
/** The radios, plus CSS that shows the picked hero pane and styles the picked selector item. */
export function picker(prefix, selCss, sel = "netflix") {
  const base = CORE.picker(prefix, sel);
  const d = `.${prefix}dir`;
  const css = `<style>${d} .hp { display: none; } ${d} label.sx { cursor: pointer; }
    ${IDS.map((id) => `${d}:has(#${prefix}-sel-${id}:checked) .hp-${id} { display: block; }`).join("\n")}
    ${important(IDS.map((id) => selCss(`${d}:has(#${prefix}-sel-${id}:checked)`, id)).join("\n"))}</style>`;
  return { ...base, css: base.css + css };
}
export const heroPanes = (render, opts = {}) => IDS.map((id) => `<div class="hp hp-${id}">${render(facts(subOf(id)), opts)}</div>`).join("");
export const bottom = (prefix, second = "charged") => two(CORE.costMapCard(prefix, { w: 704, h: 520, minH: 440 }), CORE.stack(CORE.paymentsCard(prefix), second === "charged" ? P.chargedToCard() : P.priceChangesCard()));
export function page(prefix, { selCss, top, second = "charged", sel = "netflix", mid = "" }) {
  const pk = picker(prefix, selCss, sel);
  return desktop({ h: "auto", body: `${pk.css}${pk.open}${CORE.greeting()}${top}${mid}${bottom(prefix, second)}${pk.close}` });
}
/** Phone: the same selector and hero, with Netflix picked (static), then the map and its payments. */
export const importantCss = (css) => important(css);
export function phonePage(prefix, { selCss, selector, hero, sel = "netflix", mid = "" }) {
  return phone({ h: "auto", body: `<style>${important(selCss(`.phsel-${prefix}`, sel))}</style><div class="phsel-${prefix}" style="display:flex;flex-direction:column;gap:16px">${CORE.greeting({ phone: true })}${selector}${hero(facts(subOf(sel)), { ph: true })}${mid}</div>${CORE.phoneMap()}${CORE.phonePayments()}` });
}
/** A selector item: a label for the radio on desktop, a plain element on phone. */
export const item = (prefix, id, inner, { cls = "", style = "", ph = false, tag = "label" } = {}) => (ph ? `<span class="sx sx-${id} ${cls}" style="${style}">${inner}</span>` : `<${tag} for="${prefix}-sel-${id}" class="sx sx-${id} ${cls}" style="${style}">${inner}</${tag}>`);
