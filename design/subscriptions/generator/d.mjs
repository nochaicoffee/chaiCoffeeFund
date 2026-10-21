// Direction D · Cost map. Cost first: a map of rectangles sized by what each one costs a month.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { inr, fmt, fmtY, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, header, desktop, phone, rings } = L;

export const lede = () => {
  const [a, b] = L.byCost;
  const share = L.pct(L.monthlyEq(a) + L.monthlyEq(b), L.MONTHLY);
  const next = L.byNext[0];
  return `You pay <b>${inr(L.MONTHLY)} a month</b>, or <b>${inr(L.YEARLY)} a year</b>. <b>${a.alias}</b> and <b>${b.alias}</b> are <b>${share}</b> of it. <b>${next.alias}</b> renews next, on <b>${fmtDow(L.nextRenewal(next))}</b>.`;
};

/** Squarified treemap: rectangles whose areas match the values, kept as square as possible. */
export function squarify(items, x, y, w, h) {
  const total = items.reduce((t, it) => t + it.v, 0);
  let rest = items.map((it) => ({ ...it, a: (it.v / total) * w * h })).sort((p, q) => q.a - p.a);
  const out = [];
  const worst = (row, side) => { const s = row.reduce((t, r) => t + r.a, 0); const mx = Math.max(...row.map((r) => r.a)), mn = Math.min(...row.map((r) => r.a)); return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn)); };
  while (rest.length) {
    const side = Math.min(w, h);
    let row = [rest[0]], i = 1;
    while (i < rest.length && worst([...row, rest[i]], side) <= worst(row, side)) row.push(rest[i++]);
    const s = row.reduce((t, r) => t + r.a, 0);
    if (w >= h) { const rw = s / h; let yy = y; for (const r of row) { const rh = r.a / rw; out.push({ ...r, x, y: yy, w: rw, h: rh }); yy += rh; } x += rw; w -= rw; }
    else { const rh = s / w; let xx = x; for (const r of row) { const rw = r.a / rh; out.push({ ...r, x: xx, y, w: rw, h: rh }); xx += rw; } y += rh; h -= rh; }
    rest = rest.slice(i);
  }
  return out;
}

export function costMap({ w = 900, h = 470, gap = 6, phone: ph = false, open = "", pick = null, hover = true, fluid = false, minH = 300 } = {}) {
  const rects = squarify(L.ACTIVE.map((s) => ({ s, v: L.monthlyEq(s) })), 0, 0, w, h);
  const box = (r) => (fluid ? `left:calc(${(r.x / w) * 100}% + ${gap / 2}px);top:calc(${(r.y / h) * 100}% + ${gap / 2}px);width:calc(${(r.w / w) * 100}% - ${gap}px);height:calc(${(r.h / h) * 100}% - ${gap}px)` : `left:${r.x + gap / 2}px;top:${r.y + gap / 2}px;width:${r.w - gap}px;height:${r.h - gap}px`);
  return `<div class="tmap" style="position:relative;${fluid ? `width:100%;min-height:${minH}px` : `width:${w}px;height:${h}px`}">${rects.map((r) => {
    const s = r.s, c = L.catColor(s.category);
    const bw = r.w - gap, bh = r.h - gap;
    const big = bw > 150 && bh > 110, mid = bw > 82 && bh > 62, tiny = bw < 64 || bh < 52;
    const n = L.daysBetween(L.TODAY, L.nextRenewal(s));
    const pill = n <= 7 ? `<span class="dt-pill${n <= 3 ? " due" : " soon"}">${fmt(L.nextRenewal(s))} · ${n}d</span>` : "";
    const tag = pick ? "label" : "div";
    return `<${tag}${pick ? ` for="${pick}-sel-${s.id}"` : ""} class="hov tm tm-${s.id}${s.id === open ? " is-open" : ""}" style="display:block;position:absolute;${box(r)}">
      <div class="dtile" style="width:100%;height:100%;overflow:hidden;padding:${big ? 16 : tiny ? 6 : 10}px;border-radius:${big ? 18 : 12}px;background:linear-gradient(155deg,var(--card-${c}-from),var(--card-${c}-to));box-shadow:none;cursor:pointer${tiny ? ";align-items:center;justify-content:center" : ""}">${rings(Math.round(bw), Math.round(bh), { dx: 10, dy: 19, first: 40, step: 24, stroke: "var(--rings-light)", opacity: 0.05, count: 9 })}
        ${tiny ? `<div style="text-align:center;line-height:1.15"><b style="font-size:13px">${s.alias[0]}</b>${bh > 40 && bw > 40 ? `<div style="font-size:10px;font-weight:800">${inr(L.monthlyEq(s))}</div>` : ""}</div>` : `<div class="between" style="align-items:flex-start"><div style="min-width:0"><div style="font-size:${big ? 17 : 12}px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.alias}</div>${mid ? `<div class="dt-muted" style="margin-top:3px;font-size:${big ? 12 : 10.5}px">${big ? `${s.category} · ${s.billingCycle}` : s.billingCycle}</div>` : ""}</div>${big ? `<span class="dt-faint">${L.pct(L.monthlyEq(s), L.MONTHLY)}</span>` : ""}</div>
        <div><div style="font-size:${big ? 26 : 13}px;font-weight:800;line-height:1.1">${inr(L.monthlyEq(s))}${big ? `<span class="dt-muted" style="font-size:12px"> a month</span>` : ""}</div>${big ? `<div class="between" style="margin-top:8px">${pill ? "<span></span>" : `<span class="dt-faint">${s.billingCycle === "Monthly" ? `Renews ${fmt(L.nextRenewal(s))}` : `${inr(s.amount)} a ${L.cycleWord(s.billingCycle)}, next ${fmt(L.nextRenewal(s))}`}</span>`}${pill}</div>` : mid && pill ? `<div style="margin-top:5px">${pill}</div>` : ""}</div>`}
      </div>
      ${pick ? `<span class="tick" style="top:-7px;right:-7px;z-index:3">${I.check(11)}</span>` : ""}
      ${hover ? `<div class="hc-wrap" style="left:${r.x + r.w > w - 260 ? -258 : bw + 8}px;top:0">${P.renewalCard(s, L.nextRenewal(s))}</div>` : ""}
    </${tag}>`;
  }).join("")}</div>`;
}

