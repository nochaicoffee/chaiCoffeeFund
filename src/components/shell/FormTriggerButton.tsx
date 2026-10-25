import type { Ref } from "react";

/** The page header's primary and soft buttons (Add account, Record income…), shared by the dashboards' forms. */
export const HEADER_PRIMARY_CLASS = "flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold whitespace-nowrap text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:min-h-0";
export const HEADER_GHOST_CLASS = "flex min-h-11 items-center gap-1.5 rounded-full bg-fill px-5 py-2.5 text-[13px] font-bold whitespace-nowrap text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent md:min-h-0";

/**
 * A button that opens a form. When the forms can't be used (sample data) it stays focusable but disabled, with the
 * reason as a tooltip and for screen readers. Each dashboard's FormTrigger passes its own forms' reason.
 */
export function FormTriggerButton({ className, label, onClick, disabledReason, ref }: { className: string; label: string; onClick: () => void; disabledReason?: string; ref?: Ref<HTMLButtonElement> }) {
  return (
    <button ref={ref} type="button" onClick={disabledReason ? undefined : onClick} aria-disabled={disabledReason ? true : undefined} title={disabledReason} className={`${className} ${disabledReason ? "cursor-not-allowed opacity-60" : ""}`}>
      {label}
      {disabledReason && <span className="sr-only">{` (${disabledReason})`}</span>}
    </button>
  );
}
