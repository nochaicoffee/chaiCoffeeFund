// Directions L–P. Each keeps F's greeting, D's cost map and C's payments table, and tries a different hero.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as CORE from "./core.mjs";
const { inr, inrK, fmt, fmtY, fmtSmart, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, desktop, phone, rings } = L;

const nowKey = L.TODAY.slice(0, 7);
const paidNow = L.paidByMonth(nowKey), toCome = L.expectedByMonth(nowKey);
const paysNow = L.PAYMENTS.filter((p) => p.date.startsWith(nowKey));
const comeNow = L.renewalsBetween(L.addDays(L.TODAY, 1), `${nowKey}-31`).concat(L.renewalsBetween(L.TODAY, L.TODAY));
const two = (a, b, ratio = "1.15fr 1fr") => `<div style="display:grid;grid-template-columns:${ratio.split(" ").map((x) => `minmax(0,${x})`).join(" ")};gap:20px;align-items:stretch">${a}${b}</div>`;
const page = (prefix, hero, bodyParts) => {
  const pk = CORE.picker(prefix);
  return desktop({ h: "auto", body: `${pk.css}${pk.open}${CORE.greeting()}${hero}${bodyParts}${pk.close}` });
};

// ================= L · October as an equation =================
function equation({ ph = false } = {}) {
  const lumps = comeNow.concat(paysNow.map((p) => ({ s: L.sub(p.subId) }))).filter((x) => x.s.billingCycle !== "Monthly").map((x) => `${x.s.alias} (${x.s.billingCycle.toLowerCase()})`);
  const term = (k, v, sub, style = "") => `<div style="flex:1;min-width:0;border-radius:20px;padding:${ph ? "14px" : "18px 20px"};display:flex;flex-direction:column;gap:4px;${style}"><span style="font-size:12px;font-weight:700;color:var(--muted)">${k}</span><span style="font-size:${ph ? 26 : 34}px;font-weight:800;line-height:1.1">${v}</span><span style="font-size:12px;font-weight:600;color:var(--muted)">${sub}</span></div>`;
  const op = (x) => `<span style="font-size:${ph ? 22 : 34}px;font-weight:800;color:var(--muted);align-self:center">${x}</span>`;
  const days = Array.from({ length: 31 }, (_, i) => `${nowKey}-${String(i + 1).padStart(2, "0")}`);
  const strip = `<div style="position:relative;height:30px;margin-top:4px"><span style="position:absolute;left:0;right:0;top:14px;height:2px;background:var(--divider)"></span><span style="position:absolute;left:0;width:${(19 / 30) * 100}%;top:14px;height:2px;background:var(--accent)"></span>${days.map((d, i) => { const p = paysNow.find((x) => x.date === d); const c = comeNow.find((x) => x.date === d); const x = (i / 30) * 100; if (d === L.TODAY) return `<span style="position:absolute;left:${x}%;top:6px;transform:translateX(-50%);width:18px;height:18px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px var(--accent-ring)"></span>`; if (p || c) { const s = (p ? L.sub(p.subId) : c.s); return `<span title="${s.alias}" style="position:absolute;left:${x}%;top:3px;transform:translateX(-50%);display:flex;border-radius:9px;${p ? "" : "opacity:0.55;"}">${mono(s, 24)}</span>`; } return ""; }).join("")}</div><div class="between" style="font-size:11px;font-weight:700;color:var(--muted)"><span>Oct 1</span><span style="color:var(--accent-text)">Today</span><span>Oct 31</span></div>`;
  return `<section class="card glass" style="gap:14px"><div class="between"><span class="eyebrow">October so far</span><span class="card-note">${paysNow.length} paid, ${comeNow.length} still to renew</span></div>
    <div style="display:flex;gap:${ph ? 8 : 14}px;align-items:stretch;flex-wrap:${ph ? "wrap" : "nowrap"}">
      ${term("Paid", inr(paidNow), `${paysNow.length} payments`, "background:var(--accent-tint)")}${op("+")}
      ${term("To come", inr(toCome), `${comeNow.length} renewals left`, "border:1.5px dashed var(--fill-strong)")}${op("=")}
      <div class="textured" style="flex:1.2;min-width:${ph ? "100%" : 0};border-radius:20px;padding:${ph ? "14px" : "18px 20px"};display:flex;flex-direction:column;gap:4px;background:var(--feature-tile);border:1px solid var(--feature-tile-line)">${rings(360, 120, { opacity: 0.12, sheen: "radial-gradient(circle at 85% 0%, var(--feature-tile-glow), transparent 55%)" })}<span style="font-size:12px;font-weight:700;color:oklch(0.38 0.06 152)">October</span><span style="font-size:${ph ? 30 : 40}px;font-weight:800;line-height:1.05">${inr(paidNow + toCome)}</span><span style="font-size:12px;font-weight:700;color:oklch(0.38 0.06 152)">${inr(paidNow + toCome - L.MONTHLY)} more than a usual month</span></div>
    </div>
    ${ph ? "" : strip}
    <p class="card-note">A usual month is ${inr(L.MONTHLY)}. October is bigger because ${[...new Set(lumps)].join(" and ")} renew in it.</p></section>`;
}
export function lDesktop() {
  return page("l", equation(), `${two(CORE.costMapCard("l", { w: 704, h: 520 }), CORE.stack(CORE.paymentsCard("l"), P.chargedToCard()))}${P.renewalsPanel({ n: 8, cols: 2 })}`);
}
export function lPhone() {
  return phone({ h: "auto", body: `${CORE.greeting({ phone: true })}${equation({ ph: true })}${CORE.phoneMap()}${CORE.phonePayments()}` });
}

