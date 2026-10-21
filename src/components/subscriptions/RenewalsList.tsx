import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { periodParam } from "@/lib/aggregate/period";
import { placeKey, type Place } from "@/lib/aggregate/subscriptionRenewalList";
import type { RenewalsListState } from "@/app/subscriptions/renewals/params";
import type { GroupView, PillTone, RenewalRowView, RenewalsPageView } from "@/app/subscriptions/renewals/views";
import { ArrowIcon } from "./icons";
import { LinkSelect } from "./LinkSelect";
import { ChargedTo, Mono } from "./parts";
import { RenewalRowActions } from "./RenewalRowActions";
import { SubscriptionStrip } from "./SubscriptionStrip";

/** The design's eight columns (SubsRenewals.dc.html), from 1280px; narrower, each row is the phone's two lines instead, since the columns don't fit. */
const COLUMNS = "xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1.1fr)_0.95fr_1fr_0.8fr_minmax(0,1fr)_minmax(0,1.1fr)_112px]";
const HEADERS = ["Subscription", "Renews on", "Amount", "Status", "Paid on", "Charged to", "Change"];

const PILL: Record<PillTone, string> = {
  paid: "bg-accent-tint text-accent-text",
  off: "bg-fill text-muted",
  soon: "bg-warning-tint text-warning-text",
  due: "bg-negative-tint text-negative motion-safe:animate-due-pulse",
  warning: "bg-warning-tint text-warning-text",
};

const NOTE_TONE = { due: "text-negative", warning: "text-warning-text", muted: "text-muted" } as const;

const NONE = <span className="text-muted">—</span>;

const StopIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <line x1="6" y1="18" x2="18" y2="6" />
  </svg>
);

const Chevron = ({ up = false }: { up?: boolean }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points={up ? "6 15 12 9 18 15" : "6 9 12 15 18 9"} />
  </svg>
);

function Status({ status }: { status: RenewalRowView["status"] }) {
  return (
    <span className={`inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${PILL[status.tone]}`}>
      {status.stopped && <StopIcon />}
      {status.label}
    </span>
  );
}

function Change({ change }: { change: RenewalRowView["change"] }) {
  if (!change) return NONE;
  const tone = change.plan ? "text-warning-text" : change.up ? "text-negative" : "text-positive";
  return (
    <span className={`inline-flex items-center gap-[3px] text-[11px] font-bold whitespace-nowrap ${tone}`}>
      <ArrowIcon up={change.up} />
      {change.text}
    </span>
  );
}

