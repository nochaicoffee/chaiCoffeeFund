import type { BigSpendCategory } from "@/lib/sheets/types";

const PATHS: Record<BigSpendCategory, string[]> = {
  Travel: ["M2 16l20-6-20-6 4 6-4 6Z", "M6 10h8"],
  Shopping: ["M5 8h14l-1 12H6Z", "M9 8V6a3 3 0 0 1 6 0v2"],
  Electronics: ["M4 5h16v11H4Z", "M2 20h20"],
  Home: ["M3 11 12 4l9 7", "M5 10v10h14V10", "M10 20v-6h4v6"],
  Health: ["M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"],
  Gifts: ["M3 9h18v12H3Z", "M3 13h18", "M12 9v12", "M12 9c-2-4-6-4-6-1.5S9 9 12 9c3 0 6 0 6-1.5S14 5 12 9Z"],
  Vehicle: ["M5 16V11l2-5h10l2 5v5", "M3 16h18v3H3z"],
  Education: ["M2 9l10-5 10 5-10 5Z", "M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"],
  Other: ["M6 12h.01", "M12 12h.01", "M18 12h.01"],
};

/** A big spend's category as a line icon (the design's set, design/expenses/generator/lib.mjs). */
export function CategoryIcon({ category, size = 14 }: { category: BigSpendCategory; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={category === "Other" ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[category].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
