import Link from "next/link";
import type { TileView } from "@/app/overview/views";
import { colorGradient } from "@/lib/format/colors";
import { Tip, TipBody } from "@/components/shell/Tip";
import { Glyph } from "./Glyph";

const FLAG: Record<string, string> = { red: "bg-negative", amber: "bg-warning", info: "bg-on-card-faint" };

/**
 * The twelve tiles (docs/design/overview.md, OvT1): the ten pages and the two sums of the month, each a gradient in its page's colour with
 * its glyph large and faint behind it, its figure, a tag and a line; a dot for each warning its page has; hover for the card; click to go there.
 */
export function Tiles({ tiles }: { tiles: TileView[] }) {
  return (
    <section aria-label="Every page" className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
      {tiles.map((t, i) => (
        <Tip key={t.key} place={i >= 8 ? "up" : "down"} align={i % 4 === 3 ? "right" : i % 4 === 0 ? "left" : "center"} width={300} className="block" label={`${t.name}: ${t.value}`}
          card={<TipBody head={t.card.title} total={t.card.total} detail={t.card.detail} rows={t.card.rows} foot={t.card.foot ?? `Open ${t.name} for the rest.`} />}>
          <Link href={t.href} className="group/tile relative flex min-h-[148px] flex-col gap-1 overflow-hidden rounded-[22px] p-4 text-on-card shadow-[var(--card-shadow)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-accent md:min-h-[168px] md:p-5" style={{ background: colorGradient(t.colorKey) }}>
            <Glyph name={t.glyph} className="pointer-events-none absolute top-1/2 -right-5 size-28 -translate-y-1/2 text-on-card opacity-[0.1] transition-opacity duration-200 group-hover/tile:opacity-[0.16] md:size-32" />
            <span className="relative flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.08em] uppercase opacity-80">
              {t.group}
              <span className="flex gap-1">
                {t.flags.map((tone, k) => (
                  <i key={k} className={`size-2 rounded-full ${FLAG[tone]}`} />
                ))}
              </span>
            </span>
            <span className="relative text-[15px] font-bold">{t.name}</span>
            <span className="relative text-[28px] leading-tight font-extrabold tabular-nums tracking-tight md:text-[32px]">
              {t.value}
              {t.per && <small className="ml-1.5 text-[13px] font-bold opacity-75"> {t.per}</small>}
            </span>
            <span className="relative mt-auto flex flex-wrap items-center gap-2 pt-2 text-xs font-semibold">
              <span className="rounded-full bg-on-card-fill px-2.5 py-0.5 text-[10.5px] font-extrabold tracking-[0.05em] uppercase">{t.tag}</span>
              <span className="opacity-85">{t.sub}</span>
            </span>
          </Link>
        </Tip>
      ))}
    </section>
  );
}
