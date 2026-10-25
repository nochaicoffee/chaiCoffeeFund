"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { monthTitle, type LedgerKind, type LedgerRow } from "@/app/income/entries/entriesView";
import { Select } from "@/components/Select";
import { addDays } from "@/lib/aggregate/subscriptionRenewals";
import { useIncomeForms } from "../forms/IncomeForms";
import { SourceIcon } from "../SourceIcon";

type Status = "all" | LedgerKind;
const TONES = {
  good: "bg-accent-tint text-accent-text",
  warn: "bg-warning-tint text-warning-text",
  late: "border border-negative/30 bg-negative-tint text-negative",
  quiet: "bg-fill text-muted",
} as const;
const STEP = 40;

/**
 * The Entries page's Ledger (E1, #191): every payment of the year in one list, in Renewals' layout. What's owed on
 * top (with Mark received), what's coming up in the next 30 days (the rest of the year folded under it), then a
 * group per month of what landed. Status chips, source, tag, a search and the order filter it; choosing one source
 * opens its Passbook. A payment opens Edit payment.
 */
export function Ledger({ rows, sources, today, year, current }: { rows: LedgerRow[]; sources: { id: string; name: string }[]; today: string; year: number; current: boolean }) {
  const [status, setStatus] = useState<Status>("all");
  const [tag, setTag] = useState("");
  const [query, setQuery] = useState("");
  const [oldestFirst, setOldestFirst] = useState(false);
  const [later, setLater] = useState(false);
  const [shown, setShown] = useState(STEP);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const counts = useMemo(() => ({ all: rows.length, upcoming: rows.filter((r) => r.kind === "upcoming").length, pending: rows.filter((r) => r.kind === "pending").length, received: rows.filter((r) => r.kind === "received").length }), [rows]);
  const visible = rows.filter((r) => (status === "all" || r.kind === status) && (!tag || r.tag === tag) && (!query.trim() || r.search.includes(query.trim().toLowerCase().replace(/[₹,]/g, "")) || r.search.includes(query.trim().toLowerCase())));
  const soon = addDays(today, 29);
  const pending = visible.filter((r) => r.kind === "pending");
  const upcoming = visible.filter((r) => r.kind === "upcoming");
  const next30 = upcoming.filter((r) => r.expectedDate <= soon);
  const rest = upcoming.filter((r) => r.expectedDate > soon);
  const received = visible.filter((r) => r.kind === "received");
  const ordered = oldestFirst ? [...received].reverse() : received;
  const page = ordered.slice(0, shown);
  const months = [...new Set(page.map((r) => r.month))];

  function openSource(id: string) {
    const query = new URLSearchParams(params.toString());
    if (id) query.set("source", id);
    else query.delete("source");
    const text = query.toString().replace(/(^|&)demo=(&|$)/, "$1demo$2");
    router.push(text ? `${pathname}?${text}` : pathname);
  }

  const chip = (value: Status, label: string, n: number) => (
    <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-bold text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent aria-pressed:bg-surface aria-pressed:text-fg aria-pressed:shadow-soft">
      {label} <span className="text-[11px] font-semibold tabular-nums opacity-70">{n}</span>
    </button>
  );

  return (
    <section aria-label="Every payment" className="flex min-w-0 flex-col gap-4 rounded-[24px] border border-surface-line bg-surface p-4 shadow-[var(--card-shadow)] md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Show" className="flex flex-wrap gap-1 rounded-full bg-fill p-1">
          {chip("all", "All", counts.all)}
          {counts.upcoming > 0 && chip("upcoming", "Upcoming", counts.upcoming)}
          {counts.pending > 0 && chip("pending", "Pending", counts.pending)}
          {chip("received", "Received", counts.received)}
        </div>
        <Select variant="pill" aria-label="Source" options={[{ value: "", label: "All sources" }, ...sources.map((s) => ({ value: s.id, label: s.name }))]} value="" onChange={openSource} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-surface-line bg-surface px-3.5 text-[12.5px] font-bold" />
        <Select variant="pill" aria-label="Tag" options={[{ value: "", label: "Tag: any" }, { value: "Regular", label: "Regular" }, { value: "Bonus", label: "Bonus" }, { value: "One-off", label: "One-off" }]} value={tag} onChange={setTag} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-surface-line bg-surface px-3.5 text-[12.5px] font-bold" />
        <label className="ml-auto flex min-h-9 min-w-[200px] items-center gap-2 rounded-full border border-surface-line bg-surface px-3.5 text-[12.5px] max-md:ml-0 max-md:w-full">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="text-muted">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
          <span className="sr-only">Search</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search source or amount" className="min-w-0 flex-1 bg-transparent font-semibold outline-none" />
        </label>
        <button type="button" onClick={() => setOldestFirst(!oldestFirst)} className="min-h-9 rounded-full border border-surface-line bg-surface px-3.5 text-[12.5px] font-bold focus-visible:outline-2 focus-visible:outline-accent">
          {oldestFirst ? "Oldest first" : "Newest first"}
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm font-semibold text-muted">{rows.length === 0 ? (current ? "No payments this year yet." : `No payments in ${year}.`) : "Nothing matches. Try another filter or search."}</p>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">
                <th className="pb-2 font-extrabold">Source</th>
                <th className="pb-2 font-extrabold">Expected on</th>
                <th className="pb-2 font-extrabold">Amount</th>
                <th className="pb-2 font-extrabold">Status</th>
                <th className="pb-2 font-extrabold">Received on</th>
                <th className="pb-2 font-extrabold">Landed in</th>
                <th className="pb-2 font-extrabold">Tag</th>
                <th className="pb-2 font-extrabold">Change</th>
              </tr>
            </thead>
            {pending.length > 0 && <Group title="Needs attention · pending" note={`${pending.length === 1 ? pending[0].amount : `${pending.length} payments`} not received`} rows={pending} />}
            {next30.length > 0 && <Group title="Coming up · next 30 days" note={`${next30.length === 1 ? "1 payment" : `${next30.length} payments`} to come`} rows={next30} />}
            {rest.length > 0 && (
              <tbody>
                <tr>
                  <td colSpan={8} className="pt-1 pb-3">
                    <button type="button" aria-expanded={later} onClick={() => setLater(!later)} className="text-[12.5px] font-extrabold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                      {later ? "Hide" : "Show"} {rest.length} more later this year
                    </button>
                  </td>
                </tr>
              </tbody>
            )}
            {later && rest.length > 0 && <Group title="Later this year" note="at the usual amounts" rows={rest} />}
            {months.map((m) => {
              const inMonth = page.filter((r) => r.month === m);
              return <Group key={m} title={monthTitle(m)} note={`${inMonth.length === 1 ? "1 payment" : `${inMonth.length} payments`}`} rows={inMonth} />;
            })}
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-3 text-[11.5px] font-semibold text-muted">
        <span>
          Showing {Math.min(shown, received.length)} of {received.length} received {current ? "this year" : `in ${year}`}. {current && "Upcoming ones come from each source's schedule at its usual amount; nothing is saved until one lands. "} <b className="text-fg">Change</b> compares a payment with the one before it.
        </span>
        {received.length > shown && (
          <button type="button" onClick={() => setShown(shown + STEP)} className="min-h-9 rounded-full bg-fill px-4 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
            Show {Math.min(STEP, received.length - shown)} more
          </button>
        )}
      </div>
    </section>
  );
}

