// C · Pop Poster — loud, tilted, halftone. Display type, starburst badges and comic speech bubbles; a sticker strip replaces the sidebar.
import { art, SECTION_ART, INK } from "./art.mjs";
import { inr, parts, netWorth, tiles, trend, attention, SECTIONS, greeting } from "./data.mjs";

const P = { yellow: "#FFE14D", pink: "#FF3E8A", blue: "#2D5BFF", mint: "#2FEFB0", orange: "#FF7A1A", white: "#fff", lilac: "#C9B3FF", ink: INK };
const STRIP = [P.pink, P.mint, P.blue, P.orange, P.lilac, P.white, P.mint, P.pink, P.orange, P.lilac, P.blue];
const TILE = [
  { bg: P.pink, fg: "#fff" }, { bg: P.ink, fg: "#fff" }, { bg: P.mint, fg: INK }, { bg: P.blue, fg: "#fff" },
  { bg: P.white, fg: INK }, { bg: P.orange, fg: INK }, { bg: P.lilac, fg: INK }, { bg: P.pink, fg: "#fff" },
];

const css = `
.C { width:1440px; min-height:2080px; background:${P.yellow}; color:${INK}; font-family:'Archivo',sans-serif; position:relative; overflow:hidden; padding:0 0 70px; }
.C * { box-sizing:border-box; }
.C .dots { position:absolute; pointer-events:none; background-image:radial-gradient(${P.pink} 3.4px, transparent 3.8px); background-size:16px 16px; }
.C .strip { position:relative; display:flex; gap:7px; padding:22px 18px 20px; background:${INK}; border-bottom:4px solid ${INK}; z-index:2; }
.C .st { display:flex; align-items:center; gap:5px; border:3px solid ${INK}; border-radius:10px; padding:4px 8px 4px 4px; font-weight:800; font-size:11.5px; white-space:nowrap; text-transform:uppercase; letter-spacing:.02em; box-shadow:4px 4px 0 #fff; }
.C .st:nth-child(odd) { transform:rotate(-1.6deg); } .C .st:nth-child(even) { transform:rotate(1.4deg); }
.C .st.on { background:#fff !important; box-shadow:4px 4px 0 ${P.pink}; outline:3px solid ${P.yellow}; }
.C .st .ic { width:24px; height:24px; display:grid; place-items:center; }
.C .wrap { position:relative; z-index:1; padding:44px 44px 0; }
.C .top { display:grid; grid-template-columns:1fr 330px; gap:26px; align-items:start; }
.C .eyebrow { display:inline-block; background:${INK}; color:${P.yellow}; padding:6px 16px; font-weight:800; font-size:15px; letter-spacing:.14em; text-transform:uppercase; transform:rotate(-2deg); box-shadow:5px 5px 0 ${P.pink}; }
.C h1 { font-family:'Bowlby One',sans-serif; font-weight:400; font-size:84px; line-height:.95; margin:18px 0 18px; letter-spacing:-.01em; text-transform:uppercase; text-shadow:5px 5px 0 #fff; }
.C h1 em { font-style:normal; color:${P.pink}; text-shadow:5px 5px 0 ${INK}; }
.C .sent { font-size:21px; font-weight:600; line-height:1.55; max-width:800px; }
.C .sent b { font-weight:800; background:${INK}; color:${P.yellow}; padding:1px 9px; margin:0 1px; transform:rotate(-1deg); display:inline-block; cursor:help; }
.C .bubble { position:relative; background:#fff; border:4px solid ${INK}; border-radius:26px; padding:20px 22px; box-shadow:8px 8px 0 ${INK}; font-weight:800; font-size:20px; line-height:1.25; transform:rotate(2deg); text-align:center; }
.C .bubble::after { content:""; position:absolute; left:50px; bottom:-26px; border:14px solid transparent; border-top:26px solid ${INK}; border-left-width:6px; }
.C .bubble::before { content:""; position:absolute; left:53px; bottom:-18px; border:11px solid transparent; border-top:20px solid #fff; border-left-width:4px; z-index:1; }
.C .hero { position:relative; margin-top:34px; background:${P.blue}; border:5px solid ${INK}; box-shadow:12px 12px 0 ${INK}; padding:34px 44px 38px; overflow:hidden; display:grid; grid-template-columns:1fr 340px; align-items:center; }
.C .hero .halftone { position:absolute; inset:0; background-image:radial-gradient(#ffffff2e 3px, transparent 3.5px); background-size:14px 14px; -webkit-mask-image:linear-gradient(100deg, transparent 30%, #000 100%); mask-image:linear-gradient(100deg, transparent 30%, #000 100%); }
.C .ribbon { display:inline-block; background:${P.yellow}; border:4px solid ${INK}; padding:4px 22px; font-weight:900; font-size:20px; letter-spacing:.18em; text-transform:uppercase; transform:rotate(-2deg); box-shadow:5px 5px 0 ${INK}; position:relative; }
.C .num { position:relative; font-family:'Bowlby One',sans-serif; font-size:128px; line-height:1; color:#fff; -webkit-text-stroke:5px ${INK}; paint-order:stroke fill; text-shadow:9px 9px 0 ${INK}; margin:20px 0 22px; letter-spacing:-.01em; }
.C .parts { position:relative; display:flex; flex-wrap:wrap; gap:10px 12px; }
.C .pp { background:#fff; border:3px solid ${INK}; padding:4px 12px; font-weight:800; font-size:15px; box-shadow:4px 4px 0 ${INK}; text-transform:uppercase; }
.C .pp.neg { background:${P.pink}; color:#fff; }
.C .pp small { font-weight:700; opacity:.7; margin-right:6px; font-size:12px; }
.C .burst { position:relative; width:330px; height:330px; display:grid; place-items:center; justify-self:center; }
.C .burst .bg { position:absolute; inset:0; animation:none; }
.C .burst .tx { position:relative; text-align:center; font-family:'Bowlby One',sans-serif; font-size:26px; line-height:1.05; text-transform:uppercase; transform:rotate(-8deg); }
.C .burst .tx big { display:block; font-size:50px; color:#fff; -webkit-text-stroke:3px ${INK}; paint-order:stroke fill; text-shadow:4px 4px 0 ${INK}; }
.C .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:30px 26px; margin-top:44px; }
.C .tile { position:relative; border:4px solid ${INK}; box-shadow:8px 8px 0 ${INK}; padding:20px 20px 20px; min-height:190px; }
.C .tile:nth-child(1) { transform:rotate(-1.4deg); } .C .tile:nth-child(2) { transform:rotate(1deg); } .C .tile:nth-child(3) { transform:rotate(-.8deg); } .C .tile:nth-child(4) { transform:rotate(1.6deg); }
.C .tile:nth-child(5) { transform:rotate(1.1deg); } .C .tile:nth-child(6) { transform:rotate(-1.2deg); } .C .tile:nth-child(7) { transform:rotate(.9deg); } .C .tile:nth-child(8) { transform:rotate(-1.5deg); }
.C .tile .lbl { font-weight:900; font-size:15px; letter-spacing:.06em; text-transform:uppercase; max-width:150px; line-height:1.2; }
.C .tile .art { position:absolute; right:12px; top:12px; }
.C .tile .val { position:absolute; left:20px; bottom:18px; font-family:'Bowlby One',sans-serif; font-size:34px; letter-spacing:-.01em; }
.C .tile .flag { position:absolute; right:-14px; bottom:14px; background:${P.yellow}; color:${INK}; border:3px solid ${INK}; padding:1px 10px; font-weight:900; font-size:12px; letter-spacing:.1em; text-transform:uppercase; transform:rotate(6deg); }
.C .low { display:grid; grid-template-columns:1.2fr 1fr; gap:34px; margin-top:50px; align-items:start; }
.C .panel { background:#fff; border:5px solid ${INK}; box-shadow:10px 10px 0 ${INK}; padding:24px 28px 28px; position:relative; }
.C .panel h2 { font-family:'Bowlby One',sans-serif; font-weight:400; font-size:32px; text-transform:uppercase; margin:0; display:inline-block; background:${P.pink}; color:#fff; padding:2px 14px; border:4px solid ${INK}; transform:rotate(-1.5deg); box-shadow:5px 5px 0 ${INK}; position:relative; top:-46px; margin-bottom:-34px; }
.C .att { display:flex; flex-direction:column; gap:20px; margin-top:6px; }
.C .sb { position:relative; display:flex; align-items:center; gap:14px; background:${P.yellow}; border:4px solid ${INK}; border-radius:22px; padding:12px 16px; box-shadow:5px 5px 0 ${INK}; }
.C .sb:nth-child(even) { background:${P.mint}; margin-left:26px; } .C .sb:nth-child(3) { background:${P.lilac}; } .C .sb:nth-child(5) { background:#FFB38A; }
.C .sb::after { content:""; position:absolute; left:28px; bottom:-20px; border:10px solid transparent; border-top:18px solid ${INK}; border-bottom:0; border-left-width:4px; }
.C .sb:nth-child(even)::after { left:auto; right:34px; }
.C .sb:last-child::after { display:none; }
.C .sb b { display:block; font-weight:900; font-size:18px; text-transform:uppercase; letter-spacing:.01em; }
.C .sb span { font-weight:600; font-size:15px; }
.C .sb .ic { width:50px; height:50px; background:#fff; border:3px solid ${INK}; border-radius:50%; display:grid; place-items:center; flex-shrink:0; }
`;

