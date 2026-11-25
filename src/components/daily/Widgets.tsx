import Link from "next/link";
import type { CSSProperties } from "react";
import type { MonthsView, WhereView, WidgetVisual, WidgetView } from "@/app/daily/views";
import { WidgetCard } from "@/components/shell/WidgetCard";
import { CategoryTile } from "./CategoryPicker";
import { LinkedBar } from "./LinkedBar";

const toneClass = (t: "ok" | "warn" | "neg") => (t === "ok" ? "" : t);
/** A bar's place in its row, which staggers its grow-in. */
const nth = (i: number) => ({ "--i": i }) as CSSProperties;

function Visual({ v }: { v: WidgetVisual }) {
  switch (v.kind) {
    case "bar":
      return (
        <span className="gl-bar" role="img" tabIndex={0} aria-label={v.tip} data-tip={v.tip}>
          <i className={toneClass(v.tone)} style={{ width: `${Math.min(100, v.fraction * 100)}%` }} />
        </span>
      );
    case "track":
      return (
        <span className="gl-bar" role="img" tabIndex={0} aria-label={v.tip} data-tip={v.tip}>
          <i className={toneClass(v.tone)} style={{ width: `${v.fraction * 100}%` }} />
          <u style={{ left: `${v.tick * 100}%` }} />
        </span>
      );
    case "week":
      return (
        <div className="wdays">
          {v.days.map((d, i) => (
            <span key={i} className={`wd${d.today ? " cur" : ""}${d.future ? " fut" : ""}`}>
              <span className="wd-b" role="img" tabIndex={0} aria-label={d.tip} data-tip={d.tip} style={{ ...nth(i), "--h": `${d.height}%` } as CSSProperties}>
                <i style={{ height: `${d.height}%` }} />
              </span>
              <em aria-hidden="true">{d.label}</em>
            </span>
          ))}
        </div>
      );
    case "columns": {
      const labels = v.bars.some((b) => b.label);
      return (
        <div className="mb">
          <div className="mb-plot">
            {v.bars.map((b, i) => (
              <span key={i} className={`mb-c${b.className ? ` ${b.className}` : ""}`} role="img" tabIndex={0} aria-label={b.tip} data-tip={b.tip} style={{ ...nth(i), "--h": `${b.height}%` } as CSSProperties}>
                <i className={b.className} style={{ height: `${b.height}%` }} />
              </span>
            ))}
            {v.line !== undefined && <u style={{ bottom: `${v.line}%` }} />}
          </div>
          {labels && (
            <div className="mb-l" aria-hidden="true">
              {v.bars.map((b, i) => (
                <span key={i}>{b.label}</span>
              ))}
            </div>
          )}
        </div>
      );
    }
    case "stack":
      return <LinkedBar parts={v.segments} legend={v.legend} />;
    case "bigs":
      return (
        <div className="bl">
          {v.rows.map((r, i) => (
            <div key={i} className="bl-r" style={nth(i)}>
              <CategoryTile small category={{ name: r.tile, colorKey: r.colorKey }} />
              <span>
                <b>{r.title}</b>
                <small>{r.sub}</small>
              </span>
              <b>{r.amount}</b>
            </div>
          ))}
        </div>
      );
    case "split":
      return <LinkedBar parts={v.parts.map((p) => ({ name: p.name, width: p.fraction * 100, colorKey: p.colorKey, tip: p.tip }))} legend={v.legend} />;
    case "pills":
      return (
        <div className="pills">
          {v.pills.map((p, i) => (
            <span key={i} className={`pl ${p.state}`} role="img" tabIndex={0} aria-label={p.tip} data-tip={p.tip} style={nth(i)}>
              <span aria-hidden="true">{p.text}</span>
            </span>
          ))}
        </div>
      );
  }
}

/** One widget (docs/design/daily.md, round 3): a name and its tag ("Now", or the period), the figure, a line under it, and a picture at the foot of the card, level with its neighbours'. */
export function Widget({ w }: { w: WidgetView }) {
  return (
    <div className="gl">
      <div className="w-h">
        <span className="gl-k">{w.title}</span>
        <span className={`w-tag${w.isNow ? " now" : ""}`}>{w.tag}</span>
      </div>
      <b className={`gl-v ${w.valueTone ?? ""}`}>{w.valueColor ? <span className="tc"><CategoryTile small category={{ name: w.value, colorKey: w.valueColor }} /> {w.value}</span> : w.value}</b>
      <span className="gl-s">{w.sub}</span>
      <div className="gl-vis" key={w.tag}>
        <Visual v={w.visual} />
      </div>
    </div>
  );
}

/** `four` lays the row out four across on a desktop (Right now); the others take three. */
export const Widgets = ({ widgets, four = false }: { widgets: WidgetView[]; four?: boolean }) => (
  <div className={`glance${four ? " four" : ""}`}>
    {widgets.map((w) => (
      <Widget key={w.key} w={w} />
    ))}
  </div>
);

export function WhereCard({ view }: { view: WhereView }) {
  return (
    <WidgetCard label={view.title} title={view.title} right={<b className="text-xl font-extrabold tabular-nums">{view.total}</b>}>
      {view.rows.length === 0 ? (
        <div className="empty-box">
          <b>Nothing to split yet</b>
          <small>Give a spend a category when you add it, and this shows which ones took the period.</small>
        </div>
      ) : (
        <div className="ww">
          {view.rows.map((r, i) => (
            <div key={r.id} className="ww-r" style={nth(i)}>
              <CategoryTile category={r} />
              <b className="ww-n">{r.name}</b>
              <span className="ww-bar">
                <span data-tip={r.tip} style={{ width: `${r.fraction * 100}%`, backgroundColor: `var(--card-${r.colorKey})` }} />
              </span>
              <span className="ww-v">
                {r.amount}
                <small>{r.share}</small>
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

export function MonthsCard({ view }: { view: MonthsView }) {
  return (
    <WidgetCard label={view.title} title={view.title} note={view.note} right={view.limitLabel ? <span className="lg-lim"><i />{view.limitLabel}</span> : undefined}>
      <div className="my">
        {view.rows.map((r) => (
          <Link key={r.month} href={r.href} scroll={false} className={`my-r${r.on ? " on" : ""}${r.empty ? " empty" : ""}`} aria-current={r.on ? "true" : undefined}>
            <b>{r.label}</b>
            <span className="mo-bar" aria-hidden="true">
              <span data-tip={r.tips.upi} style={{ width: `${r.upi * 100}%`, backgroundColor: "var(--card-teal)" }} />
              <span data-tip={r.tips.card} style={{ width: `${r.card * 100}%`, backgroundColor: "var(--card-ruby)" }} />
              {r.cash > 0 && <span data-tip={r.tips.cash} style={{ width: `${r.cash * 100}%`, backgroundColor: "var(--card-emerald)" }} />}
              {r.limit !== null && <i className="mo-lim" style={{ left: `${r.limit * 100}%` }} />}
            </span>
            <b className="my-t">{r.total}</b>
            <small className={r.over ? "neg" : ""}>{r.diff}</small>
          </Link>
        ))}
      </div>
    </WidgetCard>
  );
}
