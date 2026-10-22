import { colorGradient, type ColorKey } from "@/lib/format/subscriptionLabels";
import { formatInr } from "@/lib/format/money";
import { RingTexture } from "../../RingTexture";

/**
 * The account's card as the forms' live preview, in the treatment of the Cards and Subscriptions
 * previews: the dark gradient lit from the top, the faint rings from the corner, the bank's initial
 * in a small rounded square, the name, then its last 4 and balance. Greyed when closed.
 */
export function MiniAccountCard({ colorKey, initial, name, last4, balance, corner, closed }: { colorKey: ColorKey; initial: string; name: string; last4?: string; balance?: number | null; corner?: string; closed?: boolean }) {
  return (
    <div
      className="relative isolate flex h-[156px] flex-col justify-between overflow-hidden rounded-[18px] border border-on-card-line border-t-on-card-line-top px-4 py-3.5 text-on-card shadow-[var(--tile-shadow)] max-md:h-[120px]"
      style={{ background: colorGradient(colorKey), filter: closed ? "grayscale(0.8)" : undefined }}
      aria-hidden="true"
    >
      <RingTexture width={280} height={156} dx={10} dy={20} first={40} step={26} count={8} stroke="var(--rings-light)" opacity={0.07} />
      <span className="flex items-center justify-between">
        <span className="flex size-[30px] items-center justify-center rounded-[9px] bg-on-card-fill text-[13px] font-extrabold">{initial || "?"}</span>
        <span className="text-[10px] font-bold text-on-card-faint">{closed ? "Closed" : corner}</span>
      </span>
      <span className="min-w-0">
        <b className="block truncate text-lg">{name.trim() || "Account name"}</b>
        <span className="mt-1 flex justify-between text-xs font-semibold text-on-card-muted tabular-nums">
          <span>{balance === undefined || balance === null ? "₹–" : formatInr(balance)}</span>
          <span className="tracking-[0.14em] text-on-card-faint">{last4 ? `•••• ${last4}` : "••••"}</span>
        </span>
      </span>
    </div>
  );
}

/** The colour radios that sit in the preview panel, inside the form so they submit with it (as in Add card and Add subscription). */
export function ColorSwatches({ colors, value, onChange, error }: { colors: readonly string[]; value: string; onChange: (color: string) => void; error?: string }) {
  return (
    <fieldset aria-describedby={error ? "color-error" : undefined}>
      <legend className="mb-2 text-[11px] font-bold tracking-[0.04em] text-muted uppercase">
        Colour<span className="text-negative" aria-hidden="true"> *</span>
      </legend>
      <div className="flex flex-wrap gap-2.5">
        {colors.map((c) => (
          <label key={c} className="relative flex cursor-pointer flex-col items-center gap-1">
            <input type="radio" name="color" value={c} checked={value === c} onChange={() => onChange(c)} className="peer sr-only" />
            <span
              className="size-[30px] rounded-[9px] shadow-[0_2px_5px_oklch(0_0_0/0.18)] ring-offset-2 ring-offset-feature-tile peer-checked:ring-2 peer-checked:ring-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-accent max-md:size-9"
              style={{ background: colorGradient(c.toLowerCase() as ColorKey) }}
              aria-hidden="true"
            />
            <span className="text-[10px] font-semibold text-muted peer-checked:font-bold peer-checked:text-fg">{c}</span>
          </label>
        ))}
      </div>
      {error && (
        <p id="color-error" className="mt-1.5 text-[11px] font-semibold text-negative">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** The light box under a preview card with a few labelled figures, as on Mark paid and Add subscription. */
export function SummaryBox({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[14px] bg-surface/80 px-3.5 py-3">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3 text-xs">
          <span className="font-medium text-muted">{r.label}</span>
          <b className="font-extrabold whitespace-nowrap tabular-nums">{r.value}</b>
        </div>
      ))}
    </div>
  );
}
