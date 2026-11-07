// A · Sticker Bento — cream paper, thick ink outlines, hard offset shadows, one spot illustration per tile.
import { art, SECTION_ART, INK } from "./art.mjs";
import { inr, lakh, parts, netWorth, tiles, trend, attention, SECTIONS, greeting } from "./data.mjs";

const P = { cream: "#FFF3D6", yellow: "#FFD23F", pink: "#FF8FB1", coral: "#FF6B5A", mint: "#3DD6A5", sky: "#7FD6FF", lilac: "#B79CFF", orange: "#FF9A3D", blue: "#6C8BFF", lime: "#C6F04A", white: "#FFFFFF" };
const NAV_BG = [P.yellow, P.pink, P.blue, P.lilac, P.lime, P.coral, P.sky, P.mint, P.orange, P.pink, P.yellow];
const TILE_BG = [P.pink, P.lilac, P.sky, P.lime, P.mint, P.orange, P.yellow, P.coral];
const PART_BG = [P.sky, P.lilac, P.mint, P.lime, P.orange, P.pink, P.coral];

const css = `
.A { --ink:${INK}; width:1440px; min-height:1500px; background:${P.cream}; background-image: radial-gradient(${INK}22 1.4px, transparent 1.6px); background-size: 22px 22px; color:var(--ink); font-family:'Space Grotesk',sans-serif; display:flex; }
.A * { box-sizing:border-box; }
.A .side { width:252px; padding:28px 20px; border-right:3px solid var(--ink); background:${P.white}; display:flex; flex-direction:column; gap:8px; flex-shrink:0; }
.A .logo { display:flex; align-items:center; gap:10px; background:${P.yellow}; border:3px solid var(--ink); border-radius:14px; box-shadow:5px 5px 0 var(--ink); padding:8px 12px; margin-bottom:22px; font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:19px; line-height:1; transform:rotate(-1.5deg); }
.A .nav { display:flex; align-items:center; gap:11px; padding:6px 10px 6px 6px; border:3px solid transparent; border-radius:14px; font-weight:700; font-size:15.5px; }
.A .nav .chip { width:38px; height:38px; border:3px solid var(--ink); border-radius:11px; display:grid; place-items:center; }
.A .nav.on { background:var(--ink); color:#fff; box-shadow:4px 4px 0 ${P.pink}; border-color:var(--ink); }
.A .nav.on .chip { background:${P.yellow} !important; }
.A .main { flex:1; padding:34px 40px 48px; display:flex; flex-direction:column; gap:26px; }
.A .head { display:flex; justify-content:space-between; align-items:flex-start; gap:30px; }
.A .eyebrow { display:inline-block; background:${P.lime}; border:3px solid var(--ink); border-radius:999px; padding:3px 13px; font-weight:700; font-size:13px; letter-spacing:.08em; text-transform:uppercase; box-shadow:3px 3px 0 var(--ink); }
.A h1 { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:60px; line-height:1; letter-spacing:-.025em; margin:16px 0 12px; }
.A .sent { font-size:19px; font-weight:500; max-width:720px; line-height:1.55; }
.A .sent b { font-weight:700; background:linear-gradient(transparent 52%, ${P.yellow} 52%, ${P.yellow} 92%, transparent 92%); padding:0 3px; cursor:help; }
.A .btn { display:inline-flex; align-items:center; gap:8px; background:#fff; border:3px solid var(--ink); border-radius:12px; padding:10px 16px; font-weight:700; font-size:15px; box-shadow:4px 4px 0 var(--ink); }
.A .card { border:3px solid var(--ink); border-radius:20px; box-shadow:7px 7px 0 var(--ink); background:#fff; position:relative; }
.A .hero { background:${P.yellow}; padding:30px 34px 28px; display:grid; grid-template-columns:1fr 250px; gap:20px; overflow:hidden; }
.A .lbl { font-weight:700; font-size:14px; letter-spacing:.07em; text-transform:uppercase; }
.A .big { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:92px; line-height:1; letter-spacing:-.035em; margin:6px 0 20px; text-shadow:5px 5px 0 #fff; }
.A .chips { display:flex; flex-wrap:wrap; gap:10px; }
.A .pc { border:3px solid var(--ink); border-radius:12px; padding:6px 12px; font-weight:700; font-size:14.5px; box-shadow:3px 3px 0 var(--ink); display:flex; gap:7px; align-items:baseline; }
.A .pc small { font-weight:600; font-size:12px; opacity:.75; }
.A .heroArt { position:relative; }
.A .heroArt .a1 { position:absolute; right:-6px; top:2px; transform:rotate(6deg); }
.A .heroArt .a2 { position:absolute; left:-16px; bottom:-8px; transform:rotate(-10deg); }
.A .heroArt .a3 { position:absolute; right:26px; bottom:-14px; }
.A .grid4 { display:grid; grid-template-columns:repeat(4,1fr); gap:22px; }
.A .tile { padding:16px 18px 18px; min-height:158px; display:flex; flex-direction:column; justify-content:flex-end; transition:transform .12s; }
.A .tile:hover { transform:translate(-3px,-3px); box-shadow:10px 10px 0 var(--ink); }
.A .tile .lbl { font-size:12.5px; max-width:130px; line-height:1.25; position:absolute; top:16px; left:18px; }
.A .tile .art { position:absolute; right:10px; top:8px; transform:rotate(7deg); }
.A .tile:nth-child(even) .art { transform:rotate(-7deg); }
.A .val { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:32px; letter-spacing:-.02em; line-height:1; }
.A .tag { position:absolute; left:18px; bottom:18px; }
.A .stk { display:inline-block; border:2.5px solid var(--ink); border-radius:8px; background:#fff; padding:1px 8px; font-weight:700; font-size:11.5px; letter-spacing:.06em; text-transform:uppercase; transform:rotate(-3deg); }
.A .row2 { display:grid; grid-template-columns:1.25fr 1fr; gap:26px; align-items:stretch; }
.A .panel { padding:22px 24px 24px; }
.A .panel h2 { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:25px; margin:0 0 4px; letter-spacing:-.01em; display:flex; align-items:center; gap:10px; }
.A .panel .sub { font-size:14px; font-weight:500; opacity:.7; margin-bottom:12px; }
.A .att { display:flex; flex-direction:column; gap:12px; margin-top:10px; }
.A .item { display:flex; align-items:center; gap:14px; border:3px solid var(--ink); border-radius:14px; padding:10px 14px 10px 10px; box-shadow:4px 4px 0 var(--ink); }
.A .item:nth-child(odd) { transform:rotate(-.6deg); } .A .item:nth-child(even) { transform:rotate(.6deg); }
.A .item .ic { width:46px; height:46px; border:3px solid var(--ink); border-radius:12px; display:grid; place-items:center; flex-shrink:0; }
.A .item b { display:block; font-size:16px; font-weight:700; }
.A .item span { font-size:13.5px; font-weight:500; opacity:.78; }
.A .item .go { margin-left:auto; width:34px; height:34px; border:3px solid var(--ink); border-radius:50%; background:#fff; display:grid; place-items:center; font-weight:800; }
`;

