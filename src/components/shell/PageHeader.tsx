import { connection } from "next/server";
import type { ReactNode } from "react";
import { formatHeaderDate } from "@/lib/format/date";

/**
 * The top of every page, as in the design: a small "Cards · Sat, 17 Oct"
 * eyebrow (or, on a sub-page, a back link in its place), the page title,
 * optional content under it, and page actions on the right.
 * The title shares its row with the actions; the content under it spans the
 * whole width, so a row of actions never squeezes the summary into a narrow
 * column. On a phone it reads title, content, then actions.
 * It reads the clock, so it waits for a real request (`connection()`) rather
 * than being prerendered with the build date.
 */
export async function PageHeader({
  section,
  eyebrow,
  title,
  actions,
  children,
}: {
  section: string;
  /** Replaces the "Section · date" line, e.g. with a back link on a sub-page. */
  eyebrow?: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  await connection();
  const today = formatHeaderDate();
  return (
    <header
      className={`grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1fr)_auto] ${
        // Only the rows there's content for, so a missing one leaves no extra gap.
        children
          ? "[grid-template-areas:'title'_'body'_'actions'] lg:[grid-template-areas:'title_actions'_'body_body']"
          : "[grid-template-areas:'title'_'actions'] lg:[grid-template-areas:'title_actions']"
      }`}
    >
      <div className="flex min-w-0 flex-col gap-3 [grid-area:title]">
        <div className="text-xs font-bold tracking-[0.04em] text-muted uppercase">{eyebrow ?? `${section} · ${today}`}</div>
        <h1 className="text-[26px] leading-tight font-extrabold text-balance text-fg md:text-[30px]">{title}</h1>
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2.5 mt-1 [grid-area:actions] lg:justify-end">{actions}</div>}
      {children && <div className="flex min-w-0 max-w-[960px] flex-col gap-3 [grid-area:body]">{children}</div>}
    </header>
  );
}
