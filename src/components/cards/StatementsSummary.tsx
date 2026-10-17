import type { ReactNode } from "react";

export interface SummaryTile {
  label: string;
  value: string;
  caption: ReactNode;
}

/** The rings in the corner of the highlighted tile, as in the design. */
function Rings() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 92% 8%, var(--feature-tile-glow), transparent 45%)" }} />
      <svg viewBox="0 0 360 112" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <g fill="none" stroke="var(--feature-tile-rings)" strokeWidth="1">
          {Array.from({ length: 21 }, (_, i) => (
            <circle key={i} cx="380" cy="150" r={20 * (i + 1)} />
          ))}
        </g>
      </svg>
    </div>
  );
}

/**
 * The four tiles at the top of the Statements page (StatementsList.dc.html):
 * the first is highlighted, the rest are plain surfaces.
 */
export function StatementsSummary({ tiles }: { tiles: SummaryTile[] }) {
  return (
    <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {tiles.map((tile, i) => (
        <div
          key={tile.label}
          className={`relative isolate flex min-w-0 flex-col gap-1 overflow-hidden rounded-[22px] border px-4 py-4 shadow-soft md:px-5 md:py-[18px] ${
            i === 0 ? "border-feature-tile-line bg-feature-tile" : "border-surface-line bg-surface"
          }`}
        >
          {i === 0 && <Rings />}
          <span className="text-xs font-semibold text-muted">{tile.label}</span>
          <span className="text-[22px] leading-tight font-extrabold tabular-nums md:text-[26px]">{tile.value}</span>
          <span className="text-[11.5px] font-semibold text-muted">{tile.caption}</span>
        </div>
      ))}
    </section>
  );
}
