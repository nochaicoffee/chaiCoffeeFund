import type { Metadata } from "next";
import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { PeriodSelect } from "@/components/cards/PeriodSelect";
import { StatementsSummary } from "@/components/cards/StatementsSummary";
import { PageHeader } from "@/components/shell/PageHeader";
import { RenewalsList } from "@/components/subscriptions/RenewalsList";
import { RecordPaymentButton, SubscriptionFormsProvider } from "@/components/subscriptions/forms/SubscriptionForms";
import { todayIso } from "@/lib/format/date";
import { queryString } from "../../cards/params";
import { usableSubscriptionData } from "@/lib/aggregate/subscriptionPage";
import { formsView } from "../formsView";
import { loadSubscriptionData } from "../loadSubscriptionData";
import { parseRenewalsState, renewalsPeriodMenu, renewalsPeriodValue, renewalsQuery, renewalsRangeStart, type RenewalsListState } from "./params";
import { renewalsPageView } from "./views";

export const metadata: Metadata = { title: "Renewals" };

/**
 * The Renewals page (#130, layout R1 in docs/design/subscriptions.md): every renewal in
 * one table, like the Cards Statements page. Coming up in the next 30 days first, then
 * each past month; filtered to one subscription (`?sub=<id>`, which the Subscriptions
 * page's "All renewals" links open for all time) it's that subscription's history.
 * Upcoming renewals come from each schedule; nothing is written until a payment is
 * recorded, through the Subscriptions forms (#128). `?demo` shows sample data in
 * development, with the forms disabled.
 */
export default async function RenewalsPage({ searchParams }: PageProps<"/subscriptions/renewals">) {
  const params = await searchParams;
  const today = todayIso();
  const { demo, data: sheetData, skipped } = await loadSubscriptionData(params, today);
  // Payments whose subscription is gone are left out of everything, the period menu's figures included.
  const data = usableSubscriptionData(sheetData);
  const state = parseRenewalsState(params, data, today, demo);
  const forms = formsView(data, today, demo);
  const view = renewalsPageView(data, state, today, forms);
  const hrefFor = (changes: Partial<RenewalsListState>) => `/subscriptions/renewals${renewalsQuery({ ...state, page: 1, ...changes }, today)}`;
  const subscriptionsHref = (sub?: string) => `/subscriptions${queryString([["sub", sub]], demo)}`.replace(/\?$/, "");

  return (
    <SubscriptionFormsProvider forms={forms}>
    <div className="flex flex-col gap-5">
      <PageHeader
        section="Subscriptions"
        eyebrow={
          <Link href={subscriptionsHref(state.subscriptionId)} className="inline-flex min-h-11 items-center gap-1.5 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent md:min-h-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="11 6 5 12 11 18" />
            </svg>
            Subscriptions · Renewals
          </Link>
        }
        title="Renewals"
        actions={
          <>
            <PeriodSelect options={renewalsPeriodMenu(data, state.period, today)} value={renewalsPeriodValue(state.period, today)} start={renewalsRangeStart(data, state.period, today)} currentMonth={today.slice(0, 7)} />
            <span className="max-md:hidden">
              <RefreshButton iconOnly />
            </span>
            <RecordPaymentButton subscriptionId={state.subscriptionId} />
          </>
        }
      >
        <p className="text-[15px] leading-relaxed font-medium text-muted">
          {view.lede.map((part, i) =>
            part.strong ? (
              <span key={i} className="font-bold whitespace-nowrap text-fg tabular-nums">
                {part.text}
              </span>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </p>
        {demo && <p className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-bold text-accent-text">Sample data. Nothing here is from your Sheet.</p>}
        <SkippedRowsNotice tabs={skipped} />
      </PageHeader>

      <StatementsSummary
        tiles={view.tiles.map((t) => ({
          label: t.label,
          value: (
            <span className={t.warning ? "text-warning-text" : ""}>
              {t.value}
              {t.unit && <small className="ml-1.5 text-sm font-bold text-muted">{t.unit}</small>}
            </span>
          ),
          caption: t.caption.map((part, i) =>
            part.strong ? (
              <b key={i} className="font-bold text-fg">
                {part.text}
              </b>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          ),
        }))}
      />

      <RenewalsList view={view} state={state} hrefFor={hrefFor} openHref={subscriptionsHref} subscriptionsHref={subscriptionsHref()} today={today} />
    </div>
    </SubscriptionFormsProvider>
  );
}
