// Directions E–I, each with its own idea rather than the Cards tiles or the Subscriptions cover flow:
// E Reservoir, F Passbook, G Instrument cluster, H Tree rings, I Bubbles. The shell and the greeting stay shared.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as U from "./uniq.mjs";
const { inr, signed, inrS, fmt, fmtY, monName, monYear, I, btn, iconBtn, rings, grad, mono, desktop, phone, ringCircles } = L;
const { IDS, FACTS, ORDER, panes } = P;

const two = (a, b, ratio = "1fr 1fr") => `<div style="display:grid;grid-template-columns:${ratio.split(" ").map((x) => `minmax(0,${x})`).join(" ")};gap:20px;align-items:stretch">${a}${b}</div>`;
const card = (inner, style = "") => `<section class="card glass" style="${style}">${inner}</section>`;
const head = (title, sub = "", right = "") => `<div class="card-h"><span class="card-t">${title}${sub ? `<small>${sub}</small>` : ""}</span>${right}</div>`;
const t = (iso) => Date.parse(`${iso}T00:00:00Z`);
const record = (id) => (id === "all" ? Math.max(...L.HISTORY.map((k) => L.totalAtMonth(k))) : Math.max(...L.snapsOf(id).map((s) => s.balance)));
const recordAt = (id) => (id === "all" ? L.HISTORY.reduce((m, k) => (L.totalAtMonth(k) > L.totalAtMonth(m) ? k : m)) : L.monthKey(L.snapsOf(id).reduce((m, s) => (s.balance > m.balance ? s : m)).date));
const weekly = (from, id) => { const out = []; for (let d = from; d < L.TODAY; d = L.addDays(d, 7)) out.push(d); out.push(L.TODAY); return out.map((d) => ({ d, v: id === "all" ? L.totalOn(d) : L.balanceOn(id, d) ?? 0 })); };
const nice = (v) => { const steps = [10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000, 1000000]; const s = steps.find((x) => v / x <= 5) ?? 2000000; return Math.ceil(v / s) * s; };
/** The interval a pick's flows cover: since its last balance, or October so far for All. */
const interval = (f) => (f.all ? { ...L.monthFlows(L.monthKey(L.TODAY)), from: { date: "2026-09-30" } } : f.interval);
function groupedFlows(f) {
  const iv = interval(f);
  if (!iv) return { inn: [], out: [], iv };
  const by = (dir) => Object.entries(iv.list.filter((x) => L.KINDS[x.kind].dir === dir).reduce((m, x) => { const k = x.label; m[k] = m[k] ?? { label: k, v: 0, kind: x.kind, ref: x.ref }; m[k].v += x.amount; return m; }, {})).map(([, v]) => v);
  const inn = by("in"), out = by("out");
  if (iv.other > 0) inn.push({ label: "Not recorded", v: iv.other, other: true });
  if (iv.other < 0) out.push({ label: "Not recorded", v: -iv.other, other: true });
  return { inn, out, iv };
}
const flowColor = (x) => (x.other ? "repeating-linear-gradient(135deg, var(--muted) 0 3px, transparent 3px 6px)" : x.ref && L.CARDS[x.ref] ? `var(--card-${L.CARDS[x.ref].color})` : L.KINDS[x.kind].color);

