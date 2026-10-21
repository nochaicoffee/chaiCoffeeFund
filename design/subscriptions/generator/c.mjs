// Direction C · Tiles and details. The Cards dashboard's grammar: a row of tiles, the selected one's details, then trends.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { inr, inrK, fmt, fmtY, fmtSmart, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, header, desktop, phone, rings } = L;

export const lede = () => {
  const next = L.byNext[0], top = L.byCost[0];
  return `You pay <b>${inr(L.MONTHLY)} a month</b> across <b>${L.ACTIVE.length} subscriptions</b>, or <b>${inr(L.YEARLY)} a year</b>. <b>${next.alias}</b> renews next, on <b>${fmtDow(L.nextRenewal(next))}</b>, and <b>${top.alias}</b> costs the most, at <b>${inr(L.monthlyEq(top))}</b> a month.`;
};

/** How far through its current cycle a subscription is: from the last renewal to the next. */
export function cycle(s) {
  const next = L.nextRenewal(s);
  const prev = L.addMonthsUTC(next, -L.STEP[s.billingCycle]);
  const total = L.daysBetween(prev, next), done = L.daysBetween(prev, L.TODAY);
  return { prev, next, frac: Math.max(0, Math.min(1, done / total)), left: L.daysBetween(L.TODAY, next) };
}
const nowKey = L.TODAY.slice(0, 7);
const monthPaid = L.paidByMonth(nowKey), monthToCome = L.expectedByMonth(nowKey);

function allTile({ selected = true, w = 270, h = 180, compact = false, nums = null } = {}) {
  const toCome = L.renewalsBetween(L.addDays(L.TODAY, 1), `${nowKey}-31`);
  const n = nums ?? { monthly: L.MONTHLY, active: L.ACTIVE.length, frac: monthPaid / (monthPaid + monthToCome), pill: `${toCome.length} to renew in Oct`, right: compact ? `Next ${fmt(L.nextRenewal(L.byNext[0]))}` : `${inr(monthPaid)} of ${inr(monthPaid + monthToCome)} paid` };
  return `<label for="c-sel-all" class="dtile${selected ? " sel" : ""}" style="width:${w}px;height:${h}px;background:radial-gradient(circle at 92% 6%, var(--card-emerald-glow), transparent 42%),linear-gradient(150deg,var(--card-emerald-from),var(--card-emerald-to))">
    ${rings(w, h, { dx: 10, dy: 19, first: 45, step: 26, stroke: "var(--rings-light)", opacity: 0.07, count: 10 })}
    <span class="tick">${I.check(11)}</span>
    <div class="between"><span style="display:flex">${L.I.subs(18)}</span><span class="dt-faint">${n.active} active</span></div>
    <div><div style="font-size:16px;font-weight:800">All subscriptions</div>
      <div class="between" style="margin-top:6px"><span class="dt-muted">${inr(n.monthly)} a month</span><span class="dt-muted" style="font-weight:700">${Math.round(n.frac * 100)}%</span></div>
      <div style="height:5px;border-radius:999px;background:var(--on-card-fill);overflow:hidden;margin-top:6px"><div style="width:${n.frac * 100}%;height:100%;background:var(--on-card-lime)"></div></div>
      <div class="between" style="margin-top:9px"><span class="dt-pill">${n.pill}</span><span class="dt-faint">${n.right}</span></div></div>
  </label>`;
}

