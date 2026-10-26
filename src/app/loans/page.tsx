import type { Metadata } from "next";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { GreetingSentence } from "@/components/loans/GreetingSentence";
import { LoansDashboard } from "@/components/loans/LoansDashboard";
import { AddFirstLoan } from "@/components/loans/forms/AddFirstLoan";
import { HeaderFormButtons, LoanFormsProvider } from "@/components/loans/forms/LoanForms";
import { PageHeader } from "@/components/shell/PageHeader";
import { appConfig } from "@/lib/appConfig";
import { greetingFor, todayIso } from "@/lib/format/date";
import { loadLoansData } from "./loadLoansData";
import { ALL, attentionView, coverView, greetingView, loanFormsData, loansHref, pickIds, summarySentence } from "./views";
import { loanWidgets } from "./widgetsView";

export const metadata: Metadata = { title: "Loans" };

/**
 * The Loans page (docs/design/loans.md, LoansN1): the greeting, whose figures point, the attention strip while an
 * EMI is due within a week, then the dark cover and the widgets, all following the pick. `?loan=` picks a loan, and
 * `?demo` shows sample data in development.
 */
export default async function LoansPage({ searchParams }: PageProps<"/loans">) {
  const params = await searchParams;
  const today = todayIso();
  const { demo, data, skipped } = await loadLoansData(params, today);
  const ids = pickIds(data);
  const requested = typeof params.loan === "string" ? params.loan : ALL;
  const initialPick = ids.includes(requested) ? requested : ALL;
  const installmentsHref = Object.fromEntries(ids.map((id) => [id, loansHref("/loans/installments", { demo, loan: id })]));
  const anyActive = ids.length > 1;

  return (
    <LoanFormsProvider forms={loanFormsData(data, today, demo)}>
      <div className="flex flex-col gap-6">
        <PageHeader
          section="Loans"
          title={`${greetingFor()}, ${appConfig.ownerName}`}
          actions={
            <>
              <RefreshButton iconOnly />
              <HeaderFormButtons />
            </>
          }
        >
          <GreetingSentence parts={summarySentence(data, today)} cards={greetingView(data, today)} />
          {demo && <p className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-bold text-accent-text">Sample data. Nothing here is from your Sheet.</p>}
          <SkippedRowsNotice tabs={skipped} />
        </PageHeader>
        {anyActive ? (
          <LoansDashboard cover={coverView(data, today)} widgets={loanWidgets(data, today)} attention={attentionView(data, today)} today={today} initialPick={initialPick} installmentsHref={installmentsHref} />
        ) : (
          <section className="rounded-[26px] border border-dashed border-divider bg-surface px-6 py-14 text-center">
            <p className="text-base font-extrabold">{data.loans.length === 0 ? "No loans yet" : "No loans running"}</p>
            <p className="mx-auto mt-1 max-w-[520px] text-sm font-semibold text-muted">
              {data.loans.length === 0
                ? "Add a loan with its sanction letter's numbers: its whole EMI schedule is worked out for you, and this page shows what you owe, what's next and when you'll be debt-free."
                : "Every loan you've added is paid off. Add another when you borrow again."}
            </p>
            <div className="mt-5 flex justify-center">
              <AddFirstLoan />
            </div>
            {data.loans.length > 0 && (
              <p className="mt-4 text-xs font-semibold text-muted">
                <a className="font-extrabold text-accent-text hover:underline" href={installmentsHref[ALL]}>
                  See the closed loans&apos; installments →
                </a>
              </p>
            )}
          </section>
        )}
      </div>
    </LoanFormsProvider>
  );
}
