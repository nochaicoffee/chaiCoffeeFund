import type { Metadata } from "next";
import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { HeaderFormButtons, InsuranceFormsProvider } from "@/components/insurance/forms/InsuranceForms";
import { PaymentSections } from "@/components/insurance/PaymentSections";
import { PageHeader } from "@/components/shell/PageHeader";
import { todayIso } from "@/lib/format/date";
import { insuranceFormsData } from "../formsView";
import { loadInsuranceData } from "../loadInsuranceData";
import { ALL, insuranceHref, pickIds } from "../views";
import { paymentsPageView } from "../widgetsView";

export const metadata: Metadata = { title: "Insurance payments" };

/**
 * The premium payments page (as Cards' Statements, Loans' Installments and Income's Entries): every term of every policy, a section
 * each, newest first, with Edit (to enter the day it was paid or where from, which the PDFs don't say) and Delete. `?policy=` shows one
 * policy, and `?demo` shows sample data in development. The forms are the Insurance page's.
 */
export default async function InsurancePaymentsPage({ searchParams }: PageProps<"/insurance/payments">) {
  const params = await searchParams;
  const today = todayIso();
  const { demo, data, skipped } = await loadInsuranceData(params, today);
  const requested = typeof params.policy === "string" ? params.policy : ALL;
  const policyId = pickIds(data).includes(requested) && requested !== ALL ? requested : undefined;
  const view = paymentsPageView(data, today, policyId);
  const picks = [{ id: ALL, name: "All policies" }, ...data.policies.map((p) => ({ id: p.id, name: p.name }))];

  return (
    <InsuranceFormsProvider forms={insuranceFormsData(data, today, demo !== null)}>
      <div className="flex flex-col gap-5">
        <PageHeader
          section="Insurance"
          eyebrow={
            <Link href={insuranceHref("/insurance", { demo, policy: policyId })} className="inline-flex min-h-11 items-center gap-1.5 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent md:min-h-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="11 6 5 12 11 18" />
              </svg>
              Insurance · Payments
            </Link>
          }
          title={policyId ? `Payments · ${data.policies.find((p) => p.id === policyId)?.name ?? ""}` : "Payments"}
          actions={
            <>
              <RefreshButton iconOnly />
              <HeaderFormButtons />
            </>
          }
        >
          <p className="max-w-[720px] text-[15px] font-semibold text-muted">{view.sentence} Edit a payment to enter the day it was paid or where it was paid from.</p>
          {demo !== null && <p className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-bold text-accent-text">Sample data. Nothing here is from your Sheet.</p>}
          <SkippedRowsNotice tabs={skipped} />
        </PageHeader>
        <nav aria-label="Policies" className="flex flex-wrap gap-2">
          {picks.map((p) => {
            const on = (policyId ?? ALL) === p.id;
            return (
              <Link key={p.id} href={insuranceHref("/insurance/payments", { demo, policy: p.id })} aria-current={on ? "page" : undefined} className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-[12.5px] font-extrabold focus-visible:outline-2 focus-visible:outline-accent ${on ? "bg-ink text-on-ink" : "bg-fill hover:bg-fill-strong"}`}>
                {p.name}
              </Link>
            );
          })}
        </nav>
        {view.sections.length === 0 ? <p className="rounded-[22px] border border-dashed border-divider bg-surface px-6 py-14 text-center text-sm font-semibold text-muted">{policyId ? "This policy has no payment recorded. Renew it to record its next term." : "No payments yet. Add a policy and its first payment is recorded with it."}</p> : <PaymentSections sections={view.sections} />}
      </div>
    </InsuranceFormsProvider>
  );
}
