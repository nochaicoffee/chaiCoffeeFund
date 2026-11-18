"use client";

import { useEffect } from "react";
import { digestOf, ErrorScreen } from "@/components/wait/ErrorScreen";
import "./globals.css";

/** The root layout itself failed, so there is no sidebar: this replaces the whole document. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
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