// ================= M · A departure board of what's next =================
const flap = (d, late = false) => `<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:24px;height:34px;border-radius:6px;background:linear-gradient(oklch(0.27 0.01 260) 50%, oklch(0.23 0.01 260) 50%);color:${late ? "oklch(0.85 0.14 80)" : "var(--on-ink)"};font-size:20px;font-weight:800;box-shadow:inset 0 1px 0 oklch(1 0 0 / 0.08)">${d}<span style="position:absolute;left:0;right:0;top:50%;height:1px;background:oklch(0 0 0 / 0.5)"></span></span>`;
function board({ ph = false } = {}) {
  const miss = L.SUBS.flatMap((s) => L.unrecorded(s).map((d) => ({ s, date: d, amount: L.priceOn(s, d), kind: "late" })));
  const next = L.renewalRows(L.TODAY, L.addDays(L.TODAY, 30)).reverse().map((r) => ({ s: r.s, date: r.date, amount: r.plan, kind: r.status === "wont" ? "wont" : "up" }));
  const rows = [...miss, ...next].slice(0, ph ? 5 : 7);
  const st = (r) => { const n = L.daysBetween(L.TODAY, r.date); if (r.kind === "late") return ["Not recorded", "oklch(0.85 0.14 80)"]; if (r.kind === "wont") return ["Won't renew", "oklch(1 0 0 / 0.45)"]; if (n <= 3) return ["Due soon", "oklch(0.78 0.15 30)"]; return ["On time", "oklch(0.85 0.15 145)"]; };
  const cols = ph ? "62px minmax(0,1fr) 70px" : "92px minmax(0,1.4fr) 140px 110px minmax(0,1fr) 150px";
  const head = ph ? "" : `<div style="display:grid;grid-template-columns:${cols};gap:14px;padding:0 4px 10px;border-bottom:1px solid oklch(1 0 0 / 0.1);font-size:10px;font-weight:800;letter-spacing:0.08em;color:oklch(1 0 0 / 0.5)"><span>IN</span><span>SUBSCRIPTION</span><span>DATE</span><span style="text-align:right">AMOUNT</span><span>CHARGED TO</span><span style="text-align:right">STATUS</span></div>`;
  const body = rows.map((r) => {
    const n = L.daysBetween(L.TODAY, r.date);
    const digits = String(Math.abs(n)).padStart(2, "0");
    const [label, color] = st(r);
    return `<div style="display:grid;grid-template-columns:${cols};gap:14px;align-items:center;padding:10px 4px;border-bottom:1px solid oklch(1 0 0 / 0.07);${r.kind === "wont" ? "opacity:0.6;" : ""}">
      <span class="row" style="gap:3px">${digits.split("").map((d) => flap(d, r.kind === "late")).join("")}${ph ? "" : `<span style="font-size:10px;font-weight:800;color:oklch(1 0 0 / 0.5);margin-left:4px">${r.kind === "late" ? "AGO" : "DAYS"}</span>`}</span>
      <span class="row" style="gap:10px;min-width:0">${mono(r.s, ph ? 26 : 30)}<span style="min-width:0"><b style="display:block;font-size:${ph ? 13 : 14}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis${r.kind === "wont" ? ";text-decoration:line-through" : ""}">${r.s.alias}</b>${ph ? `<span style="font-size:11px;font-weight:700;color:${color}">${label}</span>` : `<span style="font-size:11px;font-weight:600;color:oklch(1 0 0 / 0.5)">${r.s.category} · ${r.s.billingCycle}</span>`}</span></span>
      ${ph ? `<b style="text-align:right;font-size:14px">${inr(r.amount)}</b>` : `<span style="font-size:13px;font-weight:700;letter-spacing:0.02em">${L.dow(r.date).toUpperCase()} ${Number(r.date.slice(8))} ${L.monName(r.date.slice(0, 7)).toUpperCase()}</span><b style="text-align:right;font-size:15px">${inr(r.amount)}</b><span style="font-size:12px;font-weight:600;color:oklch(1 0 0 / 0.7)">${L.viaName(r.s.via)}</span><span style="text-align:right;font-size:11px;font-weight:800;letter-spacing:0.08em;color:${color}">${label.toUpperCase()}${n <= 3 && r.kind === "up" ? ' <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:currentColor;animation:due-pulse 2.2s ease-in-out infinite;vertical-align:1px"></span>' : ""}</span>`}
    </div>`;
  }).join("");
  const soon = L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 30));
  return `<section class="textured" style="border-radius:26px;padding:${ph ? "16px" : "22px 26px"};background:linear-gradient(160deg,oklch(0.2 0.01 260),var(--ink));color:var(--on-ink);box-shadow:var(--card-shadow);display:flex;flex-direction:column;gap:12px">${rings(1400, 420, { stroke: "var(--rings-light)", opacity: 0.04, first: 60, step: 34 })}
    <div class="between" style="flex-wrap:wrap"><span class="row" style="gap:10px"><b style="font-size:${ph ? 16 : 18}px;letter-spacing:0.02em">Up next</b><span style="font-size:12px;font-weight:600;color:oklch(1 0 0 / 0.55)">${fmtDow(L.TODAY)}</span></span><span style="font-size:12px;font-weight:700;color:oklch(1 0 0 / 0.7)">${soon.length} in the next 30 days · <b style="color:var(--on-ink)">${inr(soon.reduce((t, r) => t + r.amount, 0))}</b></span></div>
    <div>${head}${body}</div>
    <div class="between"><span style="font-size:11px;font-weight:600;color:oklch(1 0 0 / 0.5)">Days count from today. A renewal with no payment stays on the board until it's recorded.</span><span class="link" style="color:var(--on-card-lime)">All renewals ${I.arrowR()}</span></div></section>`;
}
export function mDesktop() {
  return page("m", board(), `${two(CORE.costMapCard("m", { w: 704, h: 520 }), CORE.stack(CORE.paymentsCard("m"), P.priceChangesCard()))}`);
}
export function mPhone() {
  return phone({ h: "auto", body: `${CORE.greeting({ phone: true })}${board({ ph: true })}${CORE.phoneMap()}${CORE.phonePayments()}` });
}

