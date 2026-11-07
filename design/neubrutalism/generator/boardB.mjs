// B · Chai Buddy — a cup mascot talks you through the numbers. Sky-blue page, icon rail, round illustration badges.
import { art, SECTION_ART, INK } from "./art.mjs";
import { inr, parts, netWorth, tiles, trend, attention, SECTIONS, greeting } from "./data.mjs";

const P = { sky: "#79C7FF", cream: "#FFF8E7", tomato: "#FF5A4F", sun: "#FFCF33", grass: "#4ADE80", grape: "#9B7BFF", pink: "#FF7DB5", mint: "#3DD6A5", orange: "#FF9A3D", white: "#fff" };
const RAIL = [P.sun, P.pink, P.grape, P.grass, P.orange, P.tomato, P.mint, P.sky, P.grass, P.pink, P.sun];
const BADGE = [P.pink, P.orange, P.grape, P.sky, P.mint, P.grass, P.sun, P.tomato];
const SEG = [P.sky, P.grape, P.mint, P.grass, P.orange];

const css = `
.B { width:1440px; min-height:1790px; background:${P.sky}; color:${INK}; font-family:'Fredoka',sans-serif; display:flex; position:relative; overflow:hidden; }
.B * { box-sizing:border-box; }
.B .cl { position:absolute; opacity:.95; }
.B .rail { width:96px; background:${P.cream}; border-right:3px solid ${INK}; padding:22px 0; display:flex; flex-direction:column; align-items:center; gap:14px; flex-shrink:0; position:relative; z-index:2; }
.B .rail .logo { width:60px; height:60px; border:3px solid ${INK}; border-radius:18px; background:${P.sun}; box-shadow:4px 4px 0 ${INK}; display:grid; place-items:center; margin-bottom:12px; }
.B .ri { position:relative; width:56px; height:56px; border:3px solid ${INK}; border-radius:50%; display:grid; place-items:center; }
.B .ri.on { box-shadow:4px 4px 0 ${INK}; transform:translate(-2px,-2px); }
.B .ri.on::after { content:attr(data-l); position:absolute; left:68px; top:10px; background:${INK}; color:#fff; padding:4px 12px; border-radius:999px; font-weight:600; font-size:15px; white-space:nowrap; z-index:5; }
.B .main { flex:1; padding:34px 44px 56px; display:flex; flex-direction:column; gap:30px; position:relative; z-index:1; }
.B .hello { display:flex; align-items:flex-end; gap:6px; position:relative; }
.B .mascot { margin-left:72px; flex-shrink:0; transform:rotate(-5deg); margin-bottom:-10px; }
.B .bubble { position:relative; background:#fff; border:3px solid ${INK}; border-radius:30px; box-shadow:8px 8px 0 ${INK}; padding:24px 32px 26px; flex:1; margin-bottom:6px; }
.B .bubble::before { content:""; position:absolute; left:-24px; bottom:46px; width:36px; height:36px; background:#fff; border-left:3px solid ${INK}; border-bottom:3px solid ${INK}; transform:rotate(45deg) skew(12deg,12deg); border-radius:0 0 0 8px; }
.B .eyebrow { display:inline-block; background:${P.grape}; color:#fff; border:3px solid ${INK}; border-radius:999px; padding:2px 14px; font-weight:600; font-size:14px; letter-spacing:.04em; }
.B h1 { font-weight:700; font-size:56px; line-height:1.02; margin:12px 0 10px; letter-spacing:-.01em; }
.B .sent { font-size:21px; font-weight:500; line-height:1.5; margin:0; max-width:760px; }
.B .sent b { font-weight:700; background:${P.sun}; border:2.5px solid ${INK}; border-radius:10px; padding:0 8px; margin:0 1px; white-space:nowrap; cursor:help; }
.B .refresh { position:absolute; right:0; top:0; background:${P.sun}; border:3px solid ${INK}; border-radius:999px; padding:9px 20px; font-weight:600; font-size:17px; box-shadow:4px 4px 0 ${INK}; }
.B .card { background:${P.cream}; border:3px solid ${INK}; border-radius:30px; box-shadow:8px 8px 0 ${INK}; position:relative; }
.B .nw { padding:28px 34px 30px; display:grid; grid-template-columns:auto 1fr; gap:6px 40px; align-items:end; }
.B .nw .lbl { font-weight:600; font-size:18px; display:flex; align-items:center; gap:8px; }
.B .nw .num { font-weight:700; font-size:88px; line-height:1; letter-spacing:-.02em; color:${INK}; }
.B .nw .num span { color:${P.tomato}; -webkit-text-stroke:0; }
.B .seg { grid-column:1 / -1; margin-top:18px; }
.B .bar { display:flex; height:52px; border:3px solid ${INK}; border-radius:18px; overflow:hidden; background:#fff; }
.B .bar i { display:block; height:100%; border-right:3px solid ${INK}; }
.B .bar i:last-child { border-right:0; }
.B .owe { display:flex; height:26px; border:3px solid ${INK}; border-radius:12px; overflow:hidden; margin-top:12px; background:repeating-linear-gradient(135deg, ${P.tomato} 0 8px, #fff 8px 16px); }
.B .legend { display:flex; flex-wrap:wrap; gap:8px 22px; margin-top:16px; font-weight:500; font-size:16px; }
.B .legend span { display:flex; align-items:center; gap:8px; }
.B .legend u { width:18px; height:18px; border:3px solid ${INK}; border-radius:6px; display:inline-block; text-decoration:none; }
.B .legend b { font-weight:700; }
.B .grid4 { display:grid; grid-template-columns:repeat(4,1fr); gap:44px 24px; margin-top:20px; }
.B .tile { padding:56px 20px 18px; min-height:176px; }
.B .tile .badge { position:absolute; top:-36px; left:18px; width:88px; height:88px; border:3px solid ${INK}; border-radius:50%; box-shadow:4px 4px 0 ${INK}; display:grid; place-items:center; }
.B .tile .lbl { font-weight:500; font-size:16px; line-height:1.2; opacity:.82; min-height:38px; }
.B .tile .val { font-weight:700; font-size:34px; letter-spacing:-.01em; margin-top:2px; }
.B .tile .pill { position:absolute; top:14px; right:16px; border:2.5px solid ${INK}; border-radius:999px; padding:1px 11px; font-weight:600; font-size:13px; background:${P.grass}; }
.B .tile .pill.neg { background:${P.tomato}; color:#fff; }
.B .row2 { display:grid; grid-template-columns:1.2fr 1fr; gap:30px; margin-top:6px; }
.B .panel { padding:24px 28px 28px; }
.B .panel h2 { font-weight:700; font-size:28px; margin:0 0 4px; display:flex; align-items:center; gap:10px; }
.B .panel .sub { font-weight:500; font-size:16px; opacity:.7; }
.B .tk { display:flex; align-items:stretch; background:#fff; border:3px solid ${INK}; border-radius:18px; margin-top:13px; box-shadow:4px 4px 0 ${INK}; overflow:hidden; }
.B .tk .ic { width:76px; display:grid; place-items:center; border-right:3px dashed ${INK}; }
.B .tk .tx { padding:11px 16px; flex:1; }
.B .tk b { display:block; font-weight:600; font-size:18px; }
.B .tk span { font-size:15px; font-weight:400; opacity:.78; }
.B .tk .ck { width:30px; height:30px; border:3px solid ${INK}; border-radius:9px; margin:auto 16px auto 0; background:#fff; }
`;

