import { markStatementPaid } from "@/app/cards/actions";
import type { Account, Statement } from "@/lib/sheets/types";
import { formatDate } from "@/lib/format/date";
import { formatInrExact } from "@/lib/format/money";

const GHOST_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-fill px-3 py-1.5 text-[11px] font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-0";

/**
 * A pending row's "Mark paid": opens a small popover form (the HTML popover
 * attribute, so it needs no client JavaScript) for the amount paid and the account
 * it came from, then marks the statement Paid with today's date. The designed
 * add and mark-paid forms (#51) replace this form's contents.
 */
export function MarkPaidButton({
  statement,
  cardName,
  accounts,
  disabledReason,
}: {
  statement: Statement;
  cardName: string;
  accounts: Account[];
  /** When set, the button is shown disabled with this as its explanation (sample data). */
  disabledReason?: string;
}) {
  if (disabledReason) {
    return (
      <button type="button" disabled title={disabledReason} aria-label={`Mark paid: ${disabledReason}`} className={GHOST_BUTTON}>
        Mark paid
      </button>
    );
  }
  const id = `pay-${statement.id}`;
  return (
    <>
      <button type="button" popoverTarget={id} aria-label={`Mark ${cardName}'s ${formatDate(statement.statementDate)} statement paid`} className={GHOST_BUTTON}>
        Mark paid
      </button>
      <div
        id={id}
        popover="auto"
        role="dialog"
        aria-labelledby={`${id}-title`}
        className="m-auto w-[min(360px,calc(100vw-32px))] rounded-[22px] border border-surface-line bg-surface p-5 text-left text-fg shadow-card backdrop:bg-ink/20"
      >
        <form action={markStatementPaid} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={statement.id} />
          <div className="flex flex-col gap-1">
            <h3 id={`${id}-title`} className="text-base font-extrabold">
              Mark {cardName} paid
            </h3>
            <p className="text-xs font-semibold text-muted">
              Statement of {formatDate(statement.statementDate)} · {formatInrExact(statement.totalAmountDue)} due
            </p>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-muted">
            Amount paid
            <input
              type="number"
              name="amountPaid"
              required
              min={0}
              step={0.01}
              defaultValue={statement.totalAmountDue}
              className="min-h-11 rounded-control border border-surface-line bg-surface px-3 text-sm font-semibold text-fg tabular-nums focus-visible:outline-2 focus-visible:outline-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-muted">
            Paid from
            <select
              name="paidFromAccountId"
              defaultValue=""
              className="min-h-11 rounded-control border border-surface-line bg-surface px-3 text-sm font-semibold text-fg focus-visible:outline-2 focus-visible:outline-accent"
            >
              <option value="">Not recorded</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" popoverTarget={id} popoverTargetAction="hide" className="min-h-11 rounded-full bg-fill px-4 text-[13px] font-bold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
              Cancel
            </button>
            <button type="submit" className="min-h-11 rounded-full bg-ink px-5 text-[13px] font-bold text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              Mark paid
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
