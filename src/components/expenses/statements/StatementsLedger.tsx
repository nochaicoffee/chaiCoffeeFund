"use client";

import Link from "next/link";
import { useState } from "react";
import type { StatementMonth, StatementRow } from "@/app/expenses/statements/statementsView";
import { PART_COLORS, PART_NAMES } from "@/app/expenses/views";
import type { PartKey } from "@/lib/aggregate/expenses";
import { CategoryIcon } from "../CategoryIcon";
import { HATCH } from "../hatch";
import { PartIcon } from "./PartIcon";

type Kind = "all" | PartKey;
const KINDS: Kind[] = ["all", "card", "emi", "subs", "ins", "big", "cash"];
const MONTHS_FIRST = 4;

/** A line's icon: its kind's colour, the worked-out cash and UPI hatched. */
export function RowIcon({ part }: { part: PartKey }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-white" style={{ background: part === "cash" ? `${HATCH}, var(--card-${PART_COLORS[part]})` : `var(--card-${PART_COLORS[part]})` }}>
      <PartIcon part={part} />
    </span>
  );
}

/** Big spends from an account in a month not worked out yet: they'll sit in cash and UPI once it is. */
export function LooseTags({ tags }: { tags: StatementRow["tags"] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-divider px-1 py-2.5 text-[12px] font-semibold text-muted">
      <span>From your accounts, inside cash and UPI once the month is worked out:</span>
      {tags.map((t) => (
        <BigTag key={t.key} tag={t} />
      ))}
    </div>
  );
}

export function BigTag({ tag }: { tag: StatementRow["tags"][number] }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-tint py-0.5 pr-2.5 pl-1 text-[11.5px] font-bold text-warning-text">
      <span className="flex size-[18px] items-center justify-center rounded-full text-white" style={{ background: `var(--card-${tag.colorKey})` }}>
        <CategoryIcon category={tag.category} size={11} />
      </span>
      {tag.name} <b className="font-extrabold">{tag.amount}</b> <small className="font-semibold opacity-75">{tag.bought}</small>
    </span>
  );
}

/**
 * Statements (ExS1): every month's payments, newest first, in the Cards and Income statements layout. Filter by kind, big spends only and a search
 * narrow it; each month links to its statement. The first four months show, the rest fold under "more months".
 */
export function StatementsLedger({ months, counts }: { months: StatementMonth[]; counts: Record<Kind, number> }) {
  const [kind, setKind] = useState<Kind>("all");
  const [bigOnly, setBigOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const q = query.trim().toLowerCase();
  const keep = (r: StatementRow) => (kind === "all" || r.part === kind) && (!bigOnly || r.tags.length > 0) && (!q || r.search.includes(q) || r.search.includes(q.replace(/[₹,]/g, "")));
  const looseShown = (m: StatementMonth) => (kind === "all" || kind === "cash") && (!q || m.loose.some((t) => t.name.toLowerCase().includes(q))) && m.loose.length > 0;
  const filtered = months.map((m) => ({ ...m, rows: m.rows.filter(keep) })).filter((m) => m.rows.length > 0 || looseShown(m) || (kind === "all" && !bigOnly && !q));
  const shown = all ? filtered : filtered.slice(0, MONTHS_FIRST);

  return (
    <section aria-label="Every payment" className="flex flex-col gap-1 rounded-[22px] border border-surface-line bg-surface p-4 shadow-[var(--card-shadow)] md:p-6">
      <div className="flex flex-wrap items-center gap-1.5 pb-3">
        {KINDS.map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-fill px-3.5 text-[12.5px] font-bold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent aria-pressed:bg-ink aria-pressed:text-on-ink">
            {k !== "all" && <i aria-hidden="true" className="size-2 rounded-[3px]" style={{ background: `var(--card-${PART_COLORS[k]})` }} />}
            {k === "all" ? "All" : PART_NAMES[k]} <span className="text-[11px] font-semibold opacity-60">{counts[k]}</span>
          </button>
        ))}
        <span className="flex-1" />
        <button type="button" aria-pressed={bigOnly} onClick={() => setBigOnly((b) => !b)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-fill px-3.5 text-[12.5px] font-bold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent aria-pressed:bg-warning-tint aria-pressed:text-warning-text">
          ★ Big spends only
        </button>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search payee or amount" aria-label="Search payments" className="min-h-9 w-full rounded-full bg-fill px-4 text-[12.5px] font-semibold outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent sm:w-56" />
      </div>
      {shown.length === 0 && <p className="py-6 text-center text-sm font-semibold text-muted">Nothing matches.</p>}
      {shown.map((m) => (
        <div key={m.month} className="flex flex-col">
          <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 border-b border-divider px-1 pt-5 pb-2">
            <b className="text-[15px] font-extrabold">{m.title}</b>
            <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-muted">{m.summary}</span>
            <Link href={`/expenses/statements?month=${m.month}`} className="text-[13px] font-extrabold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              Open the statement →
            </Link>
          </div>
          {m.rows.length === 0 && m.loose.length === 0 && <p className="px-1 py-3 text-[12.5px] font-semibold text-muted">No payments recorded.</p>}
          {looseShown(m) && <LooseTags tags={m.loose} />}
          <ul>
            {m.rows.map((r) => (
              <li key={r.key} className="grid grid-cols-[44px_36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-divider px-1 py-2.5 md:grid-cols-[44px_36px_minmax(0,1fr)_130px_170px_110px]">
                <span className="grid justify-items-center rounded-[11px] bg-fill py-1.5 leading-none">
                  <b className="text-[15px] font-extrabold">{r.day}</b>
                  <small className="mt-0.5 text-[9.5px] font-extrabold text-muted uppercase">{r.mon}</small>
                </span>
                <RowIcon part={r.part} />
                <span className="min-w-0">
                  <b className="flex items-center gap-2 text-[13.5px] font-extrabold">
                    {r.label}
                    {r.worked && <small className="rounded-full bg-fill px-2 py-0.5 text-[10.5px] font-bold text-muted">worked out</small>}
                  </b>
                  {r.detail && <small className="block text-[11.5px] font-semibold text-muted">{r.detail}</small>}
                  {r.tags.length > 0 && (
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {r.tags.map((t) => (
                        <BigTag key={t.key} tag={t} />
                      ))}
                    </span>
                  )}
                </span>
                <span className="hidden items-center gap-1.5 text-[12.5px] font-bold md:inline-flex">
                  <i aria-hidden="true" className="size-2 rounded-[3px]" style={{ background: `var(--card-${PART_COLORS[r.part]})` }} />
                  {PART_NAMES[r.part]}
                </span>
                <span className="hidden text-[12.5px] font-semibold text-muted md:block">{r.from}</span>
                <b className={`text-right text-[15px] font-extrabold tabular-nums ${r.amount.startsWith("−") ? "text-negative" : ""}`}>{r.amount}</b>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {!all && filtered.length > MONTHS_FIRST && (
        <button type="button" onClick={() => setAll(true)} className="mt-3 w-fit px-1 text-[13px] font-extrabold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          ↓ {filtered.length - MONTHS_FIRST} more months, back to {filtered[filtered.length - 1].title}
        </button>
      )}
    </section>
  );
}
