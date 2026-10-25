"use client";

import { FormTrigger, useIncomeForms } from "./IncomeForms";

/** The empty page's way in: Add source. */
export function AddFirstSource() {
  const { open } = useIncomeForms();
  return <FormTrigger className="min-h-11 rounded-full bg-ink px-5 text-[13px] font-bold text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" label="Add your first source" onClick={() => open({ kind: "add-source" })} />;
}
