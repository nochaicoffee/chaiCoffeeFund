"use client";

import type { CSSProperties } from "react";
import type { PickView } from "@/app/accounts/views";
import { colorGradient, type ColorKey } from "@/lib/format/subscriptionLabels";
import { CrossfadeBackground } from "../motion/CrossfadeBackground";
import { RollingNumber } from "../motion/RollingNumber";
import { RingTexture } from "../RingTexture";
import { AccountLine } from "./AccountLine";
import { FormTrigger, HeroButtons, useAccountForms } from "./forms/AccountForms";

/**
 * The Accounts page's hero (docs/design/accounts.md, "The final design"): the cards are the
 * hero. A row of account cards across a stage; the picked one is open, showing its balance,
 * the rest fold into dark spines that show the bank's initial and the account's name. The
 * stage takes the pick's colour (fading over 650ms), and the white line and four figures
 * under it follow the pick. On a phone the picked card is full width with the others in a
 * row under it to switch (a folded-card row scrolled the open card out of view).
 */

/** The coloured stage's own tokens, so text and fills read on any pick's colour. */
const STAGE_TOKENS = {
  "--fg": "oklch(0.97 0.004 260)",
  "--muted": "oklch(1 0 0 / 0.62)",
  "--divider": "oklch(1 0 0 / 0.14)",
  "--fill": "oklch(1 0 0 / 0.12)",
  "--fill-strong": "oklch(1 0 0 / 0.22)",
} as CSSProperties;

const stageBackground = (color: ColorKey) => `radial-gradient(circle at 50% -10%, oklch(1 0 0 / 0.2), transparent 55%), ${colorGradient(color, 165)}`;
const cardBackground = (pick: PickView) => (pick.kind === "all" ? `radial-gradient(circle at 92% 6%, var(--card-emerald-glow), transparent 42%), ${colorGradient("emerald", 150)}` : colorGradient(pick.colorKey));

