import { colorGradient, type ColorKey } from "@/lib/format/subscriptionLabels";
import { formatInr } from "@/lib/format/money";
import { RingTexture } from "../../RingTexture";

/** The account's card, small, as the forms' live preview: its colour, bank initial, name, last 4 and, when given, its balance. */
export function MiniAccountCard({ colorKey, initial, name, last4, balance, note, closed }: { colorKey: ColorKey; initial: string; name: string; last4?: string; balance?: number | null; note?: string; closed?: boolean }) {
  return (
    <div className={`relative isolate flex h-[150px] w-full max-w-[280px] flex-col justify-between overflow-hidden rounded-[20px] border border-on-card-line p-4 text-on-card shadow-[var(--tile-shadow)] ${closed ? "grayscale opacity-80" : ""}`} style={{ background: colorGradient(colorKey) }}>
      <RingTexture width={280} height={150} dx={8} dy={14} first={36} step={22} stroke="var(--rings-light)" opacity={0.08} />
      <div className="flex items-center justify-between">
        <span className="flex size-7 items-center justify-center rounded-full border border-white/40 text-xs font-extrabold">{initial || "?"}</span>
        {closed && <span className="rounded border-2 border-on-card-faint px-1.5 text-[9px] font-extrabold tracking-wider text-on-card-faint uppercase">Closed</span>}
      </div>
      <div>
        <div className="text-xl font-extrabold tabular-nums">{balance === undefined || balance === null ? "—" : formatInr(balance)}</div>
        <div className="flex items-baseline gap-2 text-xs font-bold">
          <span className="truncate">{name || "New account"}</span>
          {last4 && <span className="text-[10px] font-semibold text-on-card-faint">•••• {last4}</span>}
        </div>
        {note && <div className="text-[10.5px] font-semibold text-on-card-muted">{note}</div>}
      </div>
    </div>
  );
}
