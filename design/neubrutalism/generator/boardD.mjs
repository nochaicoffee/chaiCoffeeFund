// D · Money Town — the hero is an illustrated skyline: each part of net worth is a building with a sign. Tiles are retro app windows.
import { art, SECTION_ART, INK } from "./art.mjs";
import { inr, parts, netWorth, tiles, trend, attention, SECTIONS, greeting } from "./data.mjs";

const P = { lilac: "#CDB8FF", sky: "#8EE3FF", sun: "#FFD23F", tomato: "#FF6B5A", mint: "#3DD6A5", grass: "#4ADE80", pink: "#FF8FB1", orange: "#FF9A3D", blue: "#6C8BFF", cream: "#FFF8E7", white: "#fff" };
const TAB = [P.white, P.pink, P.sun, P.mint, P.orange, P.sky, P.pink, P.sun, P.mint, P.orange, P.sky];
const WIN = [P.pink, P.orange, P.sky, P.mint, P.sun, P.grass, P.pink, P.orange];

const css = `
.D { box-sizing:border-box; width:1440px; min-height:1880px; background:${P.lilac}; background-image:linear-gradient(${INK}14 2px, transparent 2px), linear-gradient(90deg, ${INK}14 2px, transparent 2px); background-size:36px 36px; color:${INK}; font-family:'Rubik',sans-serif; padding:30px 44px 60px; }
.D * { box-sizing:border-box; }
.D .bar { display:flex; align-items:center; justify-content:space-between; }
.D .logo { display:flex; align-items:center; gap:12px; font-weight:800; font-size:26px; letter-spacing:-.02em; background:#fff; border:3px solid ${INK}; border-radius:14px; padding:6px 16px 6px 8px; box-shadow:5px 5px 0 ${INK}; }
.D .btn { background:${P.sun}; border:3px solid ${INK}; border-radius:12px; padding:9px 18px; font-weight:700; font-size:16px; box-shadow:4px 4px 0 ${INK}; }
.D .tabs { display:flex; gap:4px; margin-top:26px; padding-left:8px; align-items:flex-end; }
.D .tab { display:flex; align-items:center; gap:7px; border:3px solid ${INK}; border-bottom:0; border-radius:14px 14px 0 0; padding:7px 10px 8px 7px; font-weight:700; font-size:13.5px; white-space:nowrap; position:relative; top:3px; }
.D .tab.on { padding-top:11px; font-size:15px; z-index:2; top:3px; }
.D .win { background:#fff; border:3px solid ${INK}; border-radius:18px; box-shadow:8px 8px 0 ${INK}; overflow:hidden; position:relative; }
.D .tb { display:flex; align-items:center; gap:7px; padding:9px 14px; border-bottom:3px solid ${INK}; font-weight:700; font-size:15px; }
.D .tb i { width:13px; height:13px; border:2.5px solid ${INK}; border-radius:50%; background:#fff; display:block; }
.D .tb span { margin-left:6px; }
.D .tb em { margin-left:auto; font-style:normal; font-weight:600; font-size:13px; opacity:.75; }
.D .scene { position:relative; }
.D .scene svg.sky { display:block; width:100%; height:auto; }
.D .hello { position:absolute; left:26px; top:22px; background:#fff; border:3px solid ${INK}; border-radius:16px; box-shadow:6px 6px 0 ${INK}; padding:16px 22px 18px; width:560px; }
.D .eyebrow { display:inline-block; background:${P.mint}; border:2.5px solid ${INK}; border-radius:8px; padding:1px 10px; font-weight:700; font-size:12.5px; letter-spacing:.08em; text-transform:uppercase; }
.D h1 { font-weight:800; font-size:44px; line-height:1.02; margin:10px 0 8px; letter-spacing:-.025em; }
.D .sent { margin:0; font-size:17px; font-weight:500; line-height:1.55; }
.D .sent b { font-weight:700; background:${P.sun}; padding:0 5px; border-radius:5px; border:2px solid ${INK}; cursor:help; white-space:nowrap; }
.D .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:28px 24px; margin-top:34px; }
.D .tile .body { padding:14px 16px 16px; position:relative; min-height:112px; }
.D .tile .val { font-weight:800; font-size:33px; letter-spacing:-.02em; margin-top:4px; }
.D .tile .art { position:absolute; right:12px; bottom:12px; }
.D .tile .st { display:inline-block; margin-top:9px; border:2.5px solid ${INK}; border-radius:7px; padding:0 8px; font-weight:700; font-size:12px; letter-spacing:.05em; text-transform:uppercase; background:${P.grass}; }
.D .tile .st.neg { background:${P.tomato}; color:#fff; }
.D .row2 { display:grid; grid-template-columns:1.2fr 1fr; gap:30px; margin-top:34px; }
.D .inbox .r { display:flex; align-items:center; gap:13px; padding:11px 16px; border-bottom:3px solid ${INK}; }
.D .inbox .r:last-child { border-bottom:0; }
.D .inbox .r:nth-child(odd) { background:${P.cream}; }
.D .inbox .ic { width:44px; height:44px; border:3px solid ${INK}; border-radius:12px; display:grid; place-items:center; flex-shrink:0; }
.D .inbox b { display:block; font-weight:700; font-size:16px; }
.D .inbox span.d { font-size:14px; font-weight:500; opacity:.75; }
.D .inbox .new { margin-left:auto; background:${P.tomato}; color:#fff; border:2.5px solid ${INK}; border-radius:7px; padding:0 8px; font-weight:800; font-size:11.5px; letter-spacing:.08em; transform:rotate(4deg); }
.D .inbox .go { margin-left:10px; width:32px; height:32px; border:3px solid ${INK}; border-radius:9px; display:grid; place-items:center; font-weight:800; background:${P.sun}; flex-shrink:0; }
`;

