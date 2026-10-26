"use client";

import type { CSSProperties } from "react";
import { ALL, type CoverView } from "@/app/loans/views";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import type { ColorKey } from "@/lib/format/colors";
import { RollingNumber } from "../motion/RollingNumber";
import { RingTexture } from "../RingTexture";
import { niceTop } from "../income/chartScale";
import { ColorMark, LoanIcon, Tip, TipBody, fillOf } from "./parts";

/**
 * The Loans page's cover (docs/design/loans.md, LoansN1): dark, as on Subscriptions, and taking the picked loan's
 * colour. A tile per loan picks it (All loans first); under them the EMI cliffs, what leaves each month stepping down
 * as each loan ends, beside the payoff capsules (Prathik's pick R4): principal repaid, with a mark for how far through
 * its term each loan is. The cover sets its own tokens, so everything inside reads on the dark (the hover cards stay
 * light).
 */

const STAGE: CSSProperties = {
  "--surface": "oklch(1 0 0 / 0.065)",
  "--surface-line": "oklch(1 0 0 / 0.12)",
  "--fg": "oklch(0.96 0.004 260)",
  "--muted": "oklch(1 0 0 / 0.6)",
  "--fill": "oklch(1 0 0 / 0.08)",
  "--fill-strong": "oklch(1 0 0 / 0.17)",
  "--divider": "oklch(1 0 0 / 0.11)",
  "--ink": "oklch(0.97 0.004 260)",
  "--on-ink": "oklch(0.16 0.01 260)",
} as CSSProperties;

const stage = (c: ColorKey) =>
  `radial-gradient(1200px 800px at 6% -8%, color-mix(in oklch, var(--card-${c}) 78%, transparent), transparent 64%), radial-gradient(1000px 700px at 104% 104%, color-mix(in oklch, var(--card-${c}) 46%, transparent), transparent 70%), linear-gradient(180deg, color-mix(in oklch, var(--card-${c}-from) 72%, black), color-mix(in oklch, var(--card-${c}-to) 90%, black))`;

