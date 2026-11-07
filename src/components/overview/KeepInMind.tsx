import Link from "next/link";
import type { OverviewWarning } from "@/app/overview/warnings";
import { PAGE_NAME } from "@/app/overview/warnings";
import { WidgetCard } from "@/components/shell/WidgetCard";

const DOT = { red: "bg-negative", amber: "bg-warning", info: "bg-muted" } as const;

/** Keep in mind: every page's warnings in one list, each tagged with its page, soonest and most pressing first. (The Timeline and the Calendar replace this, #377.) */
export function KeepInMind({ warnings }: { warnings: OverviewWarning[] }) {
  return (
    <WidgetCard title="Keep in mind" note={warnings.length === 0 ? "nothing to look at" : `${warnings.length} ${warnings.length === 1 ? "thing" : "things"} from every page`} label="Keep in mind">
      {warnings.length === 0 ? (
        <p className="text-sm font-semibold text-muted">Nothing outstanding right now.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {warnings.map((w) => (
            <li key={w.id} className="flex items-center gap-3 rounded-[14px] bg-fill px-3.5 py-2.5">
              <i aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${DOT[w.tone]}`} />
              <div className="min-w-0 flex-1">
                <b className="block text-[13.5px] font-extrabold">{w.text}</b>
                <small className="block text-xs font-semibold text-muted">{w.detail}</small>
              </div>
              <span className="hidden shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-extrabold sm:inline">{PAGE_NAME[w.page]}</span>
              <Link href={w.href} className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-extrabold text-on-ink focus-visible:outline-2 focus-visible:outline-accent">{w.act}</Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
