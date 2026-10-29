import type { Metadata } from "next";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { GreetingSentence } from "@/components/insurance/GreetingSentence";
import { InsuranceDashboard } from "@/components/insurance/InsuranceDashboard";
import { PageHeader } from "@/components/shell/PageHeader";
import { appConfig } from "@/lib/appConfig";
import { greetingFor, todayIso } from "@/lib/format/date";
import { loadInsuranceData } from "./loadInsuranceData";
import { ALL, attentionView, coverView, greetingView, pickIds, summarySentence } from "./views";
import { insuranceWidgets } from "./widgetsView";

export const metadata: Metadata = { title: "Insurance" };

/**
 * The Insurance page (docs/design/insurance.md, InsFinal): the greeting, whose figures point, the attention strip while a policy has
 * lapsed or renews within a month, then the cover map. `?policy=` picks a policy, and `?demo` shows sample data in development
 * (`?demo=soon`, `?demo=lapsed` and `?demo=empty` show the other states).
 */
export default async function InsurancePage({ searchParams }: PageProps<"/insurance">) {
  const params = await searchParams;
  const today = todayIso();
  const { demo, data, skipped } = await loadInsuranceData(params, today);
  const ids = pickIds(data);
  const requested = typeof params.policy === "string" ? params.policy : ALL;
  const initialPick = ids.includes(requested) ? requested : ALL;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader section="Insurance" title={`${greetingFor()}, ${appConfig.ownerName}`} actions={<RefreshButton iconOnly />}>
        <GreetingSentence parts={summarySentence(data, today)} cards={greetingView(data, today)} />
        {demo !== null && <p className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-bold text-accent-text">Sample data. Nothing here is from your Sheet.</p>}
        <SkippedRowsNotice tabs={skipped} />
      </PageHeader>
      {data.policies.length > 0 ? (
        <InsuranceDashboard cover={coverView(data, today)} widgets={insuranceWidgets(data, today, ids)} attention={attentionView(data, today)} initialPick={initialPick} />
      ) : (
        <section className="rounded-[26px] border border-dashed border-divider bg-surface px-6 py-14 text-center">
          <p className="text-base font-extrabold">No policies yet</p>
          <p className="mx-auto mt-1 max-w-[520px] text-sm font-semibold text-muted">Add a policy with its cover and the premium you paid, and this page shows what you&apos;re covered for, what it costs a year, and when each one renews.</p>
        </section>
      )}
    </div>
  );
}
