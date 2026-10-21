// The four directions, desktop and phone. One set of radios (<prefix>-sel-<id>) holds the pick, and
// the selector, the hero, the history, the money-out card and the chart all follow it.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
const { inr, signed, inrS, fmt, fmtY, monName, I, btn, iconBtn, rings, grad, mono, desktop, phone } = L;
const { IDS, FACTS, ORDER, panes, item } = P;

const two = (a, b, ratio = "1fr 1fr") => `<div style="display:grid;grid-template-columns:${ratio.split(" ").map((x) => `minmax(0,${x})`).join(" ")};gap:20px;align-items:stretch">${a}${b}</div>`;
const stack = (...cards) => `<div class="stack-col">${cards.join("")}</div>`;
const N = IDS.length;
const wrap = (i, k) => { let d = i - k; if (d > N / 2) d -= N; if (d < -N / 2) d += N; return d; };

// ---------- The cover flow (as the Subscriptions final design), turned by wheel, drag and keys ----------
export const FLOW_JS = `(() => {
  if (window.__acctFlow) return; window.__acctFlow = true;
  const stageOf = (e) => e.target && e.target.closest && e.target.closest(".cstage");
  const step = (st, dir) => { const rs = [...document.querySelectorAll('input[name="' + st.dataset.radio + '"]')]; if (!rs.length) return; const i = Math.max(0, rs.findIndex((r) => r.checked)); const n = rs[(i + dir + rs.length) % rs.length]; n.checked = true; n.dispatchEvent(new Event("change", { bubbles: true })); };
  const acc = new WeakMap(), last = new WeakMap();
  document.addEventListener("wheel", (e) => {
    const st = stageOf(e); if (!st) return; e.preventDefault();
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY, now = performance.now(), a = (acc.get(st) || 0) + d;
    if (Math.abs(a) >= 40 && now - (last.get(st) || 0) > 90) { step(st, a > 0 ? 1 : -1); acc.set(st, 0); last.set(st, now); } else acc.set(st, Math.max(-80, Math.min(80, a)));
  }, { passive: false });
  let drag = null;
  document.addEventListener("pointerdown", (e) => { const st = stageOf(e); if (!st || e.button > 0) return; drag = { st, x: e.clientX, moved: false }; });
  document.addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) >= 56) { step(drag.st, dx < 0 ? 1 : -1); drag.x = e.clientX; drag.moved = true; } });
  document.addEventListener("pointerup", () => { if (drag && drag.moved) { const stop = (ev) => { ev.preventDefault(); ev.stopPropagation(); }; document.addEventListener("click", stop, { capture: true, once: true }); setTimeout(() => document.removeEventListener("click", stop, { capture: true }), 350); } drag = null; });
  document.addEventListener("pointercancel", () => { drag = null; });
  document.addEventListener("keydown", (e) => { const st = stageOf(e); if (!st) return; if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); step(st, 1); } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); step(st, -1); } });
})();`;
export const flowPlace = ({ near = 160, step = 80, rot = 55 } = {}) => (d) => { const a = Math.abs(d), sg = Math.sign(d); return d === 0 ? { t: "translateX(-50%) translateZ(70px)", z: 50, o: 1 } : { t: `translateX(calc(-50% + ${sg * (near + (a - 1) * step)}px)) rotateY(${-sg * rot}deg) scale(0.84)`, z: 50 - a, o: a >= 6 ? 0 : 1 }; };
const placeRules = (dsel, id, place) => IDS.map((jid, i) => { const p = place(wrap(i, IDS.indexOf(id))); return `${dsel} .sx-${jid} { transform: ${p.t}; z-index: ${p.z}; opacity: ${p.o}; }`; }).join("\n");
function nav(prefix, { inset = 28 } = {}) {
  return IDS.map((id, k) => {
    const prev = IDS[(k - 1 + N) % N], next = IDS[(k + 1) % N];
    const arrow = (to, dir) => `<label for="${prefix}-sel-${to}" class="btn btn-icon" style="pointer-events:auto;width:42px;min-height:42px;box-shadow:var(--pop-shadow)" aria-label="${dir === "prev" ? "Previous" : "Next"}: ${FACTS[to].name}">${dir === "prev" ? I.chevL(14) : I.chevR(14)}</label>`;
    return `<div class="cnav cnav-${id}" style="position:absolute;left:${inset}px;right:${inset}px;top:50%;transform:translateY(-50%);justify-content:space-between;pointer-events:none;z-index:80">${arrow(prev, "prev")}${arrow(next, "next")}</div>`;
  }).join("");
}
/** The pick's colour, lightened for marks on the coloured stage, and its deep shade for text on them. */
/** The stage stays green for every pick; the pick shows in its own colour (white for All, which is green already). */
const pickVars = (id) => `--pick-soft: ${P.selSoft(id)}; --pick-ink: ${id === "all" ? "var(--card-emerald-to)" : `var(--card-${FACTS[id].color}-to)`};`;
export const stageLayer = (f) => `radial-gradient(circle at 50% -10%, oklch(1 0 0 / 0.2), transparent 55%), linear-gradient(165deg, var(--card-${f.color}-from), var(--card-${f.color}-to))`;
function coverStage(prefix, { ph = false } = {}) {
  const layers = "";
  const w = ph ? 150 : 220, h = ph ? 106 : 156;
  const covers = IDS.map((id) => item(prefix, id, P.cover(FACTS[id], w, h, { small: ph }), { style: `position:absolute;left:50%;top:${ph ? 14 : 24}px;transition: transform 700ms cubic-bezier(0.22, 0.8, 0.2, 1), opacity 450ms;` })).join("");
  const stageEl = `<div class="cstage" data-radio="${prefix}-sel" tabindex="0" role="group" aria-roledescription="carousel" aria-label="Accounts. Scroll, drag or use the arrow keys to turn it." style="position:relative;height:${ph ? 196 : 270}px;perspective:${ph ? 900 : 1300}px;overflow:hidden;margin:0 ${ph ? -16 : -22}px">${covers}${ph ? "" : nav(prefix)}<span class="chint">${ph ? "Swipe to turn" : `Scroll or drag to turn <kbd>←</kbd><kbd>→</kbd>`}</span></div>`;
  return `<section class="card glass textured stage-dark stage-deep" style="gap:6px;padding:${ph ? "4px 16px 18px" : "8px 22px 26px"};background:${P.GREEN_BG};overflow:hidden">${layers}${rings(1400, 540, { stroke: "var(--rings-light)", opacity: 0.05, first: 60, step: 34 })}${stageEl}${panes(P.heroCaption, { ph })}</section>`;
}
const coverSel = (place) => (dsel, id) => `${placeRules(dsel, id, place)}\n${dsel} .cnav-${id} { display: flex; }\n${dsel} .sx-${id} .cov { box-shadow: 0 0 0 3px oklch(0.16 0.05 160 / 0.6), 0 0 0 6.5px ${P.selSoft(id)}, 0 0 34px ${P.selSoft(id)}, 0 24px 40px oklch(0 0 0 / 0.35); }\n${dsel} .stage-deep { ${pickVars(id)} }`;

