import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { periodParam } from "@/lib/aggregate/period";
import type { HistoryState } from "@/app/accounts/history/params";
import type { HistoryPageView, HistoryRowView } from "@/app/accounts/history/views";
import { colorGradient } from "@/lib/format/subscriptionLabels";
import { LinkSelect } from "../../subscriptions/LinkSelect";
import { UpdateBalancesButton } from "../forms/AccountForms";
import { NeedsAttentionChip } from "../NeedsAttentionChip";
import { HistoryRowMenu } from "./HistoryRowMenu";

const SELECT = "flex h-10 max-w-full cursor-pointer items-center gap-2 rounded-full bg-fill px-3 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent aria-expanded:bg-fill-strong md:h-[34px]";
/** Name and date, the pill, the balance with its change, then ⋯ (from 1024px); narrower, a row is the phone's two lines. */
const COLUMNS = "lg:grid-cols-[minmax(0,1fr)_150px_170px_36px]";

const Chevron = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const Arrow = ({ up }: { up: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points={up ? "5 12 12 5 19 12" : "5 12 12 19 19 12"} />
  </svg>
);

function Change({ row }: { row: HistoryRowView }) {
  if (!row.changeTone) return <span className="text-[11px] font-semibold text-muted">{row.changeText}</span>;
  return (
    <span className={`inline-flex items-center gap-[3px] text-[11px] font-bold whitespace-nowrap ${row.changeTone === "up" ? "text-positive" : "text-negative"}`}>
      <Arrow up={row.changeTone === "up"} />
      {row.changeText.replace(/^[+−]/, "")}
    </span>
  );
}

function Mono({ row, size }: { row: HistoryRowView; size: number }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-extrabold text-on-card shadow-[inset_0_1px_0_oklch(1_0_0/0.18),0_2px_6px_oklch(0_0_0/0.18)] ${row.closed ? "opacity-60 grayscale" : ""}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), fontSize: Math.round(size * 0.44), background: colorGradient(row.colorKey) }}
    >
      {row.initial}
    </span>
  );
}

