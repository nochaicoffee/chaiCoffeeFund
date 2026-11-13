// Round 19 (2026-11-13): hero alternatives, for the real AccountsHero/WalletCards/HeroTrend built in
// rounds 19 and 24. Prathik asked for a few fresh directions, on the condition that the Check-ins view
// (when each account's balance was read, now a toggle inside the hero) is never dropped. Each direction
// keeps three things the shipped hero has: a way to pick an account, its balance, and a way to see when it
// was read, alongside the Trend. Paired with M2 (his pick for the money section, round 18) below.
//   N1 Coin dock: circular account tokens in a row above one big balance; Trend/Check-ins stays a toggle.
//   N2 Always both: a slim account list with a check-in strip on every row, so check-ins never hide behind
//      a toggle; the stage on the right is Trend only.
//   N3 Ring stage: a bolder, graphic hero — an arc of account chips around a dominant balance number, the
//      toggle underneath it.
// All CSS, no script (radios with :has()); sample data, made up; "today" is Oct 21, 2026.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as W from "./wparts.mjs";
import * as R from "./r11.mjs";
import * as S from "./r12.mjs";
import { CSS2 } from "./r13.mjs";
import { ANIM, tag, cols } from "./widgets.mjs";
import { m2Section } from "./r18.mjs";

const { inr, inrS, signed, chg, mono, allMono, I, btn, iconBtn, periodPill, rings, grad } = L;
const { IDS, FACTS, ORDER, picker, panes } = P;
const ACTIVE_IDS = IDS.filter((id) => id !== "all" && FACTS[id].on);

const hist = (p) => P.historyCard(p, { n: 8, spread: true, fill: W.trendFill });

// ---------- Shared: a month-by-month check-in strip for one account ----------
const MONTHS12 = L.LAST12;
/** `n` months of dots: filled when a balance was recorded that month, hatched when it wasn't, ringed for the latest. */
function checkDots(id, { n = 12, size = 8, gap = 4 } = {}) {
  const months = MONTHS12.slice(-n);
  const f = FACTS[id];
  return months.map((k, i) => {
    const has = L.snapsOf(id).some((s) => s.date.slice(0, 7) === k);
    const isLast = i === months.length - 1;
    const bg = has ? `var(--card-${f.color})` : "var(--fill-strong)";
    return `<span title="${L.monName(k)}" style="width:${size}px;height:${size}px;border-radius:50%;background:${has ? bg : "transparent"};${has ? "" : `border:1.5px dashed var(--fill-strong)`};${isLast && has ? "box-shadow:0 0 0 2px var(--surface), 0 0 0 3.5px var(--card-" + f.color + ")" : ""};flex-shrink:0"></span>`;
  }).join(`<span style="width:${gap}px;flex-shrink:0"></span>`);
}
/** A bigger month-by-month grid (checkin toggle view), one account. */
function checkGrid(id, { months = L.YEAR } = {}) {
  const f = FACTS[id];
  return `<div style="display:grid;grid-template-columns:repeat(${months.length},minmax(0,1fr));gap:6px">${months.map((k) => {
    const snaps = L.snapsOf(id).filter((s) => s.date.slice(0, 7) === k);
    const has = snaps.length > 0;
    const last = has ? snaps.at(-1) : null;
    return `<div class="hov" tabindex="0" style="position:relative;height:52px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:10px;font-weight:800;${has ? `background:color-mix(in oklch, var(--card-${f.color}) 16%, var(--surface));color:var(--fg)` : "background:repeating-linear-gradient(135deg, var(--fill-strong) 0 5px, transparent 5px 10px);color:var(--muted)"}"><span style="text-transform:uppercase;letter-spacing:0.02em;opacity:0.85">${L.monName(k)}</span><span style="font-size:9px;font-weight:700;opacity:0.8">${has ? L.inrS(last.balance) : "missed"}</span>${has ? W.tip(W.hc({ h: L.monFull(k), t: inr(last.balance), rows: snaps.map((s) => [L.fmt(s.date), inr(s.balance)]) }), { w: 200, x: "c", y: "up" }) : ""}</div>`;
  }).join("")}</div>`;
}

