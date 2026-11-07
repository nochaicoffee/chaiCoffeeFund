"use client";

import { SMALL_OK } from "../shell/FormTriggerButton";
import { useTradeForms } from "./TradeForms";

/** Opens the Your targets and limits form from inside a card. */
export function TargetsButton({ label }: { label: string }) {
  const { open } = useTradeForms();
  return (
    <button type="button" className={SMALL_OK} onClick={() => open({ kind: "targets" })}>
      {label}
    </button>
  );
}
