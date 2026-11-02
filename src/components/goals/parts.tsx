import type { ReactNode } from "react";
import { colorGradient, type ColorKey } from "@/lib/format/colors";
import type { GoalStanding } from "@/lib/aggregate/goals";
import type { GoalCategory } from "@/lib/sheets/types";

const ICONS: Record<GoalCategory, string[]> = {
  Vehicle: ["M5 16V11l2-5h10l2 5v5", "M3 16h18v3H3z"],
  Home: ["M3 11l9-7 9 7", "M5 10v10h14V10", "M10 20v-6h4v6"],
  Appliance: ["M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M6 10h12", "M9 5.5v2", "M9 13v3"],
  Gadget: ["M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", "M11 18h2"],
  Travel: ["M2 16l20-6L2 4l4 6-4 6z", "M6 10h8"],
  Education: ["M2 9l10-5 10 5-10 5z", "M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"],
  Family: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
  Health: ["M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"],
  Other: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z", "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"],
};

/** The icon for a goal's category (the category fixes the icon, so there's no icon column). */
export function GoalIcon({ category, size = 16 }: { category: GoalCategory; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[category].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** A goal's rounded tile: its category's icon on its colour. */
export function GoalTile({ category, colorKey, size = 34, off = false }: { category: GoalCategory; colorKey: ColorKey; size?: number; off?: boolean }) {
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center text-on-card ${off ? "opacity-60 grayscale" : ""}`} style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: colorGradient(colorKey, 150), boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.18), 0 2px 6px oklch(0 0 0 / 0.18)" }}>
      <GoalIcon category={category} size={Math.round(size * 0.5)} />
    </span>
  );
}

export function NeedBadge({ need }: { need: boolean }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${need ? "bg-negative-tint text-negative" : "bg-[oklch(0.94_0.03_258)] text-[oklch(0.42_0.1_258)]"}`}>{need ? "Need" : "Want"}</span>;
}

export function ScaleBadge({ scale }: { scale: "Minor" | "Major" }) {
  return <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${scale === "Major" ? "border-ink bg-ink text-on-ink" : "border-divider bg-surface text-muted"}`}>{scale}</span>;
}

export function FixedPill() {
  return <span className="rounded-full bg-negative-tint px-2 py-0.5 text-[10px] font-extrabold text-negative">Fixed</span>;
}

const STANDING_TONE: Record<GoalStanding, string> = {
  Funded: "bg-accent-tint text-accent-text",
  "On track": "bg-accent-tint text-accent-text",
  Behind: "bg-warning-tint text-warning-text",
  Overdue: "bg-negative-tint text-negative",
  Done: "bg-ink text-on-ink",
  Paused: "bg-fill text-muted",
  Dropped: "bg-fill text-muted",
  "No plan": "bg-fill text-muted",
  Someday: "bg-fill text-muted",
};

export function StandingPill({ standing, small = false }: { standing: GoalStanding; small?: boolean }) {
  return <span className={`inline-flex items-center rounded-full font-extrabold whitespace-nowrap ${small ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-[11.5px]"} ${STANDING_TONE[standing]}`}>{standing}</span>;
}

/** A saved-over-target bar, with a tick for where saving should be by now. */
export function ProgressBar({ progress, expected, colorKey, height = 8, label }: { progress: number; expected: number | null; colorKey: ColorKey; height?: number; label?: string }) {
  return (
    <div role="img" aria-label={label ?? `${Math.round(progress * 100)}% set aside${expected !== null ? `, ${Math.round(expected * 100)}% expected by now` : ""}`} className="relative w-full rounded-full bg-fill" style={{ height }}>
      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(progress > 0 ? 2 : 0, progress * 100)}%`, background: `linear-gradient(90deg, color-mix(in oklch, var(--card-${colorKey}) 80%, white), var(--card-${colorKey}))` }} />
      {expected !== null && <span className="absolute -top-[3px] -bottom-[3px] w-0.5 rounded bg-ink opacity-70" style={{ left: `${expected * 100}%` }} />}
    </div>
  );
}

/** The ring texture's coloured card for a goal (the focus card, the stat cards). */
export function ColorCard({ colorKey, children, className = "" }: { colorKey: ColorKey; children: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[22px] p-5 text-on-card ${className}`} style={{ background: colorGradient(colorKey, 150), boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.16), 0 6px 16px oklch(0 0 0 / 0.12)" }}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "repeating-radial-gradient(circle at calc(100% + 10px) calc(100% + 18px), oklch(1 0 0 / 0.22) 0 1px, transparent 1px 15px)" }} />
      <div className="relative flex h-full flex-col gap-3">{children}</div>
    </div>
  );
}

/** A progress bar drawn on a coloured card: white on a translucent track. */
export function CardBar({ progress, expected, height = 10 }: { progress: number; expected: number | null; height?: number }) {
  return (
    <div role="img" aria-label={`${Math.round(progress * 100)}% set aside`} className="relative w-full rounded-full bg-white/25" style={{ height }}>
      <span className="absolute inset-y-0 left-0 rounded-full bg-white/95" style={{ width: `${progress * 100}%` }} />
      {expected !== null && <span className="absolute -top-[3px] -bottom-[3px] w-0.5 rounded bg-[oklch(0.85_0.17_95)]" style={{ left: `${expected * 100}%` }} />}
    </div>
  );
}