// ================= A · Cover flow =================
export function aDesktop() {
  const pk = P.picker("a", coverSel(flowPlace()));
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${coverStage("a")}${two(P.sitsCard("a"), stack(P.historyCard("a", { n: 5 }), P.outCard("a")), "1.05fr 1fr")}${C.switchCard(["river", "glow", "bridge"], "a")}${pk.close}<script>${FLOW_JS}</script>` });
}
export function aPhone() {
  const pk = P.picker("ap", coverSel(flowPlace({ near: 110, step: 46, rot: 58 })));
  const map = `<section class="card glass" style="padding:14px;gap:12px"><div class="between"><span class="card-t">Where it sits</span>${L.seg([{ label: "Account", on: true }, { label: "Purpose" }])}</div>${P.sitsMap("ap", { h: 300, gap: 4, ph: true })}<span class="card-note">Tap a block to open that account.</span></section>`;
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${coverStage("ap", { ph: true })}${map}${P.historyCard("ap", { n: 4, ph: true })}${P.outCard("ap", { ph: true })}${C.switchCard(["river", "glow", "bridge"], "ap", { ph: true })}${pk.close}<script>${FLOW_JS}</script>` });
}

// ================= B · Tiles and details (the Cards page's grammar) =================
const tileSel = (dsel, id) => `${dsel} .tw-${id} .atile { box-shadow: 0 0 0 2.5px var(--surface), 0 0 0 5px var(--accent), var(--tile-shadow); } ${dsel} .tw-${id} .tick { display: flex; }`;
function tileRow(prefix, { ph = false } = {}) {
  const w = ph ? 236 : 198, h = ph ? 168 : 186;
  const open = IDS.filter((id) => FACTS[id].on);
  const tiles = open.map((id) => `<label for="${prefix}-sel-${id}" class="tilewrap tw-${id}" style="cursor:pointer">${P.tile(FACTS[id], { w, h, ph })}<span class="tick">${I.check(11)}</span></label>`).join("");
  const closed = L.CLOSED.map((a) => `<label for="${prefix}-sel-${a.id}" class="tilewrap tw-${a.id}" style="cursor:pointer;flex:1"><div class="atile off" style="width:100%;height:100%;padding:10px 12px;background:${grad(a.color)};justify-content:center;gap:2px">${rings(130, 85, { stroke: "var(--rings-light)", opacity: 0.06, count: 6 })}<span class="t-faint">${I.lock(9)} 1 closed</span><b style="font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</b></div><span class="tick">${I.check(11)}</span></label>`).join("");
  const side = `<div style="display:flex;flex-direction:column;gap:12px;width:${ph ? 150 : 128}px;flex-shrink:0;height:${h}px"><div class="addtile" style="flex:1;width:100%">${I.plus(16)}Add account</div>${closed}</div>`;
  return `<div style="display:flex;gap:${ph ? 12 : 15}px;overflow-x:auto;padding:10px 10px 14px;margin:-10px -10px -14px;scrollbar-width:none">${tiles}${side}</div>`;
}
export function detailsPane(f, { ph = false } = {}) {
  const bg = f.all ? `radial-gradient(circle at 92% 0%, var(--card-emerald-glow), transparent 40%),${grad("emerald", 150)}` : `radial-gradient(circle at 92% 0%, oklch(1 0 0 / 0.16), transparent 42%),${grad(f.color, 150)}`;
  const { lo, hi, avg } = f.range;
  const pos = (v) => Math.max(0, Math.min(100, ((v - lo.v) / (hi.v - lo.v || 1)) * 100));
  const head = `<div class="textured" style="border-radius:18px;padding:${ph ? "16px" : "18px 20px"};color:var(--on-card);background:${bg};box-shadow:var(--tile-shadow);${f.on ? "" : "filter:grayscale(0.8)"}">${rings(700, 200, { stroke: "var(--rings-light)", opacity: 0.07, first: 50, step: 28 })}
    <div class="between" style="font-size:12.5px;font-weight:700;color:var(--on-card-muted)"><span>${f.all ? `All accounts · ${f.count} active` : `${f.name} · ${L.purposeName(f.purpose)}`}</span>${f.stale ? `<span class="t-pill" style="font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:oklch(0.8 0.13 80 / 0.38)">${I.clock(9)} Updated ${fmt(f.asOf)}</span>` : ""}</div>
    <div class="row" style="gap:10px;align-items:baseline;margin-top:6px;flex-wrap:wrap"><b style="font-size:${ph ? 30 : 36}px;font-weight:800;letter-spacing:-0.01em">${f.balance == null ? "—" : inr(f.balance)}</b><span style="font-size:14px;font-weight:600;color:var(--on-card-muted)">${f.all ? `${signed(f.sinceJan)} this year` : f.on ? `${L.pct(f.balance, L.TOTAL)} of everything` : "closed"}</span></div>
    ${f.on ? `<div style="margin-top:${ph ? 30 : 34}px"><div style="position:relative"><span style="position:absolute;left:${pos(avg)}%;bottom:16px;transform:translateX(-50%);font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:999px;background:var(--on-card-fill);white-space:nowrap">Avg · ${inrS(avg)}</span><span style="position:absolute;left:${pos(avg)}%;bottom:10px;width:1.5px;height:6px;background:var(--on-card-faint)"></span><div style="height:10px;border-radius:999px;background:var(--on-card-fill);overflow:hidden"><div style="width:${Math.max(pos(f.balance), 3)}%;height:100%;border-radius:inherit;background:var(--on-card-lime)"></div></div></div><div class="between" style="margin-top:6px;font-size:11px;font-weight:700;color:var(--on-card-faint)"><span>${inrS(lo.v)} low · ${monName(lo.k)}</span><span>${inrS(hi.v)} high · ${monName(hi.k)}</span></div></div>` : `<p style="margin-top:14px;font-size:12.5px;font-weight:600;color:var(--on-card-muted)">Closed ${fmtY(f.closedOn)} with a final balance of ₹0.</p>`}</div>`;
  const fig = (k, v, s = "") => `<div class="between" style="font-size:13px;padding:4px 0"><span class="muted" style="font-weight:600">${k}</span><b style="text-align:right">${v}${s ? ` <span class="muted" style="font-size:11.5px;font-weight:600">${s}</span>` : ""}</b></div>`;
  const left = f.all ? [fig("Since Jan 1", signed(f.sinceJan)), fig("This month", signed(f.month.delta))] : f.on ? [fig("Since Jan 1", signed(f.sinceJan)), fig("Since last time", signed(f.chg), fmt(f.prev.date))] : [fig("Opened", fmtY(f.opened)), fig("Closed", fmtY(f.closedOn))];
  const right = [fig(`${I.up(10)} Highest`, inr(hi.v), monName(hi.k)), fig(`${I.down(10)} Lowest`, inr(lo.v), monName(lo.k))];
  // Money out since the last balance, split like the Cards page's Next-due bar.
  const iv = f.all ? null : f.interval;
  const out = f.all ? L.monthFlows("2026-10") : iv;
  const parts = out ? Object.entries(out.list.filter((x) => L.KINDS[x.kind].dir === "out").reduce((m, x) => { const k = x.kind === "card" ? L.CARDS[x.ref].name : L.KINDS[x.kind].name; m[k] = (m[k] ?? 0) + x.amount; return m; }, {})) : [];
  const colorOf = (k) => { const c = Object.values(L.CARDS).find((c) => c.name === k); return c ? `var(--card-${c.color})` : Object.values(L.KINDS).find((x) => x.name === k)?.color; };
  const outT = parts.reduce((t, [, v]) => t + v, 0);
  const outBox = !f.on ? "" : `<div style="border-radius:16px;background:var(--fill);padding:12px 14px;display:flex;flex-direction:column;gap:9px"><div class="between" style="font-size:12px;font-weight:700"><span class="muted">${f.all ? "Out in October so far" : `Out since ${fmt(iv.from.date)}`} · worked out</span><b style="font-size:15px">${inr(outT)}</b></div>${outT ? `<div class="stack" style="height:22px;border-radius:8px">${parts.map(([k, v]) => `<span style="flex:${v};background:${colorOf(k)};color:white;font-size:10.5px;font-weight:800;display:flex;align-items:center;padding-left:8px;white-space:nowrap;overflow:hidden">${v / outT > 0.16 ? inrS(v) : ""}</span>`).join("")}</div><div class="legend" style="font-size:11.5px">${parts.map(([k, v]) => `<span><i style="background:${colorOf(k)}"></i><b>${k}</b> ${inr(v)}</span>`).join("")}</div>` : `<span class="card-note">Nothing recorded went out of ${f.name}.</span>`}</div>`;
  return `<div style="display:flex;flex-direction:column;gap:14px;height:100%">${head}<div style="display:grid;grid-template-columns:${ph ? "1fr" : "1fr 1fr"};gap:${ph ? 0 : 28}px"><div>${left.join("")}</div><div${ph ? "" : ' style="border-left:1px solid var(--divider);padding-left:28px"'}>${right.join("")}</div></div>${outBox}<div class="row foot" style="gap:8px">${P.actions(f)}</div></div>`;
}
const detailsCard = (prefix, { ph = false } = {}) => `<section class="card glass"${ph ? ' style="padding:14px"' : ""}>${panes((f) => detailsPane(f, { ph }), {}, { flex: true })}</section>`;
export function bDesktop() {
  const pk = P.picker("b", tileSel);
  const calCard = `${C.calendarCss("b")}<section class="card glass" style="gap:14px"><div class="card-h"><span class="card-t">When you updated each one<small>the last 12 months · shaded by how the balance changed</small></span>${C.CHARTS.calendar.legend}</div>${C.calendar().replace(/__P__/g, "b")}</section>`;
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${tileRow("b")}${calCard}${two(detailsCard("b"), P.historyCard("b", { n: 6 }), "1fr 1.15fr")}${C.chartCard("glow", "b", { h: 380 })}${pk.close}` });
}
export function bPhone() {
  const pk = P.picker("bp", tileSel);
  const calCard = `${C.calendarCss("bp")}<section class="card glass" style="gap:12px;padding:16px"><span class="card-t">When you updated each one</span>${C.calendar({ ph: true }).replace(/__P__/g, "bp")}</section>`;
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${tileRow("bp", { ph: true })}${detailsCard("bp", { ph: true })}${calCard}${P.historyCard("bp", { n: 4, ph: true })}${C.chartCard("glow", "bp", { ph: true })}${pk.close}` });
}

