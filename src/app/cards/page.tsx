import type { Metadata } from "next";
import { loadCardData } from "./loadCardData";
import { cardsQuery, parsePanel, parsePeriod, parseSelectedCard, parseShowClosed, periodYears, statementsQuery } from "./params";
import { summarySentence } from "./summarySentence";
import { RefreshButton } from "@/components/RefreshButton";
import { SyncStatementsButton } from "@/components/SyncStatementsButton";
import { SyncProvider } from "@/components/sync/SyncContext";
import { SyncReportPanel } from "@/components/sync/SyncReportPanel";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { CardTile, ClosedCardsTile } from "@/components/cards/CardTile";
import { AddCardButton, AddStatementButton, EditCardButton } from "@/components/cards/forms/FormButtons";
import { DetailsCard } from "@/components/cards/DetailsCard";
import { StatementsPanel } from "@/components/cards/StatementsPanel";
import { SpendHeatmap } from "@/components/cards/SpendHeatmap";
import { TrendChart } from "@/components/cards/TrendChart";
import { PeriodSelect } from "@/components/cards/PeriodSelect";
import { PageHeader } from "@/components/shell/PageHeader";
import { appConfig } from "@/lib/appConfig";
import {
  allCardsUtilization,
  cardDetails,
  heatmapPeak,
  heatmapRows,
  heatmapYearTotals,
  monthOf,
  pendingSummary,
  recentStatements,
  spendRange,
  spendSummary,
  statementCounts,
  statementYears,
  tileCards,
  closedCardTiles,
  type CardTileData,
} from "@/lib/aggregate/cardSpend";
import { trendPoints } from "@/lib/aggregate/cardTrend";
import { formatShortDate, greetingFor, todayIso } from "@/lib/format/date";
import { cardName, optionLabel } from "@/lib/format/labels";
import { toClientCard } from "@/lib/forms/clientCard";
import { formatInr } from "@/lib/format/money";

export const metadata: Metadata = { title: "Cards" };

/** "32.1%", or "0%" rather than "0.0%" for a whole number. */
function percent(value: number | null, digits: number): string | null {
  return value === null ? null : `${(value * 100).toFixed(digits).replace(/\.0+$/, "")}%`;
}

function dueLabel(dueDate: string, daysUntilDue: number): string {
  if (daysUntilDue < 0) return `Overdue · ${formatShortDate(dueDate)}`;
  if (daysUntilDue === 0) return "Due today";
  return `Due ${formatShortDate(dueDate)} · ${daysUntilDue}d`;
}