const strip = SECTIONS.map((s, i) => `<span class="st${i === 0 ? " on" : ""}" style="background:${STRIP[i]};color:${INK}"><span class="ic">${art[SECTION_ART[s]]({ a: i === 0 ? P.pink : "#fff", b: P.yellow }, 24)}</span>${s}</span>`).join("");
const sentence = greeting.sentence.map((p) => (Array.isArray(p) ? `<b>${p[0]}</b>` : p)).join("");

function trendChart() {
  const W = 620, H = 330, pb = 36, bw = 34, gap = (W - bw * 12) / 12, max = 9;
  const defs = `<defs><pattern id="ht" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${P.blue}"/><circle cx="4" cy="4" r="2" fill="#fff" opacity=".55"/></pattern>
    <pattern id="ht2" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${P.pink}"/><circle cx="4" cy="4" r="2.2" fill="${INK}" opacity=".5"/></pattern></defs>`;
  const bars = trend.map(([m, v], i) => {
    const h = (v / max) * (H - pb - 56), x = i * (bw + gap) + gap / 2, y = H - pb - h, last = i === 11;
    return `<rect x="${x + 5}" y="${y + 5}" width="${bw}" height="${h}" fill="${INK}"/><rect x="${x}" y="${y}" width="${bw}" height="${h}" fill="${last ? "url(#ht2)" : "url(#ht)"}" stroke="${INK}" stroke-width="3.5"/>
      <text x="${x + bw / 2}" y="${H - 12}" text-anchor="middle" font-family="Archivo" font-weight="800" font-size="12.5" fill="${INK}" text-transform="uppercase">${m.toUpperCase()}</text>`;
  }).join("");
  const x11 = 11 * (bw + gap) + gap / 2, y11 = H - pb - (8.4 / max) * (H - pb - 56);
  return `<svg viewBox="0 0 ${W + 14} ${H}" width="100%" style="margin-top:6px;overflow:visible">${defs}<line x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}" stroke="${INK}" stroke-width="4"/>${bars}
    <g transform="translate(${x11 - 74},${y11 - 82}) rotate(-6)">${art.burst({ a: P.yellow }, 112, 12).replace("<svg", `<svg x="0" y="0"`)}<text x="56" y="62" text-anchor="middle" font-family="Bowlby One" font-size="17" fill="${INK}">₹8.4 L</text></g></svg>`;
}