// ================= C · Money map: the month's flows as the hero, accounts grouped by purpose =================
const chipSel = (dsel, id) => `${dsel} .ch-${id} { background: var(--ink); color: var(--on-ink); box-shadow: var(--soft-shadow); } ${dsel} .ch-${id} em { color: oklch(1 0 0 / 0.65); } ${dsel} .ar-${id} { background: var(--accent-tint); }`;
function chipRow(prefix, { ph = false } = {}) {
  return `<div class="row" style="gap:8px;flex-wrap:${ph ? "nowrap" : "wrap"};${ph ? "overflow-x:auto;margin:0 -16px;padding:0 16px;scrollbar-width:none" : ""}">${IDS.map((id) => { const f = FACTS[id]; return `<label for="${prefix}-sel-${id}" class="chip ch-${id}" style="cursor:pointer;padding:8px 14px 8px 8px;font-size:13px;gap:9px;background:var(--surface);border:1px solid var(--surface-line)">${f.all ? L.allMono(22) : mono(f.a, 22)}${f.short}<em>${f.balance == null ? "" : f.on ? inrS(f.balance) : "closed"}</em>${f.stale ? `<span style="width:7px;height:7px;border-radius:50%;background:var(--warning)"></span>` : ""}</label>`; }).join("")}</div>`;
}
function flowHero(prefix, { ph = false } = {}) {
  const m = L.monthFlows("2026-09");
  const summary = (f) => { const mm = L.monthFlows("2026-09", f.all ? null : f.id); return `<div class="row" style="gap:${ph ? 14 : 28}px;flex-wrap:wrap">${[["Came in", inr(mm.in), "recorded income", "var(--positive)"], ["Went to bills and more", inr(mm.out), "card bills, subscriptions, EMIs, shares", "var(--fg)"], ["Not recorded", signed(mm.other), "UPI, transfers, cash", "var(--muted)"], ["Balance", signed(mm.delta), `${inr(mm.start)} → ${inr(mm.end)}`, mm.delta >= 0 ? "var(--positive)" : "var(--negative)"]].map(([k, v, s, c]) => `<div class="hstat"><span class="k">${k}</span><b class="v" style="font-size:${ph ? 16 : 20}px;color:${c}">${v}</b><span class="s">${s}</span></div>`).join("")}</div>`; };
  return `<section class="card glass" style="gap:16px${ph ? ";padding:16px" : ""}"><div class="card-h"><span class="card-t">${ph ? "September" : "September, through your accounts"}${ph ? "" : `<small>money in on the left, out on the right · the pick's flows stay lit</small>`}</span><span class="row" style="gap:10px">${ph ? "" : L.seg([{ label: "‹ Aug" }, { label: "Sep 2026", on: true }, { label: "Oct ›" }])}${L.derivedTag("Worked out, not a statement")}</span></div>${panes(summary, {})}${C.sankey({ w: ph ? 330 : 1368, h: ph ? 280 : 440, ph })}${ph ? C.sankeyKey() : ""}${ph ? "" : `<p class="card-note">Income, card bills, subscriptions, EMIs and trades come from the rest of the app. <b style="color:var(--fg)">Not recorded</b> is what's left of each account's change once those are counted: transfers between your own accounts show here on both sides, until transfers are recorded.</p>`}</section>`;
  void m;
}
export function accountList(prefix, { ph = false } = {}) {
  const row = (a, { editing = false } = {}) => {
    const f = FACTS[a.id];
    const right = editing ? `<span class="row" style="gap:8px;justify-content:flex-end"><span class="qinp focus" style="width:${ph ? 118 : 128}px"><span class="pre">₹</span>54,200<span style="width:1.5px;height:16px;background:var(--fg);margin-left:1px"></span></span>${btn("Save", { kind: "primary", cls: "btn-sm" })}</span>` : `<span class="row" style="gap:10px;justify-content:flex-end">${ph ? "" : L.freshPill(a, { small: true })}${btn(f.stale ? "Update" : "Update", { kind: f.stale ? "primary" : "soft", cls: "btn-sm" })}</span>`;
    return `<label for="${prefix}-sel-${a.id}" class="arow ar-${a.id}" style="grid-template-columns:${ph ? "1fr auto" : "1.3fr 110px 1fr 204px"};cursor:pointer;border-radius:12px;padding:12px 10px;margin:0 -10px;transition:background 200ms">
      <span class="cell-name">${mono(a, 32)}<span style="min-width:0"><b>${a.name}</b><small>${a.bank} · ${a.accountType}${ph ? ` · ${f.stale ? "stale" : `updated ${fmt(f.asOf)}`}` : ""}</small></span></span>
      ${ph ? "" : `<span style="color:var(--card-${a.color})">${P.spark(a.id, { w: 120, h: 30, stroke: "currentColor", width: 2, dots: true })}</span><span><b class="num" style="font-size:15px">${inr(f.balance)}</b><span class="sub2">${editing ? `was ${inr(f.balance)} on ${fmt(f.asOf)}` : `${signed(f.chg)} since ${fmt(f.prev.date)}`}</span></span>`}
      ${ph && !editing ? `<span style="text-align:right"><b class="num">${inr(f.balance)}</b><span class="sub2">${signed(f.chg)}</span></span>` : right}</label>${editing ? `<div class="help" style="margin:-4px 0 8px 46px">${I.info(12)}<span>${signed(54200 - f.balance)} since ${fmt(f.asOf)}. Saves as today's balance, Oct 21 · <u>another date</u> · Esc puts it back.</span></div>` : ""}`;
  };
  const groups = L.PURPOSES.map((p) => ({ p, list: ORDER.filter((a) => L.isOn(a) && a.purpose === p) })).filter((g) => g.list.length);
  const body = groups.map((g) => `<div class="tgroup" style="padding-top:14px"><span class="row" style="gap:8px;color:var(--fg);font-size:13px">${L.purposeIcon(g.p, 14)}${L.purposeName(g.p)}</span><span>${inr(g.list.reduce((t, a) => t + FACTS[a.id].balance, 0))}</span></div>${g.list.map((a) => row(a, { editing: a.id === "kotak" })).join("")}`).join("");
  return `<section class="card glass" style="gap:4px${ph ? ";padding:16px" : ""}"><div class="card-h"><span class="card-t">Accounts<small>by purpose · update a balance right in its row</small></span>${ph ? "" : btn("Update all", { kind: "soft", cls: "btn-sm", icon: I.check(11) })}</div><div class="spread" style="gap:0;justify-content:space-between">${body}</div><div class="between foot" style="padding-top:12px;border-top:1px solid var(--divider);margin-top:6px"><label for="${prefix}-sel-yes" class="row" style="gap:8px;cursor:pointer">${mono(L.acc("yes"), 22)}<span class="card-note"><b style="color:var(--fg)">1 closed account</b> · YES Old Salary, closed Mar 31</span></label><span class="link">Show ${I.chev(11)}</span></div></section>`;
}
export function cDesktop() {
  const pk = P.picker("c", chipSel);
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${chipRow("c")}${flowHero("c")}${two(accountList("c"), stack(P.historyCard("c", { n: 4 }), P.outCard("c")), "1.2fr 1fr")}${C.chartCard("multiples", "c")}${pk.close}` });
}
export function cPhone() {
  const pk = P.picker("cp", chipSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${chipRow("cp", { ph: true })}${flowHero("cp", { ph: true })}${accountList("cp", { ph: true })}${P.outCard("cp", { ph: true })}${C.chartCard("multiples", "cp", { ph: true })}${pk.close}` });
}

