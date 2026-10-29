import type { ReactNode } from "react";

/** A dashboard widget's card (Loans', Insurance's): a title with its small note, something on the right, then the body. */
export function WidgetCard({ title, note, right, children, label, className = "", gap = "gap-3.5" }: { title: ReactNode; note?: ReactNode; right?: ReactNode; children: ReactNode; label: string; className?: string; gap?: string }) {
  return (
    <section aria-label={label} className={`flex h-full min-w-0 flex-col ${gap} rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)] md:p-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold">
          {title}
          {note && <small className="ml-2 text-xs font-semibold text-muted">{note}</small>}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}