const html = `<div class="C">
  <div class="dots" style="right:0;top:60px;width:520px;height:420px;-webkit-mask-image:radial-gradient(circle at 100% 0,#000,transparent 70%);mask-image:radial-gradient(circle at 100% 0,#000,transparent 70%)"></div>
  <div class="dots" style="left:0;bottom:0;width:640px;height:520px;-webkit-mask-image:radial-gradient(circle at 0 100%,#000,transparent 70%);mask-image:radial-gradient(circle at 0 100%,#000,transparent 70%)"></div>
  <nav class="strip">${strip}</nav>
  <div class="wrap">
    <div class="top">
      <div><span class="eyebrow">${greeting.eyebrow}</span><h1>Good afternoon,<br><em>Prathik!</em></h1><p class="sent">${sentence}</p></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:36px;padding-top:6px">
        <div class="bubble">Psst! The bank balance is up <u style="text-decoration-color:${P.pink};text-decoration-thickness:4px">5 months</u> running.</div>
        ${art.cup({ a: "#fff", b: "#C97B3A", c: P.pink }, 210, "wow")}</div>
    </div>

    <section class="hero">
      <div class="halftone"></div>
      <div style="position:relative"><span class="ribbon">Net worth</span><div class="num">${inr(netWorth)}</div>
        <div class="parts">${parts.map((p) => `<span class="pp${p.value < 0 ? " neg" : ""}"><small>${p.label}</small>${inr(p.value)}</span>`).join("")}</div></div>
      <div class="burst"><span class="bg">${art.burst({ a: P.yellow }, 330, 14)}</span>
        <div class="tx">Bank up<big>₹0.3 L</big>since<br>last month!</div></div>
    </section>

    <section class="grid">${tiles.map((t, i) => `<div class="tile" style="background:${TILE[i].bg};color:${TILE[i].fg}"><div class="lbl">${t.label}</div>${art[t.art]({ a: i === 4 || i === 1 ? P.yellow : "#fff", b: P.yellow }, 84).replace('class="art"', 'class="art" style="filter:drop-shadow(4px 4px 0 ' + INK + ')"')}<div class="val">${inr(t.value)}</div>${t.neg ? `<span class="flag">owe!</span>` : ""}</div>`).join("")}</section>

    <section class="low">
      <div class="panel"><h2>Bank trend</h2>${trendChart()}</div>
      <div class="panel"><h2>Needs attention!</h2><div class="att">${attention.map((a) => `<div class="sb"><span class="ic">${art[a.kind]({ a: P.yellow, b: P.pink }, 34)}</span><div><b>${a.label}</b><span>${a.detail}</span></div></div>`).join("")}</div></div>
    </section>
  </div>
</div>`;

export default {
  file: "NbC_PopPoster.dc.html", name: "C · Pop Poster", w: 1440, h: 2080, css, html,
  fonts: "family=Archivo:wght@600;800;900&family=Bowlby+One",
  note: "C · Pop Poster — the loudest one. Yellow page with pink halftone, Bowlby One display type, tilted tiles, a starburst for the monthly change, comic speech bubbles for the attention list, halftone-filled bars. Navigation becomes a strip of stickers across the top. Made-up figures.",
};
