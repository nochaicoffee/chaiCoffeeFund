"use client";

import { useState } from "react";
import { HEADER_PRIMARY_CLASS } from "../shell/FormTriggerButton";
import { EpfStatementDialog } from "./EpfStatementDialog";

/** "Add EPF statement": opens the import. The dialog is mounted to open it and unmounted when it closes. */
export function AddEpfStatementButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={HEADER_PRIMARY_CLASS}>
        Add EPF statement
      </button>
      {open && <EpfStatementDialog onClose={() => setOpen(false)} />}
    </>
  );
}