// ================= D · Passbooks: the chart first, then a passbook per account and the monthly check-in =================
const bookSel = (dsel, id) => `${dsel} .pb-${id} { box-shadow: 0 0 0 2.5px var(--surface), 0 0 0 5px var(--accent), var(--card-shadow); } ${dsel} .lg-${id} { background: var(--accent-tint); } ${dsel} .lg-${id} .lg-tick { opacity: 1; }`;
function riverHero(prefix, { ph = false } = {}) {
  const legend = IDS.map((id) => { const f = FACTS[id]; return `<label for="${prefix}-sel-${id}" class="lg-${id}" style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;cursor:pointer;transition:background 200ms">${f.all ? L.allMono(26) : mono(f.a, 26)}<span class="grow"><b style="display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.short}</b><span class="sub2">${f.all ? `${f.count} active` : !f.on ? "Closed Mar 31" : f.stale ? `<span style="color:var(--warning-text)">${I.clock(9)} ${fmt(f.asOf)} · ${L.daysBetween(f.asOf, L.TODAY)} days</span>` : `Updated ${fmt(f.asOf)}`}</span></span><b class="num" style="font-size:13px">${f.balance == null ? "" : f.on ? inr(f.balance) : "₹0"}</b><span class="lg-tick" style="opacity:0;color:var(--accent-text);display:flex">${I.check(12)}</span></label>`; }).join("");
  const big = panes((f) => `<div class="row" style="gap:14px;align-items:baseline;flex-wrap:wrap"><b style="font-size:${ph ? 30 : 40}px;font-weight:800;letter-spacing:-0.015em">${f.balance == null ? "—" : inr(f.balance)}</b><span style="font-size:${ph ? 13 : 15}px;font-weight:700;color:var(--muted)">${f.all ? `in ${f.count} accounts · ${signed(f.sinceJan)} since Jan 1` : f.on ? `${f.name} · ${signed(f.sinceJan)} since Jan 1` : `${f.name} · closed ${fmtY(f.closedOn)}`}</span></div>`);
  if (ph) return `<section class="card glass" style="gap:12px;padding:16px">${big}${C.river({ w: 330, h: 230, ph: true })}<div style="display:flex;flex-direction:column;gap:2px;margin:0 -6px">${legend}</div></section>`;
  return `<section class="card glass" style="gap:14px"><div class="card-h"><span class="card-t">Everything you have<small>this year · every account stacked · pick one to lift it out</small></span><span class="row" style="gap:14px">${C.CHARTS.river.legend}${L.seg([{ label: "This year", on: true }, { label: "12 months" }, { label: "All" }])}</span></div>${big}
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:20px;align-items:center">${C.river({ w: 1080, h: 380, labels: false })}<div style="display:flex;flex-direction:column;gap:2px">${legend}</div></div></section>`;
}
export function passbook(prefix, a, { ph = false } = {}) {
  const f = FACTS[a.id];
  const days = f.asOf ? L.daysBetween(f.asOf, L.TODAY) : 0;
  const frac = Math.min(1, days / L.STALE_DAYS);
  const meter = f.on ? `<div><div class="between" style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:5px"><span>${f.stale ? `<b style="color:var(--warning-text)">${days} days</b> since the last balance` : `${days} ${days === 1 ? "day" : "days"} since the last balance`}</span><span>${L.STALE_DAYS} days</span></div><div class="track" style="height:5px"><span style="width:${Math.max(frac * 100, 3)}%;background:${f.stale ? "var(--warning)" : "var(--accent)"}"></span></div></div>` : `<p class="card-note">Closed ${fmtY(f.closedOn)} · its history stays</p>`;
  return `<label for="${prefix}-sel-${a.id}" class="pbook glass pb-${a.id}" style="cursor:pointer;padding:16px 16px 16px 22px${f.on ? "" : ";opacity:0.7"}"><span class="spine" style="background:${grad(a.color, 180)}"></span>
    <div class="between"><span class="row" style="gap:10px;min-width:0">${mono(a, 30)}<span style="min-width:0"><b style="display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</b><span class="sub2">${a.bank} · ${a.accountType} · ${L.purposeName(a.purpose)}</span></span></span>${f.on ? iconBtn(I.edit(13), "Edit", "btn-sm") : `<span class="pill pill-off">${I.lock(10)} Closed</span>`}</div>
    <div class="between" style="align-items:flex-end"><span><b style="display:block;font-size:24px;font-weight:800;letter-spacing:-0.01em">${f.on ? inr(f.balance) : "₹0"}</b><span class="sub2">${f.on ? `${signed(f.chg)} since ${fmt(f.prev.date)}` : `was ${inr(L.snapsOf(a.id)[0].balance)} in ${fmtY(L.snapsOf(a.id)[0].date).slice(-4)}`}</span></span><span style="color:var(--card-${a.color})">${P.spark(a.id, { w: ph ? 110 : 140, h: 40, stroke: "currentColor", fill: `color-mix(in oklch, var(--card-${a.color}) 14%, transparent)`, width: 2, dots: true, keys: f.on ? L.LAST12 : L.HISTORY })}</span></div>
    ${meter}</label>`;
}
function checkIn(prefix, { ph = false } = {}) {
  const typed = { sbi: 661400, kotak: 54200 };
  const rows = ORDER.filter((a) => L.isOn(a)).sort((x, y) => L.isStale(y) - L.isStale(x)).map((a, i) => {
    const f = FACTS[a.id], v = typed[a.id], focus = a.id === "icici";
    const field = `<span class="qinp${focus ? " focus" : v ? "" : " ghost"}" style="width:${ph ? 128 : 150}px"><span class="pre">₹</span>${v ? v.toLocaleString("en-IN") : focus ? `<span style="width:1.5px;height:16px;background:var(--fg)"></span>` : `<span style="font-weight:500">${f.balance.toLocaleString("en-IN")}</span>`}</span>`;
    const d = v ? v - f.balance : null;
    return `<div class="arow" style="grid-template-columns:${ph ? "1fr auto" : "1.3fr 1fr auto 110px"};padding:10px 0">
      <span class="cell-name">${mono(a, 28)}<span style="min-width:0"><b>${a.name}</b><small>${f.stale ? `<span style="color:var(--warning-text)">${I.clock(9)} ${inr(f.balance)} on ${fmt(f.asOf)}</span>` : `${inr(f.balance)} on ${fmt(f.asOf)}`}</small></span></span>
      ${ph ? "" : `<span class="card-note">${f.stale ? "Overdue, so it comes first" : ""}</span>`}${field}${ph ? "" : `<span style="text-align:right">${d == null ? `<span class="card-note">${focus ? "Typing…" : "Skip"}</span>` : d === 0 ? `<span class="card-note">No change</span>` : L.chg(d)}</span>`}</div>`;
  }).join("");
  return `<section class="card glass" style="gap:6px${ph ? ";padding:16px" : ""}"><div class="card-h"><span class="card-t">October check-in<small>every balance at once · blank ones are skipped</small></span>${ph ? "" : `<span class="qinp" style="width:auto;padding:0 12px 0 10px">${I.cal(12)} Balances on <b style="margin-left:4px">Today, Oct 21</b></span>`}</div>${rows}<div class="${ph ? "" : "between "}foot" style="padding-top:12px;border-top:1px solid var(--divider);margin-top:4px;${ph ? "display:flex;flex-direction:column;gap:10px;align-items:stretch" : ""}"><span class="card-note">2 balances typed · your total becomes <b style="color:var(--fg)">${inr(L.TOTAL - L.latest("kotak").balance + 54200 - L.latest("sbi").balance + 661400)}</b></span>${btn("Save 2 balances", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}</div></section>`;
}
export function dDesktop() {
  const pk = P.picker("d", bookSel);
  const books = `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">${ORDER.map((a) => passbook("d", a)).join("")}</div>`;
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${riverHero("d")}${books}${two(checkIn("d"), P.outCard("d"), "1.15fr 1fr")}${pk.close}` });
}
export function dPhone() {
  const pk = P.picker("dp", bookSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${riverHero("dp", { ph: true })}${ORDER.slice(0, 3).map((a) => passbook("dp", a, { ph: true })).join("")}<span class="link" style="align-self:center">3 more accounts ${I.chev(11)}</span>${checkIn("dp", { ph: true })}${P.outCard("dp", { ph: true })}${pk.close}` });
}

export const DIRS = [
  { k: "a", name: "Cover flow", blurb: "The Subscriptions hero for accounts: covers turn round with All at the centre, and the stage takes the pick's colour." },
  { k: "b", name: "Tiles and details", blurb: "The Cards page's grammar: a tile per account, a calendar of updates, a details card in the pick's colour." },
  { k: "c", name: "Money map", blurb: "The month's money as the hero: in on the left, out on the right, through each account. Accounts grouped by purpose, updated in their row." },
  { k: "d", name: "Passbooks", blurb: "The chart first: every account stacked over the year. Then a passbook per account and the monthly check-in." },
];
