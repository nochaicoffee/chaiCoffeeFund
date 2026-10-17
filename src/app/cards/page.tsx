import { createCard, createStatement, markStatementPaid } from "./actions";
import { RefreshButton } from "@/components/RefreshButton";
import { PageHeader } from "@/components/shell/PageHeader";
import { SyncStatementsButton } from "@/components/SyncStatementsButton";
import { StatTile } from "@/components/StatTile";
import { todayIso } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { computeCardSummaries } from "@/lib/aggregate/cards";
import { getCachedAccounts, getCachedCards, getCachedStatements } from "@/lib/sheets/cached";
import { CARD_COLORS, type Card } from "@/lib/sheets/types";
import type { Metadata } from "next";

function utilizationTone(utilization: number | null): "positive" | "neutral" | "negative" {
  if (utilization === null) return "neutral";
  if (utilization < 0.3) return "positive";
  if (utilization < 0.7) return "neutral";
  return "negative";
}

function cardLabel(card: Card): string {
  return `${card.name} (${card.alias})`;
}

export const metadata: Metadata = { title: "Cards" };

export default async function CardsPage() {
  const [cards, statements, accounts] = await Promise.all([
    getCachedCards(),
    getCachedStatements(),
    getCachedAccounts(),
  ]);

  const today = todayIso();
  const summaries = computeCardSummaries(cards, statements, today);
  const totalOutstanding = summaries.reduce((sum, s) => sum + s.outstandingBalance, 0);
  const totalLimit = cards.reduce((sum, c) => sum + c.creditLimit, 0);

  const sortedStatements = [...statements].sort((a, b) => b.statementDate.localeCompare(a.statementDate));
  const cardById = new Map(cards.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        section="Cards"
        title="Cards"
        actions={
          <>
            <RefreshButton />
            <SyncStatementsButton />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Total outstanding" value={formatInr(totalOutstanding)} tone="negative" />
        <StatTile label="Total credit limit" value={formatInr(totalLimit)} />
        <StatTile
          label="Overall utilization"
          value={totalLimit > 0 ? `${((totalOutstanding / totalLimit) * 100).toFixed(0)}%` : "—"}
          tone={utilizationTone(totalLimit > 0 ? totalOutstanding / totalLimit : null)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.length === 0 ? (
          <div className="text-sm text-foreground/50">No cards yet — add one below.</div>
        ) : (
          summaries.map(({ card, outstandingBalance, utilization, nextStatementDate }) => (
            <div key={card.id} className="rounded-lg border border-divider p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{card.name}</div>
                <span className="text-xs text-foreground/50">{card.status}</span>
              </div>
              <div className="text-xs text-foreground/60">
                {card.issuer} · {card.alias}
              </div>
              <div className="mt-3 text-sm">
                Outstanding <span className="font-semibold">{formatInr(outstandingBalance)}</span>{" "}
                <span className="text-foreground/50">/ {formatInr(card.creditLimit)}</span>
              </div>
              {utilization !== null && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-fill-strong">
                  <div
                    className={`h-full ${
                      utilizationTone(utilization) === "negative"
                        ? "bg-negative"
                        : utilizationTone(utilization) === "neutral"
                          ? "bg-warning"
                          : "bg-accent"
                    }`}
                    style={{ width: `${Math.min(utilization * 100, 100)}%` }}
                  />
                </div>
              )}
              <div className="mt-2 text-xs text-foreground/50">Next statement ~{nextStatementDate}</div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-lg border border-divider p-4">
        <div className="mb-2 text-sm font-medium">Statements</div>
        {sortedStatements.length === 0 ? (
          <div className="text-sm text-foreground/50">No statements yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-foreground/50">
                <tr>
                  <th className="py-1 pr-4">Card</th>
                  <th className="py-1 pr-4">Statement date</th>
                  <th className="py-1 pr-4">Due date</th>
                  <th className="py-1 pr-4">Total due</th>
                  <th className="py-1 pr-4">Min due</th>
                  <th className="py-1 pr-4">Status</th>
                  <th className="py-1 pr-4" />
                </tr>
              </thead>
              <tbody>
                {sortedStatements.map((statement) => {
                  const card = cardById.get(statement.cardId);
                  const dueSoon = statement.status === "Pending" && statement.dueDate <= today;
                  return (
                    <tr key={statement.id} className="border-t border-divider">
                      <td className="py-1.5 pr-4">{card ? card.name : statement.cardId}</td>
                      <td className="py-1.5 pr-4">{statement.statementDate}</td>
                      <td className={`py-1.5 pr-4 ${dueSoon ? "font-medium text-negative" : ""}`}>
                        {statement.dueDate}
                      </td>
                      <td className="py-1.5 pr-4">{formatInr(statement.totalAmountDue)}</td>
                      <td className="py-1.5 pr-4">{formatInr(statement.minimumAmountDue)}</td>
                      <td className="py-1.5 pr-4">{statement.status}</td>
                      <td className="py-1.5 pr-4">
                        {statement.status === "Pending" && (
                          <form action={markStatementPaid} className="flex items-center gap-1">
                            <input type="hidden" name="id" value={statement.id} />
                            <input
                              type="number"
                              step="0.01"
                              name="amountPaid"
                              defaultValue={statement.totalAmountDue}
                              className="w-24 rounded-md border border-divider px-1.5 py-0.5 text-xs"
                            />
                            <select
                              name="paidFromAccountId"
                              className="rounded-md border border-divider px-1.5 py-0.5 text-xs"
                              defaultValue=""
                            >
                              <option value="">From…</option>
                              {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="rounded-md border border-divider px-2 py-0.5 text-xs hover:bg-fill"
                            >
                              Mark paid
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-divider p-4">
          <div className="mb-3 text-sm font-medium">Add card</div>
          <form action={createCard} className="flex flex-col gap-2 text-sm">
            <input name="name" placeholder="Name" required className="rounded-md border border-divider px-2 py-1" />
            <input name="alias" placeholder="Alias" required className="rounded-md border border-divider px-2 py-1" />
            <input name="issuer" placeholder="Issuer" required className="rounded-md border border-divider px-2 py-1" />
            <input
              name="last4"
              placeholder="Last 4 digits"
              required
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              className="rounded-md border border-divider px-2 py-1"
            />
            <select name="color" required defaultValue="Sapphire" className="rounded-md border border-divider px-2 py-1">
              {CARD_COLORS.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
            <input
              name="statementPdfPassword"
              placeholder="Statement PDF password (optional)"
              autoComplete="off"
              className="rounded-md border border-divider px-2 py-1"
            />
            <input
              name="emailMatchKeywords"
              placeholder="Subject keywords, comma-separated (optional)"
              className="rounded-md border border-divider px-2 py-1"
            />
            <input
              name="creditLimit"
              type="number"
              step="0.01"
              placeholder="Credit limit"
              required
              className="rounded-md border border-divider px-2 py-1"
            />
            <label className="text-xs text-foreground/60">
              Statement anchor date
              <input
                name="statementAnchorDate"
                type="date"
                required
                className="mt-1 w-full rounded-md border border-divider px-2 py-1"
              />
            </label>
            <label className="text-xs text-foreground/60">
              Due anchor date
              <input
                name="dueAnchorDate"
                type="date"
                required
                className="mt-1 w-full rounded-md border border-divider px-2 py-1"
              />
            </label>
            <select name="status" required defaultValue="Active" className="rounded-md border border-divider px-2 py-1">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Closed">Closed</option>
            </select>
            <button
              type="submit"
              className="mt-1 rounded-md border border-divider px-3 py-1.5 hover:bg-fill"
            >
              Add card
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-divider p-4">
          <div className="mb-3 text-sm font-medium">Add statement</div>
          <form action={createStatement} className="flex flex-col gap-2 text-sm">
            <select name="cardId" required defaultValue="" className="rounded-md border border-divider px-2 py-1">
              <option value="" disabled>
                Select card…
              </option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {cardLabel(card)}
                </option>
              ))}
            </select>
            <label className="text-xs text-foreground/60">
              Statement date
              <input
                name="statementDate"
                type="date"
                required
                className="mt-1 w-full rounded-md border border-divider px-2 py-1"
              />
            </label>
            <label className="text-xs text-foreground/60">
              Due date
              <input
                name="dueDate"
                type="date"
                required
                className="mt-1 w-full rounded-md border border-divider px-2 py-1"
              />
            </label>
            <input
              name="totalAmountDue"
              type="number"
              step="0.01"
              placeholder="Total amount due"
              required
              className="rounded-md border border-divider px-2 py-1"
            />
            <input
              name="minimumAmountDue"
              type="number"
              step="0.01"
              placeholder="Minimum amount due"
              required
              className="rounded-md border border-divider px-2 py-1"
            />
            <button
              type="submit"
              className="mt-1 rounded-md border border-divider px-3 py-1.5 hover:bg-fill"
            >
              Add statement
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