export function AccountsHero({ picks, pickId, onPick, hasAccounts }: { picks: PickView[]; pickId: string; onPick: (id: string) => void; hasAccounts: boolean }) {
  const pick = picks.find((p) => p.id === pickId) ?? picks[0];
  return (
    <section aria-label="Your accounts" className="relative isolate overflow-hidden rounded-[28px] p-4 text-fg shadow-[var(--card-shadow)] md:rounded-[36px] md:p-7" style={{ ...STAGE_TOKENS, background: stageBackground(pick.colorKey) }}>
      <CrossfadeBackground background={stageBackground(pick.colorKey)} />
      <RingTexture width={1100} height={560} dx={60} dy={40} first={90} step={60} stroke="var(--rings-light)" opacity={0.07} />

      {!hasAccounts ? (
        <EmptyStage pick={pick} />
      ) : (
        <>
          {/* One row on a desktop, the picked card open and the rest folded to spines. On a phone the picked card is full width, first, and the rest wrap under it as chips. */}
          <div role="group" aria-label="Accounts" className="flex flex-wrap items-stretch gap-2 md:flex-nowrap md:gap-3 md:overflow-x-auto md:pb-3">
            {picks.map((p) => (p.id === pick.id ? <OpenCard key={p.id} pick={p} /> : <FoldedCard key={p.id} pick={p} onPick={onPick} />))}
          </div>
        </>
      )}

      {hasAccounts && (
        <>
          <div className="mt-4">
            <AccountLine line={pick.line} />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-divider pt-4 md:grid-cols-4">
            {pick.figures.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-[11px] font-bold text-muted">{f.label}</dt>
                <dd className={`mt-0.5 text-lg leading-tight font-extrabold tabular-nums md:text-xl ${f.warn ? "text-[var(--card-copper)]" : ""}`}>{f.value}</dd>
                {f.note && <dd className="text-[11px] font-semibold text-muted">{f.note}</dd>}
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}

/** The picked card, open: its balance large, who and when under it, its purpose as a chip at the top right. */
function OpenCard({ pick }: { pick: PickView }) {
  return (
    <div
      aria-current="true"
      className={`relative isolate flex min-h-[220px] shrink-0 flex-col justify-between overflow-hidden rounded-[26px] border border-white/60 p-5 text-on-card shadow-[var(--tile-shadow-selected)] ${closedStyle(pick)} order-first w-full md:order-none md:w-[min(480px,60%)] md:min-w-[360px]`}
      style={{ background: cardBackground(pick) }}
    >
      <CrossfadeBackground background={cardBackground(pick)} />
      <RingTexture width={480} height={220} dx={10} dy={20} first={45} step={26} stroke="var(--rings-light)" opacity={0.08} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold text-on-card-muted">{pick.kind === "all" ? "Your balance" : `Your balance · ${pick.bank}`}</div>
          <div className={`mt-1 leading-none font-extrabold tracking-tight tabular-nums whitespace-nowrap ${pick.balance.length > 11 ? "text-[24px] md:text-[40px]" : pick.balance.length > 9 ? "text-[30px] md:text-[48px]" : pick.balance.length > 7 ? "text-[36px] md:text-[62px]" : "text-[44px] md:text-[62px]"}`}>
            <RollingNumber value={pick.balanceValue} format="inr" />
          </div>
        </div>
        {pick.purpose && <span className="shrink-0 rounded-full bg-on-card-fill px-3 py-1 text-[11px] font-bold">{pick.purpose}</span>}
      </div>
      <div>
        <div className="flex items-baseline gap-2 text-base font-extrabold">
          <span className="min-w-0 truncate">{pick.name}</span>
          {pick.last4 && <span className="text-xs font-semibold text-on-card-faint">•••• {pick.last4}</span>}
        </div>
        <div className={`mt-0.5 text-xs font-semibold ${pick.stale ? "text-[var(--card-copper)]" : "text-on-card-muted"}`}>{pick.updated}</div>
        <div className={`text-xs font-semibold ${pick.changeTone === "up" ? "text-on-card-lime" : "text-on-card-muted"}`}>{pick.change}</div>
        <div className="mt-3">
          <HeroButtons pickId={pick.id} kind={pick.kind} closed={pick.closed} />
        </div>
      </div>
      {pick.stale && <span className="absolute top-14 right-4 rotate-6 rounded border-2 border-[var(--card-copper)] px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-[var(--card-copper)] uppercase">Not read · {pick.daysSince} days</span>}
      {pick.closed && <span className="absolute top-14 right-4 rotate-6 rounded border-2 border-on-card-faint px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-on-card-faint uppercase">Closed</span>}
    </div>
  );
}

const closedStyle = (pick: PickView) => (pick.closed ? "grayscale opacity-80" : "");

/**
 * A folded card. On a desktop it's a dark spine with the bank's initial at the top and the name
 * running up it at the bottom, widening under the pointer; on a phone it's a small chip, the
 * initial and the name side by side.
 */
function FoldedCard({ pick, onPick }: { pick: PickView; onPick: (id: string) => void }) {
  return (
    <button
      type="button"
      aria-pressed="false"
      aria-label={pick.name}
      onClick={() => onPick(pick.id)}
      className={`group/spine relative isolate flex h-14 min-w-[104px] shrink-0 cursor-pointer items-center gap-2 overflow-hidden rounded-2xl px-3 text-on-card shadow-[var(--tile-shadow)] focus-visible:outline-2 focus-visible:outline-white md:h-auto md:min-h-[220px] md:w-[64px] md:min-w-0 md:flex-col md:justify-between md:gap-0 md:rounded-[22px] md:border md:border-on-card-line md:border-t-on-card-line-top md:px-2 md:py-4 md:transition-[width] md:duration-300 md:ease-out md:hover:w-[92px] md:focus-visible:w-[92px] motion-reduce:transition-none ${closedStyle(pick)}`}
      style={{ background: cardBackground(pick) }}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-white/40 text-[11px] font-extrabold md:size-8 md:text-sm">{pick.kind === "all" ? "∑" : pick.initial}</span>
      <span className="max-w-[88px] truncate text-xs font-extrabold md:max-w-none md:[writing-mode:vertical-rl] md:rotate-180 md:tracking-wide md:whitespace-nowrap">{pick.name}</span>
      {pick.stale && <i aria-hidden="true" className="absolute top-2 right-2 size-2 rounded-full bg-[var(--card-copper)]" />}
    </button>
  );
}

/** With no accounts: ₹0, a dashed place where the first card goes, and no line. */
function EmptyStage({ pick }: { pick: PickView }) {
  const { open } = useAccountForms();
  return (
    <div className="flex min-h-[220px] flex-col items-start justify-between gap-6 rounded-[26px] border-2 border-dashed border-white/30 p-6">
      <div>
        <div className="text-xs font-bold text-muted">Your balance</div>
        <div className="mt-1 text-[44px] leading-none font-extrabold md:text-[62px]">{pick.balance}</div>
      </div>
      <div className="flex flex-col items-start gap-3">
        <div className="text-sm font-semibold text-muted">No accounts yet. Add your first account and its balance, and its card shows here.</div>
        <FormTrigger className="min-h-10 rounded-full bg-white px-5 text-[13px] font-extrabold text-[var(--ink)] hover:opacity-90" label="Add your first account" onClick={() => open({ kind: "add" })} />
      </div>
    </div>
  );
}
