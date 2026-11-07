// A modern glyph set for the tiles: each glyph has a "fill" shape (the body) and a "line" (the detail), on a 24 x 24 grid, so one set can be dressed
// five ways with CSS (glass chip, duotone squircle, watermark, app badge, orbit). Hand-drawn in the style of the line icons the app already uses.
export const GLYPH = {
  accounts: { f: "M3 10 12 4l9 6z", l: "M3 21h18M5 21V10M19 21V10M3 10l9-6 9 6M9 21v-6M15 21v-6" },
  invest: { f: "M4 11h4v9H4zM10 4h4v16h-4zM16 14h4v6h-4z", l: "M4 11h4v9H4zM10 4h4v16h-4zM16 14h4v6h-4z" },
  fixed: { f: "M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", l: "M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6zM12 12h.01M8 21v1M16 21v1" },
  lent: { f: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", l: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 10v.01M18 14v.01" },
  cards: { f: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", l: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM2 10h20M6 15h4" },
  loans: { f: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z", l: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM10 21v-6h4v6" },
  income: { f: "M3 17l6-6 4 4 8-8v13H3z", l: "M3 17l6-6 4 4 8-8M15 7h6v6" },
  subs: { f: "M7 9h10v6H7z", l: "M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" },
  goals: { f: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", l: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 11.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z" },
  ins: { f: "M12 3l8 3v6c0 4.5-3.3 8-8 9-4.7-1-8-4.5-8-9V6z", l: "M12 3l8 3v6c0 4.5-3.3 8-8 9-4.7-1-8-4.5-8-9V6zM9 12l2 2 4-4" },
  due: { f: "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", l: "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 10h18M8 2v4M16 2v4M12 14v3M12 19.2v.01" },
  left: { f: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", l: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2" },
};
/** One glyph: `ik` is the wrapper the five styles dress. */
export const glyph = (key, cls = "") => { const g = GLYPH[key] ?? GLYPH.accounts; return `<span class="ik ${cls}"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="gf" d="${g.f}"/><path class="gl" d="${g.l}"/></svg></span>`; };
export const STYLES = [
  { k: "1", name: "Glass chip", note: "a line glyph in a frosted circle with a thin ring" },
  { k: "2", name: "Duotone", note: "a squircle, the glyph in two tones" },
  { k: "3", name: "Watermark", note: "one oversized glyph, cropped and faint" },
  { k: "4", name: "App badge", note: "a solid white squircle, the glyph in the tile's colour" },
  { k: "5", name: "Orbit", note: "the glyph inside two rings with a moving dot" },
];
