"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { CloseIcon } from "../cards/forms/icons";

/**
 * The Daily page's add, edit, limit and Manage screens: a native modal dialog that sits at the foot of a phone, like a sheet, and in the middle of a
 * desktop. Focus stays inside, Esc closes it, and the field marked data-autofocus has focus when it opens. The parent mounts it to open it and unmounts
 * it on `onClose`.
 */
export function Sheet({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, []);
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby={titleId} className="dy-sheet dy" onClick={(e) => e.target === ref.current && ref.current?.close()}>
      <span className="grab" aria-hidden="true" />
      <div className="sh">
        <div className="sh-h">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="sh-x" aria-label="Close" onClick={() => ref.current?.close()}>
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
