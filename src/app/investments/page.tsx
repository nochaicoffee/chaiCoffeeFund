import type { Metadata } from "next";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { GreetingSentence } from "@/components/investments/GreetingSentence";
import { HoldingsTable } from "@/components/investments/HoldingsTable";
import { RecentTrades } from "@/components/investments/RecentTrades";
import { TradeButtons, TradeFormsProvider } from "@/components/investments/TradeForms";
import { RefreshPricesButton } from "@/components/investments/RefreshPricesButton";
import { Stage } from "@/components/investments/Stage";
import { ReturnsRow } from "@/components/investments/ReturnsRow";
import { PageHeader } from "@/components/shell/PageHeader";
import { investmentOverview } from "@/lib/aggregate/investmentOverview";
import { appConfig } from "@/lib/appConfig";
import { greetingFor, todayIso } from "@/lib/format/date";
import type { PricePoint } from "@/lib/prices/history";
import { getPriceSeries } from "@/lib/prices/series";
import { getCachedInstrumentsTab, getCachedInvestmentTransactionsTab } from "@/lib/sheets/cached";
import { tradeFormsData } from "./tradeFormsData";
import { greetingView, holdingsView, lensViews, pickerView, recentTradesView, returnsView, summarySentence } from "./views";

export const metadata: Metadata = { title: "Investments" };

/**
 * The Investments page (docs/design/investments.md, L1 Giant), first slice: the greeting whose figures point, the returns, the holdings
 * and the recent trades, on his real trades and the saved prices (ADR 0013). The stage, the lens, the split card and the forms come next
 * (docs/design/investments-build.md, epic C).
 */
export default async function InvestmentsPage() {
  const today = todayIso();
  const [tradesTab, instrumentsTab] = await Promise.all([getCachedInvestmentTransactionsTab(), getCachedInstrumentsTab()]);
  // The saved prices not reading must not take the page down: the holdings are then counted at cost, and the page says so (design state B).
  const prices = await getPriceSeries().then(
    (closes) => ({ closes, failed: false }),
    () => ({ closes: new Map<string, PricePoint[]>(), failed: true }),
  );
  const closes = prices.closes;
  const overview = investmentOverview({ trades: tradesTab.records, instruments: instrumentsTab.records, closes, today });
  const skipped = [tradesTab.skipped, instrumentsTab.skipped].filter((t) => t.rows.length > 0);

  return (
    <TradeFormsProvider forms={tradeFormsData(tradesTab.records, instrumentsTab.records, today)}>
    <div className="flex flex-col gap-6">
      <PageHeader
        section="Investments"
        title={`${greetingFor()}, ${appConfig.ownerName}`}
        actions={
          <>
            <RefreshButton iconOnly />
            <TradeButtons />
            <RefreshPricesButton />
          </>
        }
      >
        <GreetingSentence parts={summarySentence(overview)} cards={greetingView(overview)} />
        {prices.failed && (
          <p role="alert" className="text-[13px] font-semibold text-negative">
            The saved prices couldn&apos;t be read, so every holding is counted at what it cost. Your trades are unchanged. Try Refresh prices.
          </p>
        )}
        <SkippedRowsNotice tabs={skipped} />
      </PageHeader>
      <Stage series={overview.series} lenses={lensViews(overview)} picks={pickerView(overview)} holdingCount={overview.holdings.length} />
      <ReturnsRow cards={returnsView(overview)} />
      {overview.holdings.length > 0 && <HoldingsTable rows={holdingsView(overview)} />}
      <RecentTrades rows={recentTradesView(tradesTab.records, instrumentsTab.records)} />
    </div>
    </TradeFormsProvider>
  );
}