const tabs = SECTIONS.map((s, i) => `<span class="tab${i === 0 ? " on" : ""}" style="background:${TAB[i]}">${art[SECTION_ART[s]]({ a: "#fff", b: P.sun }, 22)}${s}</span>`).join("");
const sentence = greeting.sentence.map((p) => (Array.isArray(p) ? `<b>${p[0]}</b>` : p)).join("");

// The skyline. 1352 x 470; ground at y=400.
function skyline() {
  const G = 400, ink = INK;
  const sign = (x, y, w, label, value, bg = "#fff", fg = ink) => `<g transform="translate(${x},${y})"><rect width="${w}" height="46" rx="9" fill="${bg}" stroke="${ink}" stroke-width="3.5"/><rect x="5" y="5" width="${w}" height="46" rx="9" fill="${ink}" opacity="0" />
      <text x="${w / 2}" y="18" text-anchor="middle" font-family="Rubik" font-weight="700" font-size="12" letter-spacing="1" fill="${fg}" opacity=".8">${label}</text>
      <text x="${w / 2}" y="38" text-anchor="middle" font-family="Rubik" font-weight="800" font-size="21" fill="${fg}">${value}</text></g>`;
  const windows = (x, y, cols, rows, w = 14, h = 16, gx = 12, gy = 14, fill = "#9BE7FF") =>
    [...Array(rows)].flatMap((_, r) => [...Array(cols)].map((_, c) => `<rect x="${x + c * (w + gx)}" y="${y + r * (h + gy)}" width="${w}" height="${h}" fill="${(r * 3 + c * 5) % 7 === 0 ? P.sun : fill}" stroke="${ink}" stroke-width="2.5"/>`)).join("");
  const cloud = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})"><path d="M0 40 C-18 40 -18 14 4 14 C6 -8 40 -10 48 10 C70 4 80 34 62 40Z" fill="#fff" stroke="${ink}" stroke-width="3.5"/></g>`;
  const sunRays = [...Array(12)].map((_, i) => { const t = (i * Math.PI) / 6; return `<path d="M${Math.cos(t) * 52} ${Math.sin(t) * 52} L${Math.cos(t) * 70} ${Math.sin(t) * 70}" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`; }).join("");
  return `<svg class="sky" viewBox="0 0 1352 700" xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round">
    <rect width="1352" height="700" fill="${P.sky}"/>${cloud(880, 22, .9)}${cloud(1150, 130, .6)}<g transform="translate(0,230)">
    <g transform="translate(1240,84)">${sunRays}<circle r="38" fill="${P.sun}" stroke="${ink}" stroke-width="4"/></g>
    ${cloud(640, 60, 1.1)}${cloud(1010, 36, .8)}${cloud(30, 188, .7)}
    <!-- billboard -->
    <rect x="790" y="170" width="14" height="${G - 170}" fill="${P.orange}" stroke="${ink}" stroke-width="3.5"/><rect x="1130" y="170" width="14" height="${G - 170}" fill="${P.orange}" stroke="${ink}" stroke-width="3.5"/>
    <rect x="740" y="62" width="460" height="132" rx="14" fill="${P.sun}" stroke="${ink}" stroke-width="5"/><rect x="756" y="78" width="428" height="100" rx="8" fill="#fff" stroke="${ink}" stroke-width="3.5"/>
    <text x="970" y="108" text-anchor="middle" font-family="Rubik" font-weight="700" font-size="17" letter-spacing="4" fill="${ink}">NET WORTH</text>
    <text x="970" y="160" text-anchor="middle" font-family="Rubik" font-weight="800" font-size="56" letter-spacing="-1.5" fill="${ink}">${inr(netWorth)}</text>
    <circle cx="772" cy="70" r="6" fill="${P.tomato}" stroke="${ink}" stroke-width="3"/><circle cx="1168" cy="70" r="6" fill="${P.tomato}" stroke="${ink}" stroke-width="3"/>
    <!-- ground -->
    <rect x="0" y="${G}" width="1352" height="70" fill="${P.grass}" stroke="${ink}" stroke-width="4"/><rect x="0" y="${G + 34}" width="1352" height="36" fill="#6B6A7A" stroke="${ink}" stroke-width="4"/>
    <path d="M20 ${G + 52} H70 M150 ${G + 52} H200 M280 ${G + 52} H330 M410 ${G + 52} H460 M540 ${G + 52} H590 M670 ${G + 52} H720 M800 ${G + 52} H850 M930 ${G + 52} H980 M1060 ${G + 52} H1110 M1190 ${G + 52} H1240" stroke="#fff" stroke-width="5"/>
    <!-- bank -->
    <g><rect x="40" y="${G - 40}" width="250" height="40" fill="#fff" stroke="${ink}" stroke-width="4"/><rect x="60" y="${G - 70}" width="210" height="30" fill="#fff" stroke="${ink}" stroke-width="4"/>
      <rect x="64" y="${G - 220}" width="202" height="150" fill="${P.cream}" stroke="${ink}" stroke-width="4"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="${80 + i * 46}" y="${G - 205}" width="28" height="130" fill="#fff" stroke="${ink}" stroke-width="3.5"/>`).join("")}
      <path d="M44 ${G - 218} L165 ${G - 296} L286 ${G - 218}Z" fill="${P.sun}" stroke="${ink}" stroke-width="4"/><circle cx="165" cy="${G - 248}" r="14" fill="#fff" stroke="${ink}" stroke-width="3.5"/><text x="165" y="${G - 243}" text-anchor="middle" font-family="Rubik" font-weight="800" font-size="16" fill="${ink}">₹</text></g>
    ${sign(42, 56, 246, "BANK", inr(parts[0].value), P.cream)}
    <path d="M165 102 V${G - 300}" stroke="${ink}" stroke-width="3.5" stroke-dasharray="1 9"/>
    <!-- investments tower with rocket -->
    <g><rect x="326" y="146" width="116" height="${G - 146}" fill="${P.tomato}" stroke="${ink}" stroke-width="4"/>${windows(342, 176, 3, 6, 18, 18, 13, 20)}
      <rect x="314" y="136" width="140" height="18" fill="${P.sun}" stroke="${ink}" stroke-width="4"/>
      <g transform="translate(350,28) rotate(8 34 40)">${art.rocket({ a: P.pink, b: P.sun }, 68)}</g></g>
    ${sign(300, 100 - 44, 166, "INVESTMENTS", "₹31.2 L", "#fff")}
    <!-- fixed deposits vault -->
    <g><rect x="486" y="250" width="170" height="${G - 250}" fill="${P.mint}" stroke="${ink}" stroke-width="4"/><rect x="474" y="238" width="194" height="20" fill="${P.sun}" stroke="${ink}" stroke-width="4"/>
      <circle cx="571" cy="${G - 74}" r="48" fill="#fff" stroke="${ink}" stroke-width="4"/><circle cx="571" cy="${G - 74}" r="32" fill="${P.sun}" stroke="${ink}" stroke-width="4"/><circle cx="571" cy="${G - 74}" r="8" fill="${ink}"/>
      <path d="M571 ${G - 106} v10 M571 ${G - 52} v10 M539 ${G - 74} h10 M593 ${G - 74} h10" stroke="${ink}" stroke-width="3.5"/></g>
    ${sign(486, 176, 170, "FIXED DEPOSITS", "₹14.5 L", "#fff")}
    <!-- EPF tree -->
    <g><rect x="698" y="${G - 118}" width="26" height="118" fill="#B8733B" stroke="${ink}" stroke-width="4"/>
      <circle cx="711" cy="${G - 150}" r="56" fill="${P.grass}" stroke="${ink}" stroke-width="4"/><circle cx="672" cy="${G - 108}" r="34" fill="${P.grass}" stroke="${ink}" stroke-width="4"/><circle cx="752" cy="${G - 112}" r="36" fill="${P.grass}" stroke="${ink}" stroke-width="4"/>
      <circle cx="684" cy="${G - 168}" r="7" fill="${P.sun}" stroke="${ink}" stroke-width="3"/><circle cx="728" cy="${G - 136}" r="7" fill="${P.sun}" stroke="${ink}" stroke-width="3"/><circle cx="708" cy="${G - 192}" r="7" fill="${P.sun}" stroke="${ink}" stroke-width="3"/></g>
    ${sign(660, 150, 100, "EPF", "₹9.9 L", "#fff")}
    <!-- house (loans), card shop, lent-out stall -->
    <g><rect x="838" y="${G - 96}" width="110" height="96" fill="${P.cream}" stroke="${ink}" stroke-width="4"/><path d="M826 ${G - 94} L893 ${G - 156} L960 ${G - 94}Z" fill="${P.tomato}" stroke="${ink}" stroke-width="4"/>
      <rect x="878" y="${G - 52}" width="30" height="52" fill="${ink}"/><rect x="850" y="${G - 76}" width="22" height="22" fill="#9BE7FF" stroke="${ink}" stroke-width="3"/><rect x="916" y="${G - 76}" width="22" height="22" fill="#9BE7FF" stroke="${ink}" stroke-width="3"/></g>
    ${sign(828, G - 218, 130, "LOANS OWED", "−₹2.4 L", P.tomato, "#fff")}
    <g><rect x="990" y="${G - 110}" width="136" height="110" fill="${P.blue}" stroke="${ink}" stroke-width="4"/>
      <path d="M980 ${G - 110} h156 v30 q-13 14 -26 0 q-13 14 -26 0 q-13 14 -26 0 q-13 14 -26 0 q-13 14 -26 0 q-13 14 -26 0Z" fill="${P.pink}" stroke="${ink}" stroke-width="4"/>
      <rect x="1004" y="${G - 60}" width="50" height="60" fill="${P.sun}" stroke="${ink}" stroke-width="3.5"/><rect x="1068" y="${G - 66}" width="46" height="30" fill="#fff" stroke="${ink}" stroke-width="3.5"/><path d="M1076 ${G - 50} h30" stroke="${ink}" stroke-width="4"/></g>
    ${sign(986, G - 176, 144, "CARDS OWED", "−₹48.7 K", P.tomato, "#fff")}
    <g transform="translate(1170,${G - 100})">${art.bag({ a: P.sky, b: P.sun }, 96)}</g>
    ${sign(1150, G - 164, 130, "LENT OUT", "₹1.2 L", "#fff")}
    <!-- trees & lamp posts -->
    <g transform="translate(304,${G - 4})"><rect x="-4" y="-34" width="8" height="34" fill="#B8733B" stroke="${ink}" stroke-width="3"/><circle cy="-48" r="20" fill="${P.grass}" stroke="${ink}" stroke-width="3.5"/></g>
    <g transform="translate(1316,${G - 4})"><rect x="-4" y="-34" width="8" height="34" fill="#B8733B" stroke="${ink}" stroke-width="3"/><circle cy="-48" r="20" fill="${P.grass}" stroke="${ink}" stroke-width="3.5"/></g>
    <g transform="translate(470,${G + 6}) scale(.8)">${art.cup({ a: "#fff" }, 70).replace('class="art"', 'class="art"')}</g>
  </g></svg>`;
}

function trendBlocks() {
  const W = 600, H = 376, pb = 34, unit = 1, sq = 30, gap = 4, cols = 12, cw = (W - 20) / cols;
  const cols_ = trend.map(([m, v], i) => {
    const n = Math.round(v / unit), x = 10 + i * cw + (cw - sq) / 2, last = i === cols - 1;
    const blocks = [...Array(n)].map((_, k) => `<rect x="${x}" y="${H - pb - (k + 1) * (sq - 6 + gap)}" width="${sq}" height="${sq - 6}" rx="4" fill="${last && k === n - 1 ? P.tomato : [P.mint, P.sky, P.pink][(k + i) % 3]}" stroke="${INK}" stroke-width="2.8"/>`).join("");
    return blocks + `<text x="${x + sq / 2}" y="${H - 10}" text-anchor="middle" font-family="Rubik" font-weight="700" font-size="12.5" fill="${INK}">${m}</text>`;
  }).join("");
  const lastTop = H - pb - Math.round(8.4 / unit) * (sq - 6 + gap);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible"><line x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}" stroke="${INK}" stroke-width="4"/>${cols_}
    <g transform="translate(${W - 150},${lastTop - 24}) rotate(-4)"><rect width="128" height="34" rx="9" fill="${P.sun}" stroke="${INK}" stroke-width="3.5"/><text x="64" y="23" text-anchor="middle" font-family="Rubik" font-weight="800" font-size="17" fill="${INK}">₹8.4 L now</text></g></svg>`;
}

