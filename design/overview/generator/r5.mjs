// Round 5 (2026-11-07): ideas borrowed from the neubrutalism exploration (session "Dashboard design exploration": illustrations for every kind of money,
// the chai-cup mascot, and the Money Town skyline), kept in OUR design language: glass, soft gradients, the stage colour, no thick ink outlines.
//   I1 Town   a cross-section of your money: what you own stands above the road (taller as it grows), what you owe hangs below it (deeper as it grows);
//             a billboard counts the net worth; slide through 13 months and every building grows or shrinks; every building carries a sign and a beacon where its page has a warning
// Round 3's and 4's boards got the same borrowings in place: spot illustrations instead of line icons, and the cup beside the greeting.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as H from "./history.mjs";
import { radios } from "./ui.mjs";
import { spotArt as spot, art, withMascot as _wm } from "./art-soft.mjs";
const withMascot = (h) => h.replace('<div class="pg-text">', `<div class="pg-lead"><div class="mascot" aria-hidden="true">${art.cup({ a: "#fff8ec", b: "#b8743a", c: "#ff9db8" }, 88)}</div><div class="pg-text">`).replace('</div><div class="pg-actions">', '</div></div><div class="pg-actions">');
import { MKEYS, TODAY_K, GKEYS, mp, sg, arrow, pctOf, nwBig, groupAside } from "./r3.mjs";
import { BKEYS, PAGEOF, wcount, detailFor } from "./r4.mjs";
const { inr } = L;
const { lakh, col, hc, tip } = P;

// ---------- the greeting (the same as round 4's), with the cup ----------
const pt = (text, c, { x = "l", w = 300 } = {}) => `<span class="hov pt" tabindex="0"><b>${text}</b>${tip(c, { w, x, y: "down" })}</span>`;
const lede = () => {
  const N = H.NOW;
  const worth = hc({ h: "Net worth", t: inr(D.NET), d: "what you own less what you owe", rows: [["Owned", inr(D.OWNED)], ["Owed", `−${inr(D.OWED)}`]], f: "Investments at today's prices, EPF at the passbook figure, a dollar account at today's rate." });
  const mo = hc({ h: "Since the end of October", t: `+${inr(H.CHANGE.month)}`, d: `${H.CHANGE.monthPct.toFixed(1)}% on ${inr(H.PREV.net)}`, rows: [["Owned grew by", `+${inr(N.owned - H.PREV.owned)}`, col("emerald")], ["Owed fell by", inr(H.PREV.owed - N.owed), col("teal")]], f: "Month-end figures from the monthly snapshots." });
  const yr = hc({ h: "Against a year ago", t: `+${inr(H.CHANGE.year)}`, d: `from ${inr(H.THEN.net)} in ${H.mfull(0)}`, rows: [["Owned grew by", `+${inr(N.owned - H.THEN.owned)}`, col("emerald")], ["Owed fell by", inr(H.THEN.owed - N.owed), col("teal")]], f: "Needs a year of snapshots." });
  const left = hc({ h: "Still to pay this month", t: inr(D.TO_PAY), d: `${inr(D.PAID_SO_FAR)} already paid`, rows: [["HDFC Car Loan EMI", "due today", col("sky")], ["HDFC Regalia", "18 Nov", col("ruby")], ["Amex", "24 Nov", col("onyx")], ["Gym", "21 Nov", col("plum")]], f: "Obligations of the month less what has been paid." });
  const look = hc({ h: "Keep in mind", t: `${H.WARN.length} things`, rows: [["Act now", String(H.COUNTS.red), "oklch(0.62 0.2 25)"], ["Soon, or off", String(H.COUNTS.amber), "oklch(0.8 0.15 85)"], ["Worth knowing", String(H.COUNTS.info), "oklch(0.7 0.08 250)"]], f: "Every warning the ten pages raise, in one list." });
  return `You're worth ${pt(inr(D.NET), worth)}, up ${pt(lakh(H.CHANGE.month), mo, { x: "c" })} on last month and ${pt(lakh(H.CHANGE.year), yr, { x: "c" })} on a year ago. ${pt(inr(D.TO_PAY), left, { x: "c" })} is still to pay this month, and ${pt(`${H.WARN.length} things`, look, { x: "r" })} need a look, ${H.COUNTS.red} of them today.`;
};
const page = (body) => P.page(`${withMascot(L.header({ eyebrow: `Overview · Today ${P.sampleTag()}`, lede: lede(), actions: P.greetingActions() }))}${body}${P.sampleNote()}`);

// ---------- the town ----------
export const TOWN = {
  K_UP: 0.00008, K_DOWN: 0.000048, MIN_UP: 78, MIN_DOWN: 46, // units of the 1000-unit-wide scene per rupee
  // x is the centre of a building in the scene's 1000 units; w its width
  up: [{ k: "bank", x: 95, w: 150 }, { k: "invest", x: 270, w: 128 }, { k: "fixed", x: 440, w: 150 }, { k: "lent", x: 590, w: 112 }],
  down: [{ k: "home", x: 680, w: 150 }, { k: "car", x: 826, w: 112 }, { k: "cards", x: 930, w: 82 }],
};
export const upH = (r, k) => Math.max(TOWN.MIN_UP, Math.round(r[k] * TOWN.K_UP));
export const downH = (r, k) => Math.max(TOWN.MIN_DOWN, Math.round(r[k] * TOWN.K_DOWN));
const ART = { bank: "accounts", invest: "invest", fixed: "fixed", lent: "lent", home: "loans", car: "car", cards: "cards" };
const BCOL = { bank: "sapphire", invest: "indigo", fixed: "forest", lent: "copper", home: "teal", car: "sky", cards: "ruby" };

