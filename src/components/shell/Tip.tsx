import type { CSSProperties, ReactNode } from "react";

/**
 * The light hover card the dashboards' widgets share (Loans' charts, Insurance's term bars): `Tip` opens a card over a mark on hover
 * or focus, and `TipBody` is what goes in it.
 */

/** A light card that opens over a mark on hover or focus (as the other dashboards' hover cards). */
export function Tip({ children, card, className = "", place = "up", align = "center", width = 250, label, style }: { children: ReactNode; card: ReactNode; className?: string; place?: "up" | "down"; align?: "center" | "left" | "right"; width?: number; label?: string; style?: CSSProperties }) {
  const x = align === "center" ? "left-1/2 -translate-x-1/2" : align === "left" ? "left-0" : "right-0";
  return (
    <span tabIndex={0} aria-label={label} style={style} className={`group/tip relative focus-visible:outline-2 focus-visible:outline-accent ${className}`}>
      {children}
      <span role="tooltip" className={`pointer-events-none invisible absolute z-30 ${x} ${place === "up" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"} opacity-0 group-hover/tip:visible group-hover/tip:opacity-100 group-focus-visible/tip:visible group-focus-visible/tip:opacity-100 motion-safe:transition-opacity motion-safe:duration-150`} style={{ width }}>
        <span className="block rounded-[14px] border border-[var(--tip-line)] bg-[var(--tip-surface)] p-3 text-left text-[var(--tip-fg)] shadow-[var(--tip-shadow)]">{card}</span>
      </span>
    </span>
  );
}

/** The inside of a hover card: a heading, a big figure, a line, rows and a foot. */
export function TipBody({ head, aside, total, detail, rows = [], foot }: { head: string; aside?: ReactNode; total?: string; detail?: string; rows?: { name: string; amount: string; mark?: ReactNode }[]; foot?: string }) {
  return (
    <>
      <span className="flex items-center justify-between gap-2 text-[11px] font-extrabold tracking-[0.04em] text-[var(--tip-muted)] uppercase">
        <span>{head}</span>
        {aside}
      </span>
      {total && <b className="mt-1 block text-lg font-extrabold tabular-nums">{total}</b>}
      {detail && <span className="block text-[11.5px] font-semibold text-[var(--tip-muted)]">{detail}</span>}
      {rows.length > 0 && (
        <span className="mt-2 flex flex-col gap-1 border-t border-[var(--tip-line)] pt-2">
          {rows.map((r) => (
            <span key={r.name} className="flex items-center gap-2 text-xs font-semibold">
              {r.mark}
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              <b className="font-extrabold tabular-nums">{r.amount}</b>
            </span>
          ))}
        </span>
      )}
      {foot && <span className="mt-2 block border-t border-[var(--tip-line)] pt-1.5 text-[11px] font-semibold text-[var(--tip-muted)]">{foot}</span>}
    </>
  );
}
