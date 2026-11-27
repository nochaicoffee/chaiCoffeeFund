"use client";

import { useEffect } from "react";
import { digestOf, ErrorScreen } from "@/components/wait/ErrorScreen";
import { readCookie } from "@/lib/auth/cookies";
import { dataLookOf, isLook, LOOK_COOKIE } from "@/lib/look/look";
import "./globals.css";

/** The root layout itself failed, so there is no sidebar: this replaces the whole document. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
    // The layout that sets the look is the part that failed, so the look comes from the browser's cookie (ADR 0018).
    // React doesn't own this attribute here, so the effect sets it on the document directly.
    const saved = readCookie(document.cookie, LOOK_COOKIE);
    const look = isLook(saved) ? dataLookOf(saved) : undefined;
    if (look) document.documentElement.dataset.look = look;
  }, [error]);
  return (
    <html lang="en">
      <body className="min-h-dvh bg-page">
        <title>Something went wrong</title>
        <ErrorScreen digest={digestOf(error)} retry={retry} />
      </body>
    </html>
  );
}