// ================= N · Category rings =================
export function catRings({ size = 330, stroke = 12, gap = 5 } = {}) {
  const cats = L.byCategory();
  const c = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Each category's share of what you pay">${cats.map((k, i) => {
    const r = c - stroke / 2 - i * (stroke + gap);
    const circ = 2 * Math.PI * r;
    const frac = k.v / L.MONTHLY;
    return `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--fill)" stroke-width="${stroke}"></circle><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--card-${k.color})" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${Math.max(circ * frac, 2)} ${circ}" transform="rotate(-90 ${c} ${c})"></circle>`;
  }).join("")}<text x="${c}" y="${c + 2}" text-anchor="middle" font-size="${size / 14}" font-weight="800" fill="var(--fg)">${inr(L.MONTHLY)}</text><text x="${c}" y="${c + size / 14}" text-anchor="middle" font-size="${size / 30}" font-weight="700" fill="var(--muted)">a month</text></svg>`;
}
function ringsHero({ ph = false } = {}) {
  const cats = L.byCategory();
  const [a, b] = cats;
  return `<section class="card glass textured" style="flex-direction:${ph ? "column" : "row"};align-items:center;gap:${ph ? 14 : 36}px;padding:${ph ? "18px" : "26px 30px"}">${rings(1400, 380, { opacity: 0.05, first: 80, step: 36 })}
    <div style="flex-shrink:0">${catRings({ size: ph ? 280 : 330, stroke: ph ? 11 : 12 })}</div>
    <div class="grow" style="display:flex;flex-direction:column;gap:14px;width:100%">
      <div><span class="eyebrow">Where it goes</span><h2 style="font-size:${ph ? 20 : 26}px;font-weight:800;line-height:1.25;margin-top:6px;text-wrap:balance">${a.name} and ${b.name} are ${L.pct(a.v + b.v, L.MONTHLY)} of what you pay.</h2></div>
      <div style="display:grid;grid-template-columns:${ph ? "1fr" : "1fr 1fr"};gap:8px 28px">${cats.map((k) => `<div class="row" style="gap:10px;padding:7px 0;border-bottom:1px solid var(--divider);font-size:13px"><i style="width:12px;height:12px;border-radius:4px;background:var(--card-${k.color});flex-shrink:0"></i><b class="grow">${k.name}<span class="muted" style="font-weight:600;font-size:12px"> · ${k.subs.map((s) => s.alias).join(", ")}</span></b><b class="num">${inr(k.v)}</b><span class="muted" style="width:34px;text-align:right;font-weight:700;font-size:12px">${L.pct(k.v, L.MONTHLY)}</span></div>`).join("")}</div>
      <div class="row" style="gap:10px">${seg([{ label: "A month", on: true }, { label: "A year" }])}<span class="card-note">Each ring is one category's share of ${inr(L.MONTHLY)}.</span></div>
    </div></section>`;
}
export function nDesktop() {
  return page("n", ringsHero(), `${CORE.costMapCard("n", { w: 1368, h: 420, minH: 420 })}${two(CORE.paymentsCard("n"), P.renewalsPanel({ n: 6 }), "1.35fr 1fr")}`);
}
export function nPhone() {
  return phone({ h: "auto", body: `${CORE.greeting({ phone: true })}${ringsHero({ ph: true })}${CORE.phoneMap()}${CORE.phonePayments()}` });
}

// ================= O · Two years on one chart =================
function twoYearChart({ w = 1360, h = 230, ph = false } = {}) {
  const past = L.monthsFrom(L.monthKey(L.addMonthsUTC(`${nowKey}-01`, -11)), 12);
  const fut = L.monthsFrom(L.monthKey(L.addMonthsUTC(`${nowKey}-01`, 1)), 12);
  const pv = past.map((k) => (k === nowKey ? paidNow + toCome : L.paidByMonth(k))), fv = fut.map(L.expectedByMonth);
  const all = [...pv, ...fv], max = Math.ceil(Math.max(...all) / 2000) * 2000;
  const n = all.length, X = (i) => 20 + (i / (n - 1)) * (w - 40), Y = (v) => h - 34 - (v / max) * (h - 64);
  const line = (vals, off) => vals.map((v, i) => `${i ? "L" : "M"}${X(i + off).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const pastPath = line(pv, 0), futPath = `M${X(11)},${Y(pv[11])} ` + line(fv, 12).slice(1).replace(/^/, "L");
  const area = `${pastPath} L${X(11)},${h - 34} L${X(0)},${h - 34} Z`;
  const peaks = [pv.indexOf(Math.max(...pv)), 12 + fv.indexOf(Math.max(...fv))];
  const lump = (k) => L.renewalsBetween(`${k}-01`, `${k}-31`, L.SUBS).concat(L.PAYMENTS.filter((p) => p.date.startsWith(k)).map((p) => ({ s: L.sub(p.subId), amount: p.amount }))).filter((x) => x.s.billingCycle === "Yearly").sort((a, b) => b.amount - a.amount)[0];
  const keys = [...past, ...fut];
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="display:block;overflow:visible" aria-label="What you paid each month, and what's expected">
    <line x1="0" x2="${w}" y1="${Y(L.MONTHLY)}" y2="${Y(L.MONTHLY)}" stroke="var(--accent-text)" stroke-dasharray="4 5" stroke-opacity="0.5"></line>
    <path d="${area}" fill="oklch(0.42 0.1 152 / 0.12)"></path><path d="${pastPath}" fill="none" stroke="var(--accent-text)" stroke-width="2.5" stroke-linejoin="round"></path><path d="${futPath}" fill="none" stroke="var(--accent-text)" stroke-width="2" stroke-dasharray="5 5" stroke-opacity="0.7"></path>
    <line x1="${X(11)}" x2="${X(11)}" y1="10" y2="${h - 34}" stroke="var(--accent)" stroke-width="2"></line><text x="${X(11) + 6}" y="20" font-size="11" font-weight="800" fill="var(--accent-text)">Today</text>
    ${all.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="${i === 11 ? 5 : 3}" fill="${i <= 11 ? "var(--accent-text)" : "var(--surface)"}" stroke="var(--accent-text)" stroke-width="1.5"></circle>`).join("")}
    ${peaks.map((i) => { const k = keys[i]; const l = lump(k); return `<text x="${X(i)}" y="${Y(all[i]) - 12}" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--fg)">${inrK(all[i])}</text>${l && !ph ? `<text x="${X(i)}" y="${Y(all[i]) - 26}" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--muted)">${l.s.alias}</text>` : ""}`; }).join("")}
    ${keys.map((k, i) => (i % (ph ? 4 : 2) === 0 || i === 11 ? `<text x="${X(i)}" y="${h - 12}" text-anchor="middle" font-size="${ph ? 9.5 : 11}" font-weight="${i === 11 ? 800 : 600}" fill="${i === 11 ? "var(--fg)" : "var(--muted)"}">${L.monName(k)}${k.endsWith("-01") ? ` ’${k.slice(2, 4)}` : ""}</text>` : "")).join("")}
  </svg>`;
}
function chartHero({ ph = false } = {}) {
  const pastSum = L.monthsFrom(L.monthKey(L.addMonthsUTC(`${nowKey}-01`, -11)), 12).reduce((t, k) => t + L.paidByMonth(k), 0);
  const stat = (k, v, s) => `<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;font-weight:700;color:oklch(0.38 0.06 152)">${k}</span><b style="font-size:${ph ? 20 : 26}px;font-weight:800">${v}</b><span style="font-size:11px;font-weight:600;color:oklch(0.38 0.06 152)">${s}</span></div>`;
  return `<section class="textured" style="border-radius:26px;padding:${ph ? "16px" : "22px 26px 14px"};background:var(--feature-tile);border:1px solid var(--feature-tile-line);display:flex;flex-direction:column;gap:12px">${rings(1400, 380, { opacity: 0.08, first: 60, step: 32, sheen: "radial-gradient(circle at 85% 0%, var(--feature-tile-glow), transparent 55%)" })}
    <div style="display:flex;gap:${ph ? 16 : 40}px;flex-wrap:wrap;align-items:flex-end">${stat("A usual month", inr(L.MONTHLY), "the dashed line")}${stat("Last 12 months", inr(pastSum), "paid")}${stat("Next 12 months", inr(L.YEARLY), "expected, at today's prices")}</div>
    <div style="background:oklch(1 0 0 / 0.55);border-radius:18px;padding:${ph ? "8px 6px 4px" : "12px 14px 4px"}">${twoYearChart({ w: ph ? 320 : 1340, h: ph ? 160 : 220, ph })}</div></section>`;
}
export function oDesktop() {
  return page("o", chartHero(), `${two(CORE.stack(CORE.paymentsCard("o"), P.priceChangesCard()), CORE.costMapCard("o", { w: 704, h: 520 }), "1fr 1.15fr")}${P.renewalsPanel({ n: 8, cols: 2 })}`);
}
export function oPhone() {
  return phone({ h: "auto", body: `${CORE.greeting({ phone: true })}${chartHero({ ph: true })}${CORE.phoneMap()}${CORE.phonePayments()}` });
}

