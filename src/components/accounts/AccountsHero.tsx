"use client";

import type { CSSProperties } from "react";
import type { PickView } from "@/app/accounts/views";
import { colorGradient, type ColorKey } from "@/lib/format/subscriptionLabels";
import { CrossfadeBackground } from "../motion/CrossfadeBackground";
import { RollingNumber } from "../motion/RollingNumber";
import { RingTexture } from "../RingTexture";
import { AccountLine } from "./AccountLine";

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
  const others = picks.filter((p) => p.id !== pick.id);
  return (
    <section aria-label="Your accounts" className="relative isolate overflow-hidden rounded-[28px] p-4 text-fg shadow-[var(--card-shadow)] md:rounded-[36px] md:p-7" style={{ ...STAGE_TOKENS, background: stageBackground(pick.colorKey) }}>
      <CrossfadeBackground background={stageBackground(pick.colorKey)} />
      <RingTexture width={1100} height={560} dx={60} dy={40} first={90} step={60} stroke="var(--rings-light)" opacity={0.07} />

      {!hasAccounts ? (
        <EmptyStage pick={pick} />
      ) : (
        <>
          {/* Desktop: every card in one row, the picked one open. */}
          <div role="tablist" aria-label="Accounts" className="hidden items-stretch gap-3 overflow-x-auto pb-3 md:flex">
            {picks.map((p) => (p.id === pick.id ? <OpenCard key={p.id} pick={p} /> : <Spine key={p.id} pick={p} onPick={onPick} />))}
          </div>
          {/* Phone: the picked card full width, the others under it. */}
          <div className="md:hidden">
            <OpenCard pick={pick} full />
            {others.length > 0 && (
              <div role="tablist" aria-label="Accounts" className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
                {others.map((p) => (
                  <Chip key={p.id} pick={p} onPick={onPick} />
                ))}
              </div>
            )}
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
function OpenCard({ pick, full }: { pick: PickView; full?: boolean }) {
  return (
    <div
      role="tab"
      aria-selected="true"
      className={`relative isolate flex min-h-[220px] shrink-0 flex-col justify-between overflow-hidden rounded-[26px] border border-white/60 p-5 text-on-card shadow-[var(--tile-shadow-selected)] ${closedStyle(pick)} ${full ? "w-full" : "w-[min(480px,60%)] min-w-[360px]"}`}
      style={{ background: cardBackground(pick) }}
    >
      <CrossfadeBackground background={cardBackground(pick)} />
      <RingTexture width={480} height={220} dx={10} dy={20} first={45} step={26} stroke="var(--rings-light)" opacity={0.08} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold text-on-card-muted">{pick.kind === "all" ? "Your balance" : `Your balance · ${pick.bank}`}</div>
          <div className="mt-1 text-[44px] leading-none font-extrabold tracking-tight tabular-nums md:text-[62px]">
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
      </div>
      {pick.stale && <span className="absolute top-14 right-4 rotate-6 rounded border-2 border-[var(--card-copper)] px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-[var(--card-copper)] uppercase">Not read · {pick.daysSince} days</span>}
      {pick.closed && <span className="absolute top-14 right-4 rotate-6 rounded border-2 border-on-card-faint px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-on-card-faint uppercase">Closed</span>}
    </div>
  );
}

const closedStyle = (pick: PickView) => (pick.closed ? "grayscale opacity-80" : "");

/** A folded card: a dark spine with the bank's initial at the top and the name at the bottom, widening under the pointer. */
function Spine({ pick, onPick }: { pick: PickView; onPick: (id: string) => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected="false"
      aria-label={pick.name}
      onClick={() => onPick(pick.id)}
      className={`group/spine relative isolate flex min-h-[220px] w-[64px] shrink-0 cursor-pointer flex-col items-center justify-between overflow-hidden rounded-[22px] border border-on-card-line border-t-on-card-line-top px-2 py-4 text-on-card shadow-[var(--tile-shadow)] transition-[width,transform] duration-300 ease-out hover:w-[92px] focus-visible:w-[92px] focus-visible:outline-2 focus-visible:outline-white motion-reduce:transition-none ${closedStyle(pick)}`}
      style={{ background: cardBackground(pick) }}
    >
      <span className="flex size-8 items-center justify-center rounded-full border border-white/40 text-sm font-extrabold">{pick.kind === "all" ? "∑" : pick.initial}</span>
      <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-extrabold tracking-wide whitespace-nowrap">{pick.name}</span>
      {pick.stale && <i aria-hidden="true" className="absolute top-2 right-2 size-2 rounded-full bg-[var(--card-copper)]" />}
    </button>
  );
}

/** A phone's small card in the row under the open one. */
function Chip({ pick, onPick }: { pick: PickView; onPick: (id: string) => void }) {
  return (
    <button type="button" role="tab" aria-selected="false" onClick={() => onPick(pick.id)} className={`relative flex h-14 min-w-[104px] shrink-0 items-center gap-2 overflow-hidden rounded-2xl px-3 text-on-card shadow-[var(--tile-shadow)] ${closedStyle(pick)}`} style={{ background: cardBackground(pick) }}>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-white/40 text-[11px] font-extrabold">{pick.kind === "all" ? "∑" : pick.initial}</span>
      <span className="max-w-[88px] truncate text-xs font-extrabold">{pick.name}</span>
    </button>
  );
}

/** With no accounts: ₹0, a dashed place where the first card goes, and no line. */
function EmptyStage({ pick }: { pick: PickView }) {
  return (
    <div className="flex min-h-[220px] flex-col items-start justify-between gap-6 rounded-[26px] border-2 border-dashed border-white/30 p-6">
      <div>
        <div className="text-xs font-bold text-muted">Your balance</div>
        <div className="mt-1 text-[44px] leading-none font-extrabold md:text-[62px]">{pick.balance}</div>
      </div>
      <div className="text-sm font-semibold text-muted">No accounts yet. Add your first account and its balance, and its card shows here.</div>
    </div>
  );
}
