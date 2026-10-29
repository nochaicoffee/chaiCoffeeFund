import type { TileIcon } from "@/app/insurance/views";
import { colorGradient, type ColorKey } from "@/lib/format/colors";

const ICONS: Record<TileIcon, string[]> = {
  user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
  car: ["M5 17h14", "M3 17v-4l2-5h14l2 5v4", "M7 17v2M17 17v2", "M7 13h.01M17 13h.01"],
  bike: ["M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M18 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M6 15l4-7h5l3 7", "M10 8H8"],
  home: ["M3 11l9-7 9 7", "M5 10v10h14V10", "M10 20v-5h4v5"],
  shield: ["M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6l8-3z"],
  heart: ["M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"],
};

/** A thing's icon in a rounded tile: ink on the cover map, a policy's own colour in the widgets. */
export function TileMark({ icon, size = 40, colorKey }: { icon: TileIcon; size?: number; colorKey?: ColorKey }) {
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center ${colorKey ? "text-on-card" : "bg-ink text-on-ink"}`} style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: colorKey ? colorGradient(colorKey, 150) : undefined }}>
      <svg width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[icon].map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}

/** The term bar's stripes for a policy that renews within a month or has lapsed. */
export const WARN_BAR = "repeating-linear-gradient(135deg, oklch(0.72 0.14 75) 0 5px, oklch(0.8 0.12 78) 5px 10px)";
