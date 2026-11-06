import type { Metadata } from "next";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { AttentionStrip } from "@/components/lent/AttentionStrip";
import { GreetingSentence } from "@/components/lent/GreetingSentence";
import { PageHeader } from "@/components/shell/PageHeader";
import { appConfig } from "@/lib/appConfig";
import { lentLoanColor } from "@/lib/aggregate/lentOut";
import { cardColorKey } from "@/lib/format/colors";
import { greetingFor, todayIso } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { getCachedIncomeEntriesTab, getCachedIncomeSourcesTab, getCachedLentLoansTab, getCachedLentRepaymentsTab } from "@/lib/sheets/cached";
import { attentionView, greetingView, lentModel, summarySentence } from "./views";

export const metadata: Metadata = { title: "Lent out" };

/**
 * The Lent out page (docs/design/lent-out.md, L3 Who owes what + the interest clock): the greeting, whose figures point, then what needs
 * attention. The hero, the clock, the loans table and the forms are built on this shell (C2 to C5); until then the loans are a plain list,
 * as the Fixed Income page was before its widgets.
 */
export default async function LentPage() {
  const today = todayIso();
  const [loansTab, repaymentsTab, sourcesTab, entriesTab] = await Promise.all([getCachedLentLoansTab(), getCachedLentRepaymentsTab(), getCachedIncomeSourcesTab(), getCachedIncomeEntriesTab()]);
  const model = lentModel({ loans: loansTab.records, repayments: repaymentsTab.records, sources: sourcesTab.records, entries: entriesTab.records }, today);
  const skipped = [loansTab.skipped, repaymentsTab.skipped].filter((t) => t.rows.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader section="Lent out" title={`${greetingFor()}, ${appConfig.ownerName}`} actions={<RefreshButton iconOnly />}>
        <GreetingSentence parts={summarySentence(model)} cards={greetingView(model)} />
        <SkippedRowsNotice tabs={skipped} />
      </PageHeader>
      <AttentionStrip items={attentionView(model)} />
      {model.data.loans.length === 0 ? (
        <section className="rounded-[22px] border border-surface-line bg-surface p-6 text-sm font-semibold text-muted">
          Nothing lent yet. Money you lend to friends will show here: who owes what, what it earns a day, and which payouts have arrived.
        </section>
      ) : (
        <section aria-label="Loans" className="rounded-[22px] border border-surface-line bg-surface p-5 md:p-6">
          <h2 className="text-[15px] font-extrabold">Loans</h2>
          <ul className="mt-3 flex flex-col divide-y divide-divider">
            {[...model.who.blocks.map((b) => ({ loan: b.loan, owed: b.owedToday })), ...model.who.repaid.map((loan) => ({ loan, owed: 0 }))].map(({ loan, owed }) => (
              <li key={loan.id} className="flex items-center gap-3 py-2.5 text-sm">
                <i aria-hidden="true" className="size-2.5 shrink-0 rounded-[4px]" style={{ background: `var(--card-${cardColorKey(lentLoanColor(loan))})` }} />
                <span className="min-w-0 flex-1 truncate font-extrabold">{loan.borrowerName}</span>
                <span className="text-xs font-semibold text-muted">{loan.interestMode === "Accruing" ? "interest builds up" : "paid out"}{loan.status === "Repaid" ? " · repaid" : ""}</span>
                <span className="font-extrabold tabular-nums">{formatInr(Math.round(owed))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
