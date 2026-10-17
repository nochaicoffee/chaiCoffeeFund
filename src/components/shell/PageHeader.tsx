import { connection } from "next/server";
import type { ReactNode } from "react";
import { formatHeaderDate } from "@/lib/format/date";

/**
 * The top of every page, as in the design: a small "Cards · Sat, 17 Oct"
 * eyebrow (or, on a sub-page, a back link in its place), the page title,
 * optional content under it, and page actions on the right.
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
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 lg:flex-nowrap">
      <div className="flex w-full min-w-0 max-w-[960px] flex-col gap-3 lg:w-auto lg:flex-1">
        <div className="text-xs font-bold tracking-[0.04em] text-muted uppercase">{eyebrow ?? `${section} · ${today}`}</div>
        <h1 className="text-[26px] leading-tight font-extrabold text-balance text-fg md:text-[30px]">{title}</h1>
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5 md:mt-1">{actions}</div>}
    </header>
  );
}
