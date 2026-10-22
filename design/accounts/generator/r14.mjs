// Round 14 (2026-10-22): the final Bank Accounts page. W1-A (band, glow chart, money in and out, Balance history, the mix as
// blocks, Coming up) under the H4 hero (the cards are the hero), with the ring texture on every mark that has one on the other
// dashboards: chart bars, tiles, blocks and strips. All CSS, no script. Sample data, made up; "today" is Oct 21, 2026.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as Z1 from "./z1.mjs";
import * as W from "./wparts.mjs";
import * as R from "./r11.mjs";
import * as S from "./r12.mjs";
import { h4Stage, h4PhoneStage, CSS2, CSSP } from "./r13.mjs";
import { ANIM, tag, cols } from "./widgets.mjs";

export const RT = R.RT;

const glow = (p) => C.switchCard(["glow", "river", "bridge", "flow"], p, { title: "Over time" });
const hist = (p) => P.historyCard(p, { n: 8, spread: true, fill: W.trendFill });

export function finalPage() {
  const p = "fp", pk = P.picker(p, Z1.heroSel);
  const body = [cols("1fr 1fr", R.mixBlocks(p), hist(p)), R.savedBand(p), glow(p), cols("1fr 1fr", R.inOutCols(p), W.coming(p))].join("");
  return L.desktop({ h: "auto", body: `${C.DEFS()}${ANIM}${W.WCSS}${S.CSS(p)}${CSS2(p)}${RT}${pk.css}${pk.open}${tag("FINAL", "Bank Accounts", "The cards are the hero (H4), then the mix beside Balance history, this year in and out, Over time with the glow line, money in and money out beside Coming up. Ring texture on the marks.")}${R.pointGreeting()}${h4Stage(p)}${body}<div aria-hidden="true" style="height:140px;flex-shrink:0"></div>${pk.close}` });
}
/** The same page on a phone: the cards scroll as a row, then the widgets stacked in the same order. */
export function finalPhone() {
  const p = "fq", pk = P.picker(p, Z1.heroSel);
  W.OPTS.tips = false; // a touch screen has no hover, and the hover cards would double the file
  try {
    const body = [R.mixBlocks(p, { h: 250, w: 330, ph: true }), P.historyCard(p, { n: 3, ph: true }), R.savedBand(p, { ph: true }), C.switchCard(["glow", "river", "bridge", "flow"], p, { ph: true, title: "Over time" }), R.inOutCols(p, { ph: true }), W.coming(p, { ph: true })].join("");
    return `<div class="chai-app ph" style="width:390px;height:auto;padding-bottom:16px"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${L.I.menu()}</span></header><div class="ph-body" style="padding-bottom:12px">${C.DEFS()}${ANIM}${W.WCSS}${S.CSS(p)}${CSS2(p)}${CSSP(p)}${RT}${pk.css}${pk.open}${R.pointGreeting({ phone: true })}${h4PhoneStage(p)}${body}${pk.close}</div></div>`;
  } finally { W.OPTS.tips = true; }
}
export const R14_DESKTOPS = [{ file: "AccountsFinalPage.dc.html", w: 1600, render: finalPage }, { file: "AccountsFinalPagePhone.dc.html", w: 390, render: finalPhone }];
