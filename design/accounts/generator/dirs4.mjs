// Directions O–T, round 3: more of what Prathik kept from round 2 (F passbook, K diary, L T-accounts, M slips),
// each built on a different piece of banking paperwork. O Consolidated statement, P Khata, Q Receipts,
// R Annual report, S Planner, T General ledger.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as U from "./uniq.mjs";
const { inr, signed, inrS, fmt, fmtY, fmtDow, monName, monFull, I, btn, iconBtn, rings, grad, mono, desktop, phone } = L;
const { IDS, FACTS, ORDER, panes } = P;

const two = (a, b, ratio = "1fr 1fr") => `<div style="display:grid;grid-template-columns:${ratio.split(" ").map((x) => `minmax(0,${x})`).join(" ")};gap:20px;align-items:stretch">${a}${b}</div>`;
const card = (inner, style = "") => `<section class="card glass" style="${style}">${inner}</section>`;
const head = (title, sub = "", right = "") => `<div class="card-h"><span class="card-t">${title}${sub ? `<small>${sub}</small>` : ""}</span>${right}</div>`;
const MONO = "font-family:'JetBrains Mono',ui-monospace,monospace";
const SERIF = "font-family:'Newsreader',Georgia,'Times New Roman',serif";
const ACTIVE = ORDER.filter((a) => L.isOn(a));
const t = (iso) => Date.parse(`${iso}T00:00:00Z`);
const m2 = (n) => `${n < 0 ? "−" : ""}${Math.round(Math.abs(n)).toLocaleString("en-IN")}.00`;
const ddmmyy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
const ddmmyyyy = (iso) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
/** This year's recorded flows and the remainder, for one account or all. */
function year(id) {
  const months = L.YEAR.map((k) => L.monthFlows(k, id));
  const list = months.flatMap((m) => m.list);
  return { list, inn: L.sumIn(list), out: L.sumOut(list), other: months.reduce((s, m) => s + m.other, 0), open: L.yearStart(id ?? undefined), close: id ? (L.isOn(L.acc(id)) ? L.latest(id).balance : 0) : L.TOTAL };
}
const showing = () => `<span class="row" style="gap:8px"><span class="card-note">Showing</span>${panes((f) => `<span class="chip" style="gap:8px">${f.all ? L.allMono(18) : mono(f.a, 18)}${f.short}</span>`)}</span>`;

// ================= O · Consolidated statement =================
// One printed statement for every account: a summary of accounts, a month-end chart, and the picked account's statement.
export function summaryTable(prefix, { ph = false } = {}) {
  const cols = ph ? "1.3fr 1fr" : "1.6fr 1fr 1fr 1fr 1fr 1fr 0.9fr";
  const headRow = ph ? ["Account", "Closing"] : ["Account", "Opening 01-01-26", "Credits", "Debits", "Not recorded", "Closing", "Confirmed"];
  const row = (a) => { const f = FACTS[a.id], y = year(a.id); return `<label for="${prefix}-sel-${a.id}" class="osr osr-${a.id}" style="display:grid;grid-template-columns:${cols};gap:12px;align-items:center;padding:9px 10px;margin:0 -10px;border-radius:8px;cursor:pointer;border-bottom:1px solid var(--divider);font-size:12.5px"><span class="row" style="gap:9px;min-width:0">${mono(a, 24)}<span style="min-width:0"><b style="display:block;font-size:13px">${a.name}</b><span class="sub2">${a.bank} · ${f.on ? a.accountType : "closed"}</span></span></span>${ph ? `<span style="text-align:right"><b style="${MONO}">${m2(y.close)}</b><span class="sub2" style="color:${f.stale ? "var(--warning-text)" : ""}">${f.on ? ddmmyy(f.asOf) : "closed"}</span></span>` : `<span style="${MONO};text-align:right">${m2(y.open)}</span><span style="${MONO};text-align:right;color:var(--positive)">${y.inn ? m2(y.inn) : "—"}</span><span style="${MONO};text-align:right">${y.out ? m2(y.out) : "—"}</span><span style="${MONO};text-align:right;color:var(--muted);font-style:italic">${m2(y.other)}</span><b style="${MONO};text-align:right">${m2(y.close)}</b><span style="${MONO};text-align:right;color:${f.stale ? "var(--warning-text)" : "var(--muted)"};font-size:11.5px">${f.on ? ddmmyy(f.asOf) : "closed"}${f.stale ? " ✱" : ""}</span>`}</label>`; };
  const all = year(null);
  return `<div style="display:grid;grid-template-columns:${cols};gap:12px;padding:0 0 8px;border-bottom:1.5px solid var(--fg)">${headRow.map((h, i) => `<span class="th" style="${i ? "text-align:right" : ""}">${h}</span>`).join("")}</div>${ORDER.map(row).join("")}
    <label for="${prefix}-sel-all" class="osr osr-all" style="display:grid;grid-template-columns:${cols};gap:12px;align-items:center;padding:11px 10px;margin:0 -10px;border-radius:8px;cursor:pointer;font-size:13px"><b>Total, ${L.ACTIVE.length} accounts</b>${ph ? `<b style="${MONO};text-align:right;border-bottom:3px double var(--fg)">${m2(all.close)}</b>` : `<b style="${MONO};text-align:right">${m2(all.open)}</b><b style="${MONO};text-align:right;color:var(--positive)">${m2(all.inn)}</b><b style="${MONO};text-align:right">${m2(all.out)}</b><b style="${MONO};text-align:right;color:var(--muted)">${m2(all.other)}</b><b style="${MONO};text-align:right;border-bottom:3px double var(--fg);justify-self:end">${m2(all.close)}</b><span></span>`}</label>`;
}
export function monthEnds(f, { w = 1300, h = 180, ph = false } = {}) {
  const keys = L.YEAR, vals = keys.map((k) => (f.all ? L.totalAtMonth(k) : L.atMonth(f.id, k) ?? 0));
  const max = Math.max(...vals) * 1.15, padL = 8, padR = 8, padT = 22, padB = 22, slot = (w - padL - padR) / keys.length, bw = Math.min(ph ? 14 : 30, slot * 0.4);
  const Y = (v) => padT + (1 - v / max) * (h - padT - padB), ink = f.all ? "var(--fg)" : `var(--card-${f.color})`;
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${f.name}: balance at each month's end">${[0.33, 0.66, 1].map((p) => `<line x1="${padL}" x2="${w - padR}" y1="${Y(max * p / 1.15)}" y2="${Y(max * p / 1.15)}" stroke="var(--divider)" stroke-dasharray="1 4"></line>`).join("")}${vals.map((v, i) => { const x = padL + slot * i + slot / 2, last = i === keys.length - 1, staleBar = f.stale && keys[i] > L.monthKey(f.asOf); return `<rect x="${x - bw / 2}" y="${Y(v)}" width="${bw}" height="${h - padB - Y(v)}" fill="${staleBar ? "url(#hatch)" : last ? "none" : ink}" stroke="${last || staleBar ? ink : "none"}" stroke-width="1.5" opacity="${last ? 1 : 0.85}"></rect>${ph ? "" : `<text x="${x}" y="${Y(v) - 6}" text-anchor="middle" style="${MONO}" font-size="10" font-weight="700" fill="var(--muted)">${inrS(v)}</text>`}<text x="${x}" y="${h - 6}" text-anchor="middle" style="${MONO}" font-size="10" fill="${last ? "var(--fg)" : "var(--muted)"}">${ph && i % 3 ? "" : monName(keys[i]).toUpperCase()}</text>`; }).join("")}</svg>`;
}
function statementPane(f, { ph = false } = {}) {
  if (f.all) {
    const rows = ACTIVE.flatMap((a) => U.entries(a.id, L.snapsOf(a.id).filter((s) => s.date < "2026-10-01").at(-1).date).rows.filter((r) => r.kind !== "bf" && r.date >= "2026-10-01").map((r) => ({ ...r, a }))).sort((x, y) => (x.date < y.date ? 1 : -1)).slice(0, 12);
    return `<div class="between" style="margin-bottom:8px"><b style="font-size:14px">Entries this month, every account</b><span class="card-note">Pick an account in the summary for its full statement</span></div>${stmtRows(rows, { ph, withAccount: true })}`;
  }
  const s = L.snapsOf(f.id), from = (s.at(-3) ?? s[0]).date, e = U.entries(f.id, from, f.on ? L.TODAY : f.closedOn);
  return `<div class="between" style="margin-bottom:8px"><b style="font-size:14px">Statement of account · ${f.name}</b><span style="${MONO};font-size:11.5px;color:var(--muted)">${ddmmyyyy(from)} to ${ddmmyyyy(f.on ? L.TODAY : f.closedOn)}</span></div>${stmtRows(e.rows, { ph })}${f.stale ? `<div class="notice" style="margin-top:10px">${I.clock(14)}<span class="grow">✱ No balance confirmed since <b>${fmt(f.asOf)}</b>. Everything after it is carried.</span>${btn("Update", { kind: "primary", cls: "btn-xs" })}</div>` : ""}`;
}
export function stmtRows(rows, { ph = false, withAccount = false } = {}) {
  const cols = ph ? "62px 1fr 92px" : withAccount ? "86px 1.6fr 1fr 1fr 1fr" : "86px 1.8fr 1fr 1fr 1.1fr";
  const hd = ph ? ["Date", "Particulars", "Balance"] : ["Date", "Particulars", "Debit", "Credit", "Balance"];
  return `<div style="display:grid;grid-template-columns:${cols};gap:10px;padding:0 0 6px;border-bottom:1.5px solid var(--fg)">${hd.map((x, i) => `<span class="th" style="${i > 1 ? "text-align:right" : ""}">${x}</span>`).join("")}</div>${rows.map((r) => `<div style="display:grid;grid-template-columns:${cols};gap:10px;padding:7px 0;border-bottom:1px solid var(--divider);font-size:12.5px;align-items:center"><span style="${MONO};color:var(--muted);font-size:11.5px">${ddmmyy(r.date)}</span><span style="font-weight:${r.fact ? 800 : 600};${r.kind === "other" ? "color:var(--muted);font-style:italic" : ""};min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${withAccount ? `<span class="sub2" style="display:inline;margin-right:6px">${r.a.name} ·</span>` : ""}${r.kind === "snap" ? "Balance confirmed" : r.text}</span>${ph ? "" : `<span style="${MONO};text-align:right">${r.wd ? m2(r.wd) : ""}</span><span style="${MONO};text-align:right;color:var(--positive)">${r.dep ? m2(r.dep) : ""}</span>`}<span style="${MONO};text-align:right;font-weight:${r.fact ? 800 : 500};${r.fact ? "" : "color:var(--muted)"}">${m2(r.bal)} Cr</span></div>`).join("")}`;
}
const oSel = (dsel, id) => `${dsel} .osr-${id} { background: ${P.selTint(id, 16)}; box-shadow: inset 4px 0 0 var(--card-${P.hue(id)}); }`;
function statementSheet(prefix, { ph = false } = {}) {
  return `<section class="card on-paper" style="background:var(--surface);border:1px solid var(--surface-line);box-shadow:0 1px 2px oklch(0 0 0 / 0.05), 0 24px 60px oklch(0 0 0 / 0.3);padding:${ph ? "18px 16px" : "36px 44px"};gap:${ph ? 16 : 22}px;border-radius:${ph ? 18 : 10}px;position:relative;overflow:hidden">
    <div style="position:absolute;left:0;right:0;top:0;height:6px;background:${grad("emerald", 90)}"></div>
    <div class="between" style="align-items:flex-start;gap:16px;flex-wrap:wrap"><div class="row" style="gap:12px;align-items:flex-start">${L.allMono(ph ? 34 : 44)}<div><b style="display:block;font-size:${ph ? 17 : 22}px;font-weight:800">Consolidated statement of accounts</b><span style="${MONO};font-size:11.5px;color:var(--muted)">01-01-2026 to 21-10-2026 · prepared 21-10-2026 for Prathik</span></div></div>${ph ? "" : `<div style="text-align:right;border:1.5px solid var(--fg);border-radius:8px;padding:10px 16px"><span class="th">Closing balance</span><b style="display:block;${MONO};font-size:24px;font-weight:800">${m2(L.TOTAL)} Cr</b><span class="sub2">${L.ACTIVE.length} accounts · ${signed(L.sinceJan())} this year</span></div>`}</div>
    <div><div class="between" style="margin-bottom:10px"><b style="font-size:14px">Summary of accounts</b>${L.derivedTag("Credits and debits worked out")}</div>${summaryTable(prefix, { ph })}</div>
    <div><div class="between" style="margin-bottom:4px"><b style="font-size:14px">Balance at each month's end</b>${ph ? "" : showing()}</div>${panes((f) => monthEnds(f, { w: ph ? 330 : 1290, h: ph ? 130 : 180, ph }))}</div>
    <div>${panes((f) => statementPane(f, { ph }))}</div>
    <div class="between" style="padding-top:12px;border-top:1px solid var(--divider);gap:12px;flex-wrap:wrap"><span style="${MONO};font-size:10.5px;color:var(--muted);max-width:900px;line-height:1.6">Only confirmed balances are facts. Credits and debits come from your income, card bills, subscriptions, EMIs and trades; "not recorded" is what closes each gap. Not a bank statement. ✱ not confirmed in 30 days.</span><span style="${MONO};font-size:10.5px;color:var(--muted)">Page 1 of 1</span></div></section>`;
}
export function oDesktop() {
  const pk = P.picker("o", oSel);
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${P.greenStage(statementSheet("o"), { pad: "34px 40px 40px" })}${pk.close}` });
}
export function oPhone() {
  const pk = P.picker("op", oSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${P.greenStage(statementSheet("op", { ph: true }), { ph: true, pad: "12px" })}${pk.close}` });
}