function subTile(s, { w = 206, h = 180, selected = false } = {}) {
  const c = L.catColor(s.category);
  const cy = cycle(s);
  const on = L.isOn(s);
  const pill = !on ? `<span class="dt-pill">${s.status === "Paused" ? "Paused" : "Cancelled"}</span>` : `<span class="dt-pill${cy.left <= 3 ? " due" : cy.left <= 7 ? " soon" : ""}">${fmt(cy.next)} · ${cy.left === 0 ? "today" : `${cy.left}d`}</span>`;
  return `<label for="c-sel-${s.id}" class="dtile${selected ? " sel" : ""}${on ? "" : " off"}" style="width:${w}px;height:${h}px;background:linear-gradient(155deg,var(--card-${c}-from),var(--card-${c}-to))">
    ${rings(w, h, { dx: 10, dy: 19, first: 45, step: 26, stroke: "var(--rings-light)", opacity: 0.05, count: 8 })}
    <span class="tick">${I.check(11)}</span>
    <div class="between"><span style="width:26px;height:26px;border-radius:8px;background:var(--on-card-fill);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px">${s.alias[0]}</span><span class="dt-faint">${s.billingCycle}</span></div>
    <div><div style="font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.alias}</div>
      <div class="between" style="margin-top:6px"><span class="dt-muted">${inr(s.amount)} / ${L.cycleWord(s.billingCycle)}</span>${on ? `<span class="dt-muted" style="font-weight:700">${Math.round(cy.frac * 100)}%</span>` : ""}</div>
      <div style="height:5px;border-radius:999px;background:var(--on-card-fill);overflow:hidden;margin-top:6px"><div style="width:${on ? cy.frac * 100 : 0}%;height:100%;background:oklch(1 0 0 / 0.85)"></div></div>
      <div class="between" style="margin-top:9px">${pill}<span class="dt-faint" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${L.viaName(s.via)}</span></div></div>
  </label>`;
}

export function tileRow({ sel = "netflix", list = [...L.byNext, ...L.SUBS.filter((s) => !L.isOn(s))], tileW = 206, h = 180, add = true, nums = null } = {}) {
  return `<div style="position:relative;margin:0 -26px"><div class="tilerow" style="display:flex;gap:16px;overflow-x:auto;scrollbar-width:none;scroll-behavior:smooth;padding:12px 26px 18px">${allTile({ selected: sel === "all", h, nums })}${list.map((s) => subTile(s, { selected: sel === s.id, w: tileW, h })).join("")}${add ? `<span class="addtile" style="width:${tileW}px;height:${h}px">${I.plus(18)}Add subscription</span>` : ""}</div><span style="position:absolute;right:0;top:0;bottom:0;width:90px;background:linear-gradient(90deg,transparent,var(--surface));pointer-events:none"></span><span class="btn btn-icon tilerow-next" role="button" tabindex="0" style="position:absolute;right:20px;top:50%;transform:translateY(-50%)" aria-label="More subscriptions">${I.chevR(14)}</span></div>`;
}

