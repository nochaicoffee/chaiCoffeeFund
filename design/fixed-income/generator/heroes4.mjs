// Round 4: J1 is H1 (three doors) with the new widgets; J2 is the literal pillars with a time scrub and the same widgets.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts3.mjs";
import { widgets4 } from "./parts4.mjs";
import { P_KEYS } from "./css-fi3.mjs";
import { h1, epfChart, fdGantt, worthChart } from "./heroes3.mjs";
const { I, inr, plural } = L;
const { sum } = D;
const { lakh, lakhS, col, dmy } = P;

const SNAP_KEYS = D.SNAPS.map(([k]) => k);
const radios = (p, keys, def) => keys.map((k) => `<input class="pk-in" type="radio" name="${p}" id="${p}-${k}"${k === def ? " checked" : ""}>`).join("");
const big = (n, size = 54) => `<div class="s-big" style="font-size:${size}px">${n >= 100000 ? `<small>₹</small>${(n / 100000).toFixed(2)}<small>L</small>` : `<small>₹</small>${Math.round(n).toLocaleString("en-IN")}`}</div>`;
const tile = (k, v, s = "") => `<div class="s-tile"><div class="k">${k}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
const lk = (n) => (n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : n ? inr(n) : "₹0");
const SNAPS = D.SNAPS.map(([k, label, date]) => ({ k, label, date, s: D.snapshot(date) }));
const perSnap = (fn, cls = "vw-s") => SNAPS.map((x) => `<span class="${cls} vw-s-${x.k}">${fn(x.s, x)}</span>`).join("");
const pastel = (c) => `color-mix(in oklch, var(--card-${c}) 45%, white)`;

function scene() {
  const epfSegs = [["s1", "oklch(0.88 0.08 215)", "You put in"], ["s2", "oklch(0.82 0.1 285)", "NetApp put in"], ["s3", "oklch(0.86 0.16 85)", "Interest credited"]];
  const epf = `<div class="pcol"><div class="ptop">EPF</div><div class="pnum">${perSnap((s) => lk(s.epf))}</div><label class="pkl pillar epf" for="p-epf">${epfSegs.map(([c, bg]) => `<span class="blk ${c}" style="background:${bg}"></span>`).join("")}</label><div class="plinth"></div><div class="pleg">${epfSegs.map(([c, bg, t], i) => `<div><i style="background:${bg}"></i><span>${t}</span><b>${perSnap((s) => lk([s.you, s.netapp, s.interest][i]))}</b></div>`).join("")}</div></div>`;
  const fd = `<div class="pcol"><div class="ptop">Deposits</div><div class="pnum">${perSnap((s) => lk(s.fd))}</div><label class="pkl pillar fd" for="p-fd" style="gap:1px">${D.FDS.map((x, i) => `<span class="blk d${i + 1}" style="background:${pastel(x.color)}"></span>`).join("")}</label><div class="plinth"></div><div class="pleg"><div><i style="background:${pastel("teal")}"></i><span>Deposits placed</span><b>${perSnap((s) => `${s.count} of ${D.FDS.length}`)}</b></div><div><i style="background:oklch(1 0 0 / 0.35)"></i><span>Share of the whole</span><b>${perSnap((s) => `${s.total ? Math.round((s.fd / s.total) * 100) : 0}%`)}</b></div></div></div>`;
  const chips = SNAPS.map((x) => `<label class="pkl chip-b" for="s-${x.k}">${x.label}</label>`).join("");
  return `<div style="display:flex;flex-direction:column;gap:14px"><div class="scene">${epf}${fd}</div><div><div class="s-ct" style="margin-bottom:8px">Go back to a day<small>the pillars rise and fall</small></div><div class="tscrub">${chips}</div></div></div>`;
}
export function j2() {
  const panel = (k, eb, name, n, sub, tiles, chart) => `<div class="vw-p vw-p-${k} cstack"><div><div class="s-eb"><span>${eb}</span></div><div style="display:flex;align-items:baseline;gap:16px;flex-wrap:wrap"><h2 class="s-name" style="margin:6px 0 0">${name}</h2></div>${big(n, 52)}<div class="s-sub">${sub}</div></div><div class="s-tiles4">${tiles}</div>${chart}</div>`;
  const all = panel("all", "EPF and deposits together", "Your fixed income", D.TOTAL, `${D.pct(D.SHARE_EPF, 0)} of it is EPF · ≈ ${lakh(D.EPF.pending)} more interest is on its way`, tile("Earned so far", inr(D.EARNED_SO_FAR), "credited and built up") + tile("Earning a day", inr(D.PER_DAY), `${inr(D.PER_DAY * 30.44)} a month`) + tile("Put in", lakh(D.EPF.total - D.epfBalance().interest + D.FD_PUT), "by you, NetApp, deposits") + tile("First deposit matures", dmy(D.NEXT_FD.maturityDate).split(" ").slice(0, 3).join(" "), "in 10 months"), worthChart());
  const epf = panel("epf", "Employees' Provident Fund · NetApp India", "EPF passbook", D.EPF.total, `interest to 31 Mar 2026; contributions to ${dmy(D.EPF.lastCredit)} · 8.25%`, tile("Put in this year", inr(D.EPF.contributedThisYear), `${D.EPF.creditsThisYear} credits`) + tile("Interest not credited", `≈ ${inr(D.EPF.pending)}`, "April to October") + tile("Credited last year", inr(2 * D.EPF_INTEREST[2].each), "31 Mar 2026") + tile("Earning a day", `₹${D.EPF.perDay.toFixed(2)}`, "on the balance"), epfChart());
  const fd = panel("fd", "Fixed deposits · bank not set", "Seven deposits", D.FD_VALUE, `worth today, from ${lakh(D.FD_PUT)} placed · 7.75% on all seven`, tile("Interest so far", inr(D.FD_ACCRUED), "as your app shows") + tile("Still to come", inr(sum(D.FDS.map((x) => x.maturityAmount)) - D.FD_VALUE), "an estimate") + tile("Earning a day", `₹${D.FD_PER_DAY.toFixed(2)}`, `${inr(D.FD_PER_DAY * 30.44)} a month`) + tile("Next matures", dmy(D.NEXT_FD.maturityDate).split(" ").slice(0, 3).join(" "), "14 Sep 2027"), fdGantt());
  const stage = `<section class="stg2">${radios("p", P_KEYS, "all")}${radios("s", SNAP_KEYS, "now")}<div style="display:flex;justify-content:space-between;align-items:center;gap:16px"><div class="s-ct" style="margin:0;font-size:15px">Your two pillars<small>height is money: pick a pillar to open it, or go back to a day</small></div><label class="pkl chip-b" for="p-all">Everything</label></div><div class="s-grid" style="grid-template-columns:5fr 7fr">${scene()}<div>${all}${epf}${fd}</div></div></section>`;
  return stage;
}

const body = (hero) => P.page(`${P.greeting()}${P.attention()}${hero}${widgets4()}${P.note()}`);
export const BOARDS4 = { j1: h1, j2 };
export const render4 = (k) => () => body(BOARDS4[k]());