// ================= P · Khata =================
// A red-bound ledger book of tall, narrow pages, one per account, written month by month; jama and kharch below.
const RED = "oklch(0.5 0.17 25)";
function khataPage(prefix, a, { ph = false, months = ["2026-10", "2026-09"] } = {}) {
  const f = FACTS[a.id];
  const line = (label, v, { em = false, other = false, sign = "" } = {}) => `<div class="between" style="gap:6px;padding:4px 0;border-bottom:1px solid color-mix(in srgb, ${RED} 22%, transparent);font-size:12px;${other ? "color:var(--muted);font-style:italic" : ""}"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:${em ? 800 : 600}">${label}</span><b style="${MONO};font-size:11.5px;font-weight:${em ? 800 : 600};white-space:nowrap;${sign === "+" ? "color:var(--positive)" : ""}">${sign}${Math.round(Math.abs(v)).toLocaleString("en-IN")}</b></div>`;
  const month = (key) => {
    const m = L.monthFlows(key, a.id);
    if (!f.on && key > L.monthKey(f.closedOn)) return "";
    const ins = m.list.filter((x) => L.KINDS[x.kind].dir === "in"), outs = m.list.filter((x) => L.KINDS[x.kind].dir === "out");
    const stale = f.stale && key > L.monthKey(f.asOf);
    return `<div style="margin-top:10px"><div style="${SERIF};font-style:italic;font-size:15px;font-weight:600;color:${RED};margin-bottom:2px">${monFull(key)}</div>${line("Brought forward", m.start)}${ins.map((x) => line(x.label, x.amount, { sign: "+" })).join("")}${outs.map((x) => line(x.label, x.amount, { sign: "−" })).join("")}${m.other ? line("Not recorded", m.other, { other: true, sign: m.other > 0 ? "+" : "−" }) : ""}${stale ? `<div style="padding:4px 0;font-size:11px;font-weight:700;color:var(--warning-text)">${I.clock(9)} Not checked · carried</div>` : ""}<div class="between" style="padding:5px 0 2px;border-bottom:3px double ${RED}"><b style="font-size:12px">Carried</b><b style="${MONO};font-size:12.5px">${Math.round(m.end).toLocaleString("en-IN")}</b></div></div>`;
  };
  return `<label for="${prefix}-sel-${a.id}" class="kp kp-${a.id} acm ac-${a.id}" style="cursor:pointer;position:relative;min-width:${ph ? "214px" : "0"};display:flex;flex-direction:column;padding:16px 14px 14px 22px;background:oklch(0.99 0.004 25);background-image:linear-gradient(90deg, transparent 12px, color-mix(in srgb, ${RED} 45%, transparent) 12px, color-mix(in srgb, ${RED} 45%, transparent) 13.5px, transparent 13.5px, transparent 16px, color-mix(in srgb, ${RED} 45%, transparent) 16px, color-mix(in srgb, ${RED} 45%, transparent) 17.5px, transparent 17.5px);box-shadow:inset 0 0 0 1px color-mix(in srgb, ${RED} 18%, transparent), 0 6px 14px oklch(0 0 0 / 0.12);border-radius:4px;transition:transform 220ms var(--ease-out), box-shadow 220ms${f.on ? "" : ";opacity:0.72"}">
    <div class="row" style="gap:8px">${mono(a, 22)}<b style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</b></div><span class="sub2" style="margin-left:30px">${a.bank} · ${f.on ? a.accountType : "closed"}</span>
    <div style="margin-top:8px;color:${RED}">${P.spark(a.id, { w: ph ? 176 : 180, h: 26, stroke: "currentColor", width: 1.6, dots: true, keys: f.on ? L.LAST12 : L.HISTORY })}</div>
    <b style="display:block;${MONO};font-size:17px;margin-top:4px">${f.on ? inr(f.balance) : "₹0"}</b>
    ${f.on ? months.map(month).join("") : `<div style="margin-top:10px;${SERIF};font-style:italic;font-size:15px;color:${RED}">Closed ${fmtY(f.closedOn)}</div>${line("Last balance", 0, { em: true })}<p class="card-note" style="margin-top:8px">Its pages stay in the book.</p>`}
    <span class="foot" style="margin-top:12px;font-size:12px;font-weight:800;color:${RED}">${f.on ? `${I.plus(11)} Write today's balance` : `${I.play(10)} Reopen`}</span></label>`;
}
function butterfly(f, { w = 1368, ph = false } = {}) {
  const keys = L.YEAR, rowH = ph ? 22 : 30, h = keys.length * rowH + 30, mid = w / 2, lab = ph ? 34 : 60;
  const ms = keys.map((k) => L.monthFlows(k, f.all ? null : f.id));
  const max = Math.max(...ms.map((m) => Math.max(m.in + Math.max(m.other, 0), m.out + Math.max(-m.other, 0))), 1);
  const S = (v) => (v / max) * (mid - lab - (ph ? 8 : 90));
  const rows = ms.map((m, i) => { const y = 18 + i * rowH, bh = rowH - (ph ? 8 : 10), inn = S(m.in), innO = S(Math.max(m.other, 0)), out = S(m.out), outO = S(Math.max(-m.other, 0));
    return `<g><text x="${mid}" y="${y + bh / 2 + 4}" text-anchor="middle" style="${SERIF}" font-style="italic" font-size="${ph ? 11 : 13}" font-weight="600" fill="${RED}">${monName(keys[i])}</text>
      <rect x="${mid + lab / 2}" y="${y}" width="${inn}" height="${bh}" rx="3" fill="oklch(0.62 0.12 150)"></rect>${innO ? `<rect x="${mid + lab / 2 + inn}" y="${y}" width="${innO}" height="${bh}" fill="url(#hatch-grey)"></rect>` : ""}
      <rect x="${mid - lab / 2 - out}" y="${y}" width="${out}" height="${bh}" rx="3" fill="${RED}" opacity="0.85"></rect>${outO ? `<rect x="${mid - lab / 2 - out - outO}" y="${y}" width="${outO}" height="${bh}" fill="url(#hatch-grey)"></rect>` : ""}
      ${ph ? "" : `<text x="${mid + lab / 2 + inn + innO + 8}" y="${y + bh / 2 + 4}" style="${MONO}" font-size="10.5" font-weight="700" fill="var(--positive)">+${inrS(m.in)}</text><text x="${mid - lab / 2 - out - outO - 8}" y="${y + bh / 2 + 4}" text-anchor="end" style="${MONO}" font-size="10.5" font-weight="700" fill="${RED}">−${inrS(m.out)}</text><text x="${w - 4}" y="${y + bh / 2 + 4}" text-anchor="end" style="${MONO}" font-size="10.5" font-weight="800" fill="${m.delta >= 0 ? "var(--positive)" : "var(--negative)"}">${signed(m.delta)}</text>`}</g>`; }).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${f.name}: what went out and came in, month by month"><text x="${mid - lab / 2 - 8}" y="10" text-anchor="end" font-size="10.5" font-weight="800" fill="${RED}" letter-spacing="0.06em">WENT OUT (KHARCH)</text><text x="${mid + lab / 2 + 8}" y="10" font-size="10.5" font-weight="800" fill="oklch(0.45 0.12 150)" letter-spacing="0.06em">CAME IN (JAMA)</text>${ph ? "" : `<text x="${w - 4}" y="10" text-anchor="end" font-size="10.5" font-weight="800" fill="var(--muted)" letter-spacing="0.06em">CHANGE</text>`}${rows}</svg>`;
}
const pSel = (dsel, id) => `${dsel} .kp-${id} { transform: translateY(-6px); box-shadow: 0 0 0 3px oklch(0.16 0.05 160 / 0.6), 0 0 0 6px ${P.selSoft(id)}, 0 16px 30px oklch(0 0 0 / 0.3); }`;
function khataBook(prefix, { ph = false } = {}) {
  const cloth = `radial-gradient(circle at 20% 0%, oklch(0.46 0.11 156), oklch(0.24 0.07 162) 70%)`;
  const pages = ORDER.map((a) => khataPage(prefix, a, { ph })).join("");
  return `<section class="card" style="padding:${ph ? "14px" : "22px 24px 24px"};gap:14px;background:${cloth};border-radius:${ph ? 18 : 24}px;box-shadow:var(--card-shadow);position:relative;overflow:hidden;--fg:oklch(0.19 0.008 260)"><span style="position:absolute;inset:8px;border:1.5px dashed oklch(1 0 0 / 0.3);border-radius:${ph ? 12 : 18}px;pointer-events:none"></span>
    <div class="between" style="color:oklch(0.97 0.02 60);position:relative;gap:12px;flex-wrap:wrap"><span><span style="${SERIF};font-size:${ph ? 22 : 30}px;font-weight:700;font-style:italic">Khata · 2026</span><span style="display:block;font-size:12.5px;font-weight:600;opacity:0.75">a page for each account · brought forward, what came in and went out, carried</span></span>${ph ? "" : `<span class="row" style="gap:8px"><label for="${prefix}-sel-all" class="btn btn-sm" style="background:oklch(1 0 0 / 0.16);color:white;cursor:pointer">All · ${inr(L.TOTAL)}</label>${btn("Update balances", { kind: "primary", cls: "btn-sm", icon: I.check(11), style: "background:oklch(0.97 0.02 60);color:var(--card-emerald-to)" })}</span>`}</div>
    <div style="position:relative;display:${ph ? "flex" : "grid"};${ph ? "overflow-x:auto;gap:10px;margin:0 -14px;padding:4px 14px 8px;scrollbar-width:none" : "grid-template-columns:repeat(6,minmax(0,1fr));gap:12px"};align-items:stretch">${pages}</div></section>`;
}
export function pDesktop() {
  const pk = P.picker("p", pSel);
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${khataBook("p")}${card(`${head("Jama and kharch", "this year, month by month · what came in on the right, went out on the left · hatched isn't recorded", showing())}${panes((f) => butterfly(f))}`, "gap:12px")}${pk.close}` });
}
export function pPhone() {
  const pk = P.picker("pp", pSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${khataBook("pp", { ph: true })}${card(`${head("Jama and kharch")}${panes((f) => butterfly(f, { w: 330, ph: true }))}`, "padding:16px;gap:10px")}${pk.close}` });
}

