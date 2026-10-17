import { createCard, createStatement } from "./actions";
import { SyncStatementsButton } from "@/components/SyncStatementsButton";
import { CARD_COLORS, type Card } from "@/lib/sheets/types";

function cardLabel(card: Card): string {
  return `${card.name} (${card.alias})`;
}

/**
 * The pre-design add card and add statement forms and the sync button, kept
 * working below the new dashboard until the designed forms (#51) and sync
 * report (#54) replace them. Statements are listed and marked paid on the
 * Statements page (#50).
 */
export function InterimManage({ cards }: { cards: Card[] }) {
  return (
    <section aria-labelledby="manage-heading" className="flex flex-col gap-4 border-t border-divider pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="manage-heading" className="text-sm font-bold tracking-[0.04em] text-muted uppercase">
          Manage
        </h2>
        <SyncStatementsButton />
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
          <div id="add-statement" className="mb-3 scroll-mt-6 text-sm font-medium">Add statement</div>
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