// ================= E · Reservoir =================
// Each account is a tank filled to its balance, measured against its own record; All is the reservoir, layered by account.
function tankSvg(f, prefix, { w = 124, h = 290 } = {}) {
  const x0 = 6, x1 = w - 6, y0 = 22, y1 = h - 6, rx = Math.min(22, w / 5), inner = y1 - y0;
  const rec = record(f.id), cap = rec * 1.08;
  const Y = (v) => y1 - (v / cap) * inner;
  const id = `tk-${prefix}-${f.id}`;
  const wave = (yy, amp = 3, ph = 0) => { let d = `M${x0},${yy}`; for (let x = x0; x <= x1; x += 3) d += ` L${x},${(yy + amp * Math.sin(((x + ph) / 34) * Math.PI * 2)).toFixed(1)}`; return d; };
  let water = "";
  if (f.all) {
    let cum = 0;
    const layers = ["sbi", "icici", "hdfc", "kotak", "axis"].map((aid) => { const b = L.latest(aid).balance, a = L.acc(aid), lo = Y(cum), hi = Y(cum + b); cum += b; return `<rect x="${x0}" y="${hi.toFixed(1)}" width="${x1 - x0}" height="${(lo - hi).toFixed(1)}" fill="url(#g-${a.color})"></rect>`; }).join("");
    water = `${layers}<path d="${wave(Y(cum))}" fill="none" stroke="oklch(1 0 0 / 0.7)" stroke-width="2"></path>`;
  } else if (f.on && f.balance != null) {
    const yw = Y(f.balance);
    water = `<path d="${wave(yw, 3, f.id.length * 9)} L${x1},${y1} L${x0},${y1} Z" fill="url(#g-${f.color})" opacity="${f.stale ? 0.55 : 0.95}"></path><path d="${wave(yw, 3, f.id.length * 9)} L${x1},${y1} L${x0},${y1} Z" fill="url(#waves)" opacity="0.6"></path><path d="${wave(yw, 3, f.id.length * 9)}" fill="none" stroke="oklch(1 0 0 / 0.75)" stroke-width="1.6"></path>${f.stale ? `<rect x="${x0}" y="${yw - 6}" width="${x1 - x0}" height="16" fill="url(#hatch)"></rect>` : ""}${[0.3, 0.55, 0.78].map((p, i) => `<circle cx="${x0 + (x1 - x0) * p}" cy="${y1 - 14 - i * 19}" r="${2 + i}" fill="white" opacity="0.28"></circle>`).join("")}`;
  } else water = `<line x1="${x0 + 10}" x2="${x1 - 10}" y1="${y1 - 8}" y2="${y1 - 8}" stroke="var(--muted)" stroke-dasharray="4 4"></line><text x="${w / 2}" y="${y1 - 18}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--muted)">Dry since Mar 31</text>`;
  const marks = f.on ? (() => { const r = f.range, yh = Y(r.hi.v), yl = Y(r.lo.v); return `<line x1="${x0}" x2="${x1}" y1="${Y(rec)}" y2="${Y(rec)}" stroke="var(--negative)" stroke-opacity="0.55" stroke-dasharray="2 3"></line><line x1="${x0}" x2="${x0 + 8}" y1="${yh}" y2="${yh}" stroke="var(--fg)" stroke-opacity="0.5" stroke-width="1.5"></line><line x1="${x0}" x2="${x0 + 8}" y1="${yl}" y2="${yl}" stroke="var(--fg)" stroke-opacity="0.5" stroke-width="1.5"></line>`; })() : "";
  const ticks = [0.25, 0.5, 0.75].map((p) => `<line x1="${x1 - 7}" x2="${x1}" y1="${y1 - inner * p}" y2="${y1 - inner * p}" stroke="var(--fg)" stroke-opacity="0.18"></line>`).join("");
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block;overflow:visible" aria-hidden="true"><defs><clipPath id="${id}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${inner}" rx="${rx}"></rect></clipPath></defs>
    <rect x="${w / 2 - w * 0.18}" y="6" width="${w * 0.36}" height="10" rx="5" fill="var(--fill-strong)"></rect>
    <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${inner}" rx="${rx}" fill="oklch(0.97 0.012 220 / 0.6)"></rect>
    <g clip-path="url(#${id})">${water}${marks}</g>${ticks}
    <rect class="glass-line" x="${x0}" y="${y0}" width="${x1 - x0}" height="${inner}" rx="${rx}" fill="none" stroke="var(--fill-strong)" stroke-width="1.6"></rect>
    <line x1="${x0 + 8}" x2="${x0 + 8}" y1="${y0 + rx}" y2="${y1 - rx}" stroke="white" stroke-opacity="0.55" stroke-width="3" stroke-linecap="round"></line></svg>`;
}
const fullness = (f) => (f.balance == null ? "" : `${Math.round((f.balance / record(f.id)) * 100)}% of its record`);
function tankLabel(f) {
  return `<div style="display:flex;flex-direction:column;gap:2px;align-items:center;text-align:center;max-width:100%"><b style="font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${f.short}</b><b class="num" style="font-size:14px">${f.on ? inr(f.balance) : "₹0"}</b>${f.stale ? `<span class="pill pill-stale" style="padding:2px 8px;font-size:10px">${I.clock(9)} ${fmt(f.asOf)}</span>` : !f.on ? `<span class="pill pill-off" style="padding:2px 8px;font-size:10px">Closed</span>` : `<span class="sub2">${fullness(f)}</span>`}</div>`;
}
function reservoirCaption(f) {
  const rec = record(f.id), rk = recordAt(f.id);
  const rows = f.all
    ? [["Record", `${inr(rec)} · ${monYear(rk)}`], ["Low this year", `${inr(f.range.lo.v)} · ${monName(f.range.lo.k)}`], ["This month", signed(f.month.delta)], ["Up to date", `${f.fresh} of ${f.count}`]]
    : f.on ? [["Record", `${inr(rec)} · ${monYear(rk)}`], ["Low this year", `${inr(f.range.lo.v)} · ${monName(f.range.lo.k)}`], ["Since last time", `${signed(f.chg)} · ${fmt(f.prev.date)}`], ["Updated", f.stale ? `<span style="color:var(--warning-text)">${fmt(f.asOf)} · ${L.daysBetween(f.asOf, L.TODAY)} days ago</span>` : fmt(f.asOf)]]
      : [["Record", `${inr(rec)} · ${monYear(rk)}`], ["Opened", fmtY(f.opened)], ["Closed", fmtY(f.closedOn)], ["Balances", `${f.snaps} recorded`]];
  return `<div style="display:flex;flex-direction:column;gap:12px;height:100%"><span class="eyebrow">${f.all ? "The reservoir · everything" : `${L.purposeName(f.purpose)} · ${f.bank}`}</span><div><b style="display:block;font-size:20px;font-weight:800">${f.name}</b><b style="display:block;font-size:38px;font-weight:800;letter-spacing:-0.015em;line-height:1.15">${f.on ? inr(f.balance) : "₹0"}</b><span class="card-note" style="font-size:13px">${f.on ? `Filled to ${fullness(f)}` : `Closed ${fmtY(f.closedOn)}`}</span></div><div class="spread" style="gap:0">${rows.map(([k, v]) => `<div class="between" style="padding:9px 0;border-bottom:1px solid var(--divider);font-size:13px"><span class="muted" style="font-weight:600">${k}</span><b style="text-align:right">${v}</b></div>`).join("")}</div><div class="row foot" style="gap:8px;flex-wrap:wrap">${P.actions(f)}</div></div>`;
}
function tideChart(f, { w, h, ph }) {
  if (!f.on && !f.all) return `<p class="card-note" style="padding:50px 0;text-align:center">${f.name} has been dry since ${fmtY(f.closedOn)}.</p>`;
  const pts = weekly("2026-01-01", f.id), padL = ph ? 30 : 56, padR = ph ? 8 : 150, padT = 26, padB = 26;
  const vals = pts.map((p) => p.v), hi = Math.max(...vals), lo = Math.min(...vals), span = hi - lo || hi;
  const yMin = Math.max(0, lo - span * 0.8), yMax = hi + span * 0.25;
  const X = (d) => padL + ((t(d) - t("2026-01-01")) / (t(L.TODAY) - t("2026-01-01"))) * (w - padL - padR), Y = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * (h - padT - padB);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${X(p.d).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${X(L.TODAY)},${h - padB} L${padL},${h - padB} Z`, c = f.all ? "teal" : f.color;
  const iHi = vals.indexOf(hi), iLo = vals.indexOf(lo);
  const mark = (v, label, color) => `<line x1="${padL}" x2="${w - padR}" y1="${Y(v)}" y2="${Y(v)}" stroke="${color}" stroke-dasharray="5 5" stroke-opacity="0.7"></line>${ph ? "" : `<text x="${w - padR + 10}" y="${Y(v) + 4}" font-size="11" font-weight="800" fill="${color}">${label}</text><text x="${w - padR + 10}" y="${Y(v) + 18}" font-size="10.5" font-weight="700" fill="var(--muted)">${inr(v)}</text>`}`;
  const months = L.YEAR.map((k) => `<text class="axis-t" x="${X(`${k}-01`)}" y="${h - 6}" text-anchor="${k === L.YEAR[0] ? "start" : "middle"}">${ph && Number(k.slice(5)) % 3 !== 1 ? "" : monName(k)}</text>`).join("");
  const stale = f.stale ? `<rect x="${X(f.asOf)}" y="${padT}" width="${X(L.TODAY) - X(f.asOf)}" height="${h - padT - padB}" fill="url(#hatch)" opacity="0.5"></rect><text x="${(X(f.asOf) + X(L.TODAY)) / 2}" y="${padT + 14}" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--warning-text)">No reading since ${fmt(f.asOf)}</text>` : "";
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${f.name}: the level through the year"><path d="${area}" fill="url(#a-${c})"></path><path d="${area}" fill="url(#waves-ink)"></path><path d="${line}" fill="none" stroke="var(--card-${c})" stroke-width="2.6" stroke-linejoin="round"></path>${mark(hi, ph ? "" : `High tide · ${fmt(pts[iHi].d)}`, "var(--positive)")}${mark(lo, ph ? "" : `Low tide · ${fmt(pts[iLo].d)}`, "var(--negative)")}${stale}<circle cx="${X(L.TODAY)}" cy="${Y(vals.at(-1))}" r="5" fill="var(--card-${c})" stroke="var(--surface)" stroke-width="2"></circle>${months}</svg>`;
}
function pipes(f, { ph = false } = {}) {
  const { inn, out, iv } = groupedFlows(f);
  if (!iv) return `<p class="card-note">Nothing to show yet.</p>`;
  const max = Math.max(...inn.map((x) => x.v), ...out.map((x) => x.v), 1);
  const pipe = (x) => { const th = 6 + Math.round((x.v / max) * 18); return `<div style="display:flex;flex-direction:column;gap:5px"><div class="between" style="font-size:12.5px"><b style="font-weight:700">${x.label}${x.other ? ` <span class="muted" style="font-weight:600">UPI, transfers, cash</span>` : ""}</b><b class="num">${inr(x.v)}</b></div><div style="display:flex;align-items:center;gap:0"><span style="width:10px;height:${th + 8}px;border-radius:3px;background:var(--fill-strong);flex-shrink:0"></span><span style="flex:1;height:${th}px;border-radius:0 ${th}px ${th}px 0;background:${flowColor(x)};${x.other ? "border:1px dashed var(--muted)" : `box-shadow:inset 0 ${Math.ceil(th / 3)}px 0 oklch(1 0 0 / 0.22)`}"></span></div></div>`; };
  const col = (title, list, empty) => `<div style="display:flex;flex-direction:column;gap:12px;min-width:0"><span class="th">${title}</span>${list.length ? list.map(pipe).join("") : `<span class="card-note">${empty}</span>`}</div>`;
  return `<div style="display:grid;grid-template-columns:${ph ? "1fr" : "1fr 1fr"};gap:${ph ? 18 : 28}px;flex:1 1 auto">${col("Flowed in", inn, "Nothing recorded came in.")}${col("Flowed out", out, "Nothing recorded went out.")}</div><div class="between foot" style="padding-top:10px;border-top:1px solid var(--divider)"><span class="card-note">${f.all ? "October so far" : `Since ${fmt(iv.from.date)}`} · pipes are as thick as the flow</span>${L.derivedTag("Worked out")}</div>`;
}
const eSel = (dsel, id) => `${dsel} .tkw-${id} { transform: translateY(-8px); } ${dsel} .tkw-${id} .glass-line { stroke: var(--accent-text); stroke-width: 2.6; } ${dsel} .tkw-${id} .tk-cap { background: var(--ink); color: var(--on-ink); }`;
function reservoirHero(prefix, { ph = false } = {}) {
  const tanks = IDS.map((id) => { const f = FACTS[id], w = ph ? (f.all ? 110 : 84) : f.all ? 176 : f.on ? 124 : 96, h = ph ? 200 : 290; return `<label for="${prefix}-sel-${id}" class="tkw-${id}" style="display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;width:${w}px;transition:transform 260ms var(--ease-out)">${tankSvg(f, prefix, { w, h: f.on || f.all ? h : h * 0.75 })}${tankLabel(f)}</label>`; }).join("");
  const row = `<div style="display:flex;gap:${ph ? 12 : 20}px;align-items:flex-end;${ph ? "overflow-x:auto;margin:0 -16px;padding:10px 16px 4px;scrollbar-width:none" : "justify-content:space-between;padding-top:10px"}">${tanks}</div>`;
  const bg = "linear-gradient(180deg, color-mix(in srgb, var(--card-teal) 9%, var(--surface)), var(--surface) 70%)";
  if (ph) return `<section class="card glass" style="padding:16px;gap:14px;background:${bg}">${head("The reservoir", "")}${row}<div style="border-top:1px solid var(--divider);padding-top:14px">${panes((f) => reservoirCaption(f))}</div></section>`;
  return `<section class="card glass" style="gap:16px;background:${bg}">${head("The reservoir", "each tank is filled to its balance, against its own record · the red line is the record · All is layered by account", `<span class="legend"><span><i style="background:var(--negative);height:2px;border-radius:0;width:14px"></i>Record</span><span><i style="background:var(--fg);opacity:0.5;height:2px;width:8px;border-radius:0"></i>This year's high and low</span><span><i style="background:repeating-linear-gradient(135deg,var(--warning) 0 2px,var(--warning-tint) 2px 4px)"></i>Not read lately</span></span>`)}<div style="display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:28px;align-items:stretch">${row}<div style="border-left:1px solid var(--divider);padding-left:24px;display:flex;flex-direction:column">${panes((f) => reservoirCaption(f), {}, { flex: true })}</div></div></section>`;
}
export function eDesktop() {
  const pk = P.picker("e", eSel);
  const tide = card(`${head("The tide", "this year · the level week by week · high and low tide marked", P.panes((f) => `<span class="chip" style="gap:8px">${f.all ? L.allMono(18) : mono(f.a, 18)}${f.short}</span>`))}${panes((f) => tideChart(f, { w: 1368, h: 300 }))}`, "gap:12px");
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${reservoirHero("e")}${tide}${two(card(`${head("Pipes in and out", "worked out from income, card bills, subscriptions and EMIs")}${panes((f) => pipes(f), {}, { flex: true })}`), P.historyCard("e", { n: 7 }))}${pk.close}` });
}
export function ePhone() {
  const pk = P.picker("ep", eSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${reservoirHero("ep", { ph: true })}${card(`${head("The tide")}${panes((f) => tideChart(f, { w: 330, h: 190, ph: true }))}`, "padding:16px;gap:10px")}${card(`${head("Pipes in and out")}${panes((f) => pipes(f, { ph: true }), {}, { flex: true })}`, "padding:16px")}${pk.close}` });
}