// ================= Q · Receipts =================
// Every check-in prints a receipt: today's is the hero, earlier ones sit beside it, and a receipt tape charts the months.
const zigzag = (teeth = 28, d = 7) => { const top = [], bot = []; for (let i = 0; i <= teeth; i++) { const x = (i / teeth) * 100; top.push(`${x.toFixed(2)}% ${i % 2 ? 0 : d}px`); bot.push(`${(100 - x).toFixed(2)}% calc(100% - ${i % 2 ? 0 : d}px)`); } return `polygon(${top.join(",")},${bot.join(",")})`; };
export function barcode(seed, { w = 200, h = 36 } = {}) {
  let x = 0, out = "", k = 0; const codes = [...(seed + "chaicoffeefund")].map((c) => c.charCodeAt(0));
  while (x < w) { const bw = 1 + (codes[k % codes.length] % 3), g = 1 + (codes[(k * 7) % codes.length] % 3); out += `<rect x="${x}" y="0" width="${bw}" height="${h}" fill="currentColor"></rect>`; x += bw + g; k++; }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="display:block;margin:0 auto">${out}</svg>`;
}
const leader = (l, r, { bold = false, color = "" } = {}) => `<div style="display:flex;align-items:baseline;gap:6px;font-size:12.5px;${bold ? "font-weight:800" : ""}${color ? `;color:${color}` : ""}"><span style="white-space:nowrap">${l}</span><span style="flex:1;border-bottom:1.5px dotted currentColor;opacity:0.35;transform:translateY(-3px)"></span><span style="white-space:nowrap">${r}</span></div>`;
const paper = (inner, { w = "100%", rot = 0, pad = "26px 22px", z = 1, style = "" } = {}) => `<div style="position:relative;z-index:${z};width:${w};transform:rotate(${rot}deg);filter:drop-shadow(0 10px 18px oklch(0 0 0 / 0.14));${style}"><div style="clip-path:${zigzag()};background:linear-gradient(180deg, oklch(0.995 0.003 90), oklch(0.975 0.006 90));padding:${pad};${MONO};color:oklch(0.25 0.01 260)">${inner}</div></div>`;
export function todayReceipt(prefix, { ph = false } = {}) {
  const lines = ORDER.filter((a) => L.isOn(a)).map((a) => { const f = FACTS[a.id]; return `<label for="${prefix}-sel-${a.id}" class="rq rq-${a.id}" style="display:block;cursor:pointer;padding:5px 6px;margin:0 -6px;border-radius:6px">${leader(`${a.name.toUpperCase()}${f.stale ? " ✱" : ""}`, m2(f.balance), { bold: true })}<div style="display:flex;justify-content:space-between;font-size:11px;color:${f.stale ? "oklch(0.47 0.1 70)" : "oklch(0.5 0.01 260)"};margin-top:1px"><span>${f.stale ? `LAST READ ${ddmmyy(f.asOf)} · ${L.daysBetween(f.asOf, L.TODAY)} DAYS` : `READ ${ddmmyy(f.asOf)}`}</span><span>${signed(f.chg).replace("₹", "")}</span></div></label>`; }).join("");
  const since = L.monthFlows("2026-10").delta;
  return paper(`<div style="text-align:center;display:flex;flex-direction:column;gap:3px"><b style="font-size:15px;letter-spacing:0.12em">CHAICOFFEEFUND</b><span style="font-size:11.5px;letter-spacing:0.18em">BALANCE CHECK</span><span style="font-size:11.5px">21/10/2026 · 09:41 · NO. 024</span></div>
    <div style="border-top:1.5px dashed currentColor;opacity:0.4;margin:14px 0 10px"></div>${lines}
    <div style="border-top:1.5px dashed currentColor;opacity:0.4;margin:10px 0"></div>${leader("TOTAL", m2(L.TOTAL), { bold: true })}<div style="height:4px"></div>${leader("SINCE 30/09", signed(since).replace("₹", ""))}${leader("SINCE 01/01", signed(L.sinceJan()).replace("₹", ""))}
    <div style="border-top:1.5px dashed currentColor;opacity:0.4;margin:10px 0"></div><div style="font-size:11.5px;line-height:1.55;text-align:center;color:oklch(0.47 0.1 70)">✱ NOT READ IN 30 DAYS<br>UPDATE SBI RAINY DAY TO<br>COMPLETE THIS CHECK</div>
    <div style="margin:14px 0 6px">${barcode("check-024", { w: ph ? 200 : 230 })}</div><div style="text-align:center;font-size:10.5px;letter-spacing:0.2em">0024 · 211026</div>`, { pad: ph ? "24px 18px" : "30px 26px" });
}
const pastDates = ["2026-09-30", "2026-08-31", "2026-07-31", "2026-06-30"];
function pastReceipt(d, i, { ph = false } = {}) {
  const tot = L.totalOn(d), lines = ACTIVE.map((a) => leader(a.bank.split(" ")[0].toUpperCase(), inrS(L.balanceOn(a.id, d) ?? 0).replace("₹", ""))).join("");
  return paper(`<div style="text-align:center;font-size:10.5px;letter-spacing:0.14em"><b>BALANCE CHECK</b><br>${ddmmyy(d)}</div><div style="border-top:1.5px dashed currentColor;opacity:0.4;margin:8px 0"></div><div style="display:flex;flex-direction:column;gap:2px;font-size:11px">${lines.replace(/font-size:12.5px/g, "font-size:11px")}</div><div style="border-top:1.5px dashed currentColor;opacity:0.4;margin:8px 0"></div>${leader("TOTAL", inrS(tot).replace("₹", ""), { bold: true }).replace("font-size:12.5px", "font-size:12px")}`, { pad: "18px 14px", rot: [-2, 1.5, -1, 2][i], style: ph ? "flex-shrink:0;width:150px" : "" });
}
function tape(f, { w = 900, h = 210, ph = false } = {}) {
  const keys = L.LAST12, vals = keys.map((k) => (f.all ? L.totalAtMonth(k) : L.atMonth(f.id, k) ?? 0)), max = Math.max(...vals) * 1.12;
  const padL = 10, padR = 10, padT = 26, padB = 26, slot = (w - padL - padR) / keys.length, bw = slot * 0.5;
  const Y = (v) => padT + (1 - v / max) * (h - padT - padB);
  const blocks = vals.map((v, i) => { const x = padL + slot * i + slot / 2, top = Y(v), n = Math.max(1, Math.round((h - padB - top) / 7)); return `${Array.from({ length: n }, (_, j) => `<rect x="${x - bw / 2}" y="${h - padB - (j + 1) * 7 + 1}" width="${bw}" height="5.5" fill="${f.stale && keys[i] > L.monthKey(f.asOf) ? "oklch(0.72 0.14 75)" : "oklch(0.25 0.01 260)"}" opacity="${0.35 + 0.65 * ((j + 1) / n)}"></rect>`).join("")}${ph ? "" : `<text x="${x}" y="${top - 6}" text-anchor="middle" style="${MONO}" font-size="10" font-weight="700" fill="oklch(0.3 0.01 260)">${inrS(v).replace("₹", "")}</text>`}<text x="${x}" y="${h - 8}" text-anchor="middle" style="${MONO}" font-size="10" fill="oklch(0.45 0.01 260)">${ph && i % 3 ? "" : monName(keys[i]).toUpperCase()}</text>`; }).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${f.name}: month-end balances, printed">${blocks}</svg>`;
}
export function paidOutReceipt(f) {
  const iv = f.all ? L.monthFlows("2026-10") : f.interval;
  if (!iv) return `<p class="card-note">Nothing to print for a closed account.</p>`;
  const outs = Object.values(iv.list.filter((x) => L.KINDS[x.kind].dir === "out").reduce((o, x) => { (o[x.label] ??= { label: x.label, v: 0 }).v += x.amount; return o; }, {}));
  const ins = Object.values(iv.list.filter((x) => L.KINDS[x.kind].dir === "in").reduce((o, x) => { (o[x.label] ??= { label: x.label, v: 0 }).v += x.amount; return o; }, {}));
  return `<div style="display:flex;flex-direction:column;gap:3px">${ins.map((x) => leader(x.label.toUpperCase(), `+${m2(x.v)}`, { color: "oklch(0.42 0.14 145)" })).join("")}${outs.map((x) => leader(x.label.toUpperCase(), `−${m2(x.v)}`)).join("")}${leader("NOT RECORDED", m2(iv.other), { color: "oklch(0.5 0.01 260)" })}<div style="border-top:1.5px dashed currentColor;opacity:0.4;margin:8px 0"></div>${leader("CHANGE", signed(iv.delta).replace("₹", ""), { bold: true })}<div style="font-size:10.5px;color:oklch(0.5 0.01 260);margin-top:8px;text-align:center">WORKED OUT FROM YOUR INCOME, BILLS AND EMIS · ${f.all ? "SINCE 30/09" : `SINCE ${ddmmyy(iv.from.date)}`}</div></div>`;
}
const qSel = (dsel, id) => `${dsel} .rq-${id} { background: ${P.selTint(id, 22)}; box-shadow: inset 4px 0 0 var(--card-${P.hue(id)}); }`;
export function qDesktop() {
  const pk = P.picker("q", qSel);
  const quick = paper(`<div style="text-align:center;font-size:11px;letter-spacing:0.16em;margin-bottom:10px"><b>CHECK ONE NOW</b></div><div style="display:flex;flex-direction:column;gap:8px;font-family:'Manrope',sans-serif"><span class="qinp" style="background:white">${mono(L.acc("sbi"), 18)}<b style="font-size:13px">SBI Rainy Day</b><span style="margin-left:auto;color:var(--muted);display:flex">${I.chev(11)}</span></span><div style="display:grid;grid-template-columns:1fr 1.3fr;gap:8px"><span class="qinp ghost" style="background:white">${I.cal(12)} Today</span><span class="qinp focus" style="background:white"><span class="pre">₹</span><span style="${MONO}">6,61,400</span></span></div><span style="font-size:11px;${MONO};color:oklch(0.42 0.14 145);text-align:center">+3,400.00 SINCE 09/08/26</span>${btn("Print the check", { kind: "primary", cls: "btn-sm", icon: I.check(11), style: "justify-content:center" })}</div>`, { pad: "22px 20px" });
  const left = `<div style="display:flex;flex-direction:column;gap:18px">${todayReceipt("q")}<div class="row" style="gap:8px;justify-content:center"><label for="q-sel-all" class="btn btn-soft btn-sm" style="cursor:pointer">${L.allMono(16)} All accounts</label>${btn("Update balances", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}${btn("Add account", { kind: "soft", cls: "btn-sm", icon: I.plus(11) })}</div>${quick}</div>`;
  const right = `<div style="display:flex;flex-direction:column;gap:22px;min-width:0"><div><div class="between" style="margin-bottom:12px"><b style="font-size:15px">Earlier check-ins</b><span class="link">All receipts ${I.arrowR()}</span></div><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;align-items:start">${pastDates.map((d, i) => pastReceipt(d, i)).join("")}</div></div>
    <div><div class="between" style="margin-bottom:6px"><b style="font-size:15px">The receipt tape</b>${showing()}</div>${paper(panes((f) => tape(f)), { pad: "18px 16px" })}</div>
    <div><div class="between" style="margin-bottom:8px"><b style="font-size:15px">Paid in and out</b>${L.derivedTag("Worked out")}</div>${paper(panes((f) => paidOutReceipt(f)), { pad: "20px 22px" })}</div></div>`;
  const hero = P.greenStage(`${head("Receipts", "every check-in prints one · pick a line to follow that account")}<div style="display:grid;grid-template-columns:400px minmax(0,1fr);gap:36px;align-items:start;padding:6px 6px 10px">${left}${right}</div>`, { gap: 14 });
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${hero}${pk.close}` });
}
export function qPhone() {
  const pk = P.picker("qp", qSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${P.greenStage(`${todayReceipt("qp", { ph: true })}<b style="font-size:15px">Earlier check-ins</b><div style="display:flex;gap:12px;overflow-x:auto;margin:0 -16px;padding:4px 16px 12px;scrollbar-width:none">${pastDates.map((d, i) => pastReceipt(d, i, { ph: true })).join("")}</div>`, { ph: true, gap: 12 })}<b style="font-size:15px">The receipt tape</b>${paper(panes((f) => tape(f, { w: 320, h: 160, ph: true })), { pad: "14px 10px" })}<b style="font-size:15px">Paid in and out</b>${paper(panes((f) => paidOutReceipt(f)), { pad: "18px 16px" })}${pk.close}` });
}

