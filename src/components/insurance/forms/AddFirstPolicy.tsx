"use client";

import { HEADER_PRIMARY_CLASS } from "../../shell/FormTriggerButton";
import { FormTrigger, useInsuranceForms } from "./InsuranceForms";

/** The empty page's button: add the first policy. */
export function AddFirstPolicy() {
  const { open } = useInsuranceForms();
  return <FormTrigger className={HEADER_PRIMARY_CLASS} label="Add your first policy" onClick={() => open({ kind: "add" })} />;
}
