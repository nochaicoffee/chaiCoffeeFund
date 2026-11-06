import type { ReturnCard } from "@/app/investments/views";

const TONE: Record<ReturnCard["tone"], string> = { gain: "text-positive", loss: "text-negative", plain: "text-fg" };

/** The six returns at a glance (docs/design/investments.md, "Key metrics"): yearly return, time-weighted, deepest fall, the two indices and what sales made. */
export function ReturnsRow({ cards }: { cards: ReturnCard[] }) {
  if (cards.length === 0) return null;
  return (
    <section aria-label="Returns" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <div key={c.key} className="flex min-w-0 flex-col gap-1 rounded-[18px] border border-surface-line bg-surface p-4 shadow-[var(--card-shadow)]">
          <span className="text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase">{c.label}</span>
          <b className={`text-xl font-extrabold tracking-tight ${TONE[c.tone]}`}>{c.value}</b>
          <small className="text-[11px] font-medium text-muted">{c.note}</small>
        </div>
      ))}
    </section>
  );
}
