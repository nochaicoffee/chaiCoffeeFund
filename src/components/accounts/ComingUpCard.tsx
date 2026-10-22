import type { PickDetail } from "@/app/accounts/detailView";

/**
 * Coming up (docs/design/accounts.md): the next 45 days of salary, EMIs, card bills and
 * subscriptions for the pick, soonest first. Salary and EMIs are at their usual amounts, and a
 * card bill not yet billed is "about" the card's last bill. An EMI bigger than what its account
 * holds is flagged, since nothing else is assumed to land first.
 */
export function ComingUpCard({ detail }: { detail: PickDetail }) {
  const { coming } = detail;
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)]" aria-label="Coming up">
      <h2 className="text-[15px] font-extrabold">
        Coming up <small className="ml-2 text-xs font-semibold text-muted">Next 45 days</small>
      </h2>
      {coming.length === 0 ? (
        <p className="py-8 text-center text-sm font-semibold text-muted">Nothing due in the next 45 days from what&rsquo;s recorded.</p>
      ) : (
        <ul className="flex flex-1 flex-col divide-y divide-divider">
          {coming.map((c) => (
            <li key={c.key} className="flex items-center gap-3 py-2.5">
              <i aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ background: `var(--card-${c.color})` }} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[13px] font-bold">
                  {c.label} <span className="font-semibold text-muted">· {c.kind}{c.about ? ", about" : ""}</span>
                </b>
                <span className="block text-[11px] font-semibold text-muted">
                  {c.dateText} · {c.when} · {c.account}
                </span>
                {c.short && <span className="mt-0.5 inline-block rounded-full bg-negative-tint px-2 py-0.5 text-[10.5px] font-extrabold text-negative">{c.account} can&rsquo;t cover this</span>}
              </span>
              <b className={`text-[13px] font-extrabold tabular-nums ${c.kind === "Salary" ? "text-positive" : ""}`}>{c.about ? "≈ " : ""}{c.amountText}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