export function LoansCover({ cover, pickId, onPick }: { cover: CoverView; pickId: string; onPick: (id: string) => void }) {
  return (
    <section aria-label="Your loans" className="relative isolate flex min-w-0 flex-col gap-6 overflow-hidden rounded-[26px] border border-[oklch(1_0_0/0.12)] p-5 text-fg md:p-7" style={STAGE}>
      {cover.tiles.map((t) => (
        <div key={t.id} aria-hidden="true" className="absolute inset-0 -z-10 motion-safe:transition-opacity motion-safe:duration-700" style={{ background: stage(t.colorKey), opacity: t.id === pickId ? 1 : 0 }} />
      ))}
      <RingTexture width={1416} height={760} dx={60} dy={60} first={60} step={30} stroke="var(--rings-light)" opacity={0.1} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" role="group" aria-label="Pick a loan">
        {cover.tiles.map((t) => {
          const on = t.id === pickId;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(t.id)}
              className="flex min-w-0 cursor-pointer flex-col gap-3 rounded-[22px] border px-5 py-4 text-left backdrop-blur-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)] motion-safe:transition-[background,border-color,box-shadow,transform] motion-safe:duration-300 hover:-translate-y-0.5"
              style={{
                background: on ? `color-mix(in oklch, var(--card-${t.colorKey}) 26%, oklch(1 0 0 / 0.04))` : "oklch(1 0 0 / 0.045)",
                borderColor: on ? `color-mix(in oklch, var(--card-${t.colorKey}) 70%, white)` : "oklch(1 0 0 / 0.12)",
                boxShadow: on ? `0 0 0 1px color-mix(in oklch, var(--card-${t.colorKey}) 70%, white), 0 12px 34px color-mix(in oklch, var(--card-${t.colorKey}) 38%, transparent)` : undefined,
              }}
            >
              <span className="flex items-center gap-3">
                <LoanIcon category={t.category} colorKey={t.colorKey} size={36} />
                <span className="min-w-0">
                  <b className="block truncate text-[15px] font-extrabold">{t.name}</b>
                  <small className="block truncate text-[11.5px] font-semibold text-muted">{t.sub}</small>
                </span>
              </span>
              <span className="flex items-baseline gap-2">
                <b className="text-[28px] leading-tight font-extrabold tracking-[-0.02em] tabular-nums">{on ? <RollingNumber value={t.owed} format="inr" /> : formatInr(t.owed)}</b>
                <small className="text-xs font-semibold text-muted">still owed</small>
              </span>
              <span aria-hidden="true" className="block h-2.5 overflow-hidden rounded-full bg-fill">
                <i className="block h-full rounded-full" style={{ width: `${Math.max(2, t.repaidShare * 100)}%`, background: fillOf(t.colorKey) }} />
              </span>
              <span className="flex justify-between gap-2.5 text-[11.5px] font-bold text-muted">
                <span>{t.repaidText}</span>
                <span className="truncate">{t.foot}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-2">
        <Cliffs cliffs={cover.cliffs} pickId={pickId} />
        <Capsules capsules={cover.capsules} pickId={pickId} />
      </div>
    </section>
  );
}

const CHART = 230;

function Cliffs({ cliffs, pickId }: { cliffs: CoverView["cliffs"]; pickId: string }) {
  const top = niceTop(cliffs.top);
  const ticks = [top / 3, (2 * top) / 3, top].map((t) => Math.round(t));
  // Longest loan at the bottom, so each step falls off the top as a loan ends.
  const order = [...cliffs.loans].sort((a, b) => (a.end < b.end ? 1 : -1));
  const years = [...new Set(cliffs.months.map((m) => m.key.slice(0, 4)))];
  const n = cliffs.months.length;
  const nowAt = cliffs.months.findIndex((m) => m.key === cliffs.now);
  const flagAt = (month: string) => cliffs.months.findIndex((m) => m.key === month);
  // A year label every `step` years; on a phone every other one of those.
  const step = Math.max(1, Math.ceil(years.length / 9));

  return (
    <figure className="m-0 flex min-w-0 flex-col gap-3">
      <figcaption className="text-[15px] font-extrabold">
        EMI cliffs <small className="ml-2 text-xs font-semibold text-muted">what leaves each month · hover a year</small>
      </figcaption>
      <div className="flex flex-wrap gap-2">
        {cliffs.flags.map((f) => (
          <span key={f.loanId} className={`inline-flex items-center gap-2 rounded-[10px] border border-surface-line bg-[oklch(0_0_0/0.35)] px-2.5 py-1.5 text-[11px] font-bold motion-safe:transition-opacity ${pickId !== ALL && pickId !== f.loanId ? "opacity-30" : ""}`}>
            <ColorMark colorKey={cliffs.loans.find((l) => l.id === f.loanId)!.colorKey} />
            <span>
              <b className="block font-extrabold">{f.name} ends</b>
              <span className="text-muted">{f.text}</span>
            </span>
          </span>
        ))}
      </div>
      <div className="relative" style={{ height: CHART + 24 }}>
        {ticks.map((t) => (
          <div key={t} aria-hidden="true" className="absolute right-0 left-0 border-t border-dashed border-divider" style={{ bottom: (t / top) * CHART + 24 }}>
            <span className="absolute -top-2.5 right-0 pl-1 text-[10px] font-bold text-muted">{formatInrCompact(t)}</span>
          </div>
        ))}
        <div className="absolute top-0 right-10 bottom-6 left-0 flex items-end" aria-hidden="true">
          {cliffs.months.map((m, k) => (
            <span key={m.key} className="flex h-full min-w-0 flex-1 flex-col-reverse">
              {order.map((l) => {
                const amount = m.byLoan[l.id] ?? 0;
                if (!amount) return null;
                const future = k > nowAt;
                return (
                  <i
                    key={l.id}
                    className="block w-full motion-safe:transition-opacity motion-safe:duration-300"
                    style={{
                      height: (amount / top) * CHART,
                      background: future ? `color-mix(in oklch, var(--card-${l.colorKey}) 55%, oklch(0.6 0.02 260))` : `var(--card-${l.colorKey})`,
                      opacity: pickId !== ALL && pickId !== l.id ? 0.18 : 1,
                    }}
                  />
                );
              })}
            </span>
          ))}
        </div>
        {nowAt >= 0 && (
          <div aria-hidden="true" className="absolute top-0 bottom-6 border-l-2 border-[var(--fg)]/80" style={{ left: `calc((100% - 40px) * ${(nowAt + 0.5) / n})` }}>
            <span className="absolute bottom-2 left-2 rounded-full bg-[oklch(0_0_0/0.55)] px-2 py-0.5 text-[10.5px] font-extrabold whitespace-nowrap">Today · {cliffs.today}</span>
          </div>
        )}
        {cliffs.flags.map((f) => {
          const at = flagAt(f.month);
          return at < 0 ? null : <div key={f.loanId} aria-hidden="true" className="absolute top-0 bottom-6 border-l border-dashed border-[var(--fg)]/40" style={{ left: `calc((100% - 40px) * ${(at + 1) / n})` }} />;
        })}
        {/* A hover zone per year, with what leaves in it. */}
        <div className="absolute top-0 right-10 bottom-0 left-0 flex">
          {years.map((y) => {
            const months = cliffs.months.filter((m) => m.key.startsWith(y));
            const total = months.reduce((t, m) => t + m.total, 0);
            const byLoan = order.map((l) => ({ l, amount: months.reduce((t, m) => t + (m.byLoan[l.id] ?? 0), 0) })).filter((x) => x.amount > 0);
            const first = cliffs.months.indexOf(months[0]);
            return (
              <Tip
                key={y}
                className="flex h-full flex-col justify-end"
                style={{ width: `${(months.length / n) * 100}%` }}
                label={`${y}: ${formatInr(total)}`}
                width={240}
                align={first / n > 0.7 ? "right" : first / n < 0.15 ? "left" : "center"}
                card={<TipBody head={y} total={formatInr(total)} detail={`${months.length} months of EMIs`} rows={byLoan.map(({ l, amount }) => ({ name: l.name, amount: formatInr(amount), mark: <ColorMark colorKey={l.colorKey} /> }))} />}
              >
                <span className="block h-full w-full rounded-md hover:bg-[var(--fill)]" />
              </Tip>
            );
          })}
        </div>
        <div aria-hidden="true" className="absolute right-10 bottom-0 left-0 flex h-5 items-end text-[10.5px] font-extrabold text-muted">
          {years.map((y, k) => {
            const months = cliffs.months.filter((m) => m.key.startsWith(y)).length;
            return (
              <span key={y} className={`min-w-0 overflow-visible whitespace-nowrap ${(k / step) % 2 === 1 ? "max-sm:invisible" : ""}`} style={{ width: `${(months / n) * 100}%` }}>
                {k % step === 0 ? y : ""}
              </span>
            );
          })}
        </div>
      </div>
      <span className="flex gap-4 text-[11.5px] font-semibold text-muted" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] bg-[var(--fg)]/80" />
          Paid
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] bg-[var(--fg)]/35" />
          Still to come
        </span>
      </span>
      <p className="sr-only">{cliffs.flags.map((f) => `${f.name} ends ${f.text}.`).join(" ")}</p>
    </figure>
  );
}

