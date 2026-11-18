// The kulhad artwork is defined HERE (svg() below); kulhad/*.svg are generated from it, so edit this file, not the SVGs.
// Kulhad icon in several palettes: node design/app-icon/kulhad.mjs  (writes kulhad/*.svg and kulhad-palettes.png)
import fs from "node:fs";
import sharp from "sharp";

const P = [
  { id: "a-green-clay", name: "Green & clay", bg: ["#46DA6B", "#16A24A"], clay: ["#D9703A", "#C45A2B", "#9F4220"], rim: "#E58A4D", chai: ["#C98233", "#E3A04A"], coin: ["#FFF3B5", "#FFCB3D", "#E09A1B"], coinInk: "#B87A12", shadow: "#0B5A2A", steam: "#fff" },
  { id: "b-midnight", name: "Midnight", bg: ["#2B3A8C", "#111B4A"], clay: ["#E27B45", "#C9602F", "#9A4222"], rim: "#F0975F", chai: ["#B8702B", "#E3A04A"], coin: ["#FFF3B5", "#FFCB3D", "#E09A1B"], coinInk: "#B87A12", shadow: "#050B2A", steam: "#BFC8FF" },
  { id: "c-sand", name: "Warm sand", bg: ["#FBEBD0", "#F1D4A6"], clay: ["#A8481F", "#8E3A18", "#5E2410"], rim: "#BE6234", chai: ["#8A4A1C", "#C98233"], coin: ["#FFF3B5", "#FFC93C", "#D9941A"], coinInk: "#A86B0A", shadow: "#B98A4E", steam: "#8E3A18" },
  { id: "d-sunset", name: "Sunset", bg: ["#FF9A5A", "#E8456B"], clay: ["#FFF1DC", "#F2DDBE", "#D9BE96"], rim: "#FFFFFF", chai: ["#C98233", "#E3A04A"], coin: ["#FFF3B5", "#FFCB3D", "#E09A1B"], coinInk: "#B87A12", shadow: "#8A1F3E", steam: "#fff" },
  { id: "e-violet", name: "Violet", bg: ["#8B5CF6", "#4C1D95"], clay: ["#F08A4B", "#D96A32", "#A94722"], rim: "#F7A56C", chai: ["#B8702B", "#E3A04A"], coin: ["#FFF3B5", "#FFCB3D", "#E09A1B"], coinInk: "#B87A12", shadow: "#230A4D", steam: "#E6D9FF" },
  { id: "f-teal-mono", name: "Teal & ink", bg: ["#19B8A6", "#0A6B66"], clay: ["#1E2B33", "#141E25", "#0A1015"], rim: "#2E4350", chai: ["#C98233", "#E3A04A"], coin: ["#FFF3B5", "#FFCB3D", "#E09A1B"], coinInk: "#B87A12", shadow: "#032E2C", steam: "#fff" },
];

const svg = (p) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient>
    <linearGradient id="clay" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.clay[0]}"/><stop offset="0.55" stop-color="${p.clay[1]}"/><stop offset="1" stop-color="${p.clay[2]}"/></linearGradient>
    <radialGradient id="coin" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="${p.coin[0]}"/><stop offset="0.5" stop-color="${p.coin[1]}"/><stop offset="1" stop-color="${p.coin[2]}"/></radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <ellipse cx="512" cy="880" rx="260" ry="34" fill="${p.shadow}" fill-opacity="0.35"/>
  <path d="M258 430H766C760 520 720 600 716 720C714 810 690 862 630 862H394C334 862 310 810 308 720C304 600 264 520 258 430Z" fill="url(#clay)"/>
  <path d="M296 585H728" stroke="#000" stroke-opacity="0.2" stroke-width="14" stroke-linecap="round"/>
  <path d="M308 680H716" stroke="#000" stroke-opacity="0.2" stroke-width="14" stroke-linecap="round"/>
  <path d="M322 480C340 600 340 720 366 800" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="22" stroke-linecap="round"/>
  <ellipse cx="512" cy="430" rx="254" ry="60" fill="${p.rim}"/>
  <ellipse cx="512" cy="438" rx="222" ry="42" fill="${p.chai[0]}"/>
  <ellipse cx="512" cy="436" rx="150" ry="24" fill="${p.chai[1]}" fill-opacity="0.7"/>
  <g stroke="${p.steam}" stroke-opacity="0.55" stroke-width="12" stroke-linecap="round"><path d="M512 70V120"/><path d="M420 90V132"/><path d="M604 90V132"/></g>
  <circle cx="512" cy="282" r="104" fill="url(#coin)"/>
  <circle cx="512" cy="282" r="86" fill="none" stroke="${p.coinInk}" stroke-opacity="0.45" stroke-width="7" stroke-dasharray="5 9"/>
  <circle cx="512" cy="282" r="68" fill="none" stroke="${p.coinInk}" stroke-opacity="0.55" stroke-width="8"/>
  <circle cx="512" cy="282" r="68" fill="${p.coin[0]}" fill-opacity="0.35"/>
  <path d="M440 250 A 78 78 0 0 1 492 208" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="9" stroke-linecap="round"/>
</svg>
`;

fs.mkdirSync("design/app-icon/kulhad", { recursive: true });
const S = 300, G = 30, mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="${S}" height="${S}" rx="${S * 0.225}"/></svg>`);
const comps = [];
for (const [i, p] of P.entries()) {
  const s = svg(p);
  fs.writeFileSync(`design/app-icon/kulhad/${p.id}.svg`, s);
  const tile = await sharp(Buffer.from(s), { density: 96 }).resize(S, S).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const small = await sharp(Buffer.from(s)).resize(32, 32).png().toBuffer();
  const x = G + (i % 3) * (S + G), y = G + Math.floor(i / 3) * (S + 90);
  comps.push({ input: tile, left: x, top: y }, { input: small, left: x + S / 2 - 16, top: y + S + 20 });
}
await sharp({ create: { width: 3 * (S + G) + G, height: 2 * (S + 90) + G, channels: 4, background: "#f2f2ee" } }).composite(comps).png().toFile("design/app-icon/kulhad-palettes.png");
