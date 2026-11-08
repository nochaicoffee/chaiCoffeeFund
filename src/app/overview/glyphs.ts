import type { TileKey } from "./views";

export type GlyphKey = "accounts" | "invest" | "fixed" | "lent" | "cards" | "loans" | "income" | "subs" | "goals" | "ins" | "due" | "spent";

/** Hand-drawn glyphs on a 24 x 24 grid: a fill shape (the body) and a line (the detail). The tiles draw them large and faint as watermarks (docs/design/overview.md). */
export const GLYPHS: Record<GlyphKey, { fill: string; line: string }> = {
  accounts: { fill: "M3 10 12 4l9 6z", line: "M3 21h18M5 21V10M19 21V10M3 10l9-6 9 6M9 21v-6M15 21v-6" },
  invest: { fill: "M4 11h4v9H4zM10 4h4v16h-4zM16 14h4v6h-4z", line: "M4 11h4v9H4zM10 4h4v16h-4zM16 14h4v6h-4z" },
  fixed: { fill: "M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", line: "M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6zM12 12h.01M8 21v1M16 21v1" },
  lent: { fill: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", line: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 10v.01M18 14v.01" },
  cards: { fill: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", line: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM2 10h20M6 15h4" },
  loans: { fill: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z", line: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM10 21v-6h4v6" },
  income: { fill: "M3 17l6-6 4 4 8-8v13H3z", line: "M3 17l6-6 4 4 8-8M15 7h6v6" },
  subs: { fill: "M7 9h10v6H7z", line: "M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" },
  goals: { fill: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", line: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 11.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z" },
  ins: { fill: "M12 3l8 3v6c0 4.5-3.3 8-8 9-4.7-1-8-4.5-8-9V6z", line: "M12 3l8 3v6c0 4.5-3.3 8-8 9-4.7-1-8-4.5-8-9V6zM9 12l2 2 4-4" },
  due: { fill: "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", line: "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 10h18M8 2v4M16 2v4M12 14v3M12 19.2v.01" },
  spent: { fill: "M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z", line: "M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6M9 16h3" },
};

/** The glyph each tile carries. */
export const GLYPH_FOR: Record<TileKey, GlyphKey> = { accounts: "accounts", invest: "invest", fixed: "fixed", lent: "lent", cards: "cards", loans: "loans", income: "income", subs: "subs", goals: "goals", ins: "ins", due: "due", spent: "spent" };
