import type { Metadata } from "next";
import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { InstallmentSections } from "@/components/loans/InstallmentSections";
import { HeaderFormButtons, LoanFormsProvider } from "@/components/loans/forms/LoanForms";
import { PageHeader } from "@/components/shell/PageHeader";
import { todayIso } from "@/lib/format/date";
import { loadLoansData } from "../loadLoansData";
import { ALL, loanFormsData, loansHref } from "../views";
import { installmentsView } from "../widgetsView";

export const metadata: Metadata = { title: "Loan installments" };

/**
 * The Installments page (docs/design/loans.md, "Not done yet": all installments, as Cards' Statements and Income's
 * Entries): every EMI of every loan, a section each with its prepayments, the next loan due open. `?loan=` shows one
 * loan, and `?demo` shows sample data in development. The forms are the Loans page's.
 */
export default async function LoanInstallmentsPage({ searchParams }: PageProps<"/loans/installments">) {
  const params = await searchParams;
  const today = todayIso();
  const { demo, data, skipped } = await loadLoansData(params, today);
  const requested = typeof params.loan === "string" ? params.loan : ALL;
  const loanId = data.loans.some((l) => l.id === requested) ? requested : undefined;
  const sections = installmentsView(data, today, loanId);
  const picks = [{ id: ALL, name: "All loans" }, ...data.loans.map((l) => ({ id: l.id, name: l.name }))];

  return (
    <LoanFormsProvider forms={loanFormsData(data, today, demo)}>
      <div className="flex flex-col gap-5">
        <PageHeader
          section="Loans"
          eyebrow={
            <Link href={loansHref("/loans", { demo, loan: loanId })} className="inline-flex min-h-11 items-center gap-1.5 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent md:min-h-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="11 6 5 12 11 18" />
              </svg>
              Loans · Installments
            </Link>
          }
          title={loanId ? `Installments · ${sections[0]?.loan.name}` : "Installments"}
          actions={
            <>
              <RefreshButton iconOnly />
              <HeaderFormButtons />
            </>
          }
        >
          <p className="max-w-[720px] text-[15px] font-semibold text-muted">Every EMI, worked out from each loan&apos;s terms and its prepayments. Paid ones stay as they were paid; the rest change only when a prepayment is added.</p>
          {demo && <p className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-bold text-accent-text">Sample data. Nothing here is from your Sheet.</p>}
          <SkippedRowsNotice tabs={skipped} />
        </PageHeader>
        <nav aria-label="Loans" className="flex flex-wrap gap-2">
          {picks.map((p) => {
            const on = (loanId ?? ALL) === p.id;
            return (
              <Link key={p.id} href={loansHref("/loans/installments", { demo, loan: p.id })} aria-current={on ? "page" : undefined} className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-[12.5px] font-extrabold focus-visible:outline-2 focus-visible:outline-accent ${on ? "bg-ink text-on-ink" : "bg-fill hover:bg-fill-strong"}`}>
                {p.name}
              </Link>
            );
          })}
        </nav>
        {sections.length === 0 ? <p className="rounded-[22px] border border-dashed border-divider bg-surface px-6 py-14 text-center text-sm font-semibold text-muted">No loans yet.</p> : <InstallmentSections sections={sections} />}
      </div>
    </LoanFormsProvider>
  );
}