function Row({ row, openHref }: { row: RenewalRowView; openHref: string }) {
  const struck = row.stopped ? "line-through" : "";
  return (
    <div role="row" className={`border-b border-divider text-[13px] tabular-nums ${row.stopped ? "opacity-70" : ""}`}>
      {/* Phone: the name and amount, then when, where or why, with the action and status. */}
      <div role="cell" className="flex items-center gap-3 py-[11px] xl:hidden">
        <Mono mark={row.mark} size={34} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <b className="truncate text-sm font-extrabold">{row.mark.alias}</b>
            <b className={`text-sm font-extrabold ${struck}`}>{row.amount}</b>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="min-w-0 text-xs leading-snug font-semibold text-muted">
              {row.phoneLine}
              {row.phoneChange && (
                <>
                  {" · "}
                  <span className={`inline-flex items-center gap-[2px] font-bold ${row.phoneChange.up ? "text-negative" : "text-positive"}`}>
                    <ArrowIcon up={row.phoneChange.up} size={9} />
                    {row.phoneChange.text}
                  </span>
                </>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <RenewalRowActions row={row} openHref={openHref} phone />
              <Status status={row.status} />
            </span>
          </div>
        </div>
      </div>
      {/* Desktop: the design's eight columns. */}
      <div className={`grid items-center gap-3.5 px-2.5 py-[11px] max-xl:hidden ${COLUMNS}`}>
        <div role="cell" className="flex min-w-0 items-center gap-3">
          <Mono mark={row.mark} size={30} />
          <div className="min-w-0">
            <b className="block truncate font-bold">{row.mark.alias}</b>
            <small className="mt-0.5 block truncate text-[11px] font-semibold text-muted">{row.detail}</small>
          </div>
        </div>
        <div role="cell" className="min-w-0">
          <b className={`block font-bold whitespace-nowrap ${struck}`}>{row.date}</b>
          {row.dateNote && <small className={`mt-0.5 block text-[11px] font-semibold whitespace-nowrap ${NOTE_TONE[row.dateNote.tone]}`}>{row.dateNote.text}</small>}
        </div>
        <div role="cell" className="min-w-0">
          <b className={`block whitespace-nowrap ${row.amountMuted ? "font-bold text-muted" : "font-extrabold"} ${struck}`}>{row.amount}</b>
          {row.amountNote && <small className="mt-0.5 block text-[11px] font-semibold whitespace-nowrap text-muted">{row.amountNote}</small>}
        </div>
        <div role="cell">
          <Status status={row.status} />
        </div>
        <div role="cell" className="whitespace-nowrap">
          {row.paidOn ?? NONE}
        </div>
        <div role="cell" className={`min-w-0 ${row.chargedToExpected ? "opacity-60" : ""}`}>
          {row.chargedTo ? <ChargedTo chip={row.chargedTo} /> : NONE}
        </div>
        <div role="cell" className="min-w-0">
          <Change change={row.change} />
        </div>
        <div role="cell" className="flex justify-end">
          <RenewalRowActions row={row} openHref={openHref} />
        </div>
      </div>
    </div>
  );
}

function Group({ group, openHref, moreHref, lessHref }: { group: GroupView; openHref: (subscriptionId: string) => string; moreHref: string; lessHref: string }) {
  return (
    <div role="rowgroup">
      {(group.rows.length > 0 || !group.more) && (
        <div role="row" className="border-b border-divider pt-3.5 pb-2 xl:px-2.5">
          <div role="cell" aria-colspan={HEADERS.length + 1} className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-extrabold">
              <span className="xl:hidden">{group.phoneTitle}</span>
              <span className="max-xl:hidden">{group.title}</span>
            </span>
            <span className="text-xs font-semibold text-muted tabular-nums">
              <span className="xl:hidden">{group.phoneSummary}</span>
              <span className="max-xl:hidden">
                {group.summary.map((bit, i) => (
                  <span key={i} className={bit.warning ? "text-warning-text" : ""}>
                    {i > 0 && <span className="text-muted"> · </span>}
                    {bit.text}
                  </span>
                ))}
              </span>
            </span>
          </div>
        </div>
      )}
      {group.rows.map((row) => (
        <Row key={row.key} row={row} openHref={openHref(row.subscriptionId)} />
      ))}
      {group.more && (
        <div role="row" className="py-2.5 xl:px-2.5">
          <div role="cell" aria-colspan={HEADERS.length + 1}>
            <Link href={moreHref} scroll={false} className="inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent md:min-h-0">
              <Chevron />
              {group.more}
            </Link>
          </div>
        </div>
      )}
      {group.less && (
        <div role="row" className="py-2.5 xl:px-2.5">
          <div role="cell" aria-colspan={HEADERS.length + 1}>
            <Link href={lessHref} scroll={false} className="inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent md:min-h-0">
              <Chevron up />
              {group.less}
            </Link>
          </div>
        </div>
      )}
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

const SELECT = "flex h-10 max-w-full cursor-pointer items-center gap-2 rounded-full bg-fill px-3 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent aria-expanded:bg-fill-strong md:h-[34px]";

/**
 * The Renewals page's card (SubsRenewals.dc.html, layout R1): the status filter with
 * counts, the subscription and Charged to menus, search and sort, the strip for one
 * subscription, then the table in its groups, a page at a time. Every control is a
 * link, a GET form or a menu of links, so the address always says what's shown.
 */
export function RenewalsList({
  view,
  state,
  hrefFor,
  openHref,
  subscriptionsHref,
  today,
}: {
  view: RenewalsPageView;
  state: RenewalsListState;
  /** A link to this page with some choices changed, back on page 1 unless a page is given. */
  hrefFor: (changes: Partial<RenewalsListState>) => string;
  /** The subscription on the Subscriptions page. */
  openHref: (subscriptionId: string) => string;
  subscriptionsHref: string;
  today: string;
}) {
  const status = state.status ?? "all";
  const subscriptionHrefs = Object.fromEntries(view.subscriptions.map((o) => [o.value, hrefFor({ subscriptionId: o.value || undefined })]));
  const placeOf = (value: string): Place | undefined => {
    const [kind, ...id] = value.split(":");
    return kind === "card" || kind === "account" ? { kind, id: id.join(":") } : undefined;
  };
  const placeHrefs = Object.fromEntries(view.places.map((o) => [o.value, hrefFor({ place: placeOf(o.value) })]));
  const placeOptions = view.places.map((o) => ({ ...o, display: `Charged to: ${o.value ? o.label : "any"}` }));
  const shown = view.groups.some((g) => g.rows.length > 0 || g.more);
  const later = (showLater: boolean) => hrefFor({ showLater, page: state.page });

  return (
    <section aria-label="Renewals" className="flex flex-col gap-3 rounded-[24px] border border-surface-line bg-surface p-4 shadow-soft md:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-3 max-lg:w-full">
          <nav aria-label="Status" className="-mx-4 flex max-w-[calc(100%+32px)] gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:max-w-full lg:gap-0.5 lg:rounded-full lg:bg-fill lg:p-[3px]">
            {view.statuses.map((s) => {
              const on = status === s.value;
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
          {view.picked ? (
            <Link
              href={hrefFor({ subscriptionId: undefined })}
              scroll={false}
              aria-label={`Showing ${view.picked.alias} only. Show every subscription`}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-ink pr-3 pl-2 text-xs font-bold text-on-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:h-[30px]"
            >
              <Mono mark={view.picked} size={16} />
              {view.picked.alias}
              <svg className="opacity-70" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Link>
          ) : (
            <LinkSelect label="Subscription" options={view.subscriptions} hrefs={subscriptionHrefs} value={state.subscriptionId ?? ""} className={SELECT} />
          )}
          <span className="max-lg:hidden">
            <LinkSelect label="Charged to" options={placeOptions} hrefs={placeHrefs} value={state.place ? placeKey(state.place) : ""} className={SELECT} />
          </span>
        </div>
        <div className="flex items-center gap-2.5 max-lg:hidden">
          <Form action="/subscriptions/renewals" scroll={false} role="search" className="w-[250px]">
            {state.subscriptionId && <input type="hidden" name="sub" value={state.subscriptionId} />}
            {periodParam(state.period, today) && <input type="hidden" name="period" value={periodParam(state.period, today)} />}
            {status !== "all" && <input type="hidden" name="status" value={status} />}
            {state.place && <input type="hidden" name={state.place.kind} value={state.place.id} />}
            {state.sort === "oldest" && <input type="hidden" name="sort" value="oldest" />}
            {state.showLater && <input type="hidden" name="later" value="1" />}
            {state.demo && <input type="hidden" name="demo" value="" />}
            <label className="flex h-[34px] items-center gap-2 rounded-full bg-fill px-3.5 text-muted focus-within:outline-2 focus-within:outline-accent">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="sr-only">Search renewals</span>
              <input key={state.search ?? ""} type="search" name="q" defaultValue={state.search} placeholder="Search subscription or amount" className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-fg outline-none placeholder:text-muted" />
            </label>
          </Form>
          <Link
            href={hrefFor({ sort: state.sort === "oldest" ? "newest" : "oldest" })}
            scroll={false}
            aria-label={`Sorted ${state.sort === "oldest" ? "oldest" : "newest"} first. Sort ${state.sort === "oldest" ? "newest" : "oldest"} first instead`}
            className="flex h-[34px] shrink-0 items-center gap-1.5 rounded-full bg-fill px-3.5 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent"
          >
            {state.sort === "oldest" ? "Oldest first" : "Newest first"}
            <Chevron />
          </Link>
        </div>
      </div>

      {view.strip && <SubscriptionStrip strip={view.strip} today={today} />}

      {!shown && view.empty ? (
        <div className="flex flex-col items-center gap-2.5 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-[14px] bg-fill text-muted" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <h2 className="text-[15px] font-extrabold">{view.empty.title}</h2>
          <p className="max-w-[460px] text-xs leading-normal font-medium text-muted">{view.empty.body}</p>
          {view.empty.action && (
            <Link
              href={view.empty.action === "clear-filters" ? hrefFor({ status: "all", subscriptionId: undefined, place: undefined, search: undefined }) : view.empty.action === "show-all-time" ? hrefFor({ period: { kind: "all" } }) : subscriptionsHref}
              scroll={false}
              className="mt-1 inline-flex min-h-11 items-center rounded-full bg-fill px-3.5 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent md:min-h-[30px]"
            >
              {view.empty.action === "clear-filters" ? "Clear filters" : view.empty.action === "show-all-time" ? "Show all time" : "Go to Subscriptions"}
            </Link>
          )}
        </div>
      ) : (
        <div role="table" aria-label="Renewals">
          <div role="rowgroup" className="max-xl:hidden">
            <div role="row" className={`grid gap-3.5 px-2.5 pb-2 ${COLUMNS}`}>
              {HEADERS.map((h) => (
                <span key={h} role="columnheader" className="text-[10px] font-bold tracking-[0.03em] text-muted uppercase">
                  {h}
                </span>
              ))}
              <span role="columnheader">
                <span className="sr-only">Action</span>
              </span>
            </div>
          </div>
          {view.groups.map((g) => (
            <Group key={g.key} group={g} openHref={openHref} moreHref={later(true)} lessHref={later(false)} />
          ))}
        </div>
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
