// Spot illustrations for the Overview, taken from the neubrutalism exploration (session "Dashboard design exploration") and restyled in our language:
// the same shapes, but a thin soft line instead of a thick ink outline, so they sit on our glass and tinted bubbles.
// Every function returns an <svg> string on a 100x100 viewBox; pass colours as { a, b, c }.
const INK = "#1d2140";
const LINE = "rgba(18,20,50,.34)";
const S = (inner, size = 80, extra = "", vb = "0 0 100 100") =>
  `<svg class="art" style="filter:drop-shadow(0 3px 4px rgba(10,12,40,.28))" viewBox="${vb}" width="${size}" height="${size}" fill="none" stroke="${LINE}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" ${extra}>${inner}</svg>`;

export const art = {
  piggy: ({ a = "#FF8FB1", b = "#FFD23F" } = {}, size) =>
    S(`<path d="M16 54 C16 36 32 26 50 26 C60 26 68 29 74 34 L86 29 L84 44 C89 48 91 54 89 60 L81 62 C79 72 71 78 65 80 L65 90 L52 90 L52 82 C48 83 44 83 40 82 L40 90 L27 90 L27 78 C19 72 16 63 16 54Z" fill="${a}"/>
       <path d="M52 28 L57 15 L68 30Z" fill="${a}"/>
       <circle cx="68" cy="47" r="3.2" fill="${INK}" stroke="none"/>
       <ellipse cx="86" cy="54" rx="5" ry="7" fill="${b}"/>
       <path d="M40 34 H58" stroke-width="2.8"/>
       <circle cx="49" cy="10" r="9" fill="${b}"/><path d="M49 6 V14" stroke-width="1.7"/>`, size),

  coins: ({ a = "#FFD23F", b = "#FFB000" } = {}, size) =>
    S(`<path d="M18 68 v10 a32 11 0 0 0 64 0 v-10" fill="${b}"/><ellipse cx="50" cy="68" rx="32" ry="11" fill="${a}"/>
       <path d="M18 48 v10 a32 11 0 0 0 64 0 v-10" fill="${b}"/><ellipse cx="50" cy="48" rx="32" ry="11" fill="${a}"/>
       <path d="M18 28 v10 a32 11 0 0 0 64 0 v-10" fill="${b}"/><ellipse cx="50" cy="28" rx="32" ry="11" fill="${a}"/>
       <text x="50" y="33" text-anchor="middle" font-family="inherit" font-weight="800" font-size="16" fill="${INK}" stroke="none">₹</text>`, size),

  card: ({ a = "#6C8BFF", b = "#FFD23F" } = {}, size) =>
    S(`<rect x="8" y="22" width="84" height="58" rx="10" fill="${a}"/>
       <rect x="8" y="36" width="84" height="12" fill="${INK}"/>
       <rect x="18" y="58" width="18" height="13" rx="3" fill="${b}"/>
       <path d="M48 66 H80" stroke-width="2.8"/>`, size),

  house: ({ a = "#FF6B5A", b = "#FFF3D6" } = {}, size) =>
    S(`<rect x="66" y="16" width="12" height="22" fill="${a}"/>
       <rect x="20" y="46" width="60" height="42" fill="${b}"/>
       <path d="M8 48 L50 12 L92 48Z" fill="${a}"/>
       <rect x="42" y="62" width="16" height="26" fill="${INK}"/>
       <rect x="26" y="56" width="11" height="11" fill="#9BE7FF"/>
       <rect x="63" y="56" width="11" height="11" fill="#9BE7FF"/>`, size),

  car: ({ a = "#4DB3E6", b = "#FFF3D6" } = {}, size) =>
    S(`<path d="M10 62 L18 42 Q22 34 32 34 H68 Q78 34 82 42 L90 62 V76 H10Z" fill="${a}"/>
       <path d="M24 42 H44 V54 H18Z M50 42 H70 L78 54 H50Z" fill="#9BE7FF"/>
       <circle cx="28" cy="76" r="9" fill="${INK}"/><circle cx="72" cy="76" r="9" fill="${INK}"/><circle cx="28" cy="76" r="3.5" fill="${b}" stroke="none"/><circle cx="72" cy="76" r="3.5" fill="${b}" stroke="none"/>`, size),

  loop: ({ a = "#B79CFF", b = "#FFD23F" } = {}, size) =>
    S(`<circle cx="50" cy="50" r="40" fill="${a}"/>
       <path d="M27 46 A24 24 0 0 1 68 31" stroke-width="3.9"/><path d="M62 18 L74 33 L56 38Z" fill="${INK}"/>
       <path d="M73 54 A24 24 0 0 1 32 69" stroke-width="3.9"/><path d="M38 82 L26 67 L44 62Z" fill="${INK}"/>
       <circle cx="50" cy="50" r="8" fill="${b}"/>`, size),

  rocket: ({ a = "#FF6B5A", b = "#FFD23F" } = {}, size) =>
    S(`<path d="M42 76 L50 96 L58 76Z" fill="${b}"/>
       <path d="M36 60 L18 74 L20 88 L38 76Z" fill="${a}"/><path d="M64 60 L82 74 L80 88 L62 76Z" fill="${a}"/>
       <path d="M50 6 C70 20 72 50 64 76 H36 C28 50 30 20 50 6Z" fill="#FFF3D6"/>
       <path d="M50 6 C60 13 66 22 68 32 H32 C34 22 40 13 50 6Z" fill="${a}"/>
       <circle cx="50" cy="48" r="9" fill="#9BE7FF"/>`, size),

  safe: ({ a = "#3DD6A5", b = "#FFF3D6" } = {}, size) =>
    S(`<rect x="12" y="16" width="76" height="66" rx="9" fill="${a}"/>
       <rect x="22" y="26" width="56" height="46" rx="5" fill="${b}"/>
       <circle cx="50" cy="49" r="14" fill="#FFD23F"/><circle cx="50" cy="49" r="4" fill="${INK}"/>
       <path d="M50 38 V42 M50 56 V60 M39 49 H43 M57 49 H61" stroke-width="1.7"/>
       <path d="M24 82 V90 M76 82 V90" stroke-width="3.9"/>`, size),

  sprout: ({ a = "#FF9A3D", b = "#4ADE80" } = {}, size) =>
    S(`<path d="M50 68 V42"/>
       <path d="M50 50 C28 52 18 38 20 22 C38 20 50 30 50 50Z" fill="${b}"/>
       <path d="M50 42 C50 26 62 14 82 16 C82 34 70 46 50 42Z" fill="${b}"/>
       <path d="M26 66 H74 L66 92 H34Z" fill="${a}"/><path d="M24 66 H76" stroke-width="3.3"/>`, size),

  bag: ({ a = "#4DD0E1", b = "#FFD23F" } = {}, size) =>
    S(`<path d="M34 34 C8 56 8 90 50 92 C92 90 92 56 66 34Z" fill="${a}"/>
       <path d="M34 34 L38 14 Q50 24 62 14 L66 34Z" fill="${b}"/>
       <path d="M30 34 H70" stroke-width="3.3"/>
       <text x="50" y="76" text-anchor="middle" font-family="inherit" font-weight="800" font-size="30" fill="${INK}" stroke="none">₹</text>`, size),

  calendar: ({ a = "#FF5C8A", b = "#FFF3D6" } = {}, size) =>
    S(`<rect x="12" y="20" width="76" height="68" rx="9" fill="${b}"/>
       <path d="M12 29 a9 9 0 0 1 9 -9 h58 a9 9 0 0 1 9 9 v15 h-76z" fill="${a}"/>
       <path d="M32 10 V28 M68 10 V28" stroke-width="3.9"/>
       <text x="50" y="80" text-anchor="middle" font-family="inherit" font-weight="800" font-size="36" fill="${INK}" stroke="none">!</text>`, size),

  shield: ({ a = "#6C8BFF" } = {}, size) =>
    S(`<path d="M50 8 L86 21 V48 C86 71 69 86 50 94 C31 86 14 71 14 48 V21Z" fill="${a}"/>
       <path d="M33 50 L46 63 L69 36" stroke="#FFF" stroke-width="5.0"/><path d="M33 50 L46 63 L69 36" stroke-width="1.7" stroke="${INK}" opacity="0"/>`, size),

  target: ({ a = "#FF5C8A", b = "#FFF3D6" } = {}, size) =>
    S(`<circle cx="46" cy="54" r="36" fill="${a}"/><circle cx="46" cy="54" r="25" fill="${b}"/><circle cx="46" cy="54" r="14" fill="${a}"/><circle cx="46" cy="54" r="4" fill="${INK}"/>
       <path d="M46 54 L86 14" stroke-width="2.8"/><path d="M78 8 L92 8 L92 22 L84 22 L78 16Z" fill="#FFD23F"/>`, size),

  sun: ({ a = "#FFD23F" } = {}, size) =>
    S(`<g stroke-width="2.8">${[...Array(10)].map((_, i) => { const t = (i * Math.PI) / 5; return `<path d="M${50 + Math.cos(t) * 30} ${50 + Math.sin(t) * 30} L${50 + Math.cos(t) * 44} ${50 + Math.sin(t) * 44}"/>`; }).join("")}</g>
       <circle cx="50" cy="50" r="22" fill="${a}"/>`, size),

  // The chai-cup mascot. mood: "happy" | "wow".
  cup: ({ a = "#FFF3D6", b = "#C97B3A", c = "#FF8FB1" } = {}, size, mood = "happy") =>
    S(`<path d="M38 18 q-6 -8 0 -14 M52 18 q-6 -8 0 -14 M66 18 q-6 -8 0 -14" stroke-width="2.2"/>
       <ellipse cx="50" cy="90" rx="40" ry="6" fill="${INK}" stroke="none" opacity="0.18"/>
       <path d="M80 46 C100 44 100 72 78 70" stroke-width="5.0" stroke="${INK}"/><path d="M80 46 C96 45 96 68 78 70" stroke-width="1.9" stroke="${a}"/>
       <path d="M16 30 H84 V56 C84 76 70 88 50 88 C30 88 16 76 16 56Z" fill="${a}"/>
       <ellipse cx="50" cy="30" rx="34" ry="8" fill="${b}"/>
       <circle cx="36" cy="54" r="3.6" fill="${INK}" stroke="none"/><circle cx="64" cy="54" r="3.6" fill="${INK}" stroke="none"/>
       <ellipse cx="27" cy="63" rx="5.5" ry="3.6" fill="${c}" stroke="none"/><ellipse cx="73" cy="63" rx="5.5" ry="3.6" fill="${c}" stroke="none"/>
       ${mood === "wow" ? `<ellipse cx="50" cy="68" rx="5.5" ry="6.5" fill="${INK}" stroke="none"/>` : `<path d="M41 63 Q50 74 59 63" stroke-width="2.0"/>`}`, size),

  star: ({ a = "#FFD23F" } = {}, size) =>
    S(`<path d="M50 6 L61 36 L94 38 L68 58 L77 90 L50 72 L23 90 L32 58 L6 38 L39 36Z" fill="${a}"/>`, size),

  sparkle: ({ a = "#FFD23F" } = {}, size) =>
    S(`<path d="M50 6 C54 34 66 46 94 50 C66 54 54 66 50 94 C46 66 34 54 6 50 C34 46 46 34 50 6Z" fill="${a}"/>`, size),

  cloud: ({ a = "#FFF" } = {}, size) =>
    S(`<path d="M24 74 C8 74 6 52 24 50 C24 30 52 26 60 44 C80 36 92 58 78 74Z" fill="${a}"/>`, size),

  arrowUp: ({ a = "#3DD6A5" } = {}, size) =>
    S(`<path d="M50 90 V44 H26 L50 10 L74 44 H50" fill="${a}"/>`, size),

  // A starburst badge; n points. Text is placed over it in HTML.
  burst: ({ a = "#FF5C8A" } = {}, size, n = 16) => {
    const pts = [...Array(n * 2)].map((_, i) => { const r = i % 2 ? 38 : 48; const t = (i * Math.PI) / n; return `${(50 + Math.cos(t) * r).toFixed(1)},${(50 + Math.sin(t) * r).toFixed(1)}`; }).join(" ");
    return S(`<polygon points="${pts}" fill="${a}"/>`, size);
  },
};

