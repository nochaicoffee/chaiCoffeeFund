import type { ReactNode } from "react";
import { NCB_STEPS } from "@/lib/sheets/types";

/** The lengths of cover a premium can buy, as the Segmented options of Add policy and Renew. */
export const YEAR_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: n === 1 ? "1 year" : `${n} years` }));

/** The no-claim steps, as Segmented options. */
export const NCB_OPTIONS = NCB_STEPS.map((n) => ({ value: String(n), label: `${n}%` }));

/** One line of a preview panel: a label and its figure. */
export function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? "font-extrabold" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}

/** The white card at the top of a preview: what the thing is called and its big figure. */
export function PreviewCard({ mark, title, sub, big, small }: { mark: ReactNode; title: string; sub: string; big: string; small: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-surface p-4">
      <span className="flex items-center gap-3">
        {mark}
        <span className="min-w-0">
          <b className="block truncate text-[15px] font-extrabold">{title}</b>
          <span className="block truncate text-xs font-semibold text-muted">{sub}</span>
        </span>
      </span>
      <b className="text-[28px] leading-none font-extrabold tabular-nums">
        {big}
        <small className="ml-1.5 text-[11px] font-extrabold tracking-[0.04em] text-muted uppercase">{small}</small>
      </b>
    </div>
  );
}

/** A form-level problem the server found (a term that overlaps another, a policy that's gone). */
export function FormProblem({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
      {message}
    </p>
  );
}
