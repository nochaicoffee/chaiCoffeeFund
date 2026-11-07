import type { MoneyCellView, MoneyInView } from "@/app/investments/views";
import { Tip, TipBody } from "../shell/Tip";
import { WidgetCard } from "../shell/WidgetCard";

/**
 * Money in (docs/design/investments.md): a cell a month for each year since his first trade, deeper for more, coloured by where the money came
 * from (his own buys, an ESPP purchase, an RSU vest), with a red dot on a month he sold. Under it, what each year put in. Each month opens a
 * card of what was bought in it. An RSU vest counts at its fair value.
 */

const MONTHS = "JFMAMJJASOND".split("");
const LEGEND = [
  { colour: "teal", label: "Bought" },
  { colour: "violet", label: "ESPP" },
  { colour: "sapphire", label: "RSU" },
] as const;

function Cell({ c }: { c: MoneyCellView }) {
  const base = "relative block h-[26px] rounded-md";
  if (c.state === "future") return <span aria-hidden="true" className={`${base} border border-dashed border-divider`} />;
  if (c.state === "empty" || !c.tip) return <span aria-hidden="true" className={`${base} bg-fill`} />;
  const style = c.colorKey ? { background: `color-mix(in oklch, var(--card-${c.colorKey}) ${c.percent}%, var(--fill))` } : undefined;
  return (
    <Tip className={`${base} ${c.colorKey ? "" : "bg-fill"}`} style={style} width={230} label={`${c.tip.head}: ${c.tip.total}, ${c.tip.detail}`} card={<TipBody head={c.tip.head} total={c.tip.total} detail={c.tip.detail} rows={c.tip.rows} />}>
      {c.sold && <i aria-hidden="true" className="absolute top-[3px] right-[3px] block size-1.5 rounded-full bg-negative" />}
    </Tip>
  );
}

export function MoneyIn({ view }: { view: MoneyInView }) {
  return (
    <WidgetCard
      label="Money in"
      title="Money in"
      note="a cell a month · deeper is more"
      right={
        <span className="flex gap-3.5 text-[11.5px] font-bold">
          {LEGEND.map((l) => (
            <span key={l.colour} className="flex items-center gap-1.5">
              <i aria-hidden="true" className="block size-[9px] rounded-[3px]" style={{ background: `var(--card-${l.colour})` }} />
              {l.label}
            </span>
          ))}
        </span>
      }
      gap="gap-4"
    >
      <div className="grid grid-cols-[34px_repeat(12,minmax(0,1fr))] items-center gap-1">
        <span />
        {MONTHS.map((m, i) => (
          <span key={i} aria-hidden="true" className="text-center text-[10px] font-extrabold text-muted">{m}</span>
        ))}
        {view.years.map((y) => (
          <div key={y.year} className="contents">
            <span className="text-[11px] font-extrabold text-muted">{y.year}</span>
            {y.cells.map((c) => (
              <Cell key={c.key} c={c} />
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <b className="text-[13px]">Money in by year</b>
        {view.years.map((y) => (
          <div key={y.year} className="grid grid-cols-[38px_1fr_64px] items-center gap-2.5 text-xs font-bold">
            <span>{y.year}</span>
            <span aria-hidden="true" className="block h-2 overflow-hidden rounded-full bg-fill">
              <i className="block h-full rounded-full" style={{ width: `${y.fraction * 100}%`, background: "var(--card-teal)" }} />
            </span>
            <span className="text-right tabular-nums">{y.total}</span>
          </div>
        ))}
      </div>

      <div className="flex items-baseline justify-between border-t border-divider pt-2.5 text-[13px] font-semibold">
        <span className="text-muted">Months with a buy</span>
        <b className="font-extrabold">{view.monthsLine}</b>
      </div>
      <p className="border-t border-divider pt-2.5 text-[11px] font-semibold text-muted">A red dot is a month you sold. An RSU vest counts at its fair value; the shares sold to cover its tax aren&apos;t a sale here.</p>
    </WidgetCard>
  );
}
