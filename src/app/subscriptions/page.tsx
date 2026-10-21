import type { Metadata } from "next";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { PageHeader } from "@/components/shell/PageHeader";
import { SubscriptionsDashboard } from "@/components/subscriptions/SubscriptionsDashboard";
import { HeaderFormButtons, SubscriptionFormsProvider } from "@/components/subscriptions/forms/SubscriptionForms";
import { appConfig } from "@/lib/appConfig";
import { greetingFor, todayIso } from "@/lib/format/date";
import { formsView } from "./formsView";
import { loadSubscriptionData } from "./loadSubscriptionData";
import { ALL, subscriptionsPageView, summarySentence } from "./views";

export const metadata: Metadata = { title: "Subscriptions" };

/**
 * The Subscriptions page (#126, docs/design/subscriptions.md): the greeting, the
 * coloured cover-flow hero, and the cost map beside the payments. `?sub=<id>` opens
 * a pick; `?demo` shows sample data in development, with the forms disabled. The
 * forms (#128) open from the header and the hero; the Renewals page (#130) follows.
 */
export default async function SubscriptionsPage({ searchParams }: PageProps<"/subscriptions">) {
  const params = await searchParams;
  const today = todayIso();
  const { demo, data, skipped } = await loadSubscriptionData(params, today);
  const view = subscriptionsPageView(data, today);
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
            <RefreshButton iconOnly />
            <HeaderFormButtons />
          </>
        }
      >
        <p className="max-w-[960px] text-base leading-[1.7] font-medium text-muted">
          {summarySentence(data, today).map((part, i) =>
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
      <SubscriptionsDashboard view={view} initialPick={initialPick} />
    </div>
    </SubscriptionFormsProvider>
  );
}
