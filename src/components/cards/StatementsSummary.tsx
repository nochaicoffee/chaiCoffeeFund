import type { ReactNode } from "react";
import { RingTexture } from "../RingTexture";

export interface SummaryTile {
  label: string;
  value: string;
  caption: ReactNode;
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
          {i === 0 && (
            <RingTexture
              width={360}
              height={112}
              dx={20}
              dy={38}
              first={20}
              step={20}
              stroke="var(--feature-tile-rings)"
              sheen="radial-gradient(circle at 92% 8%, var(--feature-tile-glow), transparent 45%)"
            />
          )}
          <span className="text-xs font-semibold text-muted">{tile.label}</span>
          <span className="text-[22px] leading-tight font-extrabold tabular-nums md:text-[26px]">{tile.value}</span>
          <span className="text-[11.5px] font-semibold text-muted">{tile.caption}</span>
        </div>
      ))}
    </section>
  );
}