function building(b, dir) {
  const t = H.TYPES.find((x) => x.k === b.k), ws = wcount(PAGEOF[b.k]), worst = [...ws].sort((p, q) => H.TONE_RANK[p.tone] - H.TONE_RANK[q.tone])[0];
  const sign = `<span class="sign"><small>${t.name}</small><b>${mp((i) => `${dir === "down" ? "−" : ""}${lakh(H.HIST[i][b.k])}`, "ov")}</b>${worst ? `<i class="orb-w wd-${worst.tone}">${ws.length}</i>` : ""}</span>`;
  const roof = `<span class="bu-roof">${b.k === "invest" ? spot("invest", 64) : b.k === "bank" ? '<i class="tri"></i>' : b.k === "lent" ? '<i class="awn"></i>' : b.k === "fixed" ? '<i class="dome"></i>' : b.k === "home" ? '<i class="tri"></i>' : b.k === "car" ? '<i class="awn"></i>' : '<i class="awn"></i>'}</span>`;
  const body = `<span class="bu-body"><span class="bu-art">${spot(ART[b.k], 54)}</span></span>`;
  return `<label class="pkl bu bu-${dir} bu-${b.k}" for="b-${b.k}" style="left:calc(${b.x} * var(--u));--w:${b.w};--bcl:var(--card-${BCOL[b.k]}-from);--bch:var(--card-${BCOL[b.k]})">${dir === "up" ? `${sign}<span class="bu-shape">${roof}${body}</span>` : `${sign}<span class="bu-shape">${body}${roof}</span>`}</label>`;
}
function scene() {
  const ups = TOWN.up.map((b) => building(b, "up")).join(""), downs = TOWN.down.map((b) => building(b, "down")).join("");
  const eq = `<div class="eqn"><div class="eq-i"><small>Above ground</small>${mp((i) => `<b>${lakh(H.HIST[i].owned)}</b>`, "ov")}</div><span class="eq-o">−</span><div class="eq-i"><small>Underground</small>${mp((i) => `<b class="owe">${lakh(H.HIST[i].owed)}</b>`, "ov")}</div><span class="eq-o">=</span><div class="eq-i eq-k"><small>You keep</small>${mp((i) => `<b>${lakh(H.HIST[i].net)}</b>`, "ov")}</div></div>`;
  const clouds = `<i class="cl cl1">${art.cloud({ a: "#fff" }, 90)}</i><i class="cl cl2">${art.cloud({ a: "#fff" }, 60)}</i><i class="cl cl3">${art.cloud({ a: "#fff" }, 76)}</i>`;
  const billboard = `<div class="bb"><div class="bb-t">Net worth</div>${nwBig()}<div class="bb-d">${mp((i) => { const r = H.HIST[i], p = H.HIST[i - 1]; return p ? `<span class="dpill ${r.net - p.net >= 0 ? "up" : "dn"}">${arrow(r.net - p.net)} ${sg(r.net - p.net)}<small>that month</small></span>` : `<span class="dpill">first month</span>`; }, "bbm")}</div><i class="bb-p bb-p1"></i><i class="bb-p bb-p2"></i></div>`;
  return `<div class="town"><div class="town-in"><div class="sky"></div><div class="soil"></div>${clouds}<i class="sunny">${art.sun({ a: "var(--card-gold)" }, 96)}</i>${billboard}<div class="road"><i class="dashes"></i></div><i class="drive">${art.cup({ a: "#fff8ec", b: "#b8743a", c: "#ff9db8" }, 46)}</i>${ups}<span class="ground-l">what you own stands on the road</span><span class="ground-r">what you owe is underground</span>${downs}${eq}</div></div>`;
}
function town() {
  const head = mp((i) => {
    const r = H.HIST[i], ch = r.net - H.NOW.net;
    return `<div class="n1-meta"><span class="eyebrow-s">The town at the end of ${H.mfull(i)}${i === H.TODAY_I ? " (today)" : ""}</span><div class="n1-d">${i === H.TODAY_I ? `<span class="dpill up">${arrow(1)} ${sg(H.CHANGE.month)}<small>vs ${H.mfull(i - 1)}</small></span><span class="dpill up">${arrow(1)} ${sg(H.CHANGE.year)}<small>since ${H.mfull(0)}</small></span>` : `<span class="dpill dn">${arrow(-1)} ${sg(ch)}<small>against today</small></span>`}</div></div>`;
  });
  const scrub = `<div class="sc3"><span class="sc3-t">Slide through the months</span><div class="sc3-tr">${H.KEYS.map((_, i) => `<label class="pkl sc3-k" for="m-${i}"><i></i><span>${H.mshort(i)}</span></label>`).join("")}</div></div>`;
  const hint = `<div class="vw-b vw-b-all od od-hint"><b>Pick a building</b><span>to see it through the year and the warnings on its page. Buildings grow as the money grows; the ones underground deepen as you owe more. A number on a sign is how many things its page wants a look at.</span></div>`;
  const stage = `<section class="stg2 v3 town-stg" data-b="v3">${radios("m", MKEYS, TODAY_K)}${radios("g", GKEYS)}${radios("b", BKEYS)}<div class="n3-g"><div class="n3-l">${head}${scene()}<div class="od-w">${hint}${H.TYPES.map(detailFor).join("")}</div>${scrub}</div>${groupAside()}</div></section>`;
  return page(stage);
}

export const q = { town };
export const renderT = (id) => () => q[id]();