function Group({ title, note, rows }: { title: string; note: string; rows: LedgerRow[] }) {
  return (
    <tbody>
      <tr>
        <th colSpan={6} scope="colgroup" className="pt-4 pb-2 text-left text-[13px] font-extrabold">
          {title}
        </th>
        <td colSpan={2} className="pt-4 pb-2 text-right text-[11.5px] font-semibold text-muted">
          {note}
        </td>
      </tr>
      {rows.map((r) => (
        <Row key={r.key} row={r} />
      ))}
    </tbody>
  );
}

function Row({ row }: { row: LedgerRow }) {
  const { open, receive, forms, disabledReason } = useIncomeForms();
  const entry = row.entryId ? forms.entries[row.entryId] : undefined;
  const edit = !disabledReason && entry ? () => open({ kind: "entry", start: { kind: "edit", entry } }) : undefined;
  return (
    <tr className={`border-t border-divider ${row.kind === "upcoming" ? "text-muted" : ""}`}>
      <td className="py-2.5 pr-3">
        <button type="button" onClick={edit} disabled={!edit} aria-label={edit ? `Edit payment: ${row.name}, ${row.amount}` : undefined} className="flex cursor-pointer items-center gap-2.5 rounded-control text-left focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default">
          <SourceIcon icon={row.icon} name={row.name} colorKey={row.colorKey} size={30} />
          <span className="min-w-0">
            <b className="block truncate font-extrabold text-fg">{row.name}</b>
            <span className="block text-[11px] font-semibold text-muted">
              {row.sourceKind}
              {row.fromStatement ? " · from statement" : ""}
            </span>
          </span>
        </button>
      </td>
      <td className="py-2.5 pr-3">
        <b className="block font-extrabold">{row.expected}</b>
        {row.expectedNote && <span className={`block text-[11px] font-semibold ${row.kind === "pending" ? "text-negative" : "text-muted"}`}>{row.expectedNote}</span>}
      </td>
      <td className="py-2.5 pr-3">
        <b className="block font-extrabold tabular-nums">{row.amount}</b>
        {row.amountNote && <span className="block text-[11px] font-semibold text-muted">{row.amountNote}</span>}
      </td>
      <td className="py-2.5 pr-3">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold whitespace-nowrap ${TONES[row.status.tone]}`}>{row.status.text}</span>
      </td>
      <td className="py-2.5 pr-3">
        {row.received ? (
          <>
            <b className="block font-extrabold">{row.received}</b>
            <span className="block text-[11px] font-semibold text-muted">{row.receivedNote}</span>
          </>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="py-2.5 pr-3 text-[12.5px] font-semibold">{row.landsIn ?? <span className="text-muted">—</span>}</td>
      <td className="py-2.5 pr-3">
        <span className="rounded-full bg-fill px-2 py-0.5 text-[11px] font-bold text-muted">{row.tag}</span>
      </td>
      <td className="py-2.5">
        {row.kind === "pending" && !disabledReason ? (
          <button type="button" onClick={() => receive(row.sourceId, row.expectedDate)} className="min-h-8 rounded-full bg-accent-tint px-3 text-[11px] font-extrabold whitespace-nowrap text-accent-text hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-accent">
            ✓ Mark received
          </button>
        ) : row.change ? (
          <span>
            <b className={`block text-[12.5px] font-extrabold ${row.change.up ? "text-accent-text" : "text-negative"}`}>{row.change.text}</b>
            <span className="block text-[11px] font-semibold text-muted">{row.change.note}</span>
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
    </tr>
  );
}