// Section → illustration, the same one in every board's nav.
// Section key (as in data.mjs) to illustration, and the two colours it is drawn in.
export const SECTION_ART_OLD = {
  Overview: "sun", Accounts: "piggy", Cards: "card", Subscriptions: "loop", Income: "coins",
  Loans: "house", "Lent out": "bag", Insurance: "shield", "Fixed Income": "safe", Investments: "rocket", Goals: "target",
};

// The art for each section key used by the Overview boards, in that section's colours (CSS variables, so it follows the palette).
const NAME = { accounts: "piggy", invest: "rocket", fixed: "safe", lent: "bag", cards: "card", loans: "house", income: "coins", subs: "loop", ins: "shield", goals: "target", car: "car", due: "calendar", left: "calendar", sun: "sun", cup: "cup", star: "star" };
const V = (c) => `var(--card-${c})`;
const TINT = { accounts: ["sapphire", "gold"], invest: ["ruby", "gold"], fixed: ["teal", "gold"], lent: ["sky", "gold"], cards: ["sapphire", "gold"], loans: ["ruby", "gold"], income: ["gold", "copper"], subs: ["violet", "gold"], ins: ["sapphire", "gold"], goals: ["rose", "gold"], car: ["sky", "gold"] };
/** A spot illustration for a section key, at a pixel size. */
export const spotArt = (key, size = 34) => { const [a, b] = TINT[key] ?? ["gold", "copper"]; const f = art[NAME[key] ?? key]; return f ? f({ a: V(a), b: V(b) }, size) : ""; };

