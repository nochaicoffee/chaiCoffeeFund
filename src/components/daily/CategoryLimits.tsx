"use client";

import Link from "next/link";
import type { LimitRowView, LimitsView } from "@/app/daily/views";
import { WidgetCard } from "@/components/shell/WidgetCard";
import { CategoryTile } from "./CategoryPicker";
import { useDaily } from "./context";

const barColor = (r: LimitRowView) => (r.state === "over" ? "var(--negative)" : r.state === "near" ? "var(--warning)" : `var(--card-${r.colorKey})`);

/** A row above the card: which categories are over their limit or near it. Nothing is shown when none is. */
export function NeedsLook({ view }: { view: LimitsView }) {
  if (view.attention.length === 0) return null;
  return (
    <p className="nl" role="status">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span className="nl-t">
        {view.attention.map((a, i) => (
          <span key={a.id}>
            {i > 0 && " · "}
            <span className={a.state === "over" ? "nl-over" : ""}>{a.text}</span>
          </span>
        ))}
      </span>
    </p>
  );
}

/**
 * Where the month went, against each category's limit (docs/design/daily.md, round 6, L1): a bar per category that is its limit, with 80% ticked, red once
 * it's passed, and what's left or over, and what the category had by the same day of the month before. A row opens that category's spends. With no limits set, a prompt to set some.
 */
export function CategoryLimitsCard({ view }: { view: LimitsView }) {
  const daily = useDaily();
  const edit = (
    <button type="button" className="cl-edit" onClick={daily.openLimit}>
      Edit limits
    </button>
  );
  if (!view.hasLimits) {
    return (
      <WidgetCard label="Category limits" title="Category limits" note="optional" right={edit}>
        <p className="cl-empty">Give a category a limit, like ₹6,000 for Food, and this shows how far through each one is, and warns you when one is close.</p>
      </WidgetCard>
    );
  }
  return (
    <WidgetCard label={view.title} title={view.title} note={view.note} right={edit}>
      <div className="lm" role="list">
        {view.rows.map((r) => (
          <Link key={r.id} role="listitem" href={`/daily/entries?month=${view.month}&category=${r.id}`} className={`lm-r ${r.state}`} aria-label={`${r.name}: see its spends`}>
            <CategoryTile category={r} />
            <span className="lm-n">
              <b>{r.name}</b>
              {r.vs && <small className={`vs ${r.vs.tone}`}>{r.vs.tone === "up" ? "↑" : "↓"} {r.vs.text}</small>}
            </span>
            <span className={`lm-bar ${r.state}`} aria-hidden="true">
              <i style={{ width: `${(r.state === "none" ? 0 : r.fraction) * 100}%`, background: barColor(r) }} />
              {r.state !== "none" && <u />}
            </span>
            <span className="lm-v">
              <b>{r.spent}</b>
              {r.of && <small>{r.of}</small>}
            </span>
            <span className={`pill lm-pill ${r.state}`}>{r.status}</span>
          </Link>
        ))}
      </div>
      {view.footnote && <p className="card-note foot">{view.footnote}</p>}
    </WidgetCard>
  );
}