const nav = SECTIONS.map((s, i) => `<div class="nav${i === 0 ? " on" : ""}"><span class="chip" style="background:${NAV_BG[i]}">${art[SECTION_ART[s]]({ a: i === 0 ? P.coral : "#fff", b: P.yellow }, 26)}</span>${s}</div>`).join("");

const sentence = greeting.sentence.map((p) => (Array.isArray(p) ? `<b>${p[0]}</b>` : p)).join("");

function trendChart() {
  const W = 560, H = 330, left = 8, bottom = 34, max = 9.2, bw = 30, gap = (W - left - bw * 12) / 12;
  const bars = trend.map(([m, v], i) => {
    const h = (v / max) * (H - bottom - 20), x = left + i * (bw + gap) + gap / 2, y = H - bottom - h, last = i === trend.length - 1;
    return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="6" fill="${last ? P.coral : [P.sky, P.lilac, P.mint][i % 3]}" stroke="${INK}" stroke-width="3"/>
      <text x="${x + bw / 2}" y="${H - 12}" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="12.5" fill="${INK}">${m}</text>`;
  }).join("");
  const lastX = left + 11 * (bw + gap) + gap / 2 + bw / 2, lastY = H - bottom - (8.4 / max) * (H - bottom - 20);
  return `<svg viewBox="0 0 ${W} ${H + 46}" width="100%" style="overflow:visible;margin-top:30px"><line x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}" stroke="${INK}" stroke-width="3"/>${bars}
    <g transform="translate(${lastX - 56},${lastY - 62}) rotate(-5)"><rect width="112" height="38" rx="10" fill="${P.yellow}" stroke="${INK}" stroke-width="3"/><text x="56" y="25" text-anchor="middle" font-family="Bricolage Grotesque" font-weight="800" font-size="19" fill="${INK}">₹8.4 L now</text></g>
    <g transform="translate(${lastX - 6},${lastY - 26})"><path d="M0 0 l6 10 l6 -10Z" fill="${INK}"/></g></svg>`;
}

const attBg = [P.pink, P.sky, P.lime, P.mint, P.orange];
const html = `<div class="A">
  <aside class="side"><div class="logo">${art.cup({}, 34)}chai coffee<br>fund</div>${nav}</aside>
  <main class="main">
    <div class="head"><div><span class="eyebrow">${greeting.eyebrow}</span><h1>${greeting.title}</h1><p class="sent">${sentence}</p></div>
      <span class="btn" style="margin-top:6px">↻ Refresh</span></div>

    <section class="card hero">
      <div><div class="lbl">Net worth</div><div class="big">${inr(netWorth)}</div>
        <div class="chips">${parts.map((p, i) => `<span class="pc" style="background:${PART_BG[i]}"><small>${p.value < 0 ? "−" : ""}${p.label}</small>${inr(Math.abs(p.value))}</span>`).join("")}</div></div>
      <div class="heroArt"><span class="a1">${art.piggy({ a: P.pink, b: "#fff" }, 190)}</span><span class="a2">${art.coins({}, 92)}</span><span class="a3">${art.sparkle({ a: "#fff" }, 40)}</span></div>
    </section>

    <section class="grid4">${tiles.map((t, i) => `<div class="card tile" style="background:${TILE_BG[i]}"><span class="lbl">${t.label}</span>${art[t.art]({ a: "#fff", b: P.yellow }, 62)}<div class="val">${inr(t.value)}</div>${t.neg ? `<span class="stk tag" style="bottom:auto;top:auto;position:static;margin-top:10px;align-self:flex-start;background:${INK};color:#fff">you owe</span>` : `<span class="stk" style="margin-top:10px;align-self:flex-start">${t.key === "subs" ? "per month" : "yours"}</span>`}</div>`).join("")}</section>

    <section class="row2">
      <div class="card panel"><h2>${art.arrowUp({ a: P.mint }, 30)}Bank balance trend</h2><div class="sub">Last 12 months, all accounts</div>${trendChart()}</div>
      <div class="card panel" style="background:${P.white}"><h2>${art.sparkle({ a: P.coral }, 28)}What needs attention</h2><div class="sub">5 things, soonest first</div>
        <div class="att">${attention.map((a, i) => `<div class="item" style="background:${attBg[i]}"><span class="ic" style="background:#fff">${art[a.kind]({ a: P.yellow, b: P.pink }, 30)}</span><div><b>${a.label}</b><span>${a.detail}</span></div><span class="go">→</span></div>`).join("")}</div></div>
    </section>
  </main>
</div>`;

export default {
  file: "NbA_StickerBento.dc.html", name: "A · Sticker Bento", w: 1440, h: 1500, css, html,
  fonts: "family=Bricolage+Grotesque:wght@700;800&family=Space+Grotesk:wght@500;600;700",
  note: "A · Sticker Bento — cream dot-grid paper, 3px ink outlines, hard offset shadows. Every tile gets its own colour and a spot illustration (piggy bank, safe, rocket, sprout…). Closest to today's layout: sidebar, hero, 4×2 tiles, trend and attention. Made-up figures.",
};
