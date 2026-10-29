"use client";

import type { PolicyKind } from "@/lib/sheets/types";
import { HEADER_PRIMARY_CLASS } from "../../shell/FormTriggerButton";
import { TileMark } from "../parts";
import { FormTrigger, useInsuranceForms } from "./InsuranceForms";

const KINDS: { kind: PolicyKind; icon: "heart" | "shield" | "car" | "home"; text: string }[] = [
  { kind: "Health", icon: "heart", text: "A sum insured for you or your family" },
  { kind: "Accident", icon: "shield", text: "An owner-driver or personal accident cover" },
  { kind: "Motor", icon: "car", text: "A car or a bike: IDV and no-claim bonus" },
  { kind: "Home", icon: "home", text: "The flat or house, and what's in it" },
];

/** The empty page's button: add the first policy. */
export function AddFirstPolicy() {
  const { open } = useInsuranceForms();
  return <FormTrigger className={HEADER_PRIMARY_CLASS} label="Add your first policy" onClick={() => open({ kind: "add" })} />;
}

/** The empty page's four kinds to start from (InsStates 1): each opens Add policy with that kind chosen. Nothing is invented. */
export function EmptyKinds() {
  const { open, disabledReason } = useInsuranceForms();
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {KINDS.map((k) => (
        <li key={k.kind}>
          <button
            type="button"
            aria-disabled={disabledReason ? true : undefined}
            title={disabledReason}
            onClick={() => open({ kind: "add", start: { policyKind: k.kind } })}
            className="flex h-full w-full flex-col items-start gap-3 rounded-[22px] border border-surface-line bg-surface/60 p-[18px] text-left shadow-soft hover:-translate-y-px hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-60 motion-safe:transition-[transform,background]"
          >
            <TileMark icon={k.icon} size={40} />
            <span>
              <b className="block text-[15px] font-extrabold">{k.kind}</b>
              <span className="block text-xs font-semibold text-muted">{k.text}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