function Pill({ pill }: { pill: NonNullable<HistoryRowView["pill"]> }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${pill === "First balance" ? "bg-accent-tint text-accent-text" : "bg-fill text-muted"}`}>{pill}</span>;
}

function Row({ row }: { row: HistoryRowView }) {
  return (
    <div role="row" className={`grid items-center gap-x-3.5 border-b border-divider py-[11px] text-[13px] tabular-nums ${COLUMNS} grid-cols-[minmax(0,1fr)_auto_36px] ${row.closed ? "opacity-80" : ""}`}>
      <div role="cell" className="flex min-w-0 items-center gap-3">
        <Mono row={row} size={38} />
        <div className="min-w-0">
          <b className="block truncate text-[13px] font-extrabold">{row.name}</b>
          <span className="block truncate text-[11px] font-semibold text-muted">
            {row.dateText}
            {row.gapText ? ` · ${row.gapText}` : ""}
            {row.row.fromStatement ? " · from a statement" : ""}
            {row.pill && <span className="lg:hidden">{` · ${row.pill}`}</span>}
          </span>
          {row.row.attention && (
            <span className="mt-1 block lg:hidden">
              <NeedsAttentionChip item={row.row.attention} />
            </span>
          )}
        </div>
      </div>
      <div role="cell" className="flex flex-wrap items-center gap-1.5 max-lg:hidden">
        {row.pill && <Pill pill={row.pill} />}
        {row.row.attention && <NeedsAttentionChip item={row.row.attention} />}
      </div>
      <div role="cell" className="text-right">
        <b className="block text-sm font-extrabold">{row.balanceText}</b>
        <Change row={row} />
      </div>
      <div role="cell" className="flex justify-end">
        <HistoryRowMenu row={row} />
      </div>
    </div>
  );
}

function PageLink({ href, label, disabled, children }: { href: string; label: string; disabled: boolean; children: ReactNode }) {
  const className = "flex size-11 items-center justify-center rounded-full border border-surface-line bg-surface text-base shadow-soft lg:size-9";
  if (disabled)
    return (
      <span className={`${className} opacity-50`} aria-hidden="true">
        {children}
      </span>
    );
  return (
    <Link href={href} scroll={false} aria-label={label} className={`${className} text-fg hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent`}>
      {children}
    </Link>
  );
}

/**
 * The Balance history list (#177, layout H1 in docs/design/accounts.md): the status filter with its
 * counts, the account and purpose dropdowns, search and sort, then the rows grouped by month and
 * a pager. Every choice is a link (or the search form), so the address holds the whole view and
 * the server sends back the page; nothing here needs state.
 */
export function HistoryList({ view, state, hrefFor, accountsHref, today }: { view: HistoryPageView; state: HistoryState; hrefFor: (changes: Partial<HistoryState>) => string; accountsHref: string; today: string }) {
  const accountHrefs = Object.fromEntries(view.accounts.map((o) => [o.value, hrefFor({ accountId: o.value || undefined })]));
  const purposeHrefs = Object.fromEntries(view.purposes.map((o) => [o.value, hrefFor({ purpose: (o.value || undefined) as HistoryState["purpose"] })]));
  const nextSort = state.sort === "newest" ? "oldest" : state.sort === "oldest" ? "biggest" : "newest";
  const sortLabel = { newest: "Newest first", oldest: "Oldest first", biggest: "Biggest move" }[state.sort];
  const rows = view.groups.some((g) => g.rows.length > 0);

  return (
    <section aria-label="Balances" className="flex flex-col gap-3 rounded-[24px] border border-surface-line bg-surface p-4 shadow-soft md:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-3 max-lg:w-full">
          <nav aria-label="Change" className="-mx-4 flex max-w-[calc(100%+32px)] gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:max-w-full lg:gap-0.5 lg:rounded-full lg:bg-fill lg:p-[3px]">
            {view.statuses.map((s) => {
              const on = state.status === s.value;
              return (
                <Link
                  key={s.value}
                  href={hrefFor({ status: s.value })}
                  scroll={false}
                  aria-current={on ? "page" : undefined}
                  className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent lg:h-[30px] lg:px-[13px] ${
                    on ? "bg-ink text-on-ink lg:bg-surface lg:text-accent-text lg:shadow-[0_1px_3px_oklch(0_0_0/0.14)]" : "bg-fill text-fg hover:bg-fill-strong lg:bg-transparent lg:text-muted lg:hover:bg-transparent lg:hover:text-fg"
                  }`}
                >
                  {s.label}
                  <span className={`text-[11px] font-bold ${on ? "opacity-70 lg:opacity-100" : "text-muted"}`}>{s.count}</span>
                </Link>
              );
            })}
          </nav>
          <LinkSelect label="Account" options={view.accounts.map((o) => ({ ...o, display: o.value ? o.label : "All accounts" }))} hrefs={accountHrefs} value={state.accountId ?? ""} className={SELECT} />
          <span>
            <LinkSelect label="Purpose" options={view.purposes.map((o) => ({ ...o, display: o.value ? o.label : "Any purpose" }))} hrefs={purposeHrefs} value={state.purpose ?? ""} className={SELECT} />
          </span>
        </div>
        <div className="flex w-full items-center gap-2.5 lg:w-auto">
          <Form action="/accounts/history" scroll={false} role="search" className="min-w-0 flex-1 lg:w-[250px] lg:flex-none">
            {state.accountId && <input type="hidden" name="account" value={state.accountId} />}
            {state.purpose && <input type="hidden" name="purpose" value={state.purpose} />}
            {periodParam(state.period, today) && <input type="hidden" name="period" value={periodParam(state.period, today)} />}
            {state.status !== "all" && <input type="hidden" name="status" value={state.status} />}
            {state.sort !== "newest" && <input type="hidden" name="sort" value={state.sort} />}
            {state.demo && <input type="hidden" name="demo" value="" />}
            <label className="flex h-10 items-center gap-2 md:h-[34px] rounded-full bg-fill px-3.5 text-muted focus-within:outline-2 focus-within:outline-accent">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="sr-only">Search balances</span>
              <input key={state.search ?? ""} type="search" name="q" defaultValue={state.search} placeholder="Search account or amount" className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-fg outline-none placeholder:text-muted" />
            </label>
          </Form>
          <Link
            href={hrefFor({ sort: nextSort })}
            scroll={false}
            aria-label={`Sorted by ${sortLabel.toLowerCase()}. Sort by ${{ newest: "newest first", oldest: "oldest first", biggest: "biggest move" }[nextSort]} instead`}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-fill px-3.5 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent md:h-[34px]"
          >
            {sortLabel}
            <Chevron />
          </Link>
        </div>
      </div>

      {view.empty ? (
        <div className="flex flex-col items-center gap-2.5 py-12 text-center">
          <h2 className="text-[15px] font-extrabold">{view.empty.title}</h2>
          <p className="max-w-[460px] text-xs leading-normal font-medium text-muted">{view.empty.body}</p>
          {view.empty.action === "update-balances" ? (
            <UpdateBalancesButton className="mt-1 inline-flex min-h-11 items-center rounded-full bg-fill px-3.5 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent md:min-h-[30px]" />
          ) : (
            <Link
              href={view.empty.action === "clear-filters" ? hrefFor({ status: "all", accountId: undefined, purpose: undefined, search: undefined }) : view.empty.action === "show-all-time" ? hrefFor({ period: { kind: "all" } }) : accountsHref}
              scroll={false}
              className="mt-1 inline-flex min-h-11 items-center rounded-full bg-fill px-3.5 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent md:min-h-[30px]"
            >
              {view.empty.action === "clear-filters" ? "Clear filters" : view.empty.action === "show-all-time" ? "Show all time" : "Go to Accounts"}
            </Link>
          )}
        </div>
      ) : (
        rows && (
          <div role="table" aria-label="Balances">
            {view.groups.map((g) => (
              <div key={g.key} role="rowgroup">
                <div role="row" className="flex items-center justify-between border-b border-divider pt-3.5 pb-2 text-[13px] font-extrabold">
                  <span role="cell">{g.title}</span>
                  <span role="cell" className="text-xs font-semibold text-muted">{g.note}</span>
                </div>
                {g.rows.map((r) => (
                  <Row key={r.id} row={r} />
                ))}
              </div>
            ))}
          </div>
        )
      )}

      {view.footer.length > 0 && (
        <div className="flex flex-col gap-3 pt-1.5 md:flex-row md:items-center md:justify-between">
          <p className="max-w-[860px] text-xs leading-[1.55] font-medium text-muted">
            {view.footer.map((part, i) =>
              part.strong ? (
                <b key={i} className="font-bold text-fg">
                  {part.text}
                </b>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </p>
          {view.page.pages > 1 && (
            <nav aria-label="Pages" className="flex shrink-0 items-center gap-2 self-end text-xs font-bold text-muted md:self-auto">
              <PageLink href={hrefFor({ page: view.page.page - 1 })} label="Previous page" disabled={view.page.page <= 1}>
                ‹
              </PageLink>
              <span aria-current="page">
                Page {view.page.page} of {view.page.pages}
              </span>
              <PageLink href={hrefFor({ page: view.page.page + 1 })} label="Next page" disabled={view.page.page >= view.page.pages}>
                ›
              </PageLink>
            </nav>
          )}
        </div>
      )}
    </section>
  );
}
