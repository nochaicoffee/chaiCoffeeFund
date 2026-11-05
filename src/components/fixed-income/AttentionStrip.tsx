"use client";

import { useState } from "react";
import type { AttentionItem } from "@/app/fixed-income/views";
import { SMALL_OK } from "../shell/FormTriggerButton";
import { AddEpfStatementButton } from "./AddEpfStatementButton";
import { useDepositForms } from "./forms/DepositForms";
import { useEpfForms } from "./forms/EpfForms";

const TONE = {
  warn: "border-warning/30 bg-warning-tint text-warning-text",
  late: "border-negative/30 bg-negative-tint text-negative",
  ok: "border-accent/30 bg-accent-tint text-accent-text",
} as const;

const HOW = "An estimate, never a credited figure: for each month so far, the balance at the start of the month times the year's rate divided by 12, added up. It reproduces the interest EPFO credited for FY 2024-25 and FY 2025-26 to the rupee, and it is replaced by the credited figure when you import the passbook that has it. Until EPFO declares the year's rate, the latest known one is used and marked assumed.";

/**
 * The strip under the greeting (docs/design/fixed-income.md): an EPF credit that is late, a deposit that has matured and isn't
 * closed, the year's EPF interest not yet credited, and deposits missing their bank and maturity amount. Each is one line with the
 * button that deals with it.
 */
export function AttentionStrip({ items }: { items: AttentionItem[] }) {
  const deposits = useDepositForms();
  const epf = useEpfForms();
  const [explaining, setExplaining] = useState<string | null>(null);
  if (items.length === 0) return null;
  return (
    <section aria-label="Needs attention" className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.id} className={`flex flex-col gap-2 rounded-[18px] border px-4 py-3 md:px-5 ${TONE[item.tone]}`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="flex min-w-0 flex-1 basis-full items-start gap-2.5 text-[13px] font-semibold sm:basis-auto">
              <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {item.tone === "ok" ? (
                  <polyline points="20 6 9 17 4 12" />
                ) : (
                  <>
                    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </>
                )}
              </svg>
              <span>
                <b className="font-extrabold">{item.title}</b> {item.text}
              </span>
            </p>
            {item.kind === "interest" && (
              <button type="button" aria-expanded={explaining === item.id} onClick={() => setExplaining(explaining === item.id ? null : item.id)} className="min-h-8 rounded-full bg-surface px-3.5 text-xs font-extrabold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
                How it&apos;s worked out
              </button>
            )}
            {item.kind === "incomplete" && item.depositId && (
              <button type="button" onClick={() => deposits.open({ kind: "edit", id: item.depositId! })} className="min-h-8 rounded-full bg-surface px-3.5 text-xs font-extrabold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
                Add them
              </button>
            )}
            {item.kind === "due" && item.depositId && (
              <button type="button" onClick={() => deposits.open({ kind: "close", id: item.depositId! })} className={SMALL_OK}>
                Close it
              </button>
            )}
            {item.kind === "late" && (
              <>
                <AddEpfStatementButton />
                <button type="button" onClick={() => epf.open({ kind: "contribution" })} className="min-h-8 rounded-full bg-surface px-3.5 text-xs font-extrabold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
                  Add the credit
                </button>
              </>
            )}
            {item.kind === "credited" && item.typed && <AddEpfStatementButton label="Import the passbook" />}
          </div>
          {item.kind === "interest" && explaining === item.id && <p className="text-xs font-medium">{HOW}</p>}
        </div>
      ))}
    </section>
  );
}