function detailsCard(s, { phone: ph = false } = {}) {
  const c = L.catColor(s.category);
  const cy = cycle(s);
  const ch = L.priceChanges(s).at(-1);
  const pays = L.paymentsFor(s);
  const nexts = [0, 1, 2].map((i) => L.addMonthsUTC(cy.next, i * L.STEP[s.billingCycle]));
  return `<section class="card glass" style="padding:0;gap:0;overflow:hidden">
    <div class="textured" style="margin:10px;border-radius:18px;padding:18px 20px;color:var(--on-card);background:linear-gradient(150deg,var(--card-${c}-from),var(--card-${c}-to));box-shadow:var(--tile-shadow)">
      ${rings(560, 190, { dx: 10, dy: 20, first: 50, step: 28, stroke: "var(--rings-light)", opacity: 0.06 })}
      <div class="between"><span class="dt-muted" style="font-size:12px">${s.name} · ${s.category}</span><span class="dt-pill" style="font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px;background:var(--on-card-fill)">${s.billingCycle}</span></div>
      <div style="display:flex;align-items:baseline;gap:10px;margin-top:6px"><span style="font-size:${ph ? 30 : 34}px;font-weight:800">${inr(s.amount)}</span><span class="dt-muted" style="font-size:13px;font-weight:700">a ${L.cycleWord(s.billingCycle)} · ${inr(L.monthlyEq(s) * 12)} a year</span></div>
      <div style="margin-top:14px"><div class="between dt-muted" style="font-size:11px"><span>Last renewed ${fmt(cy.prev)}</span><span style="color:var(--on-card);font-weight:800">Renews ${fmtDow(cy.next)} · ${rel(cy.next)}</span></div>
        <div style="position:relative;height:8px;border-radius:999px;background:var(--on-card-fill);margin-top:7px;overflow:hidden"><div style="width:${cy.frac * 100}%;height:100%;border-radius:inherit;background:var(--on-card-lime)"></div></div></div>
    </div>
    <div style="padding:6px 20px 18px;display:grid;grid-template-columns:${ph ? "1fr" : "1fr 1fr"};gap:${ph ? "10px" : "12px 28px"};font-size:13px;flex:1 1 auto;align-content:space-between">
      <div class="between"><span class="muted" style="font-weight:600">Started</span><b>${fmtY(s.startDate)}</b></div>
      <div class="between"><span class="muted" style="font-weight:600">Paid so far</span><b>${inr(L.paidSoFar(s))} <span class="muted" style="font-weight:600">· ${pays.length}</span></b></div>
      <div class="between"><span class="muted" style="font-weight:600">Charged to</span>${cardChip(s.via)}</div>
      <div class="between"><span class="muted" style="font-weight:600">Last price change</span>${ch ? `<span class="chg chg-up">${I.up(10)}${inr(ch.to - ch.from)} on ${fmtSmart(ch.date)}</span>` : `<b>None</b>`}</div>
      <div style="grid-column:1/-1;display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;background:var(--fill);font-size:12px;font-weight:600;color:var(--muted)">${I.cal(13)}Next renewals<b style="color:var(--fg);margin-left:auto">${nexts.map(fmtSmart).join("  ·  ")}</b></div>
      <div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap">${ph ? `${btn("Mark paid", { kind: "primary", cls: "btn-sm grow", icon: I.check(11) })}${btn("Edit", { kind: "soft", cls: "btn-sm", icon: I.edit(11) })}${iconBtn(I.more(), "Pause or cancel")}` : `${btn("Mark paid", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}${btn("Edit", { kind: "soft", cls: "btn-sm", icon: I.edit(11) })}${btn("Pause", { kind: "soft", cls: "btn-sm", icon: I.pause(11) })}${btn("Cancel", { kind: "soft", cls: "btn-sm", icon: I.stop(11) })}`}</div>
    </div>
  </section>`;
}

function allDetails() {
  const toCome = L.renewalsBetween(L.addDays(L.TODAY, 1), `${nowKey}-31`);
  return `<section class="card glass" style="padding:0;gap:0;overflow:hidden">
    <div class="textured" style="margin:10px;border-radius:18px;padding:18px 20px;color:var(--on-card);background:radial-gradient(circle at 92% 6%, var(--card-emerald-glow), transparent 42%),linear-gradient(150deg,var(--card-emerald-from),var(--card-emerald-to));box-shadow:var(--tile-shadow)">
      ${rings(560, 190, { dx: 10, dy: 20, first: 50, step: 28, stroke: "var(--rings-light)", opacity: 0.07 })}
      <span class="dt-muted" style="font-size:12px">All subscriptions · ${L.ACTIVE.length} active</span>
      <div style="display:flex;align-items:baseline;gap:10px;margin-top:6px"><span style="font-size:34px;font-weight:800">${inr(L.MONTHLY)}</span><span class="dt-muted" style="font-size:13px;font-weight:700">a month · ${inr(L.YEARLY)} a year</span></div>
      <div style="margin-top:14px"><div class="between dt-muted" style="font-size:11px"><span>October so far</span><span style="color:var(--on-card);font-weight:800">${inr(monthPaid)} paid · ${inr(monthToCome)} to come</span></div>
      <div style="height:8px;border-radius:999px;background:var(--on-card-fill);margin-top:7px;overflow:hidden"><div style="width:${(monthPaid / (monthPaid + monthToCome)) * 100}%;height:100%;background:var(--on-card-lime)"></div></div></div>
    </div>
    <div style="padding:6px 20px 18px;display:flex;flex-direction:column;gap:12px;flex:1 1 auto">${P.categorySplit({ compact: true })}</div>
  </section>`;
}

export function paymentsPanel(s) {
  const pays = L.paymentsFor(s);
  const id = s.id;
  const rows = pays.slice(0, 6).map((p, i) => {
    const prev = pays[i + 1];
    const diff = prev ? p.amount - prev.amount : 0;
    return `<div style="display:grid;grid-template-columns:1.1fr 1fr 1fr 1.2fr 0.8fr;align-items:center;padding:11px 0;border-bottom:1px solid var(--divider);font-size:13px"><span style="font-weight:600">${fmtY(p.date)}</span><b class="num">${inr(p.amount)}</b><span>${diff ? `<span class="chg ${diff > 0 ? "chg-up" : "chg-down"}">${diff > 0 ? I.up(10) : I.down(10)}${inr(Math.abs(diff))} ${diff > 0 ? "more" : "less"}</span>` : `<span class="muted">—</span>`}</span><span>${cardChip(p.via)}</span><span style="text-align:right"><span class="pill pill-on">Paid</span></span></div>`;
  }).join("");
  return `<div class="cpay cpay-${id}"><div style="display:grid;grid-template-columns:1.1fr 1fr 1fr 1.2fr 0.8fr" class="th"><span>Paid on</span><span>Amount</span><span>Change</span><span>Charged to</span><span style="text-align:right">Status</span></div>${rows}
    <div class="between foot" style="padding-top:12px"><span class="card-note">Showing ${Math.min(6, pays.length)} of ${pays.length} · ${inr(L.paidSoFar(s))} paid since ${fmtSmart(s.startDate)}</span><span class="link">All renewals ${I.arrowR()}</span></div></div>`;
}

export function historyPanel(s) {
  const ch = L.priceChanges(s);
  return `<div class="chist chist-${s.id}" style="gap:12px;padding-top:6px">${P.priceStep(s, { w: 820, h: 210, pad: 30 })}<div class="legend">${ch.length ? ch.map((c) => `<span>${I.up(10)}<b>${inr(c.from)} → ${inr(c.to)}</b> on ${fmtY(c.date)}</span>`).join("") : "<span>The price hasn't changed.</span>"}</div></div>`;
}

export function allPayments() {
  return `<div class="cpay cpay-all"><div style="display:grid;grid-template-columns:1.6fr 1fr 1fr 1.2fr 0.8fr" class="th"><span>Subscription</span><span>Paid on</span><span>Amount</span><span>Charged to</span><span style="text-align:right">Status</span></div>${L.PAYMENTS.slice(0, 6).map((p) => { const s = L.sub(p.subId); return `<div style="display:grid;grid-template-columns:1.6fr 1fr 1fr 1.2fr 0.8fr;align-items:center;padding:9px 0;border-bottom:1px solid var(--divider);font-size:13px"><span class="row" style="gap:10px">${mono(s, 24)}<b style="font-weight:700">${s.alias}</b></span><span style="font-weight:600">${fmtSmart(p.date)}</span><b class="num">${inr(p.amount)}</b><span>${cardChip(p.via)}</span><span style="text-align:right"><span class="pill pill-on">Paid</span></span></div>`; }).join("")}<div class="between foot" style="padding-top:12px"><span class="card-note">The 6 most recent of ${L.PAYMENTS.length}</span><span class="link">View all renewals ${I.arrowR()}</span></div></div>`;
}

/** Month by month: bars for the last 12 months paid, and dashed bars for the next 6 expected. */
export function trend({ w = 1360, h = 300, past = 12, ahead = 6, phone: ph = false } = {}) {
  const pastKeys = L.monthsFrom(L.monthKey(L.addMonthsUTC(`${nowKey}-01`, -(past - 1))), past);
  const futKeys = L.monthsFrom(L.monthKey(L.addMonthsUTC(`${nowKey}-01`, 1)), ahead);
  const vals = [...pastKeys.map((k) => L.paidByMonth(k)), ...futKeys.map(L.expectedByMonth)];
  const keys = [...pastKeys, ...futKeys];
  const max = Math.ceil(Math.max(...vals, monthPaid + monthToCome) / 2000) * 2000;
  const plotH = h - 60, n = keys.length, gap = ph ? 6 : 14;
  const bw = (w - 50 - gap * (n - 1)) / n;
  const Y = (v) => (v / max) * plotH;
  const peak = vals.slice(0, past).indexOf(Math.max(...vals.slice(0, past)));
  const grid = [0, max / 2, max].map((v) => `<span style="position:absolute;left:0;right:0;bottom:${30 + Y(v)}px;border-top:1px ${v ? "dashed" : "solid"} var(--divider)"></span><span style="position:absolute;left:0;bottom:${30 + Y(v) + 4}px;font-size:10px;font-weight:700;color:var(--muted)">${inrK(v)}</span>`).join("");
  const avg = `<span style="position:absolute;left:44px;right:0;bottom:${30 + Y(L.MONTHLY)}px;border-top:1.5px dashed var(--accent-text);opacity:0.6"></span>`;
  const bars = keys.map((k, i) => {
    const v = vals[i], x = 50 + i * (bw + gap), bh = Math.max(4, Y(v));
    const future = i >= past, now = k === nowKey;
    const lvl = 2 + Math.min(3, Math.floor((v / max) * 4));
    const style = future ? `border:1.5px dashed var(--heat-upcoming);background:transparent` : `background:var(--heat-${lvl})${i === peak ? `;box-shadow:0 10px 22px var(--trend-peak-shadow)` : ""}${now ? `;outline:2px solid var(--accent);outline-offset:3px` : ""}`;
    return `<div style="position:absolute;left:${x}px;bottom:30px;width:${bw}px;height:${bh}px;border-radius:${ph ? 7 : 12}px ${ph ? 7 : 12}px 4px 4px;${style}" class="textured">${future ? "" : rings(60, 200, { dx: 6, dy: 14, first: 22, step: 14, stroke: lvl >= 4 ? "var(--rings-light)" : "var(--rings-ink)", opacity: 0.1 })}</div>
      ${now ? `<div style="position:absolute;left:${x}px;bottom:${30 + bh + 5}px;width:${bw}px;height:${Y(monthToCome) - 5}px;border:1.5px dashed var(--heat-4);border-radius:${ph ? 7 : 12}px ${ph ? 7 : 12}px 4px 4px"></div>` : ""}
      ${ph ? "" : `<span style="position:absolute;left:${x - 10}px;width:${bw + 20}px;bottom:${30 + bh + (now ? Y(monthToCome) : 0) + 6}px;text-align:center;font-size:11px;font-weight:800;color:${future ? "var(--muted)" : "var(--fg)"}">${now ? `${inrK(v)} + ${inrK(monthToCome)}` : inrK(v)}</span>`}
      <span style="position:absolute;left:${x}px;width:${bw}px;bottom:8px;text-align:center;font-size:${ph ? 10 : 12}px;font-weight:${now ? 800 : 600};color:${now ? "var(--fg)" : "var(--muted)"}">${ph ? L.monName(k)[0] : L.monName(k)}</span>`;
  }).join("");
  return `<div style="position:relative;height:${h}px;width:${w}px">${grid}${avg}${bars}</div>`;
}

export function selectionCss(ids) {
  return `<style>
    .cdir .c-in { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
    .cdir label.dtile { cursor: pointer; }
    .cdir .dpane, .cdir .cpay, .cdir .chist { display: none; }
    .cdir .dpane > section { flex: 1 1 auto; }
    ${ids.map((id) => `.cdir:has(#c-sel-${id}:checked) .dpane-${id} { display: flex; flex-direction: column; }
    .cdir:has(#c-sel-${id}:checked):has(#c-v-pay:checked) .cpay-${id}, .cdir:has(#c-sel-${id}:checked):has(#c-v-hist:checked) .chist-${id} { display: flex; flex-direction: column; flex: 1 1 auto; }
    .cdir:has(#c-sel-${id}:checked) label[for="c-sel-${id}"] { border: 1.5px solid var(--accent); box-shadow: var(--tile-shadow-selected); filter: none; opacity: 1; }
    .cdir:has(#c-sel-${id}:checked) label[for="c-sel-${id}"] .tick { display: flex; }`).join("\n")}
    .cdir:has(#c-sel-all:checked) .chist-all-note { display: block; }
    .cdir:has(#c-v-pay:checked) label[for="c-v-pay"], .cdir:has(#c-v-hist:checked) label[for="c-v-hist"] { background: var(--surface); color: var(--accent-text); box-shadow: 0 1px 3px oklch(0 0 0 / 0.14); }
    .cdir .c-seg { cursor: pointer; }
  </style>`;
}

export function cDesktop({ sel = "netflix" } = {}) {
  const ids = ["all", ...L.SUBS.map((s) => s.id)];
  const radios = ids.map((id) => `<input type="radio" class="c-in" name="c-sel" id="c-sel-${id}"${id === sel ? " checked" : ""}>`).join("") + `<input type="radio" class="c-in" name="c-v" id="c-v-pay" checked><input type="radio" class="c-in" name="c-v" id="c-v-hist">`;
  const panes = `<div class="dpane dpane-all">${allDetails()}</div>${L.SUBS.map((s) => `<div class="dpane dpane-${s.id}">${detailsCard(s)}</div>`).join("")}`;
  const right = `<section class="card glass"><div class="card-h"><span class="card-t">Payments</span><span class="seg"><label for="c-v-pay" class="seg-i c-seg">Payments</label><label for="c-v-hist" class="seg-i c-seg">Price history</label></span></div>
    ${allPayments()}<div class="chist chist-all"><p class="card-note" style="padding:40px 0;text-align:center">Pick a subscription to see what each of its payments cost.</p></div>
    ${L.SUBS.map((s) => paymentsPanel(s) + historyPanel(s)).join("")}</section>`;
  const body = `${selectionCss(ids)}<div class="cdir" style="display:flex;flex-direction:column;gap:20px">${radios}
    ${header({ lede: lede(), actions: L.headerActions() })}
    ${tileRow({ sel: "" })}
    <div style="display:grid;grid-template-columns:minmax(0,0.95fr) minmax(0,1.25fr);gap:20px;align-items:stretch">${panes}${right}</div>
    <div style="display:grid;grid-template-columns:minmax(0,2.2fr) minmax(0,1fr);gap:20px;align-items:stretch">
      <section class="card glass"><div class="card-h"><span class="card-t">Month by month<small>paid, and what's expected next</small></span><span class="legend"><span><i style="background:var(--heat-3)"></i>Paid</span><span><i style="border:1.5px dashed var(--heat-upcoming)"></i>Expected</span><span><i style="border-top:1.5px dashed var(--accent-text);height:0;border-radius:0;width:14px"></i>A usual month, <b>${inr(L.MONTHLY)}</b></span></span></div>${trend({ w: 930, h: 280 })}</section>
      <section class="card glass"><div class="card-h"><span class="card-t">Costs the most<small>a month</small></span></div>${costList(5)}</section>
    </div>
  </div>`;
  return desktop({ h: "auto", body });
}

function costList(n) {
  const top = L.monthlyEq(L.byCost[0]);
  return `<div class="spread" style="gap:13px">${L.byCost.slice(0, n).map((s) => `<div><div class="between" style="font-size:13px"><span class="row" style="gap:10px">${mono(s, 24)}<b style="font-weight:700">${s.alias}</b></span><span class="row" style="gap:8px"><span class="muted" style="font-size:11px;font-weight:700">${L.pct(L.monthlyEq(s), L.MONTHLY)}</span><b class="num">${inr(L.monthlyEq(s))}</b></span></div><div class="track" style="margin-top:6px"><span style="width:${(L.monthlyEq(s) / top) * 100}%;background:var(--card-${L.catColor(s.category)})"></span></div></div>`).join("")}<span class="link foot">All ${L.ACTIVE.length} ${I.arrowR()}</span></div>`;
}

export function cPhone() {
  const s = L.sub("netflix");
  const pays = L.paymentsFor(s);
  const body = `${header({ lede: lede(), phone: true, actions: `${btn("Add subscription", { kind: "primary", icon: I.plus() })}${btn("Record payment")}` })}
    <div style="margin:0 -16px;overflow:hidden"><div style="display:flex;gap:12px;padding:10px 16px 16px">${allTile({ selected: false, w: 230, h: 164, compact: true })}${L.byNext.slice(0, 3).map((x) => subTile(x, { selected: x.id === "netflix", w: 180, h: 164 })).join("")}</div></div>
    ${detailsCard(s, { phone: true })}
    <section class="card glass" style="padding:16px;gap:4px"><div class="between"><span class="card-t">Payments</span><span class="seg" style="transform:scale(0.92);transform-origin:right"><span class="seg-i on">Payments</span><span class="seg-i">Price</span></span></div>${P.paymentRows(s, 5, { phone: true })}<div class="between" style="padding-top:10px"><span class="card-note">${pays.length} payments · ${inr(L.paidSoFar(s))}</span><span class="link">All ${I.arrowR()}</span></div></section>
    <section class="card glass" style="padding:16px;gap:10px"><div class="between"><span class="card-t">Month by month</span><span class="legend" style="font-size:11px"><span><i style="background:var(--heat-3)"></i>Paid</span><span><i style="border:1.5px dashed var(--heat-upcoming)"></i>Expected</span></span></div>${trend({ w: 324, h: 190, past: 6, ahead: 6, phone: true })}</section>`;
  return phone({ h: "auto", body });
}
