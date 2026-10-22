import type { Metadata } from "next";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { PeriodSelect } from "@/components/cards/PeriodSelect";
import { PageHeader } from "@/components/shell/PageHeader";
import { GreetingSentence } from "@/components/subscriptions/GreetingSentence";
import { SubscriptionsDashboard } from "@/components/subscriptions/SubscriptionsDashboard";
import { HeaderFormButtons, SubscriptionFormsProvider } from "@/components/subscriptions/forms/SubscriptionForms";
import { usableSubscriptionData } from "@/lib/aggregate/subscriptionPage";
import { appConfig } from "@/lib/appConfig";
import { greetingFor, todayIso } from "@/lib/format/date";
import { parsePeriod } from "../cards/params";
import { formsView } from "./formsView";
import { loadSubscriptionData } from "./loadSubscriptionData";
import { renewalsPeriodMenu, renewalsPeriodValue, renewalsRangeStart } from "./renewals/params";
import { ALL, greetingView, subscriptionsPageView, summarySentence } from "./views";

export const metadata: Metadata = { title: "Subscriptions" };

/**
 * The Subscriptions page (#126, docs/design/subscriptions.md): the greeting, the
 * coloured cover-flow hero, and the cost map beside the payments. `?sub=<id>` opens
 * a pick; `?demo` shows sample data in development, with the forms disabled. The
 * forms (#128) open from the header and the hero; the Renewals page (#130) follows.
 * The period pill (`?period=`, the Renewals page's menu) decides what was paid: the
 * greeting, the hero's paid figures, the payments and the chart. This year is the default.
 */
export default async function SubscriptionsPage({ searchParams }: PageProps<"/subscriptions">) {
  const params = await searchParams;
  const today = todayIso();
  const { demo, data, skipped } = await loadSubscriptionData(params, today);
  const period = parsePeriod(params, today);
  // The menu's figures leave out payments whose subscription is gone, as the Renewals page's do.
  const usable = usableSubscriptionData(data);
  const view = subscriptionsPageView(data, today, period);
  const requested = typeof params.sub === "string" ? params.sub : ALL;
  const initialPick = view.picks.some((p) => p.id === requested) ? requested : ALL;

  return (
    <SubscriptionFormsProvider forms={formsView(data, today, demo)}>
    <div className="flex flex-col gap-6">
      <PageHeader
        section="Subscriptions"
        title={`${greetingFor()}, ${appConfig.ownerName}`}
        actions={
          <>
            <PeriodSelect options={renewalsPeriodMenu(usable, period, today)} value={renewalsPeriodValue(period, today)} start={renewalsRangeStart(usable, period, today)} currentMonth={today.slice(0, 7)} />
            <RefreshButton iconOnly />
            <HeaderFormButtons />
          </>
        }
      >
        <GreetingSentence parts={summarySentence(data, today, period)} cards={greetingView(data, today, period)} />
        {demo && <p className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-bold text-accent-text">Sample data. Nothing here is from your Sheet.</p>}
        <SkippedRowsNotice tabs={skipped} />
      </PageHeader>
      <SubscriptionsDashboard view={view} initialPick={initialPick} />
    </div>
    </SubscriptionFormsProvider>
  );
}
