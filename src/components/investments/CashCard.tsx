import type { CashTile, CashView } from "@/app/investments/cashView";
import { Tip, TipBody } from "../shell/Tip";
import { WidgetCard } from "../shell/WidgetCard";

/**
 * Cash at your brokers (docs/design/investments.md, F-IV-18): what is idle against the holdings, then a tile for each broker account with
 * its balance in its own money, what that is in rupees, and when it was read. It is today's balances: going back to a day doesn't change it.
 */
export function CashCard({ view }: { view: CashView }) {
  return (
    <WidgetCard label="Cash at your brokers" title="Cash at your brokers" note="uninvested money, outside the worth and the yearly return" gap="gap-4">
      {view.unpriced.length > 0 && (
        <p role="alert" className="rounded-xl bg-warning-tint px-3.5 py-2.5 text-[12.5px] font-bold text-warning-text">
          {view.unpriced.map((u) => `${u.name} ${u.dollars}`).join(", ")} {view.unpriced.length === 1 ? "is" : "are"} left out of the total: {view.reason ?? "today's dollar rate isn't available"}.
        </p>
      )}
      <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
        {view.tiles.length > 0 && <Summary view={view} />}
        {view.tiles.map((t) => (
          <Tile key={t.key} t={t} />
        ))}
      </div>
      <p className="border-t border-divider pt-2.5 text-[11px] font-semibold text-muted">These are today&apos;s balances, each read off a statement or typed in, and they count once in net worth on Accounts. Going back to a day changes the holdings above, not this card: an older balance is in the account&apos;s history.</p>
    </WidgetCard>
  );
}

function Summary({ view }: { view: CashView }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-[18px] bg-fill p-4">
      <div className="text-[10.5px] font-extrabold tracking-[0.05em] text-muted uppercase">Idle at the brokers</div>
      <div className="text-[28px] leading-none font-extrabold tracking-tight tabular-nums">{view.total}</div>
      <div className="text-[12px] font-semibold text-muted">{view.accountsLine}</div>
      <span role="img" aria-label={`Holdings ${view.holdings}, ${view.investedText} of what you have at your brokers; cash ${view.total}, ${view.idleText}`} className="flex h-2 overflow-hidden rounded-full bg-surface">
        <i className="block h-full" style={{ width: `${(1 - view.idle) * 100}%`, background: "var(--card-emerald)" }} />
        <i className="block h-full" style={{ width: `${view.idle * 100}%`, background: "var(--card-amber)" }} />
      </span>
      <p className="m-0 text-[12px] font-semibold">
        <b className="font-extrabold">{view.idleText}</b> of the {view.everything} you have at your brokers is not invested.
      </p>
    </div>
  );
}

function Tile({ t }: { t: CashTile }) {
  const body = (
    <div className="flex h-full min-w-0 flex-col gap-1.5 rounded-[18px] p-4 text-on-card" style={{ background: `linear-gradient(155deg, var(--card-${t.colorKey}-from), var(--card-${t.colorKey}-to))` }}>
      <div className="flex items-center justify-between gap-2 text-[12.5px] font-extrabold">
        <span className="flex min-w-0 items-center gap-2">
          <i aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-md bg-white/20 text-[10px] not-italic">{t.broker.slice(0, 1)}</i>
          <b className="truncate">{t.name}</b>
        </span>
        <span className="rounded-full bg-white/20 px-2 py-px text-[10px]">{t.currency}</span>
      </div>
      <div className="text-[26px] leading-none font-extrabold tracking-tight tabular-nums">{t.balance}</div>
      <div className="text-[12px] font-bold opacity-90">
        {t.inr ? <>≈ {t.inr} <small className="font-semibold opacity-80">{t.rateNote}</small></> : <small className="font-semibold opacity-80">{t.rateNote}</small>}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-2 pt-1 text-[11px] font-semibold opacity-90">
        <span>{t.source} · {t.readOn}</span>
        {t.stale ? <em className="rounded-full bg-warning-tint px-2 py-px text-[10px] font-extrabold text-warning-text not-italic">{t.stale}</em> : <small>{t.age}</small>}
      </div>
    </div>
  );
  return (
    <Tip className="block" place="up" align="center" width={270} label={`${t.name}: ${t.balance}. What is behind it.`} card={<TipBody head={t.tip.head} total={t.tip.total} detail={t.tip.detail} rows={t.tip.rows} foot={t.tip.foot} />}>
      {body}
    </Tip>
  );
}
