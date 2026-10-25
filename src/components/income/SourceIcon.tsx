import type { IncomeIcon } from "@/lib/sheets/types";
import type { ColorKey } from "@/lib/format/colors";
import { colorGradient } from "@/lib/format/colors";

/** Each income icon's strokes, on a 24-unit grid. */
const PATHS: Record<IncomeIcon, string[]> = {
  Briefcase: ["M3 8h18v12H3z", "M8 8V5h8v3", "M3 13h18"],
  Trend: ["M3 17l6-6 4 4 8-8", "M15 7h6v6"],
  Lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"],
  Pie: ["M21 12A9 9 0 1 1 12 3v9z", "M15 3.5A9 9 0 0 1 20.5 9H15z"],
  Receipt: ["M6 3h12v18l-3-2-3 2-3-2-3 2z", "M9 8h6", "M9 12h6"],
  Gift: ["M4 11h16v10H4z", "M3 7h18v4H3z", "M12 7v14", "M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0"],
  Home: ["M3 11l9-7 9 7", "M5 10v10h14V10"],
  Coins: ["M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z", "M4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7", "M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5"],
};

/** A source's tile: its colour, and its icon (or its first letter when it has none). */
export function SourceIcon({ icon, name, colorKey, size = 32 }: { icon?: IncomeIcon; name: string; colorKey: ColorKey; size?: number }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center justify-center text-on-card" style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: colorGradient(colorKey) }}>
      {icon ? (
        <svg width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {PATHS[icon].map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      ) : (
        <span className="font-extrabold" style={{ fontSize: Math.round(size * 0.42) }}>
          {name[0]?.toUpperCase()}
        </span>
      )}
    </span>
  );
}
