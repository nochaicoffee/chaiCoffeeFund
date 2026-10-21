// Direction K · Bento. Everything at a glance on one screen: a grid of small widgets, each answering one question.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { inr, inrK, fmt, fmtY, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, header, desktop, phone, rings } = L;

const nowKey = L.TODAY.slice(0, 7);
const paidNow = L.paidByMonth(nowKey), toCome = L.expectedByMonth(nowKey);

export function ring(frac, { size = 120, stroke = 12, color = "var(--accent)", track = "oklch(1 0 0 / 0.6)", label = "", sub = "" } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"></circle><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c * frac} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"></circle><text x="50%" y="${size / 2 + (sub ? 0 : 6)}" text-anchor="middle" font-size="${size / 5.2}" font-weight="800" fill="var(--fg)">${label}</text>${sub ? `<text x="50%" y="${size / 2 + size / 7}" text-anchor="middle" font-size="${size / 10}" font-weight="700" fill="var(--muted)">${sub}</text>` : ""}</svg>`;
}
export function donut(parts, { size = 130, stroke = 22, gap = 0.012 } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, total = parts.reduce((t, p) => t + p.v, 0);
  let off = 0;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${parts.map((p) => { const len = (p.v / total) * c - gap * c; const el = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--card-${p.color})" stroke-width="${stroke}" stroke-dasharray="${Math.max(len, 1)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})"></circle>`; off += (p.v / total) * c; return el; }).join("")}</svg>`;
}
const W = (inner, { col = "auto", row = "auto", cls = "glass", style = "" } = {}) => `<section class="card ${cls}" style="grid-column:${col};grid-row:${row};gap:12px;padding:18px 20px;justify-content:space-between;${style}">${inner}</section>`;
const wt = (t, extra = "") => `<div class="between"><span class="card-t" style="font-size:14px">${t}</span>${extra}</div>`;

function widgets({ ph = false } = {}) {
  const next = L.byNext[0], nd = L.nextRenewal(next), n = L.daysBetween(L.TODAY, nd);
  const miss = L.SUBS.flatMap((s) => L.unrecorded(s).map((d) => ({ s, d })));
  const up = L.renewalsBetween(L.addDays(L.TODAY, 0), L.addDays(L.TODAY, 45)).slice(0, ph ? 5 : 9);
  const cats = L.byCategory();
  const last6 = L.monthsFrom("2026-05", 6), next6 = L.monthsFrom("2026-11", 6);
  const vals = [...last6.map((k) => L.paidByMonth(k)), ...next6.map(L.expectedByMonth)];
  const max = Math.max(...vals);
  const changes = L.renewalRows("2026-01-01", L.TODAY).filter((r) => r.change > 0);
  const off = L.SUBS.filter((s) => !L.isOn(s));
  const pos = (desk, phone) => (ph ? phone : desk);
  return [
    W(`${rings(700, 230, { dx: 10, dy: 30, first: 40, step: 26, opacity: 0.1, sheen: "radial-gradient(circle at 85% 0%, var(--feature-tile-glow), transparent 55%)" })}<div class="between" style="align-items:flex-start"><div style="display:flex;flex-direction:column;gap:6px"><span class="k" style="font-size:12px;font-weight:600;color:oklch(0.38 0.06 152)">You pay</span><span style="font-size:${ph ? 34 : 46}px;font-weight:800;line-height:1">${inr(L.MONTHLY)}</span><span style="font-size:13px;font-weight:600;color:oklch(0.38 0.06 152)">a month · <b style="color:var(--fg)">${inr(L.YEARLY)}</b> a year · ${L.ACTIVE.length} active</span></div>${ring(paidNow / (paidNow + toCome), { size: ph ? 96 : 124, label: L.pct(paidNow, paidNow + toCome), sub: "Oct paid" })}</div><div class="between" style="font-size:12px;font-weight:700;color:oklch(0.38 0.06 152)"><span>${inr(paidNow)} paid in October</span><span>${inr(toCome)} to come</span></div>`, { col: pos("1 / span 2", "1 / -1"), row: pos("1", "auto"), cls: "feature textured" }),
    W(`${wt("Renews next", L.duePill(next))}<div class="row" style="gap:12px">${mono(next, 40)}<div><b style="font-size:18px;display:block">${next.alias}</b><span class="muted" style="font-size:12px;font-weight:600">${fmtDow(nd)} · ${L.viaName(next.via)}</span></div></div><div class="between" style="align-items:flex-end"><span style="font-size:40px;font-weight:800;line-height:1">${n}<span style="font-size:14px;color:var(--muted)"> days</span></span><b style="font-size:18px">${inr(next.amount)}</b></div>${n <= 3 ? btn("Mark paid", { kind: "accent", cls: "btn-sm", icon: I.check(11) }) : ""}`, { col: pos("3", "1 / -1") }),
    W(miss.length ? `${wt("Not recorded", `<span class="pill pill-warn">${miss.length}</span>`)}<div class="row" style="gap:10px">${mono(miss[0].s, 32)}<div><b style="display:block">${miss[0].s.alias}</b><span class="muted" style="font-size:12px;font-weight:600">${fmtDow(miss[0].d)} · ${inr(L.priceOn(miss[0].s, miss[0].d))}</span></div></div><p class="card-note">It renewed, but no payment is recorded.</p>${btn("Record payment", { kind: "ghost", cls: "btn-sm" })}` : `${wt("Not recorded")}<p class="card-note">Every renewal is recorded.</p>`, { col: pos("4", "1 / -1"), style: miss.length ? "background:linear-gradient(var(--surface),oklch(0.98 0.03 85))" : "" }),
    W(`${wt("Month by month", `<span class="legend" style="font-size:11px"><span><i style="background:var(--heat-3)"></i>Paid</span><span><i style="border:1.5px dashed var(--heat-4)"></i>Expected</span></span>`)}<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:${ph ? 4 : 8}px;align-items:end;height:${ph ? 110 : 150}px">${vals.map((v, i) => { const k = [...last6, ...next6][i]; const fut = i >= 6; return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end">${ph ? "" : `<span style="font-size:10px;font-weight:800;color:${fut ? "var(--muted)" : "var(--fg)"}">${inrK(v)}</span>`}<div class="textured" style="width:100%;height:${Math.max(6, (v / max) * (ph ? 80 : 100))}px;border-radius:8px 8px 3px 3px;${fut ? "border:1.5px dashed var(--heat-4)" : `background:var(--heat-${v > L.MONTHLY ? 4 : 3})`}${k === nowKey ? ";outline:2px solid var(--accent);outline-offset:2px" : ""}">${fut ? "" : rings(40, 120, { stroke: "var(--rings-light)", opacity: 0.1, first: 16, step: 10 })}</div><span style="font-size:10px;font-weight:${k === nowKey ? 800 : 600};color:${k === nowKey ? "var(--fg)" : "var(--muted)"}">${ph ? L.monName(k)[0] : L.monName(k)}</span></div>`; }).join("")}</div>`, { col: pos("1 / span 2", "1 / -1"), row: pos("2", "auto") }),
    W(`${wt("Coming up", `<span class="muted" style="font-size:12px;font-weight:600">${inr(L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 30)).reduce((t, r) => t + r.amount, 0))} in 30 days</span>`)}<div style="display:flex;flex-direction:column">${up.map((r) => { const d = L.daysBetween(L.TODAY, r.date); return `<div class="row" style="gap:10px;padding:8px 0;border-bottom:1px solid var(--divider);font-size:13px">${mono(r.s, 24)}<b class="grow" style="font-weight:700">${r.s.alias}</b><span style="font-size:12px;font-weight:600;color:${d <= 3 ? "var(--negative)" : "var(--muted)"}">${fmt(r.date)}</span><b class="num" style="width:58px;text-align:right">${inr(r.amount)}</b></div>`; }).join("")}</div><span class="link" style="margin-top:auto">View all renewals ${I.arrowR()}</span>`, { col: pos("3", "1 / -1"), row: pos("2 / span 2", "auto") }),
    W(`${wt("Price changes", `<span class="pill pill-off">${changes.length} this year</span>`)}${changes.map((r) => `<div class="row" style="gap:10px;font-size:13px">${mono(r.s, 24)}<b class="grow" style="font-weight:700">${r.s.alias}</b><span class="chg chg-up">${I.up(9)}${inr(r.change)}</span></div>`).join("")}<span class="card-note">${inr(changes.reduce((t, r) => t + r.change, 0))} more a month in all.</span>`, { col: pos("4", "1 / -1"), row: pos("2", "auto") }),
    W(`${wt("Where it goes")}<div class="row" style="gap:16px">${donut(cats, { size: ph ? 110 : 120, stroke: 20 })}<div style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;min-width:0" class="grow">${cats.slice(0, 5).map((c) => `<div class="between"><span class="row" style="gap:7px"><i style="width:9px;height:9px;border-radius:3px;background:var(--card-${c.color})"></i>${c.name}</span><b>${L.pct(c.v, L.MONTHLY)}</b></div>`).join("")}<span class="muted">+${cats.length - 5} more</span></div></div>`, { col: pos("1", "1 / -1"), row: pos("3", "auto") }),
    W(`${wt("Charged to")}<div class="stack" style="height:16px">${L.byPayer().map((p) => `<span style="flex:${p.v};background:var(--card-${p.color})"></span>`).join("")}</div><div style="display:flex;flex-direction:column;gap:7px;font-size:12px;font-weight:600">${L.byPayer().map((p) => `<div class="between"><span class="row" style="gap:7px"><i style="width:9px;height:9px;border-radius:3px;background:var(--card-${p.color})"></i>${p.name}</span><b>${inr(p.v)}</b></div>`).join("")}</div>`, { col: pos("2", "1 / -1"), row: pos("3", "auto") }),
    W(`${wt("Stopped")}<span style="font-size:26px;font-weight:800;color:var(--positive)">${inr(off.reduce((t, s) => t + L.monthlyEq(s) * 12, 0))}<span style="font-size:13px;color:var(--muted)"> a year</span></span><span class="card-note">no longer paid, from ${off.map((s) => `${s.alias} (${s.status === "Paused" ? "paused" : "cancelled"})`).join(" and ")}.</span>`, { col: pos("4", "1 / -1"), row: pos("3", "auto") }),
  ].join("");
}

export const lede = () => `Everything at a glance: <b>${inr(L.MONTHLY)} a month</b>, <b>Netflix</b> next on <b>${fmtDow(L.nextRenewal(L.sub("netflix")))}</b>, and <b>1 renewal</b> to record.`;

export function kDesktop() {
  const body = `${header({ lede: lede(), actions: L.headerActions() })}<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:minmax(150px,auto);gap:16px">${widgets()}</div>`;
  return desktop({ h: "auto", body });
}
export function kPhone() {
  const body = `${header({ lede: lede(), phone: true, actions: `${btn("Add subscription", { kind: "primary", icon: I.plus() })}${btn("Record payment")}` })}<div style="display:grid;grid-template-columns:1fr;gap:12px">${widgets({ ph: true })}</div>`;
  return phone({ h: "auto", body });
}