// ================= P · The year as a dial =================
const yearLeft = L.renewalsBetween(L.TODAY, "2026-12-31");
const leftSum = yearLeft.reduce((t, r) => t + r.amount, 0);
const yearTotal = L.yearPaid(2026) + leftSum;
function dial({ size = 440, ph = false } = {}) {
  const cx = size / 2, cy = size * 0.55, r = size * 0.4, sw = size * 0.07;
  const pt = (f, rr = r) => [cx - rr * Math.cos(Math.PI * f), cy - rr * Math.sin(Math.PI * f)];
  const arc = (f0, f1, rr = r) => { const [x0, y0] = pt(f0, rr), [x1, y1] = pt(f1, rr); return `M${x0.toFixed(1)},${y0.toFixed(1)} A${rr},${rr} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`; };
  const paidF = L.yearPaid(2026) / yearTotal;
  const dayF = (L.daysBetween("2026-01-01", L.TODAY) + 1) / 365;
  const [tx, ty] = pt(dayF, r + sw * 0.9), [tx0, ty0] = pt(dayF, r - sw * 0.9);
  const ticks = Array.from({ length: 12 }, (_, i) => { const f = i / 12 + 1 / 24; const [lx, ly] = pt(f, r + sw * 1.45); return `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" font-size="${size / 38}" font-weight="700" fill="var(--muted)">${"JFMAMJJASOND"[i]}</text>`; }).join("");
  const seps = Array.from({ length: 11 }, (_, i) => { const [a, b] = [pt((i + 1) / 12, r - sw / 2), pt((i + 1) / 12, r + sw / 2)]; return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="var(--surface)" stroke-width="2"></line>`; }).join("");
  return `<svg viewBox="0 0 ${size} ${size * 0.62}" width="${size}" height="${size * 0.62}" style="max-width:100%;display:block" aria-label="Paid so far this year, against the whole year">
    <path d="${arc(0, 1)}" fill="none" stroke="var(--fill-strong)" stroke-width="${sw}" stroke-linecap="butt"></path>
    <path d="${arc(0, paidF)}" fill="none" stroke="var(--accent)" stroke-width="${sw}"></path>${seps}${ticks}
    <line x1="${tx0}" y1="${ty0}" x2="${tx}" y2="${ty}" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"></line><text x="${tx}" y="${ty - 8}" text-anchor="middle" font-size="${size / 36}" font-weight="800" fill="var(--fg)">Today</text>
    <text x="${cx}" y="${cy - size * 0.07}" text-anchor="middle" font-size="${size / 11}" font-weight="800" fill="var(--fg)">${inr(L.yearPaid(2026))}</text>
    <text x="${cx}" y="${cy - size * 0.015}" text-anchor="middle" font-size="${size / 30}" font-weight="700" fill="var(--muted)">paid of ${inr(yearTotal)} this year</text></svg>`;
}
function dialHero({ ph = false } = {}) {
  const big = yearLeft.filter((r) => r.s.billingCycle !== "Monthly").sort((a, b) => (a.date < b.date ? -1 : 1));
  const monthly = yearLeft.filter((r) => r.s.billingCycle === "Monthly");
  return `<section class="card glass" style="flex-direction:${ph ? "column" : "row"};gap:${ph ? 10 : 30}px;align-items:center;padding:${ph ? "16px" : "22px 30px"}">
    <div style="flex-shrink:0">${dial({ size: ph ? 320 : 440 })}</div>
    <div class="grow" style="display:flex;flex-direction:column;gap:12px;width:100%">
      <div><span class="eyebrow">2026 so far</span><h2 style="font-size:${ph ? 20 : 26}px;font-weight:800;line-height:1.25;margin-top:6px;text-wrap:balance">${L.pct(L.yearPaid(2026), yearTotal)} of the year is paid; ${inr(leftSum)} is left.</h2><p class="card-note" style="margin-top:4px">The dial runs ahead of today because Microsoft 365 renewed in March, early in the year.</p></div>
      <div class="textured" style="border-radius:16px;padding:12px 14px;background:var(--feature-tile);border:1px solid var(--feature-tile-line);display:flex;flex-direction:column;gap:8px">${rings(600, 160, { opacity: 0.1 })}<span style="font-size:12px;font-weight:700;color:oklch(0.38 0.06 152)">Left this year</span>${big.map((r) => `<div class="row" style="gap:10px;font-size:13px">${mono(r.s, 24)}<b class="grow">${r.s.alias}<span class="muted" style="font-weight:600;font-size:12px"> · ${r.s.billingCycle.toLowerCase()}</span></b><span class="muted" style="font-weight:600">${fmt(r.date)}</span><b class="num" style="width:62px;text-align:right">${inr(r.amount)}</b></div>`).join("")}<div class="row" style="gap:10px;font-size:13px"><span style="width:24px;height:24px;border-radius:8px;background:oklch(1 0 0 / 0.7);display:flex;align-items:center;justify-content:center">${I.subs(11)}</span><b class="grow">${monthly.length} monthly renewals</b><b class="num" style="width:62px;text-align:right">${inr(monthly.reduce((t, r) => t + r.amount, 0))}</b></div></div>
      <span class="link">View all renewals ${I.arrowR()}</span>
    </div></section>`;
}
export function pDesktop() {
  return page("p", dialHero(), `${two(CORE.costMapCard("p", { w: 704, h: 520 }), CORE.stack(CORE.paymentsCard("p"), P.chargedToCard()))}`);
}
export function pPhone() {
  return phone({ h: "auto", body: `${CORE.greeting({ phone: true })}${dialHero({ ph: true })}${CORE.phoneMap()}${CORE.phonePayments()}` });
}

export { equation, board, ringsHero, chartHero, dialHero, yearTotal, leftSum };
