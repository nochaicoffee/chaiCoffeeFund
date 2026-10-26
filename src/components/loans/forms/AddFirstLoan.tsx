"use client";

import { HEADER_PRIMARY_CLASS } from "../../shell/FormTriggerButton";
import { FormTrigger, useLoanForms } from "./LoanForms";

/** Add loan, on the page with no loans running. */
export function AddFirstLoan() {
  const { open } = useLoanForms();
  return <FormTrigger className={HEADER_PRIMARY_CLASS} label="+ Add loan" onClick={() => open({ kind: "add-loan" })} />;
}