// ================= R · Annual report =================
// The year so far as a short report: a headline figure, a few highlights, an annotated chart, a statement of balances and notes.
function commentary(f) {
  if (f.all) return `Your money grew by <b>${inr(L.sinceJan())}</b> this year, to ${inr(L.TOTAL)}. Most of the rise came in March, when a <b>₹1,60,000 bonus</b> landed in HDFC Salary; a month later ₹40,000 of it went into shares from ICICI Invest. More than half of everything, <b>56%</b>, sits in SBI Rainy Day, the emergency fund¹.`;
  const y = year(f.id), d = y.close - y.open;
  if (!f.on) return `${f.name} was closed on ${fmtY(f.closedOn)}, with its last ${inr(y.open)} moved out. It counts in nothing after that day.`;
  return `<b>${f.name}</b> ${d >= 0 ? "grew" : "shrank"} by <b>${inr(Math.abs(d))}</b> this year, to ${inr(y.close)}. ${y.inn ? `${inr(y.inn)} came in that the app knows about, and ` : ""}${y.out ? `${inr(y.out)} went to bills, EMIs and shares; ` : ""}the rest, <b>${signed(y.other)}</b>, isn't recorded anywhere². ${f.stale ? `Its balance was last confirmed on ${fmt(f.asOf)}¹.` : `It was last confirmed on ${fmt(f.asOf)}.`}`;
}
function annotated(f, { w = 1300, h = 380, ph = false } = {}) {
  const pts = []; for (let d = "2026-01-01"; d < L.TODAY; d = L.addDays(d, 4)) pts.push(d); pts.push(L.TODAY);
  const vals = pts.map((d) => (f.all ? L.totalOn(d) : L.balanceOn(f.id, d) ?? 0)), hi = Math.max(...vals), lo = Math.min(...vals), span = hi - lo || hi;
  const padL = ph ? 8 : 20, padR = ph ? 8 : 20, padT = ph ? 30 : 70, padB = 28, yMin = Math.max(0, lo - span * 0.5), yMax = hi + span * 0.1;
  const X = (d) => padL + ((t(d) - t("2026-01-01")) / (t(L.TODAY) - t("2026-01-01"))) * (w - padL - padR), Y = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * (h - padT - padB);
  const line = pts.map((d, i) => `${i ? "L" : "M"}${X(d).toFixed(1)},${Y(vals[i]).toFixed(1)}`).join(" ");
  const ink = f.all ? "oklch(0.3 0.05 250)" : `var(--card-${f.color}-from)`;
  const flows = (f.all ? L.FLOWS : L.FLOWS.filter((x) => x.account === f.id)).filter((x) => x.date >= "2026-01-01" && x.amount >= 12000 && !/Salary|Coral|Millennia|EMI|Ace/.test(x.label)).sort((a, b) => b.amount - a.amount).slice(0, 3).sort((a, b) => (a.date < b.date ? -1 : 1));
  const notes = [...flows.map((x) => ({ d: x.date, text: `${x.kind === "income" ? "+" : "−"}${inr(x.amount)} ${x.label.toLowerCase()}`, sub: L.acc(x.account).name })), ...(f.all || f.stale ? L.STALE.filter((a) => f.all || a.id === f.id).map((a) => ({ d: L.latest(a.id).date, text: `${a.name}'s last reading`, sub: "carried since", warn: true })) : [])].sort((a, b) => (a.d < b.d ? -1 : 1)).slice(0, ph ? 2 : 6);
  const callouts = notes.map((n, i) => { const x = X(n.d), y = Y(f.all ? L.totalOn(n.d) : L.balanceOn(f.id, n.d) ?? 0), ty = padT - (ph ? 18 : 44) + (i % 2) * (ph ? 0 : 26), endA = x > w * 0.72; return `<line x1="${x}" x2="${x}" y1="${ty + 8}" y2="${y - 5}" stroke="${n.warn ? "var(--warning)" : "var(--fg)"}" stroke-opacity="0.45" stroke-dasharray="2 3"></line><circle cx="${x}" cy="${y}" r="4" fill="var(--surface)" stroke="${n.warn ? "var(--warning)" : ink}" stroke-width="2"></circle>${ph ? "" : `<text x="${x + (endA ? -6 : 6)}" y="${ty}" text-anchor="${endA ? "end" : "start"}" style="${SERIF}" font-style="italic" font-size="14" font-weight="600" fill="${n.warn ? "var(--warning-text)" : "var(--fg)"}">${n.text}</text><text x="${x + (endA ? -6 : 6)}" y="${ty + 14}" text-anchor="${endA ? "end" : "start"}" font-size="10.5" font-weight="700" fill="var(--muted)">${fmt(n.d)} · ${n.sub}</text>`}`; }).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${f.name}: the year so far, with what moved it"><path d="${line} L${X(L.TODAY)},${h - padB} L${padL},${h - padB} Z" fill="${f.all ? "oklch(0.3 0.05 250 / 0.07)" : `color-mix(in srgb, var(--card-${f.color}) 12%, transparent)`}"></path><path d="${line}" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"></path>${callouts}<circle cx="${X(L.TODAY)}" cy="${Y(vals.at(-1))}" r="5" fill="${ink}"></circle>${L.YEAR.map((k) => `<text x="${X(`${k}-01`)}" y="${h - 6}" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--muted)">${ph && Number(k.slice(5)) % 3 !== 1 ? "" : monName(k)}</text>`).join("")}</svg>`;
}
function balanceStatement(prefix, { ph = false } = {}) {
  const groups = L.PURPOSES.map((p) => ({ p, list: ORDER.filter((a) => a.purpose === p) })).filter((g) => g.list.length);
  const cols = ph ? "1fr auto" : "1.6fr 1fr 1fr 1fr 0.7fr";
  const row = (a) => { const f = FACTS[a.id], y = year(a.id); return `<label for="${prefix}-sel-${a.id}" class="rr rr-${a.id}" style="display:grid;grid-template-columns:${cols};gap:12px;padding:8px 8px;margin:0 -8px;border-radius:8px;cursor:pointer;font-size:13px;align-items:center"><span class="row" style="gap:8px">${mono(a, 20)}${a.name}${f.stale ? "<sup>1</sup>" : ""}${!f.on ? "<sup>3</sup>" : ""}</span>${ph ? `<b class="num">${inr(y.close)}</b>` : `<span class="num" style="text-align:right">${inr(y.open)}</span><b class="num" style="text-align:right">${inr(y.close)}</b><span class="num" style="text-align:right;color:${y.close - y.open >= 0 ? "var(--positive)" : "var(--negative)"}">${signed(y.close - y.open)}</span><span class="num" style="text-align:right;color:var(--muted)">${f.on ? L.pct(y.close, L.TOTAL) : "—"}</span>`}</label>`; };
  const body = groups.map((g) => { const sub = g.list.reduce((s, a) => s + year(a.id).close, 0), subOpen = g.list.reduce((s, a) => s + year(a.id).open, 0); return `<div style="margin-top:10px"><div style="display:grid;grid-template-columns:${cols};gap:12px;padding:6px 0;border-bottom:1px solid var(--fg)"><b style="${SERIF};font-size:16px;font-weight:700">${L.purposeName(g.p)}</b>${ph ? `<b class="num">${inr(sub)}</b>` : `<b class="num" style="text-align:right">${inr(subOpen)}</b><b class="num" style="text-align:right">${inr(sub)}</b><b class="num" style="text-align:right">${signed(sub - subOpen)}</b><b class="num" style="text-align:right">${L.pct(sub, L.TOTAL)}</b>`}</div>${g.list.map(row).join("")}</div>`; }).join("");
  return `${ph ? "" : `<div style="display:grid;grid-template-columns:${cols};gap:12px"><span></span>${["1 January", "Today", "Change", "Share"].map((x) => `<span class="th" style="text-align:right">${x}</span>`).join("")}</div>`}${body}<label for="${prefix}-sel-all" style="cursor:pointer;display:grid;grid-template-columns:${cols};gap:12px;padding:10px 0;margin-top:8px;border-top:1.5px solid var(--fg);border-bottom:3px double var(--fg)"><b style="${SERIF};font-size:17px">Total</b>${ph ? `<b class="num">${inr(L.TOTAL)}</b>` : `<b class="num" style="text-align:right">${inr(L.yearStart())}</b><b class="num" style="text-align:right">${inr(L.TOTAL)}</b><b class="num" style="text-align:right;color:var(--positive)">${signed(L.sinceJan())}</b><b class="num" style="text-align:right">100%</b>`}</label>`;
}
const NOTES = [
  "SBI Rainy Day's balance was last confirmed on Aug 9. It's carried forward in every total until it's updated.",
  "Came in and went out are worked out from your income, card bills, subscriptions, EMIs and trades. What they don't explain is shown as not recorded: UPI, cash, and transfers between your own accounts.",
  "YES Old Salary was closed on Mar 31, 2026 with a final balance of ₹0. It counts in totals up to that day.",
  "A total on any date counts each account at its latest balance on or before that date.",
];
const rSel = (dsel, id) => `${dsel} .rr-${id} { background: ${P.selTint(id, 16)}; box-shadow: inset 4px 0 0 var(--card-${P.hue(id)}); }`;
function report(prefix, { ph = false } = {}) {
  const y = year(null);
  const hl = [["Came in", inr(y.inn), "salary, a bonus and dividends"], ["Went out", inr(y.out), "card bills, EMIs, subscriptions and shares"], ["In the emergency fund", "56%", `${inr(L.latest("sbi").balance)} in SBI Rainy Day`]];
  return `<section class="card" style="background:var(--surface);border:1px solid var(--surface-line);box-shadow:var(--card-shadow);padding:${ph ? "22px 18px" : "52px 60px"};gap:${ph ? 22 : 36}px;border-radius:${ph ? 18 : 28}px">
    <div class="textured stage-dark" style="display:grid;grid-template-columns:${ph ? "1fr" : "1.25fr 1fr"};gap:${ph ? 18 : 56}px;align-items:end;margin:${ph ? "-22px -18px 0" : "-52px -60px 0"};padding:${ph ? "26px 18px 24px" : "56px 60px 46px"};border-radius:${ph ? "18px 18px 0 0" : "28px 28px 0 0"};background:${P.GREEN_BG};color:var(--fg)">${rings(1400, 400, { stroke: "var(--rings-light)", opacity: 0.05, first: 60, step: 34 })}<div><span class="eyebrow">Bank accounts · 2026 so far</span><div style="${SERIF};font-size:${ph ? 50 : 96}px;font-weight:600;letter-spacing:-0.025em;line-height:1;margin-top:10px">${panes((f) => (f.on ? inr(f.balance) : "₹0"))}</div><div style="${SERIF};font-size:${ph ? 18 : 24}px;font-style:italic;font-weight:500;margin-top:10px;color:var(--muted)">${panes((f) => (f.all ? `up ${inr(L.sinceJan())}, or 6.9%, since January` : f.on ? `${f.name}, ${signed(f.sinceJan)} since January` : `${f.name}, closed in March`))}</div></div>
      <div style="display:flex;flex-direction:column">${hl.map(([k, v, s]) => `<div style="display:grid;grid-template-columns:${ph ? "1fr auto" : "150px 1fr"};gap:14px;align-items:baseline;padding:12px 0;border-top:1px solid oklch(1 0 0 / 0.35)"><span class="th">${k}</span><span><b style="${SERIF};font-size:${ph ? 20 : 28}px;font-weight:600">${v}</b>${ph ? "" : `<span class="sub2" style="font-size:12.5px">${s}</span>`}</span></div>`).join("")}</div></div>
    <div style="${SERIF};font-size:${ph ? 16 : 21}px;line-height:1.6;max-width:880px">${panes((f) => commentary(f))}</div>
    <div><div class="between" style="margin-bottom:4px"><b style="${SERIF};font-size:${ph ? 18 : 22}px;font-weight:700">The year so far</b>${ph ? "" : showing()}</div>${panes((f) => annotated(f, { w: ph ? 330 : 1340, h: ph ? 200 : 380, ph }))}</div>
    <div style="display:grid;grid-template-columns:${ph ? "1fr" : "1.5fr 1fr"};gap:${ph ? 22 : 56}px;align-items:start"><div><b style="${SERIF};font-size:${ph ? 18 : 22}px;font-weight:700">Statement of balances</b><div style="margin-top:8px">${balanceStatement(prefix, { ph })}</div></div><div><b style="${SERIF};font-size:${ph ? 18 : 22}px;font-weight:700">Notes</b><ol style="margin:10px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:10px;font-size:13px;line-height:1.55;color:var(--muted)">${NOTES.map((n) => `<li>${n}</li>`).join("")}</ol><div class="row" style="gap:8px;margin-top:18px;flex-wrap:wrap">${btn("Update balances", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}${btn("Add account", { kind: "soft", cls: "btn-sm", icon: I.plus(11) })}</div></div></div></section>`;
}
export function rDesktop() {
  const pk = P.picker("r", rSel);
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${report("r")}${pk.close}` });
}
export function rPhone() {
  const pk = P.picker("rp", rSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${report("rp", { ph: true })}${pk.close}` });
}

// ================= S · Planner =================
// A month planner: every balance check, salary, bill and EMI on its day; this week, next month and what's due to check.
function dayEvents(d) {
  const out = [];
  for (const s of L.SNAPSHOTS.filter((x) => x.date === d && L.isOn(L.acc(x.accountId)))) out.push({ a: L.acc(s.accountId), kind: "snap", text: `${L.acc(s.accountId).bank.split(" ")[0]} ✓ ${inrS(s.balance)}` });
  for (const f of L.FLOWS.filter((x) => x.date === d)) out.push({ a: L.acc(f.account), kind: f.kind, ref: f.ref, text: `${f.label.replace(" bill", "").replace("Car loan ", "")} ${L.KINDS[f.kind].dir === "in" ? "+" : "−"}${inrS(f.amount)}` });
  if (d === L.TODAY) for (const a of L.STALE) out.push({ a, kind: "stale", text: `${a.bank.split(" ")[0]} overdue` });
  return out;
}
const chipColor = (e) => (e.kind === "snap" ? `var(--card-${e.a.color})` : e.kind === "income" ? "var(--positive)" : e.kind === "card" ? `var(--card-${L.CARDS[e.ref].color})` : e.kind === "stale" ? "var(--warning)" : L.KINDS[e.kind]?.color ?? "var(--muted)");
function calendar(prefix, { ph = false, key = "2026-10" } = {}) {
  const first = new Date(`${key}-01T00:00:00Z`), lead = (first.getUTCDay() + 6) % 7, days = Number(L.monthEnd(key).slice(8));
  const cells = []; for (let i = 0; i < lead; i++) cells.push(null); for (let d = 1; d <= days; d++) cells.push(`${key}-${String(d).padStart(2, "0")}`); while (cells.length % 7) cells.push(null);
  const cell = (d) => {
    if (!d) return `<div style="border-radius:10px;background:var(--fill);opacity:0.4"></div>`;
    const ev = dayEvents(d), today = d === L.TODAY, future = d > L.TODAY, we = [5, 6].includes((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7);
    return `<div style="position:relative;border-radius:10px;padding:${ph ? "4px" : "7px 8px"};min-height:${ph ? 46 : 104}px;background:${today ? "var(--accent-tint)" : we ? "oklch(0.975 0.004 260)" : "var(--surface)"};border:1px solid ${today ? "var(--accent)" : "var(--surface-line)"};${future ? "opacity:0.55" : ""};display:flex;flex-direction:column;gap:3px"><b style="font-size:${ph ? 10.5 : 12}px;${today ? "color:var(--accent-text)" : ""}">${Number(d.slice(8))}</b>${ph ? `<span class="row" style="gap:2px;flex-wrap:wrap">${ev.map((e) => `<i class="acm ac-${e.a.id}" style="width:6px;height:6px;border-radius:50%;background:${chipColor(e)}"></i>`).join("")}</span>` : ev.map((e) => `<span class="acm ac-${e.a.id}" style="display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:6px;background:color-mix(in srgb, ${chipColor(e)} 14%, var(--surface));color:${e.kind === "stale" ? "var(--warning-text)" : "var(--fg)"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><i style="width:6px;height:6px;border-radius:2px;flex-shrink:0;background:${chipColor(e)}"></i>${e.text}</span>`).join("")}</div>`;
  };
  return `<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:${ph ? 3 : 6}px">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => `<span class="th" style="text-align:center">${ph ? x[0] : x}</span>`).join("")}${cells.map(cell).join("")}</div>`;
}
function dayStrip(f, { w = 900, h = 120, ph = false } = {}) {
  const pts = []; for (let d = "2026-10-01"; d <= L.TODAY; d = L.addDays(d, 1)) pts.push(d);
  const all = []; for (let d = "2026-10-01"; d <= "2026-10-31"; d = L.addDays(d, 1)) all.push(d);
  const vals = pts.map((d) => (f.all ? L.totalOn(d) : L.balanceOn(f.id, d) ?? 0)), hi = Math.max(...vals), lo = Math.min(...vals), span = hi - lo || hi * 0.1;
  const X = (i) => 10 + (i / 30) * (w - 20), Y = (v) => 14 + (1 - (v - (lo - span * 0.3)) / (span * 1.5)) * (h - 34);
  let d = `M${X(0)},${Y(vals[0])}`; for (let i = 1; i < vals.length; i++) d += ` H${X(i)} V${Y(vals[i])}`;
  const ink = f.all ? "var(--accent-text)" : `var(--card-${f.color})`;
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${f.name}: October, day by day">${all.map((x, i) => `<line x1="${X(i)}" x2="${X(i)}" y1="${h - 22}" y2="${h - 16}" stroke="var(--fg)" stroke-opacity="${x <= L.TODAY ? 0.35 : 0.12}"></line>${ph && i % 5 ? "" : `<text x="${X(i)}" y="${h - 4}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${x === L.TODAY ? "var(--fg)" : "var(--muted)"}">${i + 1}</text>`}`).join("")}<path d="${d}" fill="none" stroke="${ink}" stroke-width="2.2"></path><line x1="${X(vals.length - 1)}" x2="${X(30)}" y1="${Y(vals.at(-1))}" y2="${Y(vals.at(-1))}" stroke="${ink}" stroke-dasharray="3 4" opacity="0.5"></line><circle cx="${X(vals.length - 1)}" cy="${Y(vals.at(-1))}" r="4.5" fill="${ink}"></circle>${ph ? "" : `<text x="${X(vals.length - 1) + 8}" y="${Y(vals.at(-1)) - 8}" font-size="11" font-weight="800" fill="var(--fg)">${inr(vals.at(-1))} today</text>`}</svg>`;
}
function checksDue(prefix) {
  const rows = ACTIVE.map((a) => { const f = FACTS[a.id], due = L.addDays(f.asOf, L.STALE_DAYS), late = due < L.TODAY; return { a, f, due, late }; }).sort((x, y) => (x.due < y.due ? -1 : 1));
  return rows.map(({ a, f, due, late }) => `<label for="${prefix}-sel-${a.id}" style="cursor:pointer;display:grid;grid-template-columns:20px 1fr auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--divider)"><span class="box${late ? "" : " off"}" style="${late ? "background:var(--warning)" : ""}">${late ? I.clock(10) : ""}</span><span style="font-size:13px;font-weight:600">${a.name}<span class="sub2">${late ? `overdue since ${fmt(due)}` : `check by ${fmtDow(due)}`}</span></span>${late ? btn("Update", { kind: "primary", cls: "btn-xs" }) : `<span class="card-note">${L.daysBetween(L.TODAY, due)} days</span>`}</label>`).join("");
}
function agenda() {
  const axis = FACTS.axis;
  const items = [["2026-11-01", "Salary into HDFC Salary", "+₹1,38,500", "var(--positive)"], ["2026-11-01", "Check Kotak Savings (30 days)", "", "var(--card-ruby)"], ["2026-11-05", `Car loan EMI from Axis EMI · <b style="color:var(--negative)">${inr(22450 - axis.balance)} short</b>`, "₹22,450", "var(--card-copper)"], ["2026-11-12", "Millennia bill, usually from HDFC Salary", "about ₹38k", "var(--card-teal)"]];
  return items.map(([d, txt, amt, c]) => `<div style="display:grid;grid-template-columns:48px 1fr auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--divider)"><span style="text-align:center;border-radius:10px;padding:4px 0;background:color-mix(in srgb, ${c} 14%, var(--surface))"><b style="display:block;font-size:15px">${Number(d.slice(8))}</b><span style="font-size:9.5px;font-weight:800;color:var(--muted)">${monName(d.slice(0, 7)).toUpperCase()}</span></span><span style="font-size:13px;font-weight:600;line-height:1.45">${txt}</span><b class="num" style="font-size:13px">${amt}</b></div>`).join("");
}
const sSel = (dsel, id) => `${dsel} .sp-${id} { background: var(--card-${P.hue(id)}); color: white; box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--card-${P.hue(id)}); }`;
const pickChips = (prefix) => `<span class="row" style="gap:6px;flex-wrap:wrap">${IDS.map((id) => { const f = FACTS[id]; return `<label for="${prefix}-sel-${id}" class="chip sp-${id}" style="cursor:pointer;padding:5px 11px 5px 6px;gap:7px">${f.all ? L.allMono(18) : mono(f.a, 18)}${f.all ? "All" : f.a.bank.split(" ")[0]}</label>`; }).join("")}</span>`;
export function sDesktop() {
  const pk = P.picker("s", sSel);
  const tabs = ["Aug", "Sep", "Oct", "Nov"].map((m) => `<span style="writing-mode:vertical-rl;padding:14px 8px;border-radius:0 10px 10px 0;font-size:11px;font-weight:800;background:${m === "Oct" ? "var(--ink)" : "var(--fill-strong)"};color:${m === "Oct" ? "var(--on-ink)" : "var(--muted)"}">${m}</span>`).join("");
  const spread = `<div style="display:grid;grid-template-columns:minmax(0,1.75fr) minmax(0,1fr) 34px;gap:0;align-items:stretch;filter:drop-shadow(0 18px 30px oklch(0 0 0 / 0.1))">
    <div class="on-paper" style="background:var(--surface);border-radius:22px 4px 4px 22px;padding:26px 26px 22px;box-shadow:inset -16px 0 22px -18px oklch(0 0 0 / 0.2);display:flex;flex-direction:column;gap:14px"><div class="between"><span><span style="${SERIF};font-size:34px;font-weight:700">October</span> <span style="${SERIF};font-size:20px;color:var(--muted);font-style:italic">2026</span></span>${pickChips("s")}</div>${calendar("s")}<div><span class="th">Your total, day by day</span>${panes((f) => dayStrip(f, { w: 820, h: 110 }))}</div></div>
    <div class="on-paper" style="background:var(--surface);border-radius:4px 22px 22px 4px;padding:26px 24px 22px;box-shadow:inset 16px 0 22px -18px oklch(0 0 0 / 0.2);display:flex;flex-direction:column;gap:18px"><div><b style="${SERIF};font-size:22px;font-weight:700">Checks to do</b><p class="card-note">Each account wants a fresh balance every ${L.STALE_DAYS} days.</p><div style="margin-top:6px">${checksDue("s")}</div></div><div><b style="${SERIF};font-size:22px;font-weight:700">Coming up</b><p class="card-note">From your loan schedule, income and cards.</p><div style="margin-top:6px">${agenda()}</div></div><div class="row foot" style="gap:8px">${btn("Update balances", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}${btn("Add account", { kind: "soft", cls: "btn-sm", icon: I.plus(11) })}</div></div>
    <div style="display:flex;flex-direction:column;gap:6px;padding-top:30px">${tabs}</div></div>`;
  const hero = P.greenStage(`${head("Planner", "every balance check, salary, bill and EMI on its day · pick an account to see only its days", L.derivedTag("Bills and income from the rest of the app"))}${spread}`, { gap: 16 });
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${hero}${pk.close}` });
}
export function sPhone() {
  const pk = P.picker("sp", sSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${card(`<div class="between"><span><span style="${SERIF};font-size:26px;font-weight:700;color:var(--card-emerald-to)">October</span> <span style="${SERIF};font-size:16px;color:var(--muted);font-style:italic">2026</span></span></div><div style="overflow-x:auto;margin:0 -16px;padding:0 16px;scrollbar-width:none">${pickChips("sp")}</div>${calendar("sp", { ph: true })}${panes((f) => dayStrip(f, { w: 330, h: 100, ph: true }))}`, "padding:16px;gap:12px")}${card(`<b style="${SERIF};font-size:20px;font-weight:700">Checks to do</b>${checksDue("sp")}`, "padding:16px;gap:6px")}${card(`<b style="${SERIF};font-size:20px;font-weight:700">Coming up</b>${agenda()}`, "padding:16px;gap:6px")}${pk.close}` });
}

