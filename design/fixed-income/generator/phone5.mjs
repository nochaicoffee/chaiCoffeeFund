// The final design (J1) on a phone: the doors slide sideways, the stage is one column, the widgets stack. Six phones, on his real numbers.
// The phones show one state each (the stage is live on the page itself).
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts3.mjs";
import * as W from "./parts4.mjs";
import * as H from "./heroes3.mjs";
import { F, reviewRows, checks } from "./forms5.mjs";
const { I, inr, btn } = L;
const { card, cardHead, link, grad, fillc, lakh, lakhS, dmy, daysLeft, fdTile } = P;
const { big, tile, chip } = H;
const sum = D.sum;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const phone = ({ body, h = "__H__" }) => `<div class="chai-app ph" style="width:390px;height:${h}"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${I.menu()}</span></header><div class="ph-body">${body}</div></div>`;
const phHead = () => `<header class="pg-head ph-head"><div class="pg-text"><div class="eyebrow">Fixed Income · Today</div><h1>Good afternoon, Prathik</h1><div class="lede">${P.pointLede()}</div></div><div class="pg-actions">${btn("Add deposit", { icon: I.plus() })}${btn("Add EPF statement", { kind: "primary", icon: I.plus() })}</div></header>`;
const colors = (c) => `--h1:var(--card-${c}-from);--h2:var(--card-${c}-to);--hc:var(--card-${c})`;
const door = (name, v, sub, c, share, sel) => `<div class="door" style="background:${grad(c)};--dc:var(--card-${c});${sel ? "transform:translateY(-4px);box-shadow:0 0 0 3px var(--surface),0 0 0 6px var(--card-" + c + ")" : ""}"><div class="dnm">${name}</div><div><div class="dv">${lakh(v)}</div><div class="ds">${sub}</div></div><div class="pbar"><i style="width:${share * 100}%"></i></div></div>`;
const doors = (sel) => `<div class="doors3">${door("Everything", D.TOTAL, "EPF and 7 deposits", "indigo", 1, sel === "all")}${door("EPF", D.EPF.total, `${D.pct(D.SHARE_EPF, 0)} · 8.25%`, "emerald", D.SHARE_EPF, sel === "epf")}${door("Fixed deposits", D.FD_VALUE, "7 deposits · 7.75%", "teal", 1 - D.SHARE_EPF, sel === "fd")}</div>`;
const NW = 330;
const stageAll = () => `<section class="stg2" style="${colors("indigo")}"><div><div class="s-eb"><span>EPF and deposits together</span></div><h2 class="s-name">Your fixed income</h2><div class="s-big">${big(D.TOTAL)}</div><div class="s-sub">${D.pct(D.SHARE_EPF, 0)} of it is EPF · ≈ ${lakh(D.EPF.pending)} more interest is on its way</div><div class="s-chips">${chip("Earning", `${inr(D.PER_DAY)} a day`)}</div><div class="s-tiles">${tile("Earned so far", inr(D.EARNED_SO_FAR))}${tile("A month", inr(D.PER_DAY * 30.44), "at today's pace")}</div></div>${H.worthChart(NW, 250)}</section>`;
const stageEpf = () => `<section class="stg2" style="${colors("emerald")}">${H.epfInfo()}${H.epfChart(NW, 250)}</section>`;
const stageFd = () => `<section class="stg2" style="${colors("teal")}"><div><div class="s-eb"><span>Fixed deposits · bank not set</span></div><h2 class="s-name">Seven deposits</h2><div class="s-big">${big(D.FD_VALUE)}</div><div class="s-sub">worth today, from ${lakh(D.FD_PUT)} placed · 7.75% on all seven</div><div class="s-tiles">${tile("Interest so far", inr(D.FD_ACCRUED), "as your app shows")}${tile("Earning a day", `₹${D.FD_PER_DAY.toFixed(2)}`)}</div></div>${H.fdGantt(NW, 340)}</section>`;
const depCards = () => card(`${cardHead("Fixed deposits", "7 · as your app shows them", link("Closed (0)"))}${[...D.FDS].sort((a, b) => a.maturityDate.localeCompare(b.maturityDate)).map((x) => { const f = Math.min(1, D.daysBetween(x.startDate, D.TODAY) / D.daysBetween(x.startDate, x.maturityDate)); return `<div class="pdep">${fdTile(x, 34)}<div class="nm2"><b>${x.name}</b><small>${x.tenure} · matures ${dmy(x.maturityDate).slice(0, -5)} ${x.maturityDate.slice(0, 4)}</small></div><div class="r"><b class="num">${inr(D.fdWorth(x))}</b><small class="up">+₹${x.shown.toFixed(2)}</small></div><div class="prog"><span style="width:${f * 100}%;background:${fillc(x.color)}"></span></div></div>`; }).join("")}`, { gap: 4 });
const moneyPhone = () => { const months = Array.from({ length: 12 }, (_, i) => { const d = D.addMonthsUTC("2025-12-01", i).slice(0, 7); return d; }); const lvl = (t) => (t < 20000 ? 1 : t < 30000 ? 2 : t < 40000 ? 3 : t < 55000 ? 4 : 5); return card(`${cardHead("Money in each month", "last 12 months")}<div class="pmi">${months.map((k) => { const v = D.MONEY_IN[k] || { epf: 0, fd: 0 }, t = v.epf + v.fd, now = k === D.TODAY.slice(0, 7); return `<div style="background:${t ? `var(--heat-${lvl(t)})` : "var(--fill)"};color:${t && lvl(t) >= 4 ? "#fff" : "inherit"}${now ? ";box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--accent)" : ""}"><small>${MON[+k.slice(5, 7) - 1]}</small>${t ? `${Math.round(t / 1000)}k${v.fd ? " •" : ""}` : "–"}</div>`; }).join("")}</div><div class="card-note">A dot is a deposit placed. A month this year: ${inr(sum(["2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07","2026-08","2026-09","2026-10"].map((k) => D.MONEY_IN[k].epf + D.MONEY_IN[k].fd)) / 10)}.</div>`, { gap: 12 }); };
const sheet = (inner) => `<div class="tsheet"><div class="grab"></div>${inner}</div>`;
const dim = (inner) => `<div style="opacity:.35;filter:blur(1.5px);display:flex;flex-direction:column;gap:16px;pointer-events:none">${inner}</div>`;

export function phoneBoard() {
  const p1 = phone({ body: `${phHead()}${P.attention()}${doors("all")}${stageAll()}` });
  const p2 = phone({ body: `${doors("epf")}${stageEpf()}${P.epfCard()}` });
  const p3 = phone({ body: `${doors("fd")}${stageFd()}${depCards()}` });
  const p4 = phone({ body: `${moneyPhone()}${W.creditsOnTime()}` });
  const p5 = phone({ body: `${W.growthPath()}${P.comingUp()}` });
  const FY = D.EPF_CREDITS.filter((c) => c.date >= "2025-04-01" && c.date <= "2026-03-31");
  const addSheet = sheet(`<div class="dlg-h" style="padding:0"><span class="dlg-ic">${I.receipt(18)}</span><div><h3>Add an EPF statement</h3><p>The passbook PDF from the EPFO portal</p></div><span class="dlg-x">${I.x(14)}</span></div><div class="dropz hot"><span class="ico" style="background:${grad("emerald")}">${I.receipt(22)}</span><b>Choose the passbook PDF</b><small>Tap to pick it from Downloads or Files</small></div><div class="help" style="display:flex;gap:6px;font-size:12px;color:var(--muted);font-weight:600">${I.info(12)}<span>It's read on your device, you see every row first, and your UAN and date of birth are never saved.</span></div>`);
  const revSheet = sheet(`<div class="dlg-h" style="padding:0"><span class="dlg-ic">${I.check(18)}</span><div><h3>Review: FY 2025-26</h3><p>12 credits and a year's interest</p></div><span class="dlg-x">${I.x(14)}</span></div>${checks(true)}${reviewRows(FY, { n: 4 })}${btn("Import 12 credits and the interest", { kind: "primary", icon: I.check(14) })}`);
  const p6 = phone({ body: `${dim(`${phHead()}${P.attention()}${doors("all")}`)}<div style="margin:0 -16px -28px;position:relative;z-index:3;margin-top:-300px">${addSheet}</div>` });
  const p7 = phone({ body: `${dim(`${doors("epf")}${stageEpf()}`)}<div style="margin:0 -16px -28px;position:relative;z-index:3;margin-top:-640px">${revSheet}</div>` });
  const items = [["Top", p1], ["EPF opened", p2], ["Deposits opened", p3], ["Money in, credits", p4], ["Growth, coming up", p5], ["Add EPF statement", p6], ["Review", p7]];
  const body = `<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>Fixed Income on a phone</h2><span class="sample" style="background:var(--accent-tint);color:var(--accent-text)">Your real numbers</span></div><p>The same order as the page (J1): greeting, the two attention items, the three doors (they slide sideways), then the stage for the one you pick, and under it the widgets: money in each month, credits on time, growth path, coming up and the EPF card. <b>Add EPF statement</b> is a bottom sheet: choose the PDF, then a review sheet with the checks before anything is saved. Each phone shows one pick; on the page itself the doors are live.</p></div><div style="display:flex;gap:36px;align-items:flex-start;flex-wrap:nowrap">${items.map(([l, p]) => `<div><div class="frame-l">${l}</div>${p}</div>`).join("")}</div>`;
  return `<div class="chai-app board" style="width:3200px;height:__H__">${body}</div>`;
}
