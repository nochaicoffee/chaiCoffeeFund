"use client";

import { useMemo, useState } from "react";
import { METHOD_COLORS, METHOD_NAMES } from "@/app/daily/views";
import { CalendarIcon, PILL_SELECT_CLASS, useSearchParamNavigation } from "@/components/cards/PeriodSelect";
import { StatementsSummary } from "@/components/cards/StatementsSummary";
import { Select } from "@/components/Select";
import { entryTotals, filterSpends, groupByMonthAndDay, monthsWithSpends, NO_FILTERS, sortSpends, type EntrySort } from "@/lib/daily/entries";
import { PENDING_PREFIX } from "@/lib/daily/pendingAdds";
import { formatDayDate, formatMonthYear, formatShortDate } from "@/lib/format/date";
import { formatInr, formatInrExact } from "@/lib/format/money";
import { DAILY_SPEND_METHODS, type DailySpend, type DailySpendMethod } from "@/lib/sheets/types";
import { PlusIcon } from "../cards/forms/icons";
import { CategoryTile } from "./CategoryPicker";
import { useDaily } from "./context";

const AMOUNTS = [0, 100, 500, 1000, 5000];
const SORTS: { value: EntrySort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "biggest", label: "Biggest first" },
  { value: "smallest", label: "Smallest first" },
];

/** The period pill: a month that has spends (this month always), or all time. It sets `?month=`; the default is the month today is in. */
export function EntriesPeriod({ value, defaultValue }: { value: string; defaultValue: string }) {
  const daily = useDaily();
  const choose = useSearchParamNavigation("month");
  const months = useMemo(() => monthsWithSpends(daily.model.spends), [daily.model.spends]);
  const all = months.reduce((a, m) => a + m.total, 0);
  // This month is always offered, and so is the one asked for in the address, even with nothing in it.
  const list = [...months];
  for (const wanted of [value === "all" ? "" : value, defaultValue]) if (wanted && !list.some((m) => m.month === wanted)) list.push({ month: wanted, total: 0 });
  list.sort((a, b) => (a.month < b.month ? 1 : -1));
  return (
    <Select
      variant="pill"
      aria-label="Period"
      options={[...list.map((m) => ({ value: m.month, label: formatMonthYear(m.month), meta: formatInr(m.total) })), { value: "all", label: "All time", meta: formatInr(all), divider: true }]}
      value={value}
      onChange={(v) => choose(v === defaultValue ? "" : v)}
      icon={<CalendarIcon />}
      className={PILL_SELECT_CLASS}
    />
  );
}

