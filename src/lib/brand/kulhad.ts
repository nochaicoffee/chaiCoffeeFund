/**
 * The Kulhad: a terracotta chai cup that coins drop into. One drawing for every place it shows
 * (the sign-in page, which is a plain HTML string, and the wait screen, which is React), picked
 * from five looks in design/login/LoginAndLoading.html (docs/design/login.md).
 *
 * It is a constant of our own, never built from input, so it is safe to put in a page as it is.
 * Everything it needs (gradients, colours, keyframes) is inside it or in KULHAD_CSS, so it looks
 * the same on a page that has none of the app's styles.
 */

/** Where the coins fall: inside the cup's opening. */
const COIN_X = [66, 78, 90] as const;
/** One coin's whole fall, in seconds. The three are offset by a third of it. */
const CYCLE_S = 2.6;
const STAGGER_S = 0.87;

const coin = (x: number, i: number) =>
  `<g class="kh-coin" style="--x:${x}px;animation-delay:${(i * STAGGER_S).toFixed(2)}s"><g class="kh-fl" style="animation-delay:${(-i * 0.23).toFixed(2)}s"><circle class="kh-face" r="9"/><circle class="kh-ring" r="6.2"/><text>₹</text></g></g>`;
const ripple = (x: number, i: number) => `<ellipse class="kh-ripple" cx="${x}" cy="57" rx="12" ry="3" style="animation-delay:${(i * STAGGER_S).toFixed(2)}s"/>`;

/** The cup as an inline SVG. Decorative: the page around it says what is happening. */
export function kulhadSvg(): string {
  return `<svg class="kh" viewBox="0 0 160 130" aria-hidden="true" focusable="false"><defs>
<radialGradient id="kh-coinG" cx=".35" cy=".3" r=".85"><stop offset="0" style="stop-color:oklch(0.95 0.1 98)"/><stop offset=".6" style="stop-color:oklch(0.85 0.15 88)"/><stop offset="1" style="stop-color:oklch(0.74 0.15 82)"/></radialGradient>
<linearGradient id="kh-clay" x1="0" x2="1"><stop offset="0" style="stop-color:oklch(0.4 0.09 40)"/><stop offset=".35" style="stop-color:oklch(0.62 0.13 48)"/><stop offset=".7" style="stop-color:oklch(0.56 0.12 45)"/><stop offset="1" style="stop-color:oklch(0.36 0.08 38)"/></linearGradient>
<linearGradient id="kh-chai" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:oklch(0.74 0.1 64)"/><stop offset="1" style="stop-color:oklch(0.52 0.09 55)"/></linearGradient>
<filter id="kh-blur" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="3"/></filter>
</defs>
<ellipse cx="78" cy="118" rx="48" ry="6" fill="#000" opacity=".2" filter="url(#kh-blur)"/><ellipse cx="78" cy="113" rx="28" ry="4.5" fill="oklch(0.4 0.1 42)"/>
<ellipse cx="78" cy="50" rx="40" ry="8" fill="oklch(0.3 0.06 40)"/><ellipse cx="78" cy="57" rx="34" ry="6" fill="url(#kh-chai)"/>
${COIN_X.map(coin).join("")}${COIN_X.map(ripple).join("")}
<g class="kh-steam" transform="translate(0 -4)"><path d="M50 40c-6-8 6-14 0-24" style="animation-delay:.2s"/><path d="M78 36c-6-8 6-14 0-24" style="animation-delay:1.1s"/><path d="M106 40c-6-8 6-14 0-24" style="animation-delay:2s"/></g>
<path d="M38 50L50 108Q52 114 60 114L96 114Q104 114 106 108L118 50A40 8 0 0 1 38 50Z" fill="url(#kh-clay)"/>
<path d="M42 70A37 7 0 0 0 114 70M45 84A34 6.5 0 0 0 111 84M47.5 98A31 6 0 0 0 108.5 98" fill="none" stroke="oklch(0.33 0.09 40)" stroke-width="1.2" opacity=".4"/>
<path d="M44 58L53 102L57 101L48 58Z" fill="#fff" opacity=".2"/><g fill="oklch(0.3 0.08 40)" opacity=".35"><circle cx="70" cy="76" r="1"/><circle cx="92" cy="90" r="1.1"/><circle cx="62" cy="96" r=".9"/><circle cx="100" cy="68" r=".9"/><circle cx="84" cy="102" r="1"/></g>
<path d="M38 50A40 8 0 0 0 118 50" fill="none" stroke="oklch(0.72 0.12 55)" stroke-width="3"/>
</svg>`;
}

/**
 * The cup's animation. A coin starts above the picture, small and faint (the picture does not
 * clip it: `overflow: visible`), grows into view, falls with gravity while it spins, and is hidden
 * by the cup's own front lip before it vanishes, with a ripple on the chai where it lands.
 * `--tx` and `--ty` (-1 to 1) tilt the cup toward the pointer; with reduced motion nothing moves
 * and only the steam is left, still.
 */
export const KULHAD_CSS = `
.kh { display: block; overflow: visible; --end: 74px; transform: perspective(700px) rotateY(calc(var(--tx, 0) * 9deg)) rotateX(calc(var(--ty, 0) * -7deg)); transition: transform .18s ease-out; animation: kh-bob 4.2s ease-in-out infinite; }
@keyframes kh-bob { 50% { translate: 0 -3px; } }
.kh-coin { opacity: 0; animation: kh-drop ${CYCLE_S}s infinite; }
.kh-fl { animation: kh-flip .7s linear infinite; transform-box: fill-box; transform-origin: center; }
.kh-face { fill: url(#kh-coinG); stroke: oklch(0.68 0.14 80); stroke-width: 1.4; }
.kh-ring { fill: none; stroke: oklch(0.7 0.13 80); stroke-width: .8; opacity: .7; }
.kh-coin text { font: 800 10px ui-sans-serif, system-ui, sans-serif; text-anchor: middle; dominant-baseline: central; fill: oklch(0.45 0.1 75); }
.kh-ripple { fill: none; stroke: #fff; stroke-width: 1.4; opacity: 0; transform-box: fill-box; transform-origin: center; animation: kh-ripple ${CYCLE_S}s infinite; }
.kh-steam path { fill: none; stroke: oklch(0.52 0.012 260); stroke-opacity: .4; stroke-width: 3; stroke-linecap: round; animation: kh-steam 3.2s ease-in-out infinite; opacity: 0; }
@keyframes kh-drop {
  0% { transform: translate(var(--x), -30px) scale(.4); opacity: 0; animation-timing-function: ease-out; }
  12% { transform: translate(var(--x), -16px) scale(1); opacity: 1; animation-timing-function: cubic-bezier(.5, 0, .9, .55); }
  50% { transform: translate(var(--x), var(--end)) scale(1); opacity: 1; }
  50.1%, 100% { transform: translate(var(--x), var(--end)) scale(1); opacity: 0; }
}
@keyframes kh-flip { 50% { transform: scaleX(.2); } }
@keyframes kh-ripple { 0%, 50% { opacity: 0; transform: scale(.3); } 52% { opacity: .9; transform: scale(.4); } 78%, 100% { opacity: 0; transform: scale(1.7); } }
@keyframes kh-steam { 0% { transform: translateY(8px); opacity: 0; } 35% { opacity: .55; } 100% { transform: translateY(-10px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .kh, .kh * { animation: none !important; } .kh { transform: none; } .kh-steam path { opacity: .35; } }
`;
