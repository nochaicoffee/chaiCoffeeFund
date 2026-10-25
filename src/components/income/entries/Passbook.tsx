"use client";

import Link from "next/link";
import { useState } from "react";
import type { Passbook as PassbookData, passbookSources } from "@/app/income/entries/entriesView";
import { colorGradient } from "@/lib/format/colors";
import { RingTexture } from "../../RingTexture";
import { FormTrigger, useIncomeForms } from "../forms/IncomeForms";
import { SourceIcon } from "../SourceIcon";

const TONES = {
  good: "bg-accent-tint text-accent-text",
  warn: "bg-warning-tint text-warning-text",
  late: "border border-negative/30 bg-negative-tint text-negative",
  quiet: "bg-fill text-muted",
} as const;
const STEP = 12;

/**
 * The Entries page's Passbook (E3, #191): one source at a time. The sources down the side (with its pay changes
 * under them), and the source's card: its facts, five figures, a year of months, and every payment as a timeline,
 * what's to come on top. Edit source and Record income open the forms; a payment opens Edit payment.
 */
export function Passbook({ book, sources, hrefFor }: { book: PassbookData; sources: ReturnType<typeof passbookSources>; hrefFor: Record<string, string> }) {
  const { open } = useIncomeForms();
  const [shown, setShown] = useState(STEP);
  const top = Math.max(1, ...book.months.map((m) => m.amount));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="flex min-w-0 flex-col gap-5">
        <nav aria-label="Sources" className="flex flex-col gap-1 rounded-[22px] border border-surface-line bg-surface p-3 shadow-[var(--card-shadow)] max-lg:flex-row max-lg:overflow-x-auto">
          <div className="flex items-center justify-between px-2 pt-1 pb-2 max-lg:hidden">
            <h2 className="text-[14px] font-extrabold">Sources</h2>
            <FormTrigger className="min-h-8 rounded-full bg-fill px-3 text-xs font-bold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent" label="+ Add" onClick={() => open({ kind: "add-source" })} />
          </div>
          {sources.map((s) => (
            <Link key={s.id} href={hrefFor[s.id]} aria-current={s.id === book.id ? "page" : undefined} className={`flex min-w-[180px] items-center gap-2.5 rounded-[14px] p-2 hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent aria-[current=page]:bg-surface aria-[current=page]:ring-2 aria-[current=page]:ring-ink ${s.inactive ? "opacity-60" : ""}`}>
              <SourceIcon icon={s.icon} name={s.name} colorKey={s.colorKey} size={32} />
              <span className="min-w-0">
                <b className="block truncate text-[13px] font-extrabold">{s.name}</b>
                <span className="block truncate text-[11px] font-semibold text-muted">{s.note}</span>
              </span>
            </Link>
          ))}
        </nav>
        {book.changes.length > 0 && (
          <section aria-label="Pay changes" className="flex flex-col gap-2.5 rounded-[22px] border border-surface-line bg-surface p-4 shadow-[var(--card-shadow)] max-lg:hidden">
            <h2 className="text-[14px] font-extrabold">
              Pay changes <small className="ml-1 text-xs font-semibold text-muted">{book.name}</small>
            </h2>
            <ul className="flex flex-col gap-2">
              {book.changes.map((c) => (
                <li key={c.key} className="flex items-center justify-between gap-3 text-[12px]">
                  <span>
                    <b className="block font-extrabold">{c.when}</b>
                    <span className="text-muted tabular-nums">{c.amounts}</span>
                  </span>
                  <b className={`font-extrabold tabular-nums ${c.up ? "text-accent-text" : "text-negative"}`}>{c.change}</b>
                </li>
              ))}
            </ul>
            <p className="text-[11px] font-semibold text-muted">A payment 2% or more off the one before it is a change.</p>
          </section>
        )}
      </aside>

      <div className="flex min-w-0 flex-col gap-5">
        <section aria-label={book.name} className="flex flex-col gap-5 rounded-[24px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)] md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span className="flex items-center gap-3">
              <SourceIcon icon={book.icon} name={book.name} colorKey={book.colorKey} size={44} />
              <span>
                <h2 className="text-xl font-extrabold">{book.name}</h2>
                <span className="text-[12.5px] font-semibold text-muted">{book.facts}</span>
              </span>
            </span>
            <span className="flex flex-wrap gap-2">
              <FormTrigger className="min-h-9 rounded-full bg-fill px-4 text-xs font-bold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent" label="Edit source" onClick={() => open({ kind: "edit-source", id: book.id })} />
              <FormTrigger className="min-h-9 rounded-full bg-ink px-4 text-xs font-extrabold text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" label="+ Record income" onClick={() => open({ kind: "entry", start: { kind: "record", sourceId: book.id } })} />
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-5">
            {book.figures.map((f) => (
              <div key={f.label} className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">{f.label}</dt>
                <dd className={`truncate text-lg font-extrabold tabular-nums ${f.tone === "accent" ? "text-accent-text" : f.tone === "warn" ? "text-warning-text" : ""}`}>{f.value}</dd>
                <dd className={`text-[11.5px] font-semibold ${f.tone === "warn" ? "text-warning-text" : "text-muted"}`}>{f.note}</dd>
              </div>
            ))}
          </dl>
          <ol aria-label="Month by month" className="flex h-[150px] items-end gap-1 sm:gap-2">
            {book.months.map((m) => (
              <li key={m.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" aria-label={`${m.label}: ${m.amount ? `${m.short}${m.expected ? " expected" : ""}` : "nothing"}`}>
                {m.amount > 0 && <span className={`text-[10px] font-extrabold tabular-nums max-sm:hidden ${m.expected ? "text-muted" : ""}`}>{m.short}</span>}
                {m.expected ? (
                  <span className="block w-full rounded-[8px] border-[1.5px] border-dashed border-fg/30 bg-fill" style={{ height: Math.max(4, (m.amount / top) * 110) }} />
                ) : (
                  <span className="relative isolate block w-full overflow-hidden rounded-[8px]" style={{ height: m.amount ? Math.max(4, (m.amount / top) * 110) : 2, background: m.amount ? colorGradient(book.colorKey) : "var(--fill-strong)" }}>
                    {m.amount > 0 && <RingTexture width={80} height={120} dx={20} dy={14} first={20} step={12} stroke="var(--rings-light)" opacity={0.12} />}
                  </span>
                )}
                <span className={`text-[10.5px] font-extrabold ${m.current ? "text-fg" : "text-muted"}`}>
                  <span className="sm:hidden">{m.label[0]}</span>
                  <span className="max-sm:hidden">{m.label.toUpperCase()}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="Every payment" className="flex flex-col gap-3 rounded-[24px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)] md:p-6">
          <h2 className="text-[15px] font-extrabold">
            Every payment <small className="ml-2 text-xs font-semibold text-muted">newest first, with what&apos;s next on top</small>
          </h2>
          {book.items.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-muted">Nothing received from it yet.</p>
          ) : (
            <ol className="flex flex-col">
              {book.items.slice(0, shown).map((item) => (
                <Item key={item.key} item={item} sourceId={book.id} />
              ))}
            </ol>
          )}
          {book.items.length > shown && (
            <button type="button" onClick={() => setShown(shown + STEP)} className="self-start rounded-full bg-fill px-4 py-2 text-xs font-bold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
              Show {Math.min(STEP, book.items.length - shown)} more
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

function Item({ item, sourceId }: { item: PassbookData["items"][number]; sourceId: string }) {
  const { open, forms, disabledReason, receive } = useIncomeForms();
  const entry = item.entryId ? forms.entries[item.entryId] : undefined;
  return (
    <li className="grid grid-cols-[18px_minmax(0,1fr)_auto] gap-x-3 border-l-2 border-divider py-2.5 pl-0 [&:last-child]:border-l-transparent">
      <span aria-hidden="true" className={`-ml-[9px] mt-1 block size-4 rounded-full ${item.state === "received" ? "bg-accent" : item.state === "pending" ? "border-2 border-dashed border-warning bg-warning-tint" : "border-2 border-dashed border-muted bg-surface"}`} />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <b className="text-[13px] font-extrabold">
            {item.date}
            {item.otherYear ? <span className="ml-1 text-[11px] font-semibold text-muted">{item.otherYear}</span> : null}
          </b>
          {entry && !disabledReason ? (
            <button type="button" onClick={() => open({ kind: "entry", start: { kind: "edit", entry } })} className="text-[13px] font-bold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              {item.title}
            </button>
          ) : (
            <span className="text-[13px] font-bold">{item.title}</span>
          )}
          {item.status && <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${TONES[item.status.tone]}`}>{item.status.text}</span>}
          {item.state === "pending" && !disabledReason && (
            <button type="button" onClick={() => receive(sourceId, item.expectedDate)} className="rounded-full bg-accent-tint px-2.5 py-0.5 text-[10.5px] font-extrabold text-accent-text hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-accent">
              Mark received
            </button>
          )}
        </span>
        <span className="block text-[11.5px] font-semibold text-muted">{item.note}</span>
      </span>
      <span className="text-right">
        <b className={`block text-[13px] font-extrabold tabular-nums ${item.state === "upcoming" ? "text-muted" : ""}`}>{item.amount}</b>
        {item.change && <span className={`block text-[11px] font-bold ${item.change.up ? "text-accent-text" : "text-negative"}`}>{item.change.text}</span>}
      </span>
    </li>
  );
}
