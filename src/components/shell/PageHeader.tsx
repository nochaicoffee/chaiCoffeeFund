import { connection } from "next/server";
import type { CSSProperties, ReactNode } from "react";
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
/**
 * A section's name as the key of its Neubrutalism tag colour, `--tag-bg-<key>` (ADR 0018 step 5b): "Lent out" → "lent-out".
 * Anything but letters and digits becomes one hyphen, so the key is always a valid custom property name.
 */
export function sectionKey(section: string): string {
  return section.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * The tag's classes. Every value is a token only Neubrutalism sets, falling back to what the plain eyebrow text was,
 * so in Classic the tag is just its words: same font, size, line and colour as the rest of the line.
 */
const TAG =
  "[display:var(--tag-display,inline)] rounded-full border-solid border-[length:var(--tag-edge,0px)] border-[color:var(--ink)] bg-[var(--tag-bg,transparent)] px-[var(--tag-pad-x,0px)] py-[var(--tag-pad-y,0px)] font-[family-name:var(--font-label,var(--font-sans))] text-[length:var(--tag-size,1em)] leading-[var(--tag-leading,var(--text-xs--line-height))] text-[color:var(--tag-color,currentColor)]";

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
  // The section's colour, for its tag and the marker under the greeting's figures. Only Neubrutalism defines
  // --tag-bg-<key>, so in Classic both stay unset and every use falls back.
  const key = sectionKey(section);
  const accent = {
    "--tag-bg": `var(--tag-bg-${key})`,
    "--figure-mark": `linear-gradient(transparent 58%, var(--tag-bg-${key}) 58%)`,
  } as CSSProperties;
  return (
    <header
      style={accent}
      className={`grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1fr)_auto] ${
        // Only the rows there's content for, so a missing one leaves no extra gap.
        children
          ? "[grid-template-areas:'title'_'body'_'actions'] lg:[grid-template-areas:'title_actions'_'body_body']"
          : "[grid-template-areas:'title'_'actions'] lg:[grid-template-areas:'title_actions']"
      }`}
    >
      <div className="flex min-w-0 flex-col gap-3 [grid-area:title]">
        <div className="text-xs font-bold tracking-[0.04em] text-muted uppercase label-face">
          {eyebrow ?? (
            <>
              <span className={TAG}>{section}</span>
              <span className="[display:var(--eyebrow-sep,inline)]"> · </span>
              <span className="ml-[var(--eyebrow-gap,0px)]">{today}</span>
            </>
          )}
        </div>
        <h1 className="text-[length:var(--greeting-size-sm,26px)] leading-[var(--greeting-leading,1.25)] [font-weight:var(--greeting-weight,800)] [letter-spacing:var(--greeting-tracking,normal)] text-balance text-fg md:text-[length:var(--greeting-size,30px)]">
          {title}
        </h1>
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2.5 mt-1 [grid-area:actions] lg:justify-end">{actions}</div>}
      {children && <div className="flex min-w-0 max-w-[960px] flex-col gap-3 [grid-area:body]">{children}</div>}
    </header>
  );
}
