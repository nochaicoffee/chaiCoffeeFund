"use client";

import Link from "next/link";
import type { HistoryTableRow, PickView } from "@/app/accounts/views";
import { Mono } from "../subscriptions/parts";
import { useAccountForms } from "./forms/AccountForms";
import { NeedsAttentionChip } from "./NeedsAttentionChip";

/**
 * Balance history (docs/design/accounts.md), laid out as Cards' Statements and Subscriptions'
 * Payments are: a title with what it covers, a header row, six rows divided by hairlines, a
 * line saying how many of how many, and the link to the whole list. Newest first, each with
 * what it changed from the one before and where the balance came from; for All, every
 * account's readings with the account's mark. A row's Edit opens the balance form.
 *
 * Beside the Where it sits map, so, as Payments does, it keeps one height whatever's picked:
 * room for six rows in either view, and the line under them. Otherwise the map moved its
 * blocks on every pick.
 */

const ROWS = 6;

function Source({ row }: { row: HistoryTableRow }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${row.fromStatement ? "bg-accent-tint text-accent-text" : "bg-fill text-muted"}`}>{row.sourceText}</span>;
}

const ALL_COLUMNS = "md:grid-cols-[1.5fr_1.1fr_1fr_0.9fr_1fr_40px]";
const ONE_COLUMNS = "md:grid-cols-[1fr_1.2fr_1.2fr_1.2fr_0.9fr_40px]";

/** Six rows as tall as real ones, laid out unseen under the table to hold its height. */
const SPACER: HistoryTableRow[] = Array.from({ length: ROWS }, (_, i) => ({
  id: `spacer-${i}`,
  accountId: "",
  accountName: "—",
  date: "",
  dateText: "—",
  balanceText: "—",
  balance: 0,
  changeText: "—",
  changeTone: null,
  gapText: null,
  gapDays: null,
  accountInitial: "—",
  accountColor: "onyx",
  accountClosed: false,
  sourceText: "By hand",
}));

function Table({ rows, all, onEdit, spacer = false }: { rows: HistoryTableRow[]; all: boolean; onEdit?: (row: HistoryTableRow) => void; spacer?: boolean }) {
  const columns = all ? ALL_COLUMNS : ONE_COLUMNS;
  const heads = all ? ["Account", "Read on", "Balance", "Change", "Source"] : ["Read on", "Balance", "Change", "After the one before", "Source"];
  return (
    <div role="table" aria-label="Balance history">
      <div role="row" className={`hidden text-[10px] font-bold tracking-[0.03em] text-muted uppercase md:grid ${columns}`}>
        {heads.map((h, i) => (
          <span role="columnheader" key={h} className={i === heads.length - 1 ? "text-right" : ""}>
            {h}
          </span>
        ))}
        <span role="columnheader" className="sr-only">
          Edit
        </span>
      </div>
      {rows.map((r) => (
        <div role="row" key={r.id} className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 border-b border-divider py-[9px] text-[13px] hover:bg-fill motion-safe:transition-colors motion-safe:duration-200 md:gap-x-0 md:py-[11px] ${columns}`}>
          {all && (
            <span role="cell" className="flex min-w-0 items-center gap-2.5">
              <Mono mark={{ alias: r.accountName, initial: r.accountInitial, color: r.accountColor, muted: r.accountClosed }} size={24} />
              <b className="truncate font-bold">{r.accountName}</b>
            </span>
          )}
          <span role="cell" className={`font-semibold whitespace-nowrap ${all ? "text-muted md:text-fg" : ""}`}>
            {r.dateText}
          </span>
          <b role="cell" className="text-right font-extrabold tabular-nums md:text-left">
            {r.balanceText}
          </b>
          <span role="cell" className={`text-xs font-bold whitespace-nowrap max-md:hidden ${r.changeTone === "up" ? "text-positive" : r.changeTone === "down" ? "text-negative" : "text-muted"}`}>
            {r.changeText}
          </span>
          {!all && (
            <span role="cell" className="truncate text-xs font-semibold text-muted max-md:hidden">
              {r.gapDays === null ? "—" : `${r.gapDays} day${r.gapDays === 1 ? "" : "s"}`}
            </span>
          )}
          <span role="cell" className="flex items-center justify-end gap-2 max-md:hidden">
            {/* A balance a statement disagreed with says so in place of where it came from. */}
            {r.attention && !spacer ? <NeedsAttentionChip item={r.attention} /> : <Source row={r} />}
          </span>
          <span role="cell" className="text-right max-md:hidden">
            {onEdit && (
              <button type="button" onClick={() => onEdit(r)} aria-label={`Edit the ${r.dateText} balance`} className="rounded-full px-2 py-1 text-[11px] font-bold text-muted hover:bg-fill-strong hover:text-fg focus-visible:outline-2 focus-visible:outline-accent">
                Edit
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export function HistoryCard({ pick, rows, href, hasAll, onAll }: { pick: PickView; rows: HistoryTableRow[]; href: string; hasAll: boolean; onAll: () => void }) {
  const { open, disabledReason } = useAccountForms();
  const all = pick.kind === "all";
  const shown = rows.slice(0, ROWS);
  return (
    <section aria-labelledby="history-title" className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-surface-line bg-surface p-4 shadow-[var(--card-shadow)] md:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-3 xl:flex-nowrap">
        <h2 id="history-title" className="flex min-w-0 items-center gap-2.5 text-[15px] font-extrabold text-fg">
          Balance history <span className="font-semibold text-muted">·</span>
          {all ? (
            "Every account"
          ) : (
            <span className="inline-flex min-w-0 items-center gap-2">
              <Mono mark={{ alias: pick.name, initial: pick.initial, color: pick.colorKey, muted: pick.closed }} size={22} />
              <span className="truncate">{pick.name}</span>
            </span>
          )}
        </h2>
      </div>

      <div className="flex flex-1 flex-col">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-[13px] font-medium text-muted">{all ? "No balances recorded yet." : "No balances yet. Add its first balance and it shows here."}</p>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] *:[grid-area:1/1]">
            <div aria-hidden="true" inert className="invisible max-xl:hidden">
              <Table rows={SPACER} all={all} spacer />
            </div>
            <div>
              <Table rows={shown} all={all} onEdit={disabledReason ? undefined : (row) => open({ kind: "edit-balance", row })} />
            </div>
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3">
          {rows.length > 0 && <p className="text-xs font-medium text-muted">{rows.length > ROWS ? `The ${ROWS} most recent of ${rows.length}` : `All ${rows.length} balance${rows.length === 1 ? "" : "s"}`}</p>}
          {rows.length > 0 && (
            <Link
              href={href}
              className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-[5px] text-[13px] font-bold whitespace-nowrap text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent md:min-h-0"
            >
              View all balances
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="13 6 19 12 13 18" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {/* Always there when there's an All, as tall as the button, so picking one doesn't change the card's height. */}
      {hasAll && (
        <div className="flex min-h-7 items-center gap-2 max-md:hidden">
          {all ? (
            <span className="text-xs font-medium text-muted">Pick a block in the map for one account&apos;s balances</span>
          ) : (
            <>
              <button type="button" onClick={onAll} className="inline-flex items-center gap-1.5 rounded-full bg-fill px-3 py-1.5 text-xs font-bold whitespace-nowrap text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
                All accounts
              </button>
              <span className="text-xs font-medium text-muted">or pick a block in the map</span>
            </>
          )}
        </div>
      )}
    </section>
  );
}
