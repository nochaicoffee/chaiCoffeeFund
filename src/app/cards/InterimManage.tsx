import { createCard, createStatement, markStatementPaid } from "./actions";
import { SyncStatementsButton } from "@/components/SyncStatementsButton";
import { formatInr } from "@/lib/format/money";
import { CARD_COLORS, type Account, type Card, type Statement } from "@/lib/sheets/types";

function cardLabel(card: Card): string {
  return `${card.name} (${card.alias})`;
}

/**
 * The pre-design statements table and add forms, kept working below the new
 * dashboard until their designed replacements land: the Statements panel and
 * page (#48, #50) and the add/mark-paid dialogs (#51).
 */
export function InterimManage({
  cards,
  statements,
  accounts,
  today,
}: {
  cards: Card[];
  statements: Statement[];
  accounts: Account[];
  today: string;
}) {
  const sortedStatements = [...statements].sort((a, b) => b.statementDate.localeCompare(a.statementDate));
  const cardById = new Map(cards.map((c) => [c.id, c]));

  return (
    <section aria-labelledby="manage-heading" className="flex flex-col gap-4 border-t border-divider pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="manage-heading" className="text-sm font-bold tracking-[0.04em] text-muted uppercase">
          Manage
        </h2>
        <SyncStatementsButton />
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
          <div id="add-card" className="mb-3 scroll-mt-6 text-sm font-medium">Add card</div>
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
    </section>
  );
}