// ================= T · General ledger =================
// A precise grid: a row per month-end, a column per account, every cell a balance; carried cells say so. The mix of accounts runs down the side.
function ledgerGrid(prefix, { ph = false } = {}) {
  const keys = [...L.LAST12].reverse(), accs = ORDER;
  const cols = `${ph ? "64px" : "96px"} repeat(${accs.length},minmax(${ph ? 96 : 0}px,1fr)) ${ph ? "104px" : "1.1fr"}${ph ? "" : " 120px"}`;
  const header = `<span class="th" style="align-self:end">Month end</span>${accs.map((a) => { const f = FACTS[a.id]; return `<label for="${prefix}-sel-${a.id}" class="tg tg-${a.id}" style="cursor:pointer;display:flex;flex-direction:column;gap:3px;padding:10px;border-radius:12px 12px 0 0"><span class="row" style="gap:7px">${mono(a, 20)}<b style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ph ? a.bank.split(" ")[0] : a.name}</b></span><span style="color:var(--card-${a.color})">${P.spark(a.id, { w: ph ? 80 : 150, h: 22, stroke: "currentColor", width: 1.6, dots: true })}</span><b style="${MONO};font-size:13px">${f.on ? inr(f.balance) : "closed"}</b></label>`; }).join("")}<label for="${prefix}-sel-all" class="tg tg-all" style="cursor:pointer;display:flex;flex-direction:column;gap:3px;padding:10px;border-radius:12px 12px 0 0;text-align:right"><b style="font-size:12px">Total</b><span style="color:var(--accent-text);display:flex;justify-content:flex-end">${P.spark("all", { w: ph ? 80 : 150, h: 22, stroke: "currentColor", width: 1.6, dots: true })}</span><b style="${MONO};font-size:13px">${inr(L.TOTAL)}</b></label>${ph ? "" : `<span class="th" style="align-self:end;padding:10px">Mix</span>`}`;
  const rows = keys.map((k) => {
    const cells = accs.map((a) => {
      const f = FACTS[a.id], v = L.atMonth(a.id, k), read = L.snapsOf(a.id).filter((s) => L.monthKey(s.date) === k).at(-1), prevK = L.addMonthsUTC(`${k}-01`, -1).slice(0, 7), pv = L.atMonth(a.id, prevK);
      if (!f.on && k > L.monthKey(f.closedOn)) return `<span class="tc tc-${a.id}" style="padding:8px 10px;color:var(--muted);${MONO};font-size:12px">—</span>`;
      if (v == null) return `<span class="tc tc-${a.id}" style="padding:8px 10px;color:var(--muted);font-size:11.5px">not open</span>`;
      const carried = !read, stale = f.stale && k > L.monthKey(f.asOf), d = pv == null ? null : v - pv;
      return `<span class="tc tc-${a.id}" style="padding:7px 10px;${carried ? `background:${stale ? "repeating-linear-gradient(135deg, oklch(0.95 0.05 85 / 0.7) 0 5px, transparent 5px 10px)" : "repeating-linear-gradient(135deg, var(--heat-no-data) 0 5px, transparent 5px 10px)"}` : ""}"><b style="display:block;${MONO};font-size:12.5px;font-weight:${carried ? 500 : 700};${carried ? `font-style:italic;color:${stale ? "var(--warning-text)" : "var(--muted)"}` : ""}">${Math.round(v).toLocaleString("en-IN")}</b><span style="${MONO};font-size:10.5px;color:${carried ? (stale ? "var(--warning-text)" : "var(--muted)") : d > 0 ? "var(--positive)" : d < 0 ? "var(--negative)" : "var(--muted)"}">${carried ? (stale ? "not read" : "carried") : d == null ? "first" : `${d > 0 ? "+" : d < 0 ? "−" : "±"}${Math.round(Math.abs(d)).toLocaleString("en-IN")}`}</span></span>`;
    }).join("");
    const tot = L.totalAtMonth(k), mix = accs.filter((a) => (L.atMonth(a.id, k) ?? 0) > 0).map((a) => `<span style="flex:${L.atMonth(a.id, k)};background:var(--card-${a.color})"></span>`).join("");
    return `<span style="padding:8px 0;${MONO};font-size:12px;font-weight:700;${k === L.monthKey(L.TODAY) ? "color:var(--accent-text)" : ""}">${k === L.monthKey(L.TODAY) ? "Today" : `${monName(k)} ${k.slice(2, 4)}`}</span>${cells}<span class="tc tc-all" style="padding:7px 10px;text-align:right"><b style="${MONO};font-size:13px">${Math.round(tot).toLocaleString("en-IN")}</b></span>${ph ? "" : `<span style="padding:0 10px;display:flex;align-items:center"><span style="display:flex;width:100%;height:12px;border-radius:4px;overflow:hidden;gap:1px">${mix}</span></span>`}`;
  }).join("");
  const foot = `<span class="th" style="padding:10px 0">Since Jan 1</span>${accs.map((a) => `<span class="tc tc-${a.id}" style="padding:10px">${L.chg(L.sinceJan(a.id))}</span>`).join("")}<span class="tc tc-all" style="padding:10px;text-align:right">${L.chg(L.sinceJan())}</span>${ph ? "" : "<span></span>"}`;
  return `<div style="${ph ? "overflow-x:auto;margin:0 -16px;padding:0 16px" : ""}"><div class="lgrid" style="display:grid;grid-template-columns:${cols};column-gap:0;row-gap:0;${ph ? "min-width:820px" : ""}">${header}${rows.replace(/<span style="padding:8px 0;/g, '<span style="padding:8px 0;border-top:1px solid var(--divider);').replace(/class="tc /g, 'class="tc tcr ')}${foot}</div></div>`;
}
const tSel = (dsel, id) => `${dsel} .tg-${id}, ${dsel} .tc-${id} { background-color: ${P.selTint(id, 13)}; } ${dsel} .tg-${id} { box-shadow: inset 0 4px 0 var(--card-${P.hue(id)}); }`;
function composition({ w = 1368, h = 260, ph = false } = {}) {
  const keys = L.LAST12, accs = ["sbi", "icici", "hdfc", "kotak", "axis", "yes"], padL = ph ? 8 : 40, padR = ph ? 8 : 150, padT = 10, padB = 24;
  const X = (i) => padL + (i / (keys.length - 1)) * (w - padL - padR), Y = (p) => padT + (1 - p) * (h - padT - padB);
  const shares = keys.map((k) => { const tot = L.totalAtMonth(k); return accs.map((id) => (L.atMonth(id, k) ?? 0) / tot); });
  const bands = accs.map((id, j) => { const top = shares.map((s, i) => [X(i), Y(s.slice(0, j + 1).reduce((a, b) => a + b, 0))]), bot = shares.map((s, i) => [X(i), Y(s.slice(0, j).reduce((a, b) => a + b, 0))]).reverse(); return `<path class="acm ac-${id}" d="M${top.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" L")} L${bot.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" L")} Z" fill="var(--card-${L.acc(id).color})" stroke="var(--surface)" stroke-width="1"></path>`; }).join("");
  const last = shares.at(-1);
  const ys = accs.map((id, j) => ({ id, j, y: Y(last.slice(0, j).reduce((a, b) => a + b, 0) + last[j] / 2) })).filter((x) => last[x.j] > 0.005).sort((a, b) => b.y - a.y);
  for (let i = 1; i < ys.length; i++) if (ys[i - 1].y - ys[i].y < 16) ys[i].y = ys[i - 1].y - 16;
  const labels = ph ? "" : ys.map(({ id, j, y }) => `<text class="acm ac-${id}" x="${w - padR + 10}" y="${y + 4}" font-size="12" font-weight="800" fill="var(--fg)">${L.acc(id).name} <tspan fill="var(--muted)" font-weight="700">${Math.round(last[j] * 100)}%</tspan></text>`).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Each account's share of the total, month by month">${bands}${[0.25, 0.5, 0.75].map((p) => `<line x1="${padL}" x2="${w - padR}" y1="${Y(p)}" y2="${Y(p)}" stroke="var(--surface)" stroke-opacity="0.6" stroke-dasharray="2 4"></line>${ph ? "" : `<text x="${padL - 6}" y="${Y(p) + 4}" text-anchor="end" font-size="10" font-weight="700" fill="var(--muted)">${p * 100}%</text>`}`).join("")}${labels}${keys.map((k, i) => `<text class="axis-t" x="${X(i)}" y="${h - 6}" text-anchor="middle">${ph && i % 3 ? "" : monName(k)}</text>`).join("")}</svg>`;
}
export function tDesktop() {
  const pk = P.picker("t", tSel);
  const grid = P.greenStage(`${head("General ledger", "a row per month end, a column per account · italic cells were carried from an earlier reading · pick a column", `<span class="row" style="gap:8px">${L.seg([{ label: "Month ends", on: true }, { label: "Every reading" }])}${btn("Update balances", { kind: "primary", cls: "btn-sm", icon: I.check(11), style: "background:white;color:var(--card-emerald-to)" })}</span>`)}<div class="on-paper" style="background:var(--surface);border-radius:18px;padding:14px 16px;box-shadow:0 20px 40px oklch(0 0 0 / 0.25)">${ledgerGrid("t")}</div>`, { gap: 14 });
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${grid}${card(`${head("The mix", "each account's share of everything, month by month")}${composition()}`, "gap:10px")}${pk.close}` });
}
export function tPhone() {
  const pk = P.picker("tp", tSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${P.greenStage(`${head("General ledger", "")}<div class="on-paper" style="background:var(--surface);border-radius:14px;padding:10px 12px">${ledgerGrid("tp", { ph: true })}</div>`, { ph: true, gap: 10 })}${card(`${head("The mix")}${composition({ w: 330, h: 200, ph: true })}`, "padding:16px;gap:10px")}${pk.close}` });
}

export const DIRS4 = [
  { k: "o", name: "Consolidated statement", blurb: "One printed statement for every account: a summary with opening, credits, debits and closing, a month-end chart, and the picked account's statement with a running balance in Cr." },
  { k: "p", name: "Khata", blurb: "A red-bound ledger book of tall pages, one per account, written month by month: brought forward, what came in and went out, carried. Jama and kharch charted below." },
  { k: "q", name: "Receipts", blurb: "Every check-in prints a receipt. Today's is the hero, with the stale account starred; earlier receipts sit beside it, and a receipt tape prints the months." },
  { k: "r", name: "Annual report", blurb: "The year so far as a short report: one headline figure, three highlights, a plain-words commentary, an annotated chart, a statement of balances by purpose, and numbered notes." },
  { k: "s", name: "Planner", blurb: "A month planner: every balance check, salary, bill and EMI on its day, today marked. Checks to do and Coming up on the facing page; a day-by-day line under the month." },
  { k: "t", name: "General ledger", blurb: "A precise grid: a row per month end, a column per account, carried cells in italics, with each column's sparkline on top and the mix of accounts down the side." },
];