/** The header's Add a spend, which opens the same sheet as the Daily page. */
export function AddSpendButton() {
  const daily = useDaily();
  return (
    <button type="button" onClick={() => daily.openAdd()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-bold text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:min-h-10">
      <PlusIcon /> Add a spend
    </button>
  );
}

/**
 * Every spend (docs/design/daily.md, round 6, G1, the Ledger): four figures over what's shown, a search and filters (category, how it was paid, a smallest
 * amount, the order), then months, a day under each with its total, and a row per spend. A row opens the same Edit sheet as the Daily page. Everything is
 * worked out here from the shell's spends, so a spend added or edited shows at once. `periodKey` is the month asked for ("" is all time).
 */
export function Entries({ periodKey, periodLabel, initialCategory }: { periodKey: string; periodLabel: string; initialCategory: string }) {
  const daily = useDaily();
  const { model } = daily;
  const [query, setQuery] = useState("");
  // An address naming a category that isn't there opens with no category filter rather than an empty list.
  const [category, setCategory] = useState(initialCategory === "none" || daily.categories.some((c) => c.id === initialCategory) ? initialCategory : "");
  const [method, setMethod] = useState<DailySpendMethod | "">("");
  const [min, setMin] = useState(0);
  const [sort, setSort] = useState<EntrySort>("newest");
  const filters = { ...NO_FILTERS, query, category, method, min, period: periodKey };
  const inPeriod = useMemo(() => model.spends.filter((s) => (periodKey ? s.date.startsWith(periodKey) : true)), [model.spends, periodKey]);
  const shown = useMemo(() => sortSpends(filterSpends(model.spends, filters, model.nameOf, (m) => METHOD_NAMES[m]), sort), [model.spends, query, category, method, min, sort, periodKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const totals = useMemo(() => entryTotals(shown), [shown]);
  const groups = useMemo(() => (sort === "newest" || sort === "oldest" ? groupByMonthAndDay(shown) : null), [shown, sort]);
  const narrowed = query.trim() !== "" || category !== "" || method !== "" || min > 0;
  const clear = () => {
    setQuery("");
    setCategory("");
    setMethod("");
    setMin(0);
  };
  const dayName = (date: string) => (date === daily.today ? "Today" : formatDayDate(date));
  const top = totals.top;
  const categoryOptions = [{ value: "", label: "All categories" }, ...daily.categories.filter((c) => !c.hidden || c.id === category).map((c) => ({ value: c.id, label: c.name, swatch: { background: `var(--card-${c.colorKey})` } })), { value: "none", label: "No category", divider: true }];

  const row = (s: DailySpend) => {
    const saving = s.id.startsWith(PENDING_PREFIX);
    return (
      <button key={s.id} type="button" className={`er${saving ? " saving" : ""}`} disabled={saving} onClick={() => daily.openEdit(s.id)} aria-label={`Edit ${s.note ?? model.nameOf(s.category)}, ${formatInrExact(s.amount)}, ${formatShortDate(s.date)}`}>
        <CategoryTile category={{ name: model.nameOf(s.category), colorKey: model.colorOf(s.category) }} />
        <span className="er-n">
          <b>{s.note ?? model.nameOf(s.category)}</b>
          {(sort === "biggest" || sort === "smallest") && <small>{formatShortDate(s.date)}</small>}
        </span>
        <span className="er-c">{s.note ? model.nameOf(s.category) : ""}</span>
        <span className="er-m">
          <i className="md" style={{ background: `var(--card-${METHOD_COLORS[s.method]})` }} aria-hidden="true" /> {METHOD_NAMES[s.method]}
        </span>
        <span className="er-a">{saving ? "saving…" : formatInrExact(s.amount)}</span>
      </button>
    );
  };

  return (
    <>
      <StatementsSummary
        tiles={[
          { label: `Spent · ${periodLabel}`, value: formatInr(totals.total), caption: `${totals.count} ${totals.count === 1 ? "spend" : "spends"} shown` },
          { label: "A usual spend", value: formatInr(totals.average), caption: "the average of the ones shown" },
          { label: "Biggest", value: totals.biggest ? formatInr(totals.biggest.amount) : "—", caption: totals.biggest ? `${totals.biggest.note ?? model.nameOf(totals.biggest.category)} · ${formatShortDate(totals.biggest.date)}` : "Nothing yet" },
          { label: "Most spent on", value: top ? model.nameOf(top.category) : "—", caption: top ? `${formatInr(top.amount)} · ${Math.round(top.share * 100)}% of what's shown` : "Nothing yet" },
        ]}
      />
      <section className="card er-card" aria-label="Spends">
        <div className="tb">
          <label className="srch">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="sr-only">Search spends</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes, amounts, categories" autoComplete="off" />
          </label>
          <Select variant="pill" aria-label="Category" options={categoryOptions} value={category} onChange={setCategory} className={PILL_SELECT_CLASS} />
          <div className="seg2 tb-seg" role="radiogroup" aria-label="Paid with">
            {[{ value: "" as const, label: "All" }, ...DAILY_SPEND_METHODS.map((m) => ({ value: m, label: m === "Card" ? "Card" : m }))].map((o) => (
              <label key={o.value || "all"}>
                <input type="radio" name="entries-method" checked={method === o.value} onChange={() => setMethod(o.value)} />
                <span>
                  {o.value !== "" && <i className="md" style={{ background: `var(--card-${METHOD_COLORS[o.value]})` }} aria-hidden="true" />}
                  {o.label}
                </span>
              </label>
            ))}
          </div>
          <Select variant="pill" aria-label="Amount" options={AMOUNTS.map((a) => ({ value: String(a), label: a === 0 ? "Any amount" : `${formatInr(a)} or more` }))} value={String(min)} onChange={(v) => setMin(Number(v))} className={PILL_SELECT_CLASS} />
          <span className="tb-sp" />
          <span className="tb-c" aria-live="polite">
            {shown.length} {shown.length === 1 ? "spend" : "spends"}
          </span>
          <Select variant="pill" aria-label="Order" options={SORTS} value={sort} onChange={(v) => setSort(v as EntrySort)} className={PILL_SELECT_CLASS} />
        </div>
        {narrowed && (
          <p className="tb-clear">
            Showing what matches your search and filters. <button type="button" onClick={clear}>Clear them</button>
          </p>
        )}
        {inPeriod.length === 0 ? (
          <div className="empty-box er-empty">
            <b>Nothing written down {periodKey ? `for ${periodLabel}` : "yet"}</b>
            <small>Add a spend and it shows here, a day at a time.</small>
          </div>
        ) : shown.length === 0 ? (
          <div className="empty-box er-empty">
            <b>Nothing matches</b>
            <small>Nothing {periodKey ? `in ${periodLabel} ` : ""}fits that search and those filters. Try another word, or clear them to see all {inPeriod.length} {inPeriod.length === 1 ? "spend" : "spends"}.</small>
            <button type="button" className="btn-soft" onClick={clear}>Clear the search</button>
          </div>
        ) : groups ? (
          <div className="er-l">
            {groups.map((m) => (
              <div key={m.month}>
                <div className="er-mh">
                  <b>{formatMonthYear(m.month)}</b>
                  <small>
                    {m.count} {m.count === 1 ? "spend" : "spends"}
                  </small>
                  <span>{formatInr(m.total)}</span>
                </div>
                {m.days.map((d) => (
                  <div key={d.date}>
                    <div className="er-dh">
                      <b>{dayName(d.date)}</b>
                      {d.date === daily.today && <small>{formatDayDate(d.date)}</small>}
                      <span>{formatInr(d.total)}</span>
                    </div>
                    {d.spends.map(row)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="er-l">{shown.map(row)}</div>
        )}
      </section>
    </>
  );
}