// ---------- N1 · Coin dock ----------
function n1Hero(p) {
  const pk = picker(p);
  const CSS = `<style>
.n1-dock { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 10px; scrollbar-width: none; }
.n1-dock::-webkit-scrollbar { display: none; }
.n1-coin { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; padding: 6px 4px 0; border-radius: 16px; transition: transform 200ms var(--ease-out); }
.n1-coin:hover { transform: translateY(-3px); }
.n1-ring { width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 17px; color: var(--on-card); position: relative; box-shadow: 0 6px 16px oklch(0 0 0 / 0.16); transition: box-shadow 200ms, transform 200ms; }
.n1-coin .n1-nm { font-size: 10.5px; font-weight: 700; color: var(--muted); max-width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${IDS.map((id) => `.${p}dir:has(#${p}-sel-${id}:checked) .n1-coin.c-${id} .n1-ring { box-shadow: 0 0 0 3px var(--surface), 0 0 0 5.5px ${id === "all" ? "var(--card-emerald)" : `var(--card-${FACTS[id].color})`}, 0 8px 20px oklch(0 0 0 / 0.2); transform: scale(1.06); } .${p}dir:has(#${p}-sel-${id}:checked) .n1-coin.c-${id} .n1-nm { color: var(--fg); font-weight: 800; }`).join("\n")}
.n1-fig { font-size: 52px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; }
.n1-toggle { display: inline-flex; padding: 3px; border-radius: 999px; background: var(--fill); gap: 2px; }
.n1-toggle label { padding: 7px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 800; color: var(--muted); cursor: pointer; }
${["trend", "checkins"].map((m) => `.${p}dir:has(#${p}-m-${m}:checked) label[for="${p}-m-${m}"] { background: var(--surface); color: var(--fg); box-shadow: 0 1px 3px oklch(0 0 0 / 0.14); } .${p}dir:has(#${p}-m-${m}:checked) .n1-m-${m} { display: block; }`).join("\n")}
.n1-mode { display: none; }
</style>`;
  const dock = `<div class="n1-dock">${IDS.map((id) => `<label for="${p}-sel-${id}" class="n1-coin c-${id}"><span class="n1-ring" style="background:${id === "all" ? grad("emerald", 150) : grad(FACTS[id].color)}">${id === "all" ? I.accounts(20) : L.esc(FACTS[id].bank[0])}</span><span class="n1-nm">${FACTS[id].short}</span></label>`).join("")}</div>`;
  const toggle = `<input type="radio" class="pk-in" name="${p}-m" id="${p}-m-trend" checked><input type="radio" class="pk-in" name="${p}-m" id="${p}-m-checkins"><div class="n1-toggle" role="group" aria-label="Show"><label for="${p}-m-trend">Trend</label><label for="${p}-m-checkins">Check-ins</label></div>`;
  const trendPane = panes((f) => trendChart(f.id, { w: 760, h: 180 }));
  const checkinsPane = panes((f) => (f.all ? `<div class="card-note" style="padding:40px 0;text-align:center">Pick an account to see when it was read.</div>` : checkGrid(f.id)));
  const caption = panes((f) => `<div style="display:flex;flex-direction:column;gap:6px"><span class="eyebrow">${f.all ? "All accounts" : f.name}</span><span class="n1-fig">${f.on ? inr(f.balance) : "₹0"}</span><span class="row" style="gap:10px;font-size:13px;font-weight:700;color:var(--muted)">${f.all ? `${f.count} active` : f.on ? `${L.fmt(f.asOf)} · last updated` : "Closed"}${f.chg != null ? chg(f.chg, { suffix: " since last" }) : ""}</span></div>`);
  return `${pk.css}${CSS}<section class="card glass ${p}dir" style="gap:18px">${pk.open}${dock}<div class="between" style="align-items:flex-end;flex-wrap:wrap;gap:16px">${caption}${toggle}</div><div class="n1-mode n1-m-trend">${trendPane}</div><div class="n1-mode n1-m-checkins">${checkinsPane}</div>${pk.close}</section>`;
}

// ---------- N2 · Always both (check-ins live in the list, never behind a toggle) ----------
function n2Hero(p) {
  const pk = picker(p);
  const CSS = `<style>
.n2-wrap { display: grid; grid-template-columns: 300px minmax(0,1fr); gap: 20px; align-items: stretch; }
.n2-list { display: flex; flex-direction: column; gap: 4px; }
.n2-row { display: flex; align-items: center; gap: 10px; padding: 10px 10px; border-radius: 16px; cursor: pointer; transition: background 160ms; }
.n2-row:hover { background: var(--fill); }
.n2-row .mono { width: 32px; height: 32px; border-radius: 10px; font-size: 13px; }
.n2-main { min-width: 0; flex: 1; }
.n2-main b { display: block; font-size: 12.5px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.n2-dots { display: flex; margin-top: 4px; }
.n2-bal { text-align: right; flex-shrink: 0; }
.n2-bal b { display: block; font-size: 13px; font-weight: 800; }
${IDS.map((id) => `.${p}dir:has(#${p}-sel-${id}:checked) .n2-row.c-${id} { background: color-mix(in oklch, var(--card-${P.hue(id)}) 13%, var(--surface)); box-shadow: inset 3px 0 0 var(--card-${P.hue(id)}); }`).join("\n")}
.n2-stage { border-radius: 22px; background: var(--fill); padding: 20px; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.n2-fig { font-size: 42px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; }
</style>`;
  const rows = IDS.filter((id) => id !== "all").map((id) => {
    const f = FACTS[id];
    return `<label for="${p}-sel-${id}" class="n2-row c-${id}"><span class="mono" style="background:${grad(f.color)}">${L.esc(f.bank[0])}</span><span class="n2-main"><b>${f.name}</b><span class="n2-dots">${checkDots(id, { n: 10, size: 7, gap: 3 })}</span></span><span class="n2-bal"><b>${f.on ? inr(f.balance) : "₹0"}</b>${f.chg != null ? chg(f.chg) : ""}</span></label>`;
  }).join("");
  const allRow = `<label for="${p}-sel-all" class="n2-row c-all" style="margin-bottom:4px;padding-bottom:12px;border-bottom:1px solid var(--divider)"><span class="mono" style="background:${grad("emerald", 150)}">${I.accounts(14)}</span><span class="n2-main"><b>All accounts</b><span style="font-size:11px;font-weight:700;color:var(--muted)">${FACTS.all.count} active, every dot below is one</span></span><span class="n2-bal"><b>${inr(FACTS.all.balance)}</b></span></label>`;
  const stage = panes((f) => `<div class="n2-stage"><div class="between" style="align-items:flex-start"><div><span class="eyebrow">${f.all ? "Balance · all accounts" : `Balance · ${f.name}`}</span><div class="n2-fig">${f.on ? inr(f.balance) : "₹0"}</div></div>${f.chg != null ? `<span style="padding-top:6px">${chg(f.chg, { suffix: " since last" })}</span>` : ""}</div>${trendChart(f.id, { w: 760, h: 170 })}<span class="card-note">${f.all ? "Every account's check-in strip is on the left: a dot for each month its balance was read." : `${L.snapsOf(f.id).filter((s) => s.date >= "2026-01-01").length} readings this year. Its check-in strip is on the left, always on.`}</span></div>`);
  return `${pk.css}${CSS}<section class="card glass ${p}dir" style="gap:0">${pk.open}<div class="n2-wrap"><div class="n2-list">${allRow}${rows}</div>${stage}</div>${pk.close}</section>`;
}

// ---------- N3 · Ring stage ----------
function n3Hero(p) {
  const pk = picker(p);
  const n = ACTIVE_IDS.length;
  const R0 = 168;
  const chips = ACTIVE_IDS.map((id, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * R0, y = Math.sin(a) * R0 * 0.62;
    return `<label for="${p}-sel-${id}" class="n3-chip c-${id}" style="left:calc(50% + ${x}px);top:calc(50% + ${y}px)"><span class="mono" style="background:${grad(FACTS[id].color)}">${L.esc(FACTS[id].bank[0])}</span></label>`;
  }).join("");
  const CSS = `<style>
.n3-stage { position: relative; min-height: 290px; display: flex; align-items: center; justify-content: center; }
.n3-chip { position: absolute; transform: translate(-50%, -50%); cursor: pointer; transition: transform 200ms var(--ease-out); z-index: 5; }
.n3-chip .mono { width: 42px; height: 42px; border-radius: 13px; font-size: 15px; box-shadow: 0 6px 14px oklch(0 0 0 / 0.18); }
.n3-chip:hover { transform: translate(-50%, -50%) translateY(-3px); }
${IDS.filter((id) => id !== "all").map((id) => `.${p}dir:has(#${p}-sel-${id}:checked) .n3-chip.c-${id} .mono { box-shadow: 0 0 0 3px var(--surface), 0 0 0 5.5px var(--card-${FACTS[id].color}), 0 8px 18px oklch(0 0 0 / 0.22); transform: scale(1.1); }`).join("\n")}
.n3-core { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
.n3-core .n3-all { cursor: pointer; }
.n3-fig { font-size: 50px; font-weight: 800; letter-spacing: -0.025em; line-height: 1.05; }
.n3-toggle { display: inline-flex; padding: 3px; border-radius: 999px; background: var(--fill); gap: 2px; margin-top: 6px; }
.n3-toggle label { padding: 7px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 800; color: var(--muted); cursor: pointer; }
${["trend", "checkins"].map((m) => `.${p}dir:has(#${p}-m-${m}:checked) label[for="${p}-m-${m}"] { background: var(--surface); color: var(--fg); box-shadow: 0 1px 3px oklch(0 0 0 / 0.14); } .${p}dir:has(#${p}-m-${m}:checked) .n3-m-${m} { display: block; }`).join("\n")}
.n3-mode { display: none; }
.n3-ringline { position: absolute; inset: 0; border-radius: 50%; border: 1.5px dashed var(--divider); width: ${R0 * 2}px; height: ${R0 * 1.24}px; left: 50%; top: 50%; transform: translate(-50%,-50%); z-index: 0; }
</style>`;
  const caption = panes((f) => `<div class="n3-core"><label for="${p}-sel-all" class="n3-all eyebrow">${f.all ? "All accounts" : f.name}</label><span class="n3-fig">${f.on ? inr(f.balance) : "₹0"}</span>${f.chg != null ? chg(f.chg, { suffix: " since last" }) : `<span class="card-note">${f.count} accounts, since January</span>`}</div>`);
  const toggle = `<input type="radio" class="pk-in" name="${p}-m" id="${p}-m-trend" checked><input type="radio" class="pk-in" name="${p}-m" id="${p}-m-checkins"><div class="n3-toggle" role="group" aria-label="Show" style="align-self:center">${rings(1, 1)}<label for="${p}-m-trend">Trend</label><label for="${p}-m-checkins">Check-ins</label></div>`;
  const trendPane = panes((f) => trendChart(f.id, { w: 1100, h: 170 }));
  const checkinsPane = panes((f) => (f.all ? `<div class="card-note" style="padding:40px 0;text-align:center">Pick an account to see when it was read.</div>` : checkGrid(f.id)));
  return `${pk.css}${CSS}<section class="card glass ${p}dir" style="gap:14px">${pk.open}<div class="n3-stage"><div class="n3-ringline"></div>${chips}<div class="n3-core-wrap">${caption}</div></div>${toggle}<div class="n3-mode n3-m-trend">${trendPane}</div><div class="n3-mode n3-m-checkins">${checkinsPane}</div>${pk.close}</section>`;
}

// ---------- A trend chart: a smooth area line over the picked account's year, with the high and the now ----------
function trendChart(id, { w = 760, h = 180 } = {}) {
  const months = L.YEAR;
  const vals = months.map((k) => (id === "all" ? L.totalAtMonth(k) : L.atMonth(id, k)));
  const known = vals.map((v, i) => [i, v]).filter(([, v]) => v != null);
  if (known.length < 2) return `<div class="card-note" style="padding:30px 0;text-align:center">Not enough balances yet.</div>`;
  const lo = Math.min(...known.map(([, v]) => v)), hi = Math.max(...known.map(([, v]) => v));
  const pad = 10;
  const X = (i) => pad + (i / (months.length - 1)) * (w - pad * 2);
  const Y = (v) => pad + (1 - (v - lo) / (hi - lo || 1)) * (h - pad * 2 - 20) + 10;
  const color = id === "all" ? "var(--card-emerald)" : `var(--card-${FACTS[id].color})`;
  let d = "", first = -1, lastI = -1;
  vals.forEach((v, i) => { if (v == null) return; d += `${first < 0 ? "M" : "L"}${X(i).toFixed(1)} ${Y(v).toFixed(1)} `; if (first < 0) first = i; lastI = i; });
  const area = `${d} L${X(lastI).toFixed(1)} ${h} L${X(first).toFixed(1)} ${h} Z`;
  const hiI = known.reduce((m, c) => (c[1] > known[m][1] ? known.indexOf(c) : m), 0);
  return `<svg width="100%" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible"><defs><linearGradient id="tg-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.22"></stop><stop offset="1" stop-color="${color}" stop-opacity="0"></stop></linearGradient></defs><path d="${area}" fill="url(#tg-${id})"></path><path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path>${known.map(([i, v]) => `<circle cx="${X(i)}" cy="${Y(v)}" r="${i === lastI ? 4.5 : 3}" fill="var(--surface)" stroke="${color}" stroke-width="2"></circle>`).join("")}<text x="${X(known[hiI][0])}" y="${Y(known[hiI][1]) - 12}" text-anchor="middle" font-size="11" font-weight="800" fill="var(--fg)">${inrS(known[hiI][1])}</text>${months.filter((_, i) => i % 2 === 0).map((k, j) => `<text x="${X(j * 2)}" y="${h - 2}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--muted)">${L.monName(k)}</text>`).join("")}</svg>`;
}

// ---------- Pages ----------
const IDEAS = {
  N1: ["Coin dock", "A row of circular account tokens, not cards; one big balance under it; Trend and Check-ins stay a toggle, lighter than today's."],
  N2: ["Always both", "A slim account list, each row with its own check-in strip, so when a balance was read never hides behind a toggle; the stage on the right is Trend only."],
  N3: ["Ring stage", "A bolder, graphic hero: an arc of account chips around one dominant balance number. Trend and Check-ins stay a toggle, underneath."],
};
const HEROES = { N1: n1Hero, N2: n2Hero, N3: n3Hero };
function page(id) {
  const p = `n19${id.toLowerCase()}`;
  const body = [cols("1fr 1fr", R.mixBlocks(p), hist(p)), m2Section(), cols("1fr", W.coming(p))].join("");
  const [name, idea] = IDEAS[id];
  return L.desktop({ h: "auto", body: `${C.DEFS()}${ANIM}${W.WCSS}${S.CSS(p)}${CSS2(p)}${R.RT}${tag(id, name, `${idea} Check-ins is never dropped. Pairs with M2 (the money section, round 18, his pick). Sample data, made up.`)}${R.pointGreeting()}${HEROES[id](p)}${body}<div aria-hidden="true" style="height:140px;flex-shrink:0"></div>` });
}

export const R19_DESKTOPS = [
  { file: "AccountsHeroN1.dc.html", w: 1600, render: () => page("N1") },
  { file: "AccountsHeroN2.dc.html", w: 1600, render: () => page("N2") },
  { file: "AccountsHeroN3.dc.html", w: 1600, render: () => page("N3") },
];
