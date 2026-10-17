import type { StatementStatus } from "@/lib/sheets/types";

/** A statement's Pending or Paid pill, as the design shows it in every statement list. */
export function StatusPill({ status }: { status: StatementStatus }) {
  return (
    <span className={`rounded-full px-[11px] py-1 text-[10px] font-bold ${status === "Paid" ? "bg-accent-tint text-accent-text" : "bg-fill text-muted"}`}>
      {status}
    </span>
  );
}
