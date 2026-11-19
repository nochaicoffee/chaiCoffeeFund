"use client";

import { useState } from "react";

/** A small "Copy" for a command or a value to paste. Falls back to nothing if the browser won't give the clipboard. */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // No clipboard (an insecure page, a locked-down browser): the text is still on screen to select.
        }
      }}
      className="shrink-0 rounded-full bg-fill px-3 py-1 text-[11.5px] font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent"
      aria-label={copied ? "Copied" : `Copy ${text}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