const rail = SECTIONS.map((s, i) => `<span class="ri${i === 0 ? " on" : ""}" data-l="${s}" style="background:${RAIL[i]}">${art[SECTION_ART[s]]({ a: "#fff", b: P.sun }, 34)}</span>`).join("");
const sentence = greeting.sentence.map((p) => (Array.isArray(p) ? `<b>${p[0]}</b>` : p)).join("");

const pos = parts.filter((p) => p.value > 0), posTotal = pos.reduce((s, p) => s + p.value, 0);
const negs = parts.filter((p) => p.value < 0);
const bar = pos.map((p, i) => `<i style="width:${(p.value / posTotal) * 100}%;background:${SEG[i]}"></i>`).join("");
const owe = negs.map((p) => `<i style="width:${(Math.abs(p.value) / posTotal) * 100 * 4}%;border-right:3px solid ${INK}"></i>`).join("");
const legend = parts.map((p, i) => `<span><u style="background:${p.value < 0 ? P.tomato : SEG[i]}"></u>${p.label} <b>${inr(p.value)}</b></span>`).join("");

function trendChart() {
  const W = 600, H = 390, pl = 14, pr = 14, pt = 46, pb = 36, min = 4, max = 9;
  const xs = (i) => pl + (i * (W - pl - pr)) / (trend.length - 1), ys = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
  const line = trend.map(([, v], i) => `${xs(i)},${ys(v)}`).join(" L");
  const area = `M${xs(0)},${H - pb} L${line} L${xs(trend.length - 1)},${H - pb}Z`;
  const grid = [5, 6, 7, 8, 9].map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${ys(v)}" y2="${ys(v)}" stroke="${INK}" stroke-opacity=".35" stroke-width="2" stroke-dasharray="3 7"/><text x="${pl + 4}" y="${ys(v) - 6}" text-anchor="start" font-family="Fredoka" font-weight="600" font-size="13" fill="${INK}" opacity=".75">₹${v} L</text>`).join("");
  const dots = trend.map(([m, v], i) => `<circle cx="${xs(i)}" cy="${ys(v)}" r="${i === trend.length - 1 ? 9 : 6}" fill="${i === trend.length - 1 ? P.tomato : "#fff"}" stroke="${INK}" stroke-width="3"/><text x="${xs(i)}" y="${H - 10}" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="13" fill="${INK}">${m}</text>`).join("");
  const lx = xs(trend.length - 1), ly = ys(8.4);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="margin-top:10px;overflow:visible"><path d="${area}" fill="${P.sun}" stroke="none" opacity=".85"/>${grid}<path d="M${line}" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>${dots}
    <g transform="translate(${lx - 118},${ly - 52})"><rect width="104" height="34" rx="17" fill="${P.tomato}" stroke="${INK}" stroke-width="3"/><text x="52" y="23" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="18" fill="#fff">₹8.4 L now</text></g></svg>`;
}

const html = `<div class="B">
  ${art.cloud({}, 150).replace('class="art"', 'class="art cl" style="left:330px;top:18px"')}
  ${art.cloud({}, 110).replace('class="art"', 'class="art cl" style="right:90px;top:120px"')}
  ${art.cloud({}, 90).replace('class="art"', 'class="art cl" style="right:420px;top:900px"')}
  <aside class="rail"><div class="logo">${art.cup({}, 42)}</div>${rail}</aside>
  <main class="main">
    <div class="hello"><div class="mascot">${art.cup({ a: "#fff", b: "#C97B3A", c: P.pink }, 250, "wow")}</div>
      <div class="bubble"><span class="eyebrow">${greeting.eyebrow}</span><h1>${greeting.title}</h1><p class="sent">${sentence}</p></div>
      <span class="refresh">↻ Refresh</span></div>

    <section class="card nw">
      <div><div class="lbl">${art.star({ a: P.sun }, 26)} Net worth</div><div class="num">${inr(netWorth)}</div></div>
      <div style="justify-self:end;margin-bottom:-6px">${art.coins({}, 110)}${art.piggy({ a: P.pink, b: P.sun }, 130)}</div>
      <div class="seg"><div class="bar">${bar}</div><div style="display:flex;align-items:center;gap:14px;margin-top:12px"><div class="owe" style="margin:0;flex:none;width:${(Math.abs(negs[0].value + negs[1].value) / posTotal) * 100}%;min-width:90px"></div><span style="font-weight:600;font-size:17px">← you owe ${inr(Math.abs(negs[0].value + negs[1].value))} (cards + loans), already taken off</span></div>
        <div class="legend">${legend}</div></div>
    </section>

    <section class="grid4">${tiles.map((t, i) => `<div class="card tile"><span class="badge" style="background:${BADGE[i]}">${art[t.art]({ a: "#fff", b: P.sun }, 58)}</span><span class="pill${t.neg ? " neg" : ""}">${t.neg ? "owe" : t.key === "subs" ? "monthly" : "yours"}</span><div class="lbl">${t.label}</div><div class="val">${inr(t.value)}</div></div>`).join("")}</section>

    <section class="row2">
      <div class="card panel"><h2>${art.arrowUp({ a: P.grass }, 32)}Bank balance trend</h2><div class="sub">Climbing for 5 months in a row</div>${trendChart()}</div>
      <div class="card panel"><h2>${art.sparkle({ a: P.tomato }, 30)}What needs attention</h2><div class="sub">5 things, soonest first</div>
        ${attention.map((a, i) => `<div class="tk"><span class="ic" style="background:${BADGE[(i * 3 + 1) % 8]}">${art[a.kind]({ a: "#fff", b: P.sun }, 38)}</span><div class="tx"><b>${a.label}</b><span>${a.detail}</span></div><span class="ck"></span></div>`).join("")}</div>
    </section>
  </main>
</div>`;

export default {
  file: "NbB_ChaiBuddy.dc.html", name: "B · Chai Buddy", w: 1440, h: 1790, css, html,
  fonts: "family=Fredoka:wght@400;500;600;700",
  note: "B · Chai Buddy — the chai cup is a mascot who says the greeting out loud. Sky-blue page, a round icon rail instead of the sidebar, circular illustration badges on the tiles, net worth as one chunky segmented bar (assets) with a hatched strip for what you owe. Made-up figures.",
};
