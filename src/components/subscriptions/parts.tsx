import type { ChargedToChip, Mark } from "@/app/subscriptions/views";
import { colorGradient } from "@/lib/format/subscriptionLabels";
import { BankIcon, RenewIcon } from "./icons";

/** The square that stands in for a subscription's logo: its initial on its colour. All gets the renew icon on emerald. */
export function Mono({ mark, size = 24 }: { mark: Mark; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center font-extrabold text-on-card shadow-[inset_0_1px_0_oklch(1_0_0/0.18),0_2px_6px_oklch(0_0_0/0.18)] ${mark.muted ? "opacity-55 grayscale" : ""}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), fontSize: Math.round(size * 0.44), background: colorGradient(mark.color) }}
    >
      {mark.initial || <RenewIcon size={Math.round(size * 0.46)} />}
    </span>
  );
}

/** Where something's charged: a card as a little tile in its colour, an account as a bank. */
export function ChargedTo({ chip }: { chip: ChargedToChip }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-[7px] text-xs font-semibold whitespace-nowrap text-fg">
      {chip.kind === "card" ? (
        <span aria-hidden="true" className="h-3.5 w-5 shrink-0 rounded-[4px] shadow-[inset_0_1px_0_oklch(1_0_0/0.2)]" style={{ background: colorGradient(chip.color) }} />
      ) : (
        <span aria-hidden="true" className="inline-flex h-3.5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-fill-strong text-muted">
          <BankIcon />
        </span>
      )}
      <span className="truncate">{chip.name}</span>
    </span>
  );
}

/** The segmented toggle, in its own client file since it measures itself (7D). */
export { Segmented } from "./Segmented";