/** What changed in a year: each subscription whose price moved, a year ago against now. */
export function slope({ w = 560, h = 230 } = {}) {
  const ago = L.addMonthsUTC(L.TODAY, -12);
  const items = L.ACTIVE.map((s) => {
    const before = s.startDate <= ago ? L.priceOn(s, ago) : null;
    const now = L.lastPayment(s)?.amount ?? s.amount;
    return { s, before: before && L.monthlyEq({ ...s, amount: before }), now: L.monthlyEq({ ...s, amount: now }) };
  }).filter((it) => it.before == null || Math.abs(it.before - it.now) > 0.5);
  const max = Math.max(...items.map((it) => Math.max(it.before ?? 0, it.now)));
  const top = Math.ceil(max / 500) * 500;
  const X0 = 150, X1 = w - 150, Y = (v) => h - 30 - (v / top) * (h - 60);
  const spread = (ys) => { const idx = ys.map((y, i) => [y, i]).sort((a, b) => a[0] - b[0]); for (let k = 1; k < idx.length; k++) if (idx[k][0] - idx[k - 1][0] < 15) idx[k][0] = idx[k - 1][0] + 15; const out = []; idx.forEach(([y, i]) => (out[i] = y)); return out; };
  const leftY = spread(items.map((it) => Y(it.before ?? it.now))), rightY = spread(items.map((it) => Y(it.now)));
  const lines = items.map((it, i) => {
    const col = `var(--card-${L.catColor(it.s.category)})`;
    const up = it.before != null && it.now > it.before;
    return `${it.before != null ? `<line x1="${X0}" y1="${Y(it.before)}" x2="${X1}" y2="${Y(it.now)}" stroke="${col}" stroke-width="2.5"></line><circle cx="${X0}" cy="${Y(it.before)}" r="4.5" fill="${col}"></circle><text x="${X0 - 12}" y="${leftY[i] + 4}" text-anchor="end" font-size="11.5" font-weight="700" fill="var(--muted)">${it.s.alias} ${inr(it.before)}</text>` : `<line x1="${X0}" y1="${Y(it.now)}" x2="${X1}" y2="${Y(it.now)}" stroke="${col}" stroke-width="1.5" stroke-dasharray="4 4"></line><text x="${X0 - 12}" y="${leftY[i] + 4}" text-anchor="end" font-size="11.5" font-weight="700" fill="var(--muted)">${it.s.alias}: new</text>`}
      <circle cx="${X1}" cy="${Y(it.now)}" r="4.5" fill="${col}"></circle><text x="${X1 + 12}" y="${rightY[i] + 4}" font-size="12" font-weight="800" fill="var(--fg)">${it.s.alias} ${inr(it.now)}${up ? ` <tspan fill="var(--negative)">+${inr(it.now - it.before)}</tspan>` : ""}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="display:block" aria-label="Monthly cost a year ago and now">
    <line x1="${X0}" x2="${X0}" y1="16" y2="${h - 30}" stroke="var(--divider)"></line><line x1="${X1}" x2="${X1}" y1="16" y2="${h - 30}" stroke="var(--divider)"></line>
    <text x="${X0}" y="${h - 8}" text-anchor="middle" font-size="11" font-weight="800" fill="var(--muted)">${fmtY(ago)}</text><text x="${X1}" y="${h - 8}" text-anchor="middle" font-size="11" font-weight="800" fill="var(--fg)">Now</text>
    ${lines}</svg><p class="card-note">${L.ACTIVE.length - items.length} others cost the same as a year ago. A month each, from what was charged.</p>`;
}

/** D's cost map card, as Prathik liked it: toggles, the map, a category legend, and what's not in it. */
export function costMapCard({ w = 912, h = 470, pick = null, title = "What each one costs", hover = true, extra = "", fluid = false, minH = 320 } = {}) {
  const off = L.SUBS.filter((s) => !L.isOn(s));
  return `<section class="card glass"><div class="card-h"><span class="card-t">${title}<small>a month, sized by cost${pick ? " · pick one for its payments" : ""}</small></span><span class="row" style="gap:10px">${seg([{ label: "A month", on: true }, { label: "A year" }])}${seg([{ label: "Each", on: true }, { label: "By category" }])}</span></div>
    ${costMap({ w, h, pick, hover, fluid, minH })}
    <div class="legend">${L.byCategory().map((c) => `<span><i style="background:var(--card-${c.color})"></i>${c.name} <b>${inr(c.v)}</b></span>`).join("")}</div>
    <div class="row" style="gap:10px;flex-wrap:wrap;padding-top:4px;border-top:1px solid var(--divider)"><span class="card-note" style="padding-top:10px">Not in the map:</span>${off.map((s) => `${pick ? `<label for="${pick}-sel-${s.id}" style="cursor:pointer;margin-top:10px">` : `<span style="margin-top:10px">`}<span class="chip off-chip off-${s.id}">${mono(s, 16)}${s.alias}<em>${s.status === "Paused" ? "paused" : "cancelled"}</em></span>${pick ? "</label>" : "</span>"}`).join("")}${extra}</div>
  </section>`;
}

export function dDesktop() {
  const off = L.SUBS.filter((s) => !L.isOn(s));
  const body = `${header({ lede: lede(), actions: L.headerActions() })}
    <div style="display:grid;grid-template-columns:minmax(0,1.85fr) minmax(0,1fr);gap:20px;align-items:stretch">${costMapCard({ w: 912, h: 560, fluid: true, minH: 420 })}<div class="stack-col">${P.renewalsPanel({ n: 7 })}${P.chargedToCard()}</div></div>
    <section class="card glass"><div class="card-h"><span class="card-t">A year ago and now<small>only the ones that changed</small></span></div>${slope({ w: 1360, h: 240 })}</section>`;
  return desktop({ h: "auto", body });
}

export function dPhone() {
  const body = `${header({ lede: lede(), phone: true, actions: `${btn("Add subscription", { kind: "primary", icon: I.plus() })}${btn("Record payment")}` })}
    <section class="card glass" style="padding:14px;gap:12px"><div class="between"><span class="card-t">What each one costs</span>${seg([{ label: "Month", on: true }, { label: "Year" }])}</div>${costMap({ w: 330, h: 380, gap: 4, phone: true })}<span class="card-note">Tap one for its details. Paused and cancelled ones aren't in the map.</span></section>
    ${P.renewalsPanel({ n: 5, phone: true })}
    <section class="card glass" style="padding:16px"><span class="card-t">Price changes</span><div style="display:flex;flex-direction:column;gap:14px">${P.changeList()}</div></section>`;
  return phone({ h: "auto", body });
}