export default async function CardsPage({ searchParams }: PageProps<"/cards">) {
  const params = await searchParams;
  const today = todayIso();
  const { demo, data, accounts, skipped } = await loadCardData(params, today);

  const period = parsePeriod(params, today);
  const currentYear = Number(today.slice(0, 4));
  const cardId = parseSelectedCard(params, data);
  const selectedCard = data.cards.find((c) => c.id === cardId);
  const panel = parsePanel(params);
  // Closed cards with nothing left to pay fold away at the end of the row; a selected one keeps them open.
  const closedTiles = closedCardTiles(data, today);
  const closedOpen = parseShowClosed(params) || closedTiles.some((t) => t.card.id === cardId);
  const linkFor = (id?: string) => cardsQuery({ period, cardId: id, panel, showClosed: closedOpen, demo }, today);
  const panelHref = (view: "statements" | "range") => cardsQuery({ period, cardId, panel: view, showClosed: closedOpen, demo }, today);
  // Folding them away also lets go of a selected closed card, which would otherwise keep them open.
  const closedToggleHref = closedOpen
    ? cardsQuery({ period, cardId: closedTiles.some((t) => t.card.id === cardId) ? undefined : cardId, panel, demo }, today)
    : cardsQuery({ period, cardId, panel, showClosed: true, demo }, today);

  const summary = spendSummary(data, period, today, cardId);
  const pending = pendingSummary(data, today, cardId);
  const allCards = allCardsUtilization(data);
  const allPending = pendingSummary(data, today);

  const tiles = tileCards(data, today);
  const heatRows = heatmapRows(data, period, today, cardId);
  const yearTotals = heatmapYearTotals(data, heatRows, today, cardId);
  const cardsById = new Map(data.cards.map((c) => [c.id, c]));
  const periodLabel = period.kind === "all" ? "all time" : period.year === currentYear ? "this year" : String(period.year);
  // Sample data never reaches the Sheet: the form buttons show disabled.
  const disabledReason = demo ? "Sample data can't be changed" : undefined;
  const clientCards = data.cards.map(toClientCard);
  const accountOptions = accounts.filter((a) => a.status === "Active").map((a) => ({ id: a.id, name: a.name }));
  const usedColors = data.cards.flatMap((c) => (c.color ? [c.color] : []));

  const cardTile = ({ card, outstanding, utilization, nextDue, nextStatementDate }: CardTileData) => (
    <div role="listitem" key={card.id}>
      <CardTile
        dimmed={card.status === "Closed" && outstanding === 0}
        href={linkFor(card.id)}
        selected={card.id === cardId}
        variant="card"
        title={cardName(card)}
        corner={optionLabel(card.issuer)}
        color={card.color}
        last4={card.last4}
        balance={`${formatInr(outstanding)} / ${formatInr(card.creditLimit)}`}
        utilizationLabel={percent(utilization, 1)}
        utilization={utilization ?? 0}
        pill={nextDue ? dueLabel(nextDue.statement.dueDate, nextDue.daysUntilDue) : undefined}
        footnote={
          nextDue
            ? `Min ${formatInr(nextDue.statement.minimumAmountDue)}`
            : card.status === "Active"
              ? `Next statement ${formatShortDate(nextStatementDate)}`
              : card.status
        }
      />
    </div>
  );

  // For the sync report, which names cards by their short name.
  const syncCardNames = Object.fromEntries(data.cards.map((c) => [c.id, cardName(c)]));

  return (
    <div className="flex flex-col gap-6">
      <SyncProvider cardNames={syncCardNames}>
        <PageHeader
          section="Cards"
          title={`${greetingFor()}, ${appConfig.ownerName}`}
          actions={
            <>
              <PeriodSelect
                years={periodYears(statementYears(data, today), period)}
                currentYear={currentYear}
                value={period.kind === "all" ? "all" : String(period.year)}
              />
              <RefreshButton iconOnly />
              {!demo && <SyncStatementsButton />}
              <AddStatementButton cards={clientCards} statements={data.statements} today={today} initialCardId={cardId} disabledReason={disabledReason} variant="ghost" />
              <AddCardButton accounts={accountOptions} usedColors={usedColors} disabledReason={disabledReason} variant="header" />
            </>
          }
        >
          <p className="max-w-[960px] text-base leading-[1.7] font-medium text-muted">
            {summarySentence({ summary, pending, period, today, cardName: selectedCard && cardName(selectedCard) }).map((part, i) =>
              part.strong ? (
                <span key={i} className="font-bold whitespace-nowrap text-fg tabular-nums">
                  {part.text}
                </span>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </p>
          {demo && (
            <p className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-bold text-accent-text">
              Sample data. Nothing here is from your Sheet.
            </p>
          )}
          {!demo && <SyncReportPanel />}
          <SkippedRowsNotice tabs={skipped} />
        </PageHeader>
      </SyncProvider>

      {/* Scrolls sideways by trackpad, touch, shift-scroll or keyboard (a focused tile scrolls into view), with no scrollbar drawn under it. */}
      <div
        role="list"
        aria-label="Cards"
        className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pt-3 pb-4 [scrollbar-width:none] md:-mx-[26px] md:scroll-px-[26px] md:px-[26px] [&::-webkit-scrollbar]:hidden"
      >
        <div role="listitem">
          <CardTile
            href={linkFor(undefined)}
            selected={cardId === undefined}
            variant="all"
            title="All Cards"
            corner={`${tiles.length} ${tiles.length === 1 ? "card" : "cards"}`}
            balance={`${formatInr(allCards.activeOutstanding)} / ${formatInr(allCards.limit)}`}
            utilizationLabel={percent(allCards.utilization, 0)}
            utilization={allCards.utilization ?? 0}
            pill={allPending.count > 0 ? `${allPending.count} pending` : undefined}
            footnote={allPending.nextDueDate ? `Next ${formatShortDate(allPending.nextDueDate)}` : "Nothing due"}
          />
        </div>
        {tiles.map(cardTile)}
        {closedTiles.length > 0 && (
          <div role="listitem">
            <ClosedCardsTile href={closedToggleHref} colors={closedTiles.map((t) => t.card.color)} open={closedOpen} />
          </div>
        )}
        {closedOpen && closedTiles.map(cardTile)}
        <div role="listitem">
          <AddCardButton accounts={accountOptions} usedColors={usedColors} disabledReason={disabledReason} variant="tile" />
        </div>
      </div>

      <SpendHeatmap
        title={selectedCard ? cardName(selectedCard) : "All Cards"}
        rows={heatRows}
        yearTotals={yearTotals}
        peak={heatmapPeak(heatRows)}
        currentMonth={monthOf(today)}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,620px)_minmax(0,1fr)]">
        <DetailsCard
          details={cardDetails(data, period, today, cardId)}
          card={selectedCard}
          cardsById={cardsById}
          cardCount={tiles.length}
          periodLabel={periodLabel}
          singleYear={period.kind === "year"}
          action={
            selectedCard && (
              <EditCardButton card={toClientCard(selectedCard)} accounts={accountOptions} usedColors={usedColors} disabledReason={disabledReason} />
            )
          }
        />
        <StatementsPanel
          view={panel}
          hrefFor={panelHref}
          statements={recentStatements(data, period, 5, cardId)}
          cardsById={cardsById}
          today={today}
          counts={statementCounts(data, period, cardId)}
          periodLabel={periodLabel}
          range={spendRange(data, period, today, cardId)}
          viewAllHref={`/cards/statements${statementsQuery({ period, cardId, demo }, today)}`}
        />
      </div>

      <TrendChart
        points={trendPoints(data, today, period, cardId)}
        cards={(selectedCard ? [selectedCard] : data.cards).map((c) => ({ id: c.id, name: cardName(c), color: c.color }))}
        currentMonth={monthOf(today)}
      />

    </div>
  );
}