const html = `<div class="D">
  <div class="bar"><div class="logo">${art.cup({}, 40)}chai coffee fund</div><span class="btn">↻ Refresh</span></div>
  <div class="tabs">${tabs}</div>

  <section class="win" style="border-top-left-radius:0;position:relative;z-index:1">
    <div class="tb" style="background:${P.white}"><i style="background:${P.tomato}"></i><i style="background:${P.sun}"></i><i style="background:${P.grass}"></i><span>overview / town.map</span><em>every building is part of your net worth</em></div>
    <div class="scene">${skyline()}
      <div class="hello"><span class="eyebrow">${greeting.eyebrow}</span><h1>${greeting.title}</h1><p class="sent">${sentence}</p></div></div>
  </section>

  <section class="grid">${tiles.map((t, i) => `<div class="win tile"><div class="tb" style="background:${WIN[i]}"><i></i><i></i><i></i><span>${t.label}</span></div>
      <div class="body">${art[t.art]({ a: "#fff", b: P.sun }, 62)}<div class="val">${inr(t.value)}</div><span class="st${t.neg ? " neg" : ""}">${t.neg ? "you owe" : t.key === "subs" ? "per month" : "yours"}</span></div></div>`).join("")}</section>

  <section class="row2">
    <div class="win"><div class="tb" style="background:${P.mint}"><i></i><i></i><i></i><span>bank_balance_trend</span><em>1 block = ₹1 L</em></div><div style="padding:22px 22px 14px">${trendBlocks()}</div></div>
    <div class="win inbox"><div class="tb" style="background:${P.pink}"><i></i><i></i><i></i><span>What needs attention</span><em>5 new</em></div>
      ${attention.map((a, i) => `<div class="r"><span class="ic" style="background:${[P.sun, P.sky, P.mint, P.orange, P.pink][i]}">${art[a.kind]({ a: "#fff", b: P.sun }, 30)}</span><div><b>${a.label}</b><span class="d">${a.detail}</span></div>${i < 2 ? `<span class="new">NEW</span>` : ""}<span class="go">→</span></div>`).join("")}</div>
  </section>
</div>`;

export default {
  file: "NbD_MoneyTown.dc.html", name: "D · Money Town", w: 1440, h: 1880, css, html,
  fonts: "family=Rubik:wght@500;600;700;800",
  note: "D · Money Town — the hero is a vector skyline: the bank, the investments tower with a rocket, the FD vault, the EPF tree, the house for loans and the card shop each carry a sign with their figure, under a net-worth billboard. Folder tabs for navigation, retro app windows for the tiles, and the bank trend as stacked blocks (1 block = ₹1 L). Made-up figures.",
};
