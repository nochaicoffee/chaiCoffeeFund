import type { Metadata } from "next";
import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { TradeButtons, TradeFormsProvider } from "@/components/investments/TradeForms";
import { TradeBook } from "@/components/investments/trades/TradeBook";
import { TradesList } from "@/components/investments/trades/TradesList";
import { PageHeader } from "@/components/shell/PageHeader";
import { holdingRows } from "@/lib/aggregate/investmentOverview";
import { tradeEntries } from "@/lib/aggregate/tradeHistory";
import { todayIso } from "@/lib/format/date";
import type { PricePoint } from "@/lib/prices/history";
import { getPriceSeries } from "@/lib/prices/series";
import { getCachedInstrumentsTab, getCachedInvestmentTransactionsTab } from "@/lib/sheets/cached";
import { readCash } from "../loadCash";
import { tradeFormsData } from "../tradeFormsData";
import { bookView, findHolding, holdingRefs, listSentence, tradesListView, type Part } from "./tradesView";

export const metadata: Metadata = { title: "Trades" };

/**
 * The Trades page (docs/design/investments.md, "The Trades page", picked T1 + T2): every trade, like Cards' Statements and Income's
 * Entries. With `?holding=NTAP` it's that holding's book: the shares held and the average cost after every trade. The forms are the
 * Investments page's. Prices are read only for the holdings' order (so the colours match the Investments page) and a share's price today.
 */
export default async function TradesPage({ searchParams }: PageProps<"/investments/trades">) {
  const params = await searchParams;
  const today = todayIso();
  const cashRead = readCash(today);
  const [tradesTab, instrumentsTab] = await Promise.all([getCachedInvestmentTransactionsTab(), getCachedInstrumentsTab()]);
  const closes = await getPriceSeries().catch(() => new Map<string, PricePoint[]>());
  const trades = tradesTab.records;
  const held = holdingRows({ trades, instruments: instrumentsTab.records, closes, today });
  const entries = tradeEntries(trades);
  const refs = holdingRefs(entries, instrumentsTab.records, held);
  const asked = typeof params.holding === "string" ? params.holding : undefined;
  const ref = findHolding(refs, asked);
  const book = ref ? bookView(trades, entries, ref, held.find((h) => h.market === ref.market && h.symbol === ref.symbol), today) : undefined;
  const skipped = [tradesTab.skipped, instrumentsTab.skipped].filter((t) => t.rows.length > 0);
  const cash = await cashRead;

  return (
    <TradeFormsProvider forms={tradeFormsData(trades, instrumentsTab.records, today, cash?.cash)}>
      <div className="flex flex-col gap-5">
        <PageHeader
          section="Investments"
          eyebrow={
            <Link href="/investments" className="inline-flex min-h-11 items-center gap-1.5 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent md:min-h-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="11 6 5 12 11 18" />
              </svg>
              Investments · Trades
            </Link>
          }
          title={book ? `Trades · ${book.ref.name}` : "Trades"}
          actions={
            <>
              <span className="max-md:hidden">
                <RefreshButton iconOnly />
              </span>
              <TradeButtons />
            </>
          }
        >
          <Sentence parts={book ? book.sentence : listSentence(entries)} />
          {asked && !ref && (
            <p role="status" className="w-fit rounded-full bg-warning-tint px-3 py-1 text-xs font-bold text-warning-text">
              That holding isn&apos;t in your trades any more, so every trade is shown.
            </p>
          )}
          <SkippedRowsNotice tabs={skipped} />
        </PageHeader>
        {book ? <TradeBook view={book} holdings={refs} /> : trades.length > 0 ? <TradesList view={tradesListView(entries, refs)} holdings={refs} /> : <NoTrades />}
      </div>
    </TradeFormsProvider>
  );
}

function Sentence({ parts }: { parts: Part[] }) {
  return (
    <p className="text-[15px] leading-relaxed font-medium text-muted">
      {parts.map((part, i) =>
        part.strong ? (
          <span key={i} className="font-bold whitespace-nowrap text-fg tabular-nums">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </p>
  );
}

/** No trades yet (design state A): the header's buttons add the first one. */
function NoTrades() {
  return (
    <section aria-label="No trades yet" className="rounded-[24px] border border-surface-line bg-surface p-8 text-center shadow-[var(--card-shadow)]">
      <p className="text-sm font-bold">Nothing here yet.</p>
      <p className="mt-1 text-[13px] font-semibold text-muted">Add a trade, record an RSU vest or an ESPP purchase with the buttons above, and every trade you make lists here by month.</p>
    </section>
  );
}
