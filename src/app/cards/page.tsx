import type { Metadata } from "next";
import Link from "next/link";
import { InterimManage } from "./InterimManage";
import { cardsQuery, parsePanel, parsePeriod, parseSelectedCard, periodYears } from "./params";
import { summarySentence } from "./summarySentence";
import { RefreshButton } from "@/components/RefreshButton";
import { AddCardTile, CardTile } from "@/components/cards/CardTile";
import { DetailsCard } from "@/components/cards/DetailsCard";
import { StatementsPanel } from "@/components/cards/StatementsPanel";
import { SpendHeatmap } from "@/components/cards/SpendHeatmap";
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
  type CardData,
} from "@/lib/aggregate/cardSpend";
import { demoCardData, isDemoAllowed } from "@/lib/demo/cardsDemo";
import { formatShortDate, greetingFor, todayIso } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { getCachedAccounts, getCachedCards, getCachedStatements } from "@/lib/sheets/cached";

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
  const demo = isDemoAllowed() && params.demo !== undefined;
  const [data, accounts]: [CardData, Awaited<ReturnType<typeof getCachedAccounts>>] = demo
    ? [demoCardData(today), []]
    : await Promise.all([
        Promise.all([getCachedCards(), getCachedStatements()]).then(([cards, statements]) => ({ cards, statements })),
        getCachedAccounts(),
      ]);

  const period = parsePeriod(params, today);
  const currentYear = Number(today.slice(0, 4));
  const cardId = parseSelectedCard(params, data);
  const selectedCard = data.cards.find((c) => c.id === cardId);
  const panel = parsePanel(params);
  const linkFor = (id?: string) => cardsQuery({ period, cardId: id, panel, demo }, today);
  const panelHref = (view: "statements" | "range") => cardsQuery({ period, cardId, panel: view, demo }, today);

  const summary = spendSummary(data, period, today, cardId);
  const pending = pendingSummary(data, today, cardId);
  const allCards = allCardsUtilization(data);
  const allPending = pendingSummary(data, today);

  const tiles = tileCards(data, today);
  const heatRows = heatmapRows(data, period, today, cardId);
  const yearTotals = heatmapYearTotals(data, heatRows, today, cardId);
  const cardsById = new Map(data.cards.map((c) => [c.id, c]));
  const periodLabel = period.kind === "all" ? "all time" : period.year === currentYear ? "this year" : String(period.year);
  // Sample data never reaches the real forms, so it can't write to the Sheet.
  const addCardHref = demo ? "/cards#add-card" : "#add-card";

  return (
    <div className="flex flex-col gap-6">
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
            <Link
              href={addCardHref}
              className="flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:min-h-0"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add card
            </Link>
          </>
        }
      >
        <p className="max-w-[960px] text-base leading-[1.7] font-medium text-muted">
          {summarySentence({ summary, pending, period, today, cardName: selectedCard?.name }).map((part, i) =>
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
      </PageHeader>

      <div
        role="list"
        aria-label="Cards"
        className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pt-3 pb-4 md:-mx-[26px] md:scroll-px-[26px] md:px-[26px]"
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
        {tiles.map(({ card, outstanding, utilization, nextDue, nextStatementDate }) => (
          <div role="listitem" key={card.id}>
            <CardTile
              href={linkFor(card.id)}
              selected={card.id === cardId}
              variant="card"
              title={card.name}
              corner={card.issuer}
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
        ))}
        <div role="listitem">
          <AddCardTile href={addCardHref} />
        </div>
      </div>

      <SpendHeatmap
        title={selectedCard?.name ?? "All Cards"}
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
          viewAllHref={demo ? undefined : "#manage-heading"}
        />
      </div>

      {!demo && <InterimManage cards={data.cards} statements={data.statements} accounts={accounts} today={today} />}
    </div>
  );
}