/** The chai cup who stands beside the greeting. */
export const cup = (size = 84, mood = "happy") => art.cup({ a: "#fff8ec", b: "#b8743a", c: "#ff9db8" }, size, mood);
/** Put the cup beside the greeting's text (the header's text block becomes cup + text). */
export const withMascot = (hdr) => !ART_ON ? hdr : hdr.replace('<div class="pg-text">', `<div class="pg-lead"><div class="mascot" aria-hidden="true">${cup(88)}</div><div class="pg-text">`).replace('</div><div class="pg-actions">', '</div></div><div class="pg-actions">');

// Prathik doesn't want the illustrations or the cup (2026-11-07, after round 5); he liked the layouts. They stay here, switched off, so a round can use them again.
export const ART_ON = false;
import * as Lb from "./lib.mjs";
import { SECTIONS } from "./data.mjs";
const LINE_ICON = { accounts: "accounts", invest: "invest", fixed: "fixed", lent: "lent", cards: "cards", loans: "loans", income: "income", subs: "subs", ins: "shield", goals: "goals", car: "car", sun: "overview", star: "overview" };
/** A mark for a section key: the illustration when ART_ON, else the line icon on the section's gradient (what the boards used before round 5). */
export const spot = (key, size = 34) => {
  if (ART_ON) return spotArt(key, size);
  const s = SECTIONS.find((x) => x.key === key), c = s ? s.color : key === "car" ? "sky" : "gold";
  const icon = (Lb.I[LINE_ICON[key]] ?? Lb.I.overview)(Math.round(size * 0.5));
  return `<span class="icf" style="background:linear-gradient(155deg,var(--card-${c}-from),var(--card-${c}-to))">${icon}</span>`;
};
