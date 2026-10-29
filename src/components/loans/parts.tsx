import type { CSSProperties, ReactNode } from "react";
import { colorGradient, type ColorKey } from "@/lib/format/colors";
import type { LoanCategory } from "@/lib/sheets/types";

/**
 * The pieces the Loans widgets share (docs/design/loans.md, LoansN1): a loan's tile (its colour and its category's
 * icon), the card every widget sits in, a hover card, the status pills, and the principal and interest marks
 * (Prathik's pick P6: principal solid, interest a dashed outline on its tint).
 */

const ICONS: Record<LoanCategory | "All", string[]> = {
  Home: ["M3 11l9-7 9 7", "M5 10v10h14V10", "M10 20v-5h4v5"],
  Auto: ["M5 17h14", "M3 17v-4l2-5h14l2 5v4", "M7 17v2M17 17v2", "M7 13h.01M17 13h.01"],
  Personal: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
  Other: ["M4 6h16v10H4z", "M2 20h20"],
  All: ["M19 5L5 19", "M7.5 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z", "M16.5 17.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"],
};

/** A loan's tile: its colour's gradient and its category's icon. A closed loan's is greyed. */
export function LoanIcon({ category, colorKey, size = 32, closed = false }: { category: LoanCategory | "All"; colorKey: ColorKey; size?: number; closed?: boolean }) {
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center text-on-card ${closed ? "opacity-60 grayscale-[0.85]" : ""}`} style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: colorGradient(colorKey, 150) }}>
      <svg width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[category].map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}

export { WidgetCard as LoanCard } from "../shell/WidgetCard";

export { Tip, TipBody } from "../shell/Tip";

/** Principal's mark (solid) and interest's (a dashed outline on its tint), for legends and rows. */
export function PrincipalMark({ size = 10 }: { size?: number }) {
  return <i aria-hidden="true" className="inline-block shrink-0 rounded-[3px] bg-[var(--loan-principal)]" style={{ width: size, height: size }} />;
}
export function InterestMark({ size = 10 }: { size?: number }) {
  return <i aria-hidden="true" className="inline-block shrink-0 rounded-[3px] border-[1.5px] border-dashed border-[var(--loan-interest)] bg-[var(--loan-interest-tint)]" style={{ width: size, height: size }} />;
}
export function ColorMark({ colorKey, size = 9 }: { colorKey: ColorKey; size?: number }) {
  return <i aria-hidden="true" className="inline-block shrink-0 rounded-[3px]" style={{ width: size, height: size, background: `var(--card-${colorKey})` }} />;
}

export function SplitLegend() {
  return (
    <span className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] font-semibold text-muted" aria-hidden="true">
      <span className="inline-flex items-center gap-1.5">
        <PrincipalMark />
        Principal
      </span>
      <span className="inline-flex items-center gap-1.5">
        <InterestMark />
        Interest
      </span>
    </span>
  );
}

/** A bar's fill in a loan's colour: its solid, lightened at the top, as the design draws marks. */
export const fillOf = (colorKey: ColorKey, angle = 90): string => `linear-gradient(${angle}deg, color-mix(in oklch, var(--card-${colorKey}) 80%, white), var(--card-${colorKey}))`;

const PILL = {
  paid: "bg-accent-tint text-accent-text",
  late: "bg-warning-tint text-warning-text",
  due: "bg-negative-tint text-negative",
  overdue: "bg-negative-tint text-negative",
  later: "bg-fill text-muted",
} as const;

export function StatusPill({ tone, children, title }: { tone: keyof typeof PILL; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold whitespace-nowrap ${PILL[tone]}`}>
      {children}
    </span>
  );
}

/** A thin bar for a share, in a loan's colour. */
export function ShareBar({ share, colorKey, className = "h-2", style }: { share: number; colorKey: ColorKey; className?: string; style?: CSSProperties }) {
  return (
    <span aria-hidden="true" className={`block overflow-hidden rounded-full bg-fill ${className}`} style={style}>
      <i className="block h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, share * 100))}%`, background: fillOf(colorKey) }} />
    </span>
  );
}

export const SMALL_PRIMARY = "inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-xs font-extrabold text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
export const SMALL_SOFT = "inline-flex min-h-9 items-center gap-1.5 rounded-full bg-fill px-4 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent";
export const SMALL_OK = "inline-flex min-h-8 items-center gap-1.5 rounded-full bg-accent-tint px-3.5 text-xs font-extrabold text-accent-text hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-accent";
export const LINK = "inline-flex items-center gap-1 text-[13px] font-extrabold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent";