// ================= F · Passbook =================
// An open passbook: accounts on the left page, the picked one's entries on the right, index tabs on the edge.
const MONO = "font-family:'JetBrains Mono',ui-monospace,monospace";
const pbDate = (iso) => `${String(Number(iso.slice(8))).padStart(2, "0")} ${monName(iso.slice(0, 7))} ${iso.slice(2, 4)}`;
const money = (n) => (n == null ? "" : Math.round(n).toLocaleString("en-IN"));
const stamp = (text, color, { rot = -9, style = "" } = {}) => `<span style="position:absolute;${style};transform:rotate(${rot}deg);padding:5px 10px;border:2px solid ${color};border-radius:8px;box-shadow:inset 0 0 0 2px var(--pb-page), inset 0 0 0 3.5px ${color};color:${color};font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;opacity:0.82;white-space:nowrap;${MONO};pointer-events:none">${text}</span>`;
const page = (inner, { side = "left", ph = false } = {}) => `<div class="on-paper" style="position:relative;isolation:isolate;min-width:0;padding:${ph ? "18px 16px" : "26px 30px"};background:var(--pb-page);background-image:repeating-linear-gradient(180deg, transparent 0 33px, oklch(0.6 0.05 170 / 0.14) 33px 34px);${side === "left" ? "border-radius:18px 4px 4px 18px;box-shadow:inset -18px 0 24px -18px oklch(0 0 0 / 0.18)" : side === "right" ? "border-radius:4px 18px 18px 4px;box-shadow:inset 18px 0 24px -18px oklch(0 0 0 / 0.18)" : "border-radius:16px"};display:flex;flex-direction:column;gap:12px">${rings(700, 560, { stroke: "oklch(0.5 0.08 170)", opacity: 0.07, first: 30, step: 14, dx: -350, dy: -120 })}${inner}</div>`;
export function leftPage(prefix, { ph = false } = {}) {
  const rows = ORDER.map((a) => { const f = FACTS[a.id]; return `<label for="${prefix}-sel-${a.id}" class="pbr pbr-${a.id}" style="position:relative;display:grid;grid-template-columns:1.5fr 0.9fr 1fr;gap:10px;align-items:center;padding:8px 8px;margin:0 -8px;border-radius:8px;cursor:pointer;min-height:34px"><span class="row" style="gap:9px;min-width:0">${mono(a, 22)}<b style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</b></span><span style="${MONO};font-size:12px;color:${f.stale ? "var(--warning-text)" : "var(--muted)"}">${pbDate(f.asOf)}</span><b style="${MONO};font-size:13px;text-align:right">${money(f.on ? f.balance : 0)}</b>${ph ? "" : f.stale ? stamp(`Stale · ${L.daysBetween(f.asOf, L.TODAY)} days`, "var(--warning-text)", { style: "right:96px;top:2px" }) : ""}${ph || f.on ? "" : stamp("Closed 31 Mar 26", "var(--muted)", { rot: -6, style: "right:96px;top:2px" })}</label>`; }).join("");
  return `<div class="between"><span style="${MONO};font-size:10.5px;font-weight:700;letter-spacing:0.08em;color:oklch(0.42 0.06 170);text-transform:uppercase">chaiCoffeeFund · Accounts held</span><span style="${MONO};font-size:10.5px;color:var(--muted)">Page 1</span></div>
    <div style="display:grid;grid-template-columns:1.5fr 0.9fr 1fr;gap:10px;padding-bottom:6px;border-bottom:1.5px solid oklch(0.42 0.06 170 / 0.4)"><span class="th">Account</span><span class="th">Last entry</span><span class="th" style="text-align:right">Balance ₹</span></div>
    <div style="display:flex;flex-direction:column;gap:0">${rows}</div>
    <label for="${prefix}-sel-all" class="pbr pbr-all" style="display:grid;grid-template-columns:1.5fr 0.9fr 1fr;gap:10px;align-items:center;padding:10px 8px;margin:0 -8px;border-radius:8px;cursor:pointer;border-top:1.5px solid oklch(0.42 0.06 170 / 0.4)"><b style="font-size:13px">All accounts</b><span style="${MONO};font-size:12px;color:var(--muted)">${L.ACTIVE.length} active</span><b style="${MONO};font-size:15px;text-align:right;border-bottom:3px double var(--fg);justify-self:end">${money(L.TOTAL)}</b></label>
    <p class="card-note foot" style="${MONO};font-size:11px">Pick an account to turn to its page. Stamped ones need you.</p>`;
}
export function rightPage(f, { ph = false } = {}) {
  const top = `<div class="between"><span style="${MONO};font-size:10.5px;font-weight:700;letter-spacing:0.08em;color:oklch(0.42 0.06 170);text-transform:uppercase">${f.all ? "Statement of balances" : `${f.name} · ${f.on ? f.type : "Closed"}`}</span><span style="${MONO};font-size:10.5px;color:var(--muted)">${f.all ? "Page 2" : `Page ${2 + ORDER.findIndex((a) => a.id === f.id)}`}</span></div>`;
  if (f.all) {
    const rows = ORDER.map((a) => { const x = FACTS[a.id], s = L.yearStart(a.id), e = x.on ? x.balance : 0; return `<div style="display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:10px;padding:8px 0;border-bottom:1px solid oklch(0.6 0.05 170 / 0.18);font-size:13px;${MONO}"><span style="font-family:inherit;font-weight:700;font-family:'Manrope',sans-serif">${a.name}</span><span style="text-align:right">${money(s)}</span><span style="text-align:right">${money(e)}</span><span style="text-align:right;color:${e - s >= 0 ? "var(--positive)" : "var(--negative)"}">${signed(e - s).replace("₹", "")}</span></div>`; }).join("");
    return `${top}<div style="display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:10px;padding-bottom:6px;border-bottom:1.5px solid oklch(0.42 0.06 170 / 0.4)"><span class="th">Account</span><span class="th" style="text-align:right">B/F 1 Jan</span><span class="th" style="text-align:right">C/F today</span><span class="th" style="text-align:right">Change</span></div>${rows}<div style="display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:10px;padding:10px 0;${MONO};font-size:14px;font-weight:800"><span style="font-family:'Manrope',sans-serif">Total</span><span style="text-align:right">${money(L.yearStart())}</span><span style="text-align:right;border-bottom:3px double var(--fg)">${money(L.TOTAL)}</span><span style="text-align:right;color:var(--positive)">${signed(L.sinceJan()).replace("₹", "")}</span></div>${(() => { const list = L.YEAR.flatMap((k) => L.monthFlows(k).list), other = L.YEAR.reduce((t, k) => t + L.monthFlows(k).other, 0); return `<div style="margin-top:6px;padding:12px 14px;border-radius:10px;background:oklch(1 0 0 / 0.55);display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;font-size:12.5px">${[["Came in, recorded", L.sumIn(list)], ["Card bills", L.sumKind(list, "card")], ["Loan EMIs", L.sumKind(list, "emi")], ["Shares bought", L.sumKind(list, "invest")], ["Subscriptions", L.sumKind(list, "sub")], ["Not recorded", other]].map(([k, v]) => `<div class="between"><span class="muted" style="font-weight:600">${k}</span><b style="${MONO}">${k === "Not recorded" ? signed(v).replace("₹", "") : money(v)}</b></div>`).join("")}</div><span class="card-note" style="${MONO};font-size:11px">This year, worked out from income, bills and trades.</span>`; })()}<p class="card-note foot" style="${MONO};font-size:11px">B/F is brought forward, C/F carried forward: the balance on 1 Jan and today, as recorded.</p>`;
  }
  const snaps = L.snapsOf(f.id), from = (snaps.at(-3) ?? snaps[0]).date;
  const e = U.entries(f.id, from, f.on ? L.TODAY : f.closedOn);
  const rows = e.rows.map((r) => { const fact = r.fact, other = r.kind === "other"; return `<div style="display:grid;grid-template-columns:${ph ? "64px 1fr 84px" : "78px 1.5fr 0.9fr 0.9fr 1fr"};gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid oklch(0.6 0.05 170 / 0.16);font-size:12.5px"><span style="${MONO};color:var(--muted);font-size:11.5px">${pbDate(r.date)}</span><span style="font-weight:${fact ? 800 : 600};${other ? "color:var(--muted);font-style:italic" : ""}">${r.text}${r.kind === "snap" ? ` <span style="${MONO};font-size:9.5px;font-weight:800;color:var(--positive);border:1.5px solid currentColor;border-radius:4px;padding:0 4px;margin-left:4px">CHECKED</span>` : ""}</span>${ph ? "" : `<span style="${MONO};text-align:right;color:var(--negative)">${money(r.wd)}</span><span style="${MONO};text-align:right;color:var(--positive)">${money(r.dep)}</span>`}<span style="${MONO};text-align:right;font-weight:${fact ? 800 : 500};${fact ? "" : "color:var(--muted);font-style:italic"}">${money(r.bal)}</span></div>`; }).join("");
  const tail = f.stale ? `<div style="position:relative;height:84px">${stamp(`Not updated since ${pbDate(f.asOf)}`, "var(--warning-text)", { rot: -4, style: "left:40px;top:16px;font-size:13px;padding:8px 14px" })}</div>` : !f.on ? `<div style="position:relative;height:84px">${stamp(`Account closed ${pbDate(f.closedOn)}`, "var(--muted)", { rot: -4, style: "left:40px;top:16px;font-size:13px;padding:8px 14px" })}</div>` : "";
  return `${top}<div style="display:grid;grid-template-columns:${ph ? "64px 1fr 84px" : "78px 1.5fr 0.9fr 0.9fr 1fr"};gap:8px;padding-bottom:6px;border-bottom:1.5px solid oklch(0.42 0.06 170 / 0.4)"><span class="th">Date</span><span class="th">Particulars</span>${ph ? "" : `<span class="th" style="text-align:right">Withdrawals</span><span class="th" style="text-align:right">Deposits</span>`}<span class="th" style="text-align:right">Balance</span></div><div>${rows}</div>${tail}<p class="card-note foot" style="${MONO};font-size:11px">Only the bold balances were recorded. The lines between are worked out from your income and bills; "not recorded" closes each gap.</p>`;
}
const fSel = (dsel, id) => `${dsel} .pbr-${id} { background: ${P.selTint(id, 20)}; box-shadow: inset 4px 0 0 var(--card-${P.hue(id)}); } ${dsel} .pbt-${id} { transform: translateX(8px); box-shadow: 0 0 0 3px oklch(0.16 0.05 160 / 0.6), 0 0 0 6px ${P.selSoft(id)}, var(--pop-shadow); }`;
function passbook(prefix, { ph = false } = {}) {
  const tabs = IDS.map((id) => { const f = FACTS[id]; return `<label for="${prefix}-sel-${id}" class="pbt-${id}" style="cursor:pointer;display:flex;align-items:center;justify-content:center;width:38px;height:${f.all ? 74 : 64}px;border-radius:0 10px 10px 0;background:${f.all ? grad("emerald") : grad(f.color)};color:var(--on-card);writing-mode:vertical-rl;font-size:10.5px;font-weight:800;letter-spacing:0.03em;transition:transform 220ms var(--ease-out);${f.on ? "" : "filter:grayscale(0.85);opacity:0.75"}">${f.all ? "All" : f.bank.split(" ")[0]}</label>`; }).join("");
  if (ph) return `<section class="card glass textured stage-dark" style="padding:14px;gap:12px;--pb-page:oklch(0.975 0.014 165);background:${P.GREEN_BG}">${head("Passbook", "")}<div style="display:flex;gap:8px;overflow-x:auto;margin:0 -14px;padding:0 14px 4px;scrollbar-width:none">${tabs.replace(/width:38px;height:(\d+)px;border-radius:0 10px 10px 0/g, "width:auto;height:32px;padding:0 12px;border-radius:10px").replace(/writing-mode:vertical-rl;/g, "")}</div>${page(panes((f) => rightPage(f, { ph: true }), {}, { flex: true }), { side: "single", ph: true })}${page(leftPage(prefix, { ph: true }), { side: "single", ph: true })}</section>`;
  return `<section class="card glass textured stage-dark" style="gap:16px;--pb-page:oklch(0.975 0.014 165);background:${P.GREEN_BG}">${rings(1400, 700, { stroke: "var(--rings-light)", opacity: 0.05, first: 60, step: 34 })}${head("Your passbook", "accounts on the left, the one you pick on the right · index tabs on the edge", `<span class="row" style="gap:8px">${btn("Update passbook", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}${btn("Open a new one", { kind: "soft", cls: "btn-sm", icon: I.plus(11) })}</span>`)}
    <div style="display:grid;grid-template-columns:minmax(0,0.92fr) minmax(0,1.08fr) 38px;gap:0;align-items:stretch;filter:drop-shadow(0 18px 30px oklch(0 0 0 / 0.12))">${page(leftPage(prefix))}${page(panes((f) => rightPage(f), {}, { flex: true }), { side: "right" })}<div style="display:flex;flex-direction:column;gap:6px;padding-top:28px">${tabs}</div></div></section>`;
}
export function printedTrend(f, { w, h, ph }) {
  const pts = (f.all ? L.YEAR.map((k) => ({ d: `${k}-15`, v: L.totalAtMonth(k), fact: true })) : L.snapsOf(f.id).filter((s) => s.date >= "2025-12-01").map((s) => ({ d: s.date, v: s.balance, fact: true })));
  if (pts.length < 2) return `<p class="card-note" style="padding:40px 0;text-align:center">Not enough entries to print a line.</p>`;
  const padL = ph ? 34 : 60, padR = 20, padT = 20, padB = 26, x0 = t("2026-01-01"), x1 = t(L.TODAY);
  const vals = pts.map((p) => p.v), hi = Math.max(...vals), lo = Math.min(...vals), span = hi - lo || hi;
  const yMin = Math.max(0, lo - span * 0.4), yMax = hi + span * 0.2;
  const X = (d) => padL + Math.max(0, (t(d) - x0) / (x1 - x0)) * (w - padL - padR), Y = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * (h - padT - padB);
  let d = `M${X(pts[0].d)},${Y(pts[0].v)}`; for (let i = 1; i < pts.length; i++) d += ` H${X(pts[i].d)} V${Y(pts[i].v)}`; d += ` H${X(L.TODAY)}`;
  const ink = f.all ? "oklch(0.35 0.08 170)" : `var(--card-${f.color}-from)`;
  const tstep = [5000, 10000, 20000, 25000, 50000, 100000, 200000].find((x) => (yMax - yMin) / x <= 4) ?? 500000, tv = []; for (let v = Math.ceil(yMin / tstep) * tstep; v <= yMax; v += tstep) tv.push(v);
  const grid = tv.map((v) => `<line x1="${padL}" x2="${w - padR}" y1="${Y(v)}" y2="${Y(v)}" stroke="oklch(0.6 0.05 170 / 0.3)" stroke-dasharray="1 4"></line><text x="${padL - 8}" y="${Y(v) + 4}" text-anchor="end" style="${MONO}" font-size="10" fill="var(--muted)">${money(v)}</text>`).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${f.name}: each balance as printed">${grid}<path d="${d}" fill="none" stroke="${ink}" stroke-width="2.2"></path>${pts.map((p) => `<rect x="${X(p.d) - 3.5}" y="${Y(p.v) - 3.5}" width="7" height="7" fill="var(--surface)" stroke="${ink}" stroke-width="1.8"></rect>`).join("")}${L.YEAR.map((k) => `<text x="${X(`${k}-01`)}" y="${h - 6}" text-anchor="middle" style="${MONO}" font-size="10" fill="var(--muted)">${ph && Number(k.slice(5)) % 3 !== 1 ? "" : monName(k).toUpperCase()}</text>`).join("")}</svg>`;
}
function quickEntry(prefix, { ph = false } = {}) {
  return card(`${head("Add an entry", "the quickest way in")}${panes((f) => (f.all ? `<div style="display:flex;flex-direction:column;gap:0;flex:1">${ORDER.filter((a) => L.isOn(a)).sort((x, y) => L.isStale(y) - L.isStale(x)).map((a) => { const x = FACTS[a.id]; return `<div class="between" style="padding:8px 0;border-bottom:1px solid var(--divider);font-size:13px"><span class="row" style="gap:8px">${mono(a, 22)}<b style="font-weight:700">${a.name}</b></span><span style="${MONO};font-size:11.5px;color:${x.stale ? "var(--warning-text)" : "var(--muted)"}">${x.stale ? "due · " : ""}${pbDate(x.asOf)}</span></div>`; }).join("")}</div><div class="foot" style="padding-top:10px">${btn("Update all balances", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}</div>` : !f.on ? `<p class="card-note" style="font-size:13px">${f.name} is closed. Reopen it to add entries.</p><div class="foot">${btn("Reopen", { kind: "soft", cls: "btn-sm", icon: I.play(10) })}</div>` : `<div style="display:flex;flex-direction:column;gap:10px;flex:1"><div class="row" style="gap:8px">${mono(f.a, 24)}<b>${f.name}</b></div><div style="display:grid;grid-template-columns:1fr 1.3fr;gap:8px"><span class="qinp ghost">${I.cal(12)} Today</span><span class="qinp focus"><span class="pre">₹</span><span style="${MONO}">${f.stale ? "6,61,400" : money(f.balance)}</span></span></div><span class="card-note">${f.stale ? "+₹3,400 since 09 Aug 26" : `Last entry ${pbDate(f.asOf)}`}</span><div class="row foot" style="gap:8px">${btn("Print entry", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}${btn("Edit account", { kind: "soft", cls: "btn-sm" })}</div></div>`), {}, { flex: true })}`, "gap:12px");
}
export function fDesktop() {
  const pk = P.picker("f", fSel);
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${passbook("f")}${two(quickEntry("f"), card(`${head("As printed", "each recorded balance, this year · a step until the next entry")}${panes((f) => printedTrend(f, { w: 920, h: 220 }))}`, "gap:10px"), "1fr 2.3fr")}${pk.close}` });
}
export function fPhone() {
  const pk = P.picker("fp", fSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${passbook("fp", { ph: true })}${quickEntry("fp", { ph: true })}${pk.close}` });
}

// ================= G · Instrument cluster =================
// The page as a dashboard in the literal sense: a balance speedometer, a change dial, a freshness gauge and warning lights.
const SWEEP = `<style>.hp .needle { animation: g-sweep 1100ms cubic-bezier(0.2, 0.8, 0.2, 1) both; } @keyframes g-sweep { from { transform: rotate(var(--from, -120deg)); } } @media (prefers-reduced-motion: reduce) { .hp .needle { animation: none; } }</style>`;
const withSweep = (svg, from) => svg.replace('class="needle" style="', `class="needle" style="--from:${from}deg;`);
function clusterPane(f, { w = 1372, h = 410, ph = false } = {}) {
  const pick = f.all ? "emerald" : f.color, soft = `color-mix(in oklch, var(--card-${pick}) 50%, white)`;
  const rec = record(f.id), scale = nice(rec * 1.1), bal = f.on ? f.balance ?? 0 : 0;
  const chg = f.all ? f.month.delta : f.chg ?? 0, crange = nice(Math.max(Math.abs(chg) * 1.6, 20000));
  const days = f.all ? null : f.asOf ? L.daysBetween(f.asOf, L.TODAY) : 0;
  const fresh = f.all ? f.fresh / f.count : f.on ? 1 - Math.min(days / L.STALE_DAYS, 1) : 0;
  const S = ph ? 0.3 : 1;
  const cx = [w * 0.2, w * 0.5, w * 0.8], cy = ph ? 120 : 220;
  const parts = [4, 5, 3, 2].find((n) => (scale / n) % (scale >= 500000 ? 50000 : 10000) === 0) ?? 4;
  const center = U.dial({ cx: cx[1], cy, r: ph ? 112 : 180, frac: bal / scale, color: soft, labels: ph ? [] : Array.from({ length: parts - 1 }, (_, i) => [(i + 1) / parts, inrS((scale * (i + 1)) / parts)]), width: ph ? 8 : 12, ticks: parts * 5 });
  const recA = -120 + 240 * (rec / scale), [rx0, ry0] = U.polar(cx[1], cy, (ph ? 112 : 180) - 2, recA), [rx1, ry1] = U.polar(cx[1], cy, (ph ? 112 : 180) - (ph ? 14 : 22), recA);
  const left = ph ? "" : U.dial({ cx: cx[0], cy: cy + 20, r: 130, frac: 0.5 + chg / (2 * crange), color: chg >= 0 ? "var(--on-card-lime)" : "oklch(0.75 0.13 30)", labels: [[0, `−${inrS(crange)}`], [0.5, "0"], [1, `+${inrS(crange)}`]], ticks: 10 });
  const right = ph ? "" : U.dial({ cx: cx[2], cy: cy + 20, r: 130, frac: fresh, a0: -120, a1: 120, color: fresh < 0.01 ? "var(--warning)" : "var(--on-card-lime)", labels: [[0, "E"], [0.5, "½"], [1, "F"]], ticks: 8 });
  const read = (x, y, big, small, size) => `<text x="${x}" y="${y}" text-anchor="middle" style="${MONO}" font-size="${size}" font-weight="800" fill="var(--on-card)">${big}</text><text x="${x}" y="${y + size * 0.85}" text-anchor="middle" font-size="${Math.max(10, size * 0.42)}" font-weight="700" fill="var(--on-card-muted)">${small}</text>`;
  const lights = [
    { on: f.all ? f.staleList.length > 0 : f.stale, icon: I.clock(16), label: f.all ? `${f.staleList.length} stale` : "Stale", color: "var(--warning)" },
    { on: !f.all && !f.on, icon: I.lock(16), label: "Closed", color: "oklch(0.8 0 0)" },
    { on: !f.all && f.on && f.prev && f.chg < -0.2 * f.prev.balance, icon: I.down(16), label: "Big drop", color: "oklch(0.7 0.18 28)" },
    { on: true, icon: I.link(16), label: "Worked out", color: "oklch(0.75 0.1 245)" },
  ];
  const lightsHtml = `<div style="position:absolute;left:50%;bottom:${ph ? 10 : 18}px;transform:translateX(-50%);display:flex;gap:${ph ? 8 : 14}px">${lights.map((l) => `<span title="${l.label}" style="display:flex;align-items:center;gap:6px;padding:${ph ? "4px 8px" : "5px 11px"};border-radius:999px;background:oklch(1 0 0 / 0.06);font-size:${ph ? 10 : 11}px;font-weight:800;color:${l.on ? l.color : "oklch(1 0 0 / 0.25)"};${l.on ? `box-shadow:0 0 14px color-mix(in oklch, ${l.color} 45%, transparent)` : ""}">${l.icon}${ph ? "" : l.label}</span>`).join("")}</div>`;
  const svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="display:block" role="img" aria-label="${f.name}: balance ${inr(bal)}">
    ${withSweep(center, -240 * Math.min(1, bal / scale))}<line x1="${rx0}" y1="${ry0}" x2="${rx1}" y2="${ry1}" stroke="oklch(0.7 0.18 28)" stroke-width="3"></line>
    ${read(cx[1], cy + (ph ? 52 : 82), f.on || f.all ? inr(bal) : "₹0", f.all ? "All accounts" : f.name, ph ? 22 : 34)}
    ${ph ? "" : `${withSweep(left, -240 * (0.5 + chg / (2 * crange)))}${read(cx[0], cy + 84, signed(chg), f.all ? "this month" : "since last time", 20)}<text x="${cx[0]}" y="${cy - 136}" text-anchor="middle" font-size="11" font-weight="800" letter-spacing="0.08em" fill="var(--on-card-faint)">CHANGE</text>
    ${withSweep(right, -240 * fresh)}${read(cx[2], cy + 84, f.all ? `${f.fresh}/${f.count}` : f.on ? `${days} d` : "—", f.all ? "up to date" : f.on ? "since the last reading" : "closed", 20)}<text x="${cx[2]}" y="${cy - 136}" text-anchor="middle" font-size="11" font-weight="800" letter-spacing="0.08em" fill="var(--on-card-faint)">FRESHNESS</text>
    <text x="${cx[1]}" y="${cy - (ph ? 0 : 196)}" text-anchor="middle" font-size="11" font-weight="800" letter-spacing="0.08em" fill="var(--on-card-faint)">BALANCE · RECORD ${inrS(rec)}</text>`}</svg>`;
  void S;
  return `<div style="position:relative">${svg}${lightsHtml}</div>`;
}
function miniGauge(prefix, a) {
  const f = FACTS[a.id], r = f.range, frac = f.on ? (f.balance - r.lo.v) / (r.hi.v - r.lo.v || 1) : 0;
  const g = U.dial({ cx: 70, cy: 64, r: 58, frac, a0: -90, a1: 90, color: `var(--card-${a.color})`, track: "var(--fill)", tickColor: "var(--muted)", needle: "var(--fg)", width: 8, ticks: 6 });
  return `<label for="${prefix}-sel-${a.id}" class="gm gm-${a.id}" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 10px 12px;border-radius:18px;background:var(--surface);border:1px solid var(--surface-line);box-shadow:var(--soft-shadow);transition:box-shadow 200ms${f.on ? "" : ";opacity:0.6"}"><svg viewBox="0 0 140 74" width="140" height="74" aria-hidden="true">${g}</svg><b style="font-size:12.5px;white-space:nowrap">${a.name}</b><b class="num" style="font-size:14px">${f.on ? inr(f.balance) : "Closed"}</b><span class="sub2">${f.on ? `low ${inrS(r.lo.v)} · high ${inrS(r.hi.v)}` : `closed ${fmt(f.closedOn)}`}</span>${f.stale ? `<span class="pill pill-stale" style="font-size:10px;padding:2px 8px">${I.clock(9)} ${L.daysBetween(f.asOf, L.TODAY)} days</span>` : ""}</label>`;
}
function tripComputer(f) {
  const iv = interval(f);
  const days = iv ? L.daysBetween(iv.from.date, f.all ? L.TODAY : iv.to.date) : 0;
  const outAll = iv ? iv.out + Math.max(-iv.other, 0) : 0;
  const lcd = (k, v) => `<div class="between" style="padding:8px 0;border-bottom:1px dashed oklch(0.42 0.08 150 / 0.25)"><span style="font-size:11px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:oklch(0.42 0.08 150)">${k}</span><b style="${MONO};font-size:16px;color:oklch(0.25 0.06 150)">${v}</b></div>`;
  if (!iv) return `<p class="card-note">Closed accounts have no trip.</p>`;
  return `<div style="border-radius:16px;padding:12px 16px;background:linear-gradient(180deg, oklch(0.9 0.05 140), oklch(0.86 0.06 140));box-shadow:inset 0 2px 6px oklch(0 0 0 / 0.12);flex:1 1 auto;display:flex;flex-direction:column;justify-content:space-between">${lcd("Trip", `${days} days`)}${lcd("In", inr(iv.in))}${lcd("Out to bills", inr(iv.out))}${lcd("Not recorded", signed(iv.other))}${lcd("Out a day", inr(outAll / Math.max(days, 1)))}</div><div class="between foot" style="padding-top:8px"><span class="card-note">${f.all ? "Since Sep 30" : `Since your last reading, ${fmt(iv.from.date)}`}</span>${L.derivedTag("Worked out")}</div>`;
}
function tachograph(f, { w, h, ph }) {
  const pts = weekly("2025-11-01", f.id), padL = ph ? 30 : 56, padR = 16, padT = 18, padB = 24;
  const vals = pts.map((p) => p.v), hi = Math.max(...vals), lo = Math.min(...vals), span = hi - lo || hi;
  const yMin = Math.max(0, lo - span * 0.3), yMax = hi + span * 0.15;
  const X = (d) => padL + ((t(d) - t("2025-11-01")) / (t(L.TODAY) - t("2025-11-01"))) * (w - padL - padR), Y = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * (h - padT - padB);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${X(p.d).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const ink = f.all ? "oklch(0.3 0.1 260)" : `var(--card-${f.color}-from)`;
  const snaps = (f.all ? [] : L.snapsOf(f.id).filter((s) => s.date >= "2025-11-01")).map((s) => `<line x1="${X(s.date)}" x2="${X(s.date)}" y1="${h - padB}" y2="${h - padB - 7}" stroke="${ink}" stroke-width="1.6"></line>`).join("");
  return `<div style="border-radius:14px;overflow:hidden;background:oklch(0.985 0.01 85);background-image:linear-gradient(oklch(0.55 0.12 25 / 0.08) 1px, transparent 1px),linear-gradient(90deg, oklch(0.55 0.12 25 / 0.08) 1px, transparent 1px),linear-gradient(oklch(0.55 0.12 25 / 0.16) 1px, transparent 1px),linear-gradient(90deg, oklch(0.55 0.12 25 / 0.16) 1px, transparent 1px);background-size:10px 10px,10px 10px,50px 50px,50px 50px"><svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${f.name}: the trace over 12 months">${[yMin, (yMin + yMax) / 2, yMax].map((v) => `<text x="${padL - 6}" y="${Y(v) + 4}" text-anchor="end" style="${MONO}" font-size="10" fill="oklch(0.5 0.1 25)">${inrS(v)}</text>`).join("")}<path d="${line}" fill="none" stroke="${ink}" stroke-width="2" stroke-linejoin="round"></path>${snaps}<circle cx="${X(L.TODAY)}" cy="${Y(vals.at(-1))}" r="4.5" fill="${ink}"></circle>${L.LAST12.map((k) => `<text x="${X(`${k}-01`)}" y="${h - 6}" text-anchor="middle" style="${MONO}" font-size="10" fill="oklch(0.5 0.1 25)">${ph && Number(k.slice(5)) % 3 !== 2 ? "" : monName(k).toUpperCase()}</text>`).join("")}</svg></div>`;
}
const gSel = (dsel, id) => `${dsel} .gm-${id} { box-shadow: 0 0 0 2.5px var(--surface), 0 0 0 5px var(--accent), var(--soft-shadow); }`;
function cluster(prefix, { ph = false } = {}) {
  return `<section class="card glass textured stage-dark" style="padding:${ph ? "10px 10px 14px" : "14px 22px 18px"};background:radial-gradient(ellipse at 50% 0%, oklch(0.32 0.03 260), oklch(0.15 0.01 260) 70%);gap:0;overflow:hidden">${rings(1400, 420, { stroke: "var(--rings-light)", opacity: 0.04, first: 60, step: 30 })}${panes((f) => clusterPane(f, { w: ph ? 330 : 1372, h: ph ? 230 : 410, ph }))}${ph ? "" : `<div class="row" style="justify-content:center;gap:10px;margin-top:4px"><label for="${prefix}-sel-all" class="btn btn-sm" style="background:oklch(1 0 0 / 0.12);color:var(--fg);cursor:pointer">${I.accounts(12)} All accounts</label>${btn("Update balances", { kind: "primary", cls: "btn-sm", icon: I.check(11), style: "background:var(--on-card-lime);color:var(--ink)" })}</div>`}</section>`;
}
export function gDesktop() {
  const pk = P.picker("g", gSel);
  const minis = `<div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px">${ORDER.map((a) => miniGauge("g", a)).join("")}</div>`;
  return desktop({ h: "auto", body: `${C.DEFS()}${SWEEP}${pk.css}${pk.open}${P.greeting()}${cluster("g")}${minis}${two(card(`${head("Trip computer", "money in and out since the last reading")}${panes(tripComputer, {}, { flex: true })}`), card(`${head("The trace", "12 months, week by week · ticks mark each balance you recorded")}${panes((f) => tachograph(f, { w: 860, h: 250 }))}`, "gap:12px"), "1fr 1.7fr")}${P.historyCard("g", { n: 4 })}${pk.close}` });
}
export function gPhone() {
  const pk = P.picker("gp", gSel);
  const minis = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${ORDER.map((a) => miniGauge("gp", a).replace('width="140" height="74"', 'width="120" height="64"')).join("")}</div>`;
  return phone({ h: "auto", body: `${C.DEFS()}${SWEEP}${pk.css}${pk.open}${P.greeting({ phone: true })}${cluster("gp", { ph: true })}${minis}${card(`${head("Trip computer")}${panes(tripComputer, {}, { flex: true })}`, "padding:16px")}${card(`${head("The trace")}${panes((f) => tachograph(f, { w: 330, h: 180, ph: true }))}`, "padding:16px;gap:10px")}${pk.close}` });
}

// ================= H · Tree rings =================
// A year of balances as rings round a core: each account a band, thickest where it held the most; the emergency fund is the heartwood.
const RSTACK = ["sbi", "icici", "hdfc", "kotak", "axis", "yes"];
function treeRings(prefix, { size = 640, ph = false } = {}) {
  const cx = size / 2, cy = size / 2, r0 = size * 0.14, rMax = size * 0.44;
  const dates = []; for (let d = "2025-10-22"; d < L.TODAY; d = L.addDays(d, 7)) dates.push(d); dates.push(L.TODAY);
  const N = dates.length - 1, ang = (i) => (i / N) * 360;
  const vals = RSTACK.map((id) => dates.map((d) => L.balanceOn(id, d) ?? 0));
  const cum = RSTACK.map((_, k) => dates.map((__, i) => vals.slice(0, k + 1).reduce((s, v) => s + v[i], 0)));
  const max = Math.max(...cum.at(-1)) * 1.04, R = (v) => r0 + (v / max) * (rMax - r0);
  const ring = (outer, inner) => { const o = outer.map((v, i) => U.polar(cx, cy, R(v), ang(i))), n = inner.map((v, i) => U.polar(cx, cy, R(v), ang(i))).reverse(); return `M${o.map((p) => p.map((x) => x.toFixed(1)).join(",")).join(" L")} L${n.map((p) => p.map((x) => x.toFixed(1)).join(",")).join(" L")} Z`; };
  const clipR = `rclip-${prefix}`;
  const bands = RSTACK.map((id, k) => `<path class="acm ac-${id}" d="${ring(cum[k], k ? cum[k - 1] : dates.map(() => 0))}" fill="color-mix(in srgb, var(--card-${L.acc(id).color}) 72%, white)" stroke="var(--card-${L.acc(id).color}-from)" stroke-opacity="0.55" stroke-width="1"></path>`).join("");
  const st = L.STALE[0], si = dates.findIndex((d) => d >= L.latest(st.id).date), k = RSTACK.indexOf(st.id);
  const ringPart = (outer, inner, from) => { const o = outer.slice(from).map((v, j) => U.polar(cx, cy, R(v), ang(from + j))), n = inner.slice(from).map((v, j) => U.polar(cx, cy, R(v), ang(from + j))).reverse(); return `M${o.map((p) => p.map((x) => x.toFixed(1)).join(",")).join(" L")} L${n.map((p) => p.map((x) => x.toFixed(1)).join(",")).join(" L")} Z`; };
  const stale = `<path class="acm ac-${st.id}" d="${ringPart(cum[k], k ? cum[k - 1] : dates.map(() => 0), si)}" fill="url(#hatch)" opacity="0.85"></path>`;
  const grid = [300000, 600000, 900000, 1200000].filter((v) => v < max).map((v) => `<circle cx="${cx}" cy="${cy}" r="${R(v)}" fill="none" stroke="var(--fg)" stroke-opacity="0.12" stroke-dasharray="2 4"></circle>${ph ? "" : `<text x="${cx + 4}" y="${cy - R(v) + 12}" font-size="10" font-weight="700" fill="var(--muted)">${inrS(v)}</text>`}`).join("");
  const months = L.LAST12.map((key) => { const i = dates.findIndex((d) => d >= `${key}-01`); if (i < 0) return ""; const a = ang(i), [x0, y0] = U.polar(cx, cy, r0, a), [x1, y1] = U.polar(cx, cy, rMax + 4, a), [lx, ly] = U.polar(cx, cy, rMax + (ph ? 12 : 20), a); return `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="var(--surface)" stroke-opacity="0.5"></line><text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="${ph ? 9 : 11}" font-weight="800" fill="${key === "2026-01" ? "var(--fg)" : "var(--muted)"}">${ph && Number(key.slice(5)) % 3 !== 1 ? "" : monName(key)}${key === "2026-01" && !ph ? " 26" : ""}</text>`; }).join("");
  const [tx, ty] = U.polar(cx, cy, rMax + 8, 0);
  const core = `<circle cx="${cx}" cy="${cy}" r="${r0 - 6}" fill="var(--surface)" stroke="var(--surface-line)"></circle>`;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block;overflow:visible;max-width:100%" role="img" aria-label="A year of balances as rings">${bands}${stale}${grid}${months}<line x1="${cx}" y1="${cy - r0}" x2="${tx}" y2="${ty - 6}" stroke="var(--fg)" stroke-width="1.5" stroke-dasharray="2 3"></line>${ph ? "" : `<text x="${tx + 6}" y="${ty - 10}" font-size="11" font-weight="800" fill="var(--fg)">Today</text>`}${core}</svg>`;
}
const ringCenter = (f, { ph = false } = {}) => `<div style="text-align:center"><span class="eyebrow" style="font-size:${ph ? 9 : 10.5}px">${f.all ? "All" : f.on ? L.purposeName(f.purpose) : "Closed"}</span><b style="display:block;font-size:${ph ? 15 : 22}px;font-weight:800;letter-spacing:-0.01em">${f.on ? inrS(f.balance) : "₹0"}</b>${ph ? "" : `<span class="sub2" style="white-space:normal">${f.all ? `${signed(f.sinceJan)} this year` : f.on ? signed(f.sinceJan) + " this year" : `since ${fmt(f.closedOn)}`}</span>`}</div>`;
function ringsLegend(prefix) {
  return IDS.map((id) => { const f = FACTS[id]; const share = f.all ? 100 : f.on ? Math.round((f.balance / L.TOTAL) * 100) : 0; return `<label for="${prefix}-sel-${id}" class="rl rl-${id}" style="display:grid;grid-template-columns:28px 1fr auto;gap:10px;align-items:center;padding:9px 10px;border-radius:12px;cursor:pointer;transition:background 200ms">${f.all ? L.allMono(28) : mono(f.a, 28)}<span style="min-width:0"><b style="display:block;font-size:13px">${f.short}</b><span class="sub2">${f.all ? "every ring together" : !f.on ? "a thin ring that ended Mar 31" : f.stale ? `<span style="color:var(--warning-text)">${I.clock(9)} last reading ${fmt(f.asOf)}</span>` : `${share}% of the wood · updated ${fmt(f.asOf)}`}</span></span><b class="num" style="font-size:13.5px">${f.on ? inr(f.balance) : "₹0"}</b></label>`; }).join("");
}
function ringGauges(prefix, { ph = false } = {}) {
  return `<div style="display:grid;grid-template-columns:repeat(${ph ? 2 : 3},minmax(0,1fr));grid-auto-rows:1fr;gap:12px;flex:1 1 auto">${ORDER.map((a) => { const f = FACTS[a.id], rec = record(a.id), frac = f.on ? f.balance / rec : 0, sz = ph ? 70 : 84; return `<label for="${prefix}-sel-${a.id}" class="acm ac-${a.id}" style="cursor:pointer;display:flex;align-items:center;gap:12px;padding:12px;border-radius:16px;background:var(--fill)"><svg width="${sz}" height="${sz}" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="34" fill="none" stroke="var(--fill-strong)" stroke-width="9"></circle><path d="${U.arc(42, 42, 34, 0, Math.max(frac * 359.9, 1))}" fill="none" stroke="var(--card-${a.color})" stroke-width="9" stroke-linecap="round"></path><text x="42" y="47" text-anchor="middle" font-size="15" font-weight="800" fill="var(--fg)">${Math.round(frac * 100)}%</text></svg><span style="min-width:0"><b style="display:block;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</b><span class="sub2">of its record ${inrS(rec)}</span><span class="sub2">${f.on ? `${signed(f.sinceJan)} this year` : "closed"}</span></span></label>`; }).join("")}</div>`;
}
const hSel = (dsel, id) => `${dsel} .rl-${id} { background: var(--accent-tint); }`;
export function hDesktop() {
  const pk = P.picker("h", hSel);
  const hero = card(`${head("Rings", "the last 12 months round the clock, starting at today's line · each band is an account, as thick as its balance · the core is the emergency fund", `<span class="legend"><span><i style="background:repeating-linear-gradient(135deg,var(--warning) 0 2px,var(--warning-tint) 2px 4px)"></i>Carried, not read</span></span>`)}<div style="display:grid;grid-template-columns:640px minmax(0,1fr);gap:36px;align-items:center"><div style="position:relative;width:640px;height:640px">${treeRings("h")}<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:150px">${panes((f) => ringCenter(f))}</div></div><div style="display:flex;flex-direction:column;gap:14px"><div style="display:flex;flex-direction:column;gap:2px">${ringsLegend("h")}</div><div style="border-top:1px solid var(--divider);padding-top:14px">${panes((f) => `<div class="row" style="gap:8px;flex-wrap:wrap">${P.actions(f)}</div>`)}</div></div></div>`, "gap:14px");
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${hero}${two(card(`${head("Against its record", "each account's balance as a share of the most it has held")}${ringGauges("h")}`), P.historyCard("h", { n: 4 }), "1.25fr 1fr")}${pk.close}` });
}
export function hPhone() {
  const pk = P.picker("hp", hSel);
  const hero = card(`${head("Rings", "")}<div style="position:relative;width:326px;height:326px;margin:0 auto">${treeRings("hp", { size: 326, ph: true })}<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:80px">${panes((f) => ringCenter(f, { ph: true }))}</div></div><div style="display:flex;flex-direction:column;gap:0;margin:0 -6px">${ringsLegend("hp")}</div>`, "padding:16px;gap:10px");
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${hero}${card(`${head("Against its record")}${ringGauges("hp", { ph: true })}`, "padding:16px")}${P.historyCard("hp", { n: 4, ph: true })}${pk.close}` });
}

// ================= I · Bubbles =================
// Each account a bubble as big as its balance; a dashed ring shows how big it was last time. A lens beside it shows the pick.
function bubbles(prefix, { w = 900, h = 520, ph = false } = {}) {
  const k = (ph ? 92 : 168) / Math.sqrt(L.latest("sbi").balance);
  const items = ORDER.filter((a) => L.isOn(a)).map((a) => ({ a, f: FACTS[a.id], r: Math.sqrt(FACTS[a.id].balance) * k }));
  const packed = U.pack(items, ph ? 6 : 12);
  const bx = (fn) => fn(...packed.map((p) => p.x - p.r)), sc = Math.min(1, (w - 16) / (Math.max(...packed.map((p) => p.x + p.r)) - Math.min(...packed.map((p) => p.x - p.r))), (h - 50) / (Math.max(...packed.map((p) => p.y + p.r)) - Math.min(...packed.map((p) => p.y - p.r))));
  const placed = packed.map((p) => ({ ...p, x: p.x * sc, y: p.y * sc, r: p.r * sc }));
  void bx;
  const minX = Math.min(...placed.map((p) => p.x - p.r)), maxX = Math.max(...placed.map((p) => p.x + p.r)), minY = Math.min(...placed.map((p) => p.y - p.r)), maxY = Math.max(...placed.map((p) => p.y + p.r));
  const ox = (w - (maxX - minX)) / 2 - minX, oy = (h - (maxY - minY)) / 2 - minY;
  const circ = (x, y, r, style, inner = "", cls = "") => `<span class="${cls}" style="position:absolute;left:${(x - r).toFixed(1)}px;top:${(y - r).toFixed(1)}px;width:${(2 * r).toFixed(1)}px;height:${(2 * r).toFixed(1)}px;border-radius:50%;${style}">${inner}</span>`;
  const body = placed.map((p) => {
    const x = p.x + ox, y = p.y + oy, f = p.f, a = p.a, prevR = f.prev ? Math.sqrt(f.prev.balance) * k * sc : p.r, big = p.r > (ph ? 40 : 58);
    const label = big ? `<span style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;color:var(--on-card);padding:0 10px"><b style="font-size:${ph ? 11 : Math.min(17, p.r / 6)}px;font-weight:800;white-space:nowrap">${a.name}</b><b style="font-size:${ph ? 13 : Math.min(26, p.r / 4.4)}px;font-weight:800">${ph ? inrS(f.balance) : inr(f.balance)}</b>${f.stale ? `<span style="font-size:10.5px;font-weight:800;margin-top:3px;padding:2px 8px;border-radius:999px;background:oklch(0.8 0.13 80 / 0.4)">${I.clock(9)} ${fmt(f.asOf)}</span>` : ""}</span>` : `<span style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--on-card);font-size:${ph ? 10 : 12}px;font-weight:800">${inrS(f.balance)}</span><span style="position:absolute;left:50%;top:calc(100% + 6px);transform:translateX(-50%);white-space:nowrap;font-size:${ph ? 10 : 11.5}px;font-weight:800;color:var(--fg)">${a.name}</span>`;
    const ball = circ(x, y, p.r, `background:radial-gradient(circle at 34% 28%, color-mix(in srgb, var(--card-${a.color}) 70%, white), var(--card-${a.color}-from) 55%, var(--card-${a.color}-to));box-shadow:0 14px 30px oklch(0 0 0 / 0.18);overflow:hidden;isolation:isolate${f.stale ? ";opacity:0.75" : ""}`, `${rings(200, 200, { stroke: "var(--rings-light)", opacity: 0.09, count: 10 })}`);
    const prev = circ(x, y, prevR, `border:1.5px dashed ${prevR > p.r ? "var(--negative)" : "oklch(1 0 0 / 0.7)"};pointer-events:none;z-index:2`);
    const staleRing = f.stale ? circ(x, y, p.r + 6, "border:2.5px dashed var(--warning);pointer-events:none") : "";
    const pickRing = circ(x, y, p.r + 8, "border:3px solid var(--accent);opacity:0;transition:opacity 200ms;pointer-events:none", "", "bub-ring");
    return `<label for="${prefix}-sel-${a.id}" class="acm ac-${a.id} bub-${a.id}" style="cursor:pointer;position:absolute;inset:0;pointer-events:none"><span style="pointer-events:auto">${ball}</span>${prev}${staleRing}${pickRing}${circ(x, y, p.r, "pointer-events:auto;z-index:3", label)}</label>`;
  }).join("");
  const yes = FACTS.yes, gr = ph ? 16 : 24;
  const ghost = `<label for="${prefix}-sel-yes" class="acm ac-yes bub-yes" style="cursor:pointer;position:absolute;left:${ph ? 6 : 14}px;bottom:${ph ? 6 : 14}px;display:flex;align-items:center;gap:8px"><span style="position:relative;width:${gr * 2}px;height:${gr * 2}px;border-radius:50%;border:1.5px dashed var(--muted)"><span class="bub-ring" style="position:absolute;inset:-6px;border-radius:50%;border:3px solid var(--accent);opacity:0"></span></span><b style="font-size:${ph ? 10.5 : 12}px;color:var(--muted)">${yes.name} · closed</b></label>`;
  return `<div style="position:relative;width:100%;max-width:${w}px;height:${h}px;margin:0 auto">${body}${ghost}</div>`;
}
function lens(f, { ph = false } = {}) {
  const iv = interval(f);
  return `<div style="display:flex;flex-direction:column;gap:12px;height:100%"><div class="row" style="gap:12px">${f.all ? L.allMono(36) : mono(f.a, 36)}<span><b style="display:block;font-size:16px">${f.name}</b><span class="sub2">${f.all ? `${f.count} active accounts` : `${f.bank} · ${f.on ? f.type : "closed"}`}</span></span></div>
    <div><b style="display:block;font-size:34px;font-weight:800;letter-spacing:-0.015em">${f.on ? inr(f.balance) : "₹0"}</b>${f.all ? L.chg(f.sinceJan, { suffix: " this year" }) : f.on ? L.chg(f.chg, { suffix: ` since ${fmt(f.prev.date)}` }) : `<span class="card-note">closed ${fmtY(f.closedOn)}</span>`}</div>
    <div style="color:${f.all ? "var(--accent-text)" : `var(--card-${f.color})`}">${P.spark(f.id, { w: ph ? 300 : 360, h: 56, stroke: "currentColor", fill: `color-mix(in oklch, currentColor 12%, transparent)`, width: 2.2, dots: true, keys: f.on ? L.LAST12 : L.HISTORY })}</div>
    <div style="display:flex;flex-direction:column">${[["Last reading", f.all ? `${fmt(f.asOf)} (latest)` : f.on ? (f.stale ? `<span style="color:var(--warning-text)">${fmt(f.asOf)} · ${L.daysBetween(f.asOf, L.TODAY)} days ago</span>` : fmt(f.asOf)) : fmtY(f.closedOn)], ["Last time it was", f.all ? inr(L.yearStart()) + " on Jan 1" : f.prev ? `${inr(f.prev.balance)} · ${fmt(f.prev.date)}` : "—"], ["Out to bills since", iv ? `${inr(iv.out)} · worked out` : "—"]].map(([k, v]) => `<div class="between" style="padding:8px 0;border-bottom:1px solid var(--divider);font-size:13px"><span class="muted" style="font-weight:600">${k}</span><b style="text-align:right">${v}</b></div>`).join("")}</div>
    ${f.on && !f.all ? `<div class="row foot" style="gap:8px"><span class="qinp${f.stale ? " focus" : ""}" style="flex:1"><span class="pre">₹</span>${f.stale ? "6,61,400" : `<span style="color:var(--muted);font-weight:500">New balance</span>`}</span>${btn("Save", { kind: "primary", cls: "btn-sm" })}${iconBtn(I.more(), "Edit or close", "btn-sm")}</div>` : `<div class="row foot" style="gap:8px">${P.actions(f)}</div>`}</div>`;
}
function bubbleGrid(prefix, { ph = false } = {}) {
  const keys = ph ? L.LAST12.slice(-6) : L.LAST12, maxB = L.latest("sbi").balance, maxR = ph ? 13 : 19;
  const cell = (a, k) => { const v = L.atMonth(a.id, k), inMonth = L.snapsOf(a.id).some((s) => L.monthKey(s.date) === k), f = FACTS[a.id];
    if (!L.isOn(a) && k > L.monthKey(f.closedOn)) return `<span style="width:8px;height:2px;background:var(--fill-strong);border-radius:2px"></span>`;
    if (v == null) return "";
    const r = Math.max(2.5, Math.sqrt(v / maxB) * maxR), staleCell = f.stale && k > L.monthKey(f.asOf);
    return `<svg width="${maxR * 2 + 4}" height="${maxR * 2 + 4}" aria-hidden="true"><circle cx="${maxR + 2}" cy="${maxR + 2}" r="${r}" fill="${staleCell ? "none" : inMonth ? `var(--card-${a.color})` : `color-mix(in oklch, var(--card-${a.color}) 35%, transparent)`}" stroke="${staleCell ? "var(--warning)" : "none"}" stroke-width="1.6" stroke-dasharray="${staleCell ? "3 3" : "0"}"></circle></svg>`; };
  const rows = ORDER.map((a) => `<label for="${prefix}-sel-${a.id}" class="acm ac-${a.id}" style="display:contents;cursor:pointer"><span class="row" style="gap:8px;min-width:0">${mono(a, 22)}<b style="font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ph ? a.bank.split(" ")[0] : a.name}</b></span>${keys.map((k) => `<span style="display:flex;align-items:center;justify-content:center;height:${maxR * 2 + 6}px">${cell(a, k)}</span>`).join("")}${ph ? "" : `<b class="num" style="text-align:right;font-size:13px">${FACTS[a.id].on ? inr(FACTS[a.id].balance) : "₹0"}</b>`}</label>`).join("");
  return `<div class="scal" style="grid-template-columns:${ph ? "70px" : "160px"} repeat(${keys.length},minmax(0,1fr))${ph ? "" : " 100px"};gap:4px 6px">${`<span></span>${keys.map((k) => `<span class="sc-h${k === L.monthKey(L.TODAY) ? " now" : ""}">${monName(k)}</span>`).join("")}${ph ? "" : `<span class="sc-h" style="text-align:right">Now</span>`}`}${rows}</div>`;
}
const iSel = (dsel, id) => `${dsel} .bub-${id} .bub-ring { opacity: 1; }`;
export function iDesktop() {
  const pk = P.picker("i", iSel);
  const hero = card(`${head("Bubbles", "each account as big as its balance · the dashed ring is how big it was last time: red when it was bigger", `<label for="i-sel-all" class="chip" style="cursor:pointer">${L.allMono(18)}All accounts · ${inr(L.TOTAL)}</label>`)}<div style="display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:28px;align-items:stretch">${bubbles("i")}<div style="border-left:1px solid var(--divider);padding-left:24px;display:flex;flex-direction:column">${panes((f) => lens(f), {}, { flex: true })}</div></div>`, "gap:12px;background:radial-gradient(ellipse at 35% 45%, color-mix(in srgb, var(--card-teal) 7%, var(--surface)), var(--surface) 65%)");
  const grid = `${C.calendarCss("i")}${card(`${head("A year of bubbles", "each month's balance as a bubble · faint ones were carried from an earlier month · amber rings were never read", "")}${bubbleGrid("i")}`, "gap:14px")}`;
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${hero}${grid}${two(P.outCard("i"), P.historyCard("i", { n: 5 }))}${pk.close}` });
}
export function iPhone() {
  const pk = P.picker("ip", iSel);
  const hero = card(`${head("Bubbles", "")}${bubbles("ip", { w: 326, h: 300, ph: true })}<div style="border-top:1px solid var(--divider);padding-top:12px">${panes((f) => lens(f, { ph: true }))}</div>`, "padding:16px;gap:10px");
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${hero}${C.calendarCss("ip")}${card(`${head("A year of bubbles")}${bubbleGrid("ip", { ph: true })}`, "padding:16px;gap:10px")}${P.outCard("ip", { ph: true })}${pk.close}` });
}

export const DIRS2 = [
  { k: "e", name: "Reservoir", blurb: "Each account a glass tank filled to its balance against its own record; All is the reservoir, layered by account. A tide chart, and pipes as thick as the money in and out." },
  { k: "f", name: "Passbook", blurb: "An open passbook: accounts on the left page, the picked one's entries on the right with withdrawals, deposits and a running balance. Index tabs on the edge, stamps for stale and closed." },
  { k: "g", name: "Instrument cluster", blurb: "A car's dashboard: a balance speedometer with the record marked, a change dial, a freshness fuel gauge and warning lights. Mini gauges pick an account; a trip computer and a chart-recorder trace." },
  { k: "h", name: "Tree rings", blurb: "Twelve months round a circle, every account a ring as thick as its balance, the emergency fund at the core. Each account against its record, as a ring gauge." },
  { k: "i", name: "Bubbles", blurb: "Accounts as bubbles sized by balance, with a dashed ring for how big each was last time. A lens beside it updates the pick in place; a year of bubbles below shows every month." },
];
