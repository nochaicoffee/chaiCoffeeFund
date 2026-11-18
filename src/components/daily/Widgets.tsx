import Link from "next/link";
import type { MonthsView, WhereView, WidgetVisual, WidgetView } from "@/app/daily/views";
import { WidgetCard } from "@/components/shell/WidgetCard";
import { CategoryTile } from "./CategoryPicker";

const toneClass = (t: "ok" | "warn" | "neg") => (t === "ok" ? "" : t);

function Visual({ v }: { v: WidgetVisual }) {
  switch (v.kind) {
    case "bar":
      return (
        <span className="gl-bar" aria-hidden="true">
          <i className={toneClass(v.tone)} style={{ width: `${Math.min(100, v.fraction * 100)}%` }} />
        </span>
      );
    case "track":
      return (
        <span className="gl-bar" aria-hidden="true">
          <i className={toneClass(v.tone)} style={{ width: `${v.fraction * 100}%` }} />
          <u style={{ left: `${v.tick * 100}%` }} />
        </span>
      );
    case "week":
      return (
        <div className="wdays" aria-hidden="true">
          {v.days.map((d, i) => (
            <span key={i} className={`wd${d.today ? " cur" : ""}${d.future ? " fut" : ""}`}>
              <i style={{ height: `${d.height}%` }} />
              <em>{d.label}</em>
            </span>
          ))}
        </div>
      );
    case "columns": {
      const labels = v.bars.some((b) => b.label);
      return (
        <div className="mb" aria-hidden="true">
          <div className="mb-plot">
            {v.bars.map((b, i) => (
              <i key={i} className={b.className} style={{ height: `${b.height}%` }} />
            ))}
            {v.line !== undefined && <u style={{ bottom: `${v.line}%` }} />}
          </div>
          {labels && (
            <div className="mb-l">
              {v.bars.map((b, i) => (
                <span key={i}>{b.label}</span>
              ))}
            </div>
          )}
        </div>
      );
    }
    case "stack":
      return (
        <div className="sp2">
          <span className="sp2-b" aria-hidden="true">
            {v.segments.map((s, i) => (
              <i key={i} style={{ width: `${s.width}%`, background: `var(--card-${s.colorKey})` }} />
            ))}
          </span>
          <span className="sp2-l">
            {v.legend.map((l) => (
              <span key={l.name}>
                <i className="md" style={{ background: `var(--card-${l.colorKey})` }} />
                {l.name} <b>{l.percent}</b>
              </span>
            ))}
          </span>
        </div>
      );
    case "bigs":
      return (
        <div className="bl">
          {v.rows.map((r, i) => (
            <div key={i} className="bl-r">
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
      return (
        <div className="sp2">
          <span className="sp2-b" aria-hidden="true">
            <i style={{ width: `${v.upi * 100}%`, background: "var(--card-teal)" }} />
            <i style={{ width: `${v.card * 100}%`, background: "var(--card-ruby)" }} />
          </span>
          <span className="sp2-l">
            {v.legend.map((l) => (
              <span key={l.name}>
                <i className="md" style={{ background: `var(--card-${l.colorKey})` }} />
                {l.name} <b>{l.percent}</b>
              </span>
            ))}
          </span>
        </div>
      );
    case "pills":
      return (
        <div className="pills" aria-hidden="true">
          {v.pills.map((p, i) => (
            <span key={i} className={`pl ${p.state}`}>
              {p.text}
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
      <div className="gl-vis">
        <Visual v={w.visual} />
      </div>
    </div>
  );
}

export const Widgets = ({ widgets }: { widgets: WidgetView[] }) => (
  <div className="glance">
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
          {view.rows.map((r) => (
            <div key={r.id} className="ww-r">
              <CategoryTile category={r} />
              <b className="ww-n">{r.name}</b>
              <span className="ww-bar">
                <span style={{ width: `${r.fraction * 100}%`, background: `var(--card-${r.colorKey})` }} />
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
              <span style={{ width: `${r.upi * 100}%`, background: "var(--card-teal)" }} />
              <span style={{ width: `${r.card * 100}%`, background: "var(--card-ruby)" }} />
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