function Capsules({ capsules, pickId }: { capsules: CoverView["capsules"]; pickId: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h3 className="text-[15px] font-extrabold">
        Payoff <small className="ml-2 text-xs font-semibold text-muted">principal repaid, and how far through its term</small>
      </h3>
      <ul className="flex flex-1 flex-col justify-center">
        {capsules.map((c) => (
          <li key={c.id} className={`grid grid-cols-[minmax(0,150px)_minmax(0,1fr)_56px] items-center gap-4 py-3 motion-safe:transition-opacity motion-safe:duration-300 max-sm:grid-cols-[minmax(0,1fr)_56px] ${pickId !== ALL && pickId !== c.id ? "opacity-20" : ""}`}>
            <span className="flex min-w-0 items-center gap-2.5">
              <LoanIcon category={c.category} colorKey={c.colorKey} size={30} />
              <span className="min-w-0">
                <b className="block truncate text-[13px] font-extrabold">{c.name}</b>
                <small className="block truncate text-[11px] font-semibold text-muted">{c.owed}</small>
              </span>
            </span>
            <span className="min-w-0 max-sm:col-span-2 max-sm:row-start-2">
              <span className="relative block h-6 rounded-full bg-fill" aria-hidden="true">
                <i className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(3, c.repaidShare * 100)}%`, background: fillOf(c.colorKey) }} />
                <b className="absolute -top-[5px] -bottom-[5px] w-[3px] rounded-sm bg-[var(--fg)] opacity-85" style={{ left: `${c.termShare * 100}%` }} />
              </span>
              <span className="mt-1.5 flex justify-between text-[10.5px] font-bold text-muted">
                <span>principal repaid</span>
                <span>{Math.round(c.termShare * 100)}% of its term</span>
              </span>
            </span>
            <b className="text-right text-[22px] font-extrabold tabular-nums">{Math.round(c.repaidShare * 100)}%</b>
            <span className="sr-only">
              {c.name}: {Math.round(c.repaidShare * 100)}% of the principal repaid, {Math.round(c.termShare * 100)}% of the way through its term.
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs font-semibold text-muted">The bar is principal repaid; the white mark is how far through its term the loan is.</p>
    </div>
  );
}
