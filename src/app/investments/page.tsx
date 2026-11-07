import type { Metadata } from "next";
import { AsOfProvider } from "@/components/investments/AsOf";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { CashCard } from "@/components/investments/CashCard";
import { GreetingSentence } from "@/components/investments/GreetingSentence";
import { HoldingsTable } from "@/components/investments/HoldingsTable";
import { MoneyIn } from "@/components/investments/MoneyIn";
import { RecentTrades } from "@/components/investments/RecentTrades";
import { SameMoney } from "@/components/investments/SameMoney";
import { TradeButtons, TradeFormsProvider } from "@/components/investments/TradeForms";
import { RefreshPricesButton } from "@/components/investments/RefreshPricesButton";
import { Stage } from "@/components/investments/Stage";
import { ConcentrationCard } from "@/components/investments/ConcentrationCard";
import { GainCard } from "@/components/investments/GainCard";
import { GrowthCard } from "@/components/investments/GrowthCard";
import { SplitCard } from "@/components/investments/SplitCard";
import { WeightCard } from "@/components/investments/WeightCard";
import { WhatIfCard } from "@/components/investments/WhatIfCard";
import { ReturnsRow } from "@/components/investments/ReturnsRow";
import { PageHeader } from "@/components/shell/PageHeader";
import { investmentOverview } from "@/lib/aggregate/investmentOverview";
import { appConfig } from "@/lib/appConfig";
import { greetingFor, todayIso } from "@/lib/format/date";
import type { PricePoint } from "@/lib/prices/history";
import { getPriceSeries } from "@/lib/prices/series";
import { getCachedInstrumentsTab, getCachedInvestmentTransactionsTab } from "@/lib/sheets/cached";
import { asOfViews } from "./asOfViews";
import { cashFrom, readCash } from "./loadCash";
import { growthView, whatIfView } from "./scenarioViews";
import { splitView } from "./splitView";
import { tradeFormsData } from "./tradeFormsData";
import { concentrationView, gainView, weightView } from "./understandViews";
import { greetingView, holdingsView, lensReturnsView, lensViews, moneyInView, pickerView, recentTradesView, returnsView, sameMoneyView, summarySentence } from "./views";

export const metadata: Metadata = { title: "Investments" };

/**
 * The Investments page (docs/design/investments.md, L1 Giant), first slice: the greeting whose figures point, the returns, the holdings
 * and the recent trades, on his real trades and the saved prices (ADR 0013). The stage, the lens, the split card and the forms come next
 * (docs/design/investments-build.md, epic C).
 */
export default async function InvestmentsPage() {
  const today = todayIso();
  // The cash at his brokers is read beside the holdings (it needs nothing from them) and counted outside their worth (F-IV-18).
  const cashRead = readCash(today);
  const [tradesTab, instrumentsTab] = await Promise.all([getCachedInvestmentTransactionsTab(), getCachedInstrumentsTab()]);
  // The saved prices not reading must not take the page down: the holdings are then counted at cost, and the page says so (design state B).
  const prices = await getPriceSeries().then(
    (closes) => ({ closes, failed: false }),
    () => ({ closes: new Map<string, PricePoint[]>(), failed: true }),
  );
  const closes = prices.closes;
  const overviewInput = { trades: tradesTab.records, instruments: instrumentsTab.records, closes, today };
  const overview = investmentOverview(overviewInput);
  // The Returns row and the holdings table as they stood on each day the stage can go back to.
  const asOf = asOfViews(overviewInput, overview);
  const cashData = await cashRead;
  const cash = cashFrom(cashData, overview.valueInr, today);
  const skipped = [tradesTab.skipped, instrumentsTab.skipped].filter((t) => t.rows.length > 0);

  const split = splitView(overview);
  const weight = weightView(overview);
  const gain = gainView(overview);
  const whatIf = whatIfView(overview);
  const growth = growthView(overview);
  const concentrated = concentrationView(overview);

  return (
    <TradeFormsProvider forms={tradeFormsData(tradesTab.records, instrumentsTab.records, today, cashData?.cash)}>
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
        <GreetingSentence parts={summarySentence(overview, cash)} cards={greetingView(overview, cash)} />
        {prices.failed && (
          <p role="alert" className="text-[13px] font-semibold text-negative">
            The saved prices couldn&apos;t be read, so every holding is counted at what it cost. Your trades are unchanged. Try Refresh prices.
          </p>
        )}
        <SkippedRowsNotice tabs={skipped} />
      </PageHeader>
      <AsOfProvider>
      <Stage series={overview.series} race={overview.race} lenses={lensViews(overview)} picks={pickerView(overview)} holdingCount={overview.holdings.length} />
      <ReturnsRow cards={returnsView(overview)} asOf={asOf} holdings={lensReturnsView(overview)} />
      {overview.holdings.length > 0 && <HoldingsTable rows={holdingsView(overview)} asOf={asOf} />}
      </AsOfProvider>
      {cash && <CashCard view={cash} />}
      <MoneyAndSame money={moneyInView(tradesTab.records, instrumentsTab.records, today)} same={sameMoneyView(overview)} />
      {(split || weight || gain || whatIf || growth || concentrated) && (
        <section aria-label="Understand it" className="flex flex-col gap-3">
          <h2 className="px-1 text-base font-extrabold">
            Understand it
            <small className="ml-2 text-xs font-semibold text-muted">how it&apos;s split, where the weight sits, how it would move: arithmetic on your holdings, never a suggestion</small>
          </h2>
          {split && <SplitCard dimensions={split.dimensions} />}
          {(weight || gain) && (
            <div className={`grid items-stretch gap-6 ${weight && gain ? "lg:grid-cols-2" : ""}`}>
              {weight && <WeightCard view={weight} />}
              {gain && <GainCard view={gain} />}
            </div>
          )}
          {whatIf && <WhatIfCard view={whatIf} />}
          {concentrated && <ConcentrationCard view={concentrated} />}
          {growth && <GrowthCard view={growth} />}
        </section>
      )}
      <RecentTrades rows={recentTradesView(tradesTab.records, instrumentsTab.records)} />
    </div>
    </TradeFormsProvider>
  );
}

/** Money in beside the same money somewhere else, as the design sets them (two halves); either alone takes the whole row. */
function MoneyAndSame({ money, same }: { money: ReturnType<typeof moneyInView>; same: ReturnType<typeof sameMoneyView> }) {
  if (!money && same.length === 0) return null;
  return (
    <div className={`grid items-stretch gap-6 ${money && same.length > 0 ? "lg:grid-cols-2" : ""}`}>
      {money && <MoneyIn view={money} />}
      <SameMoney rows={same} />
    </div>
  );
}
