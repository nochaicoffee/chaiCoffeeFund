"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";

const subscribe = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};
const isOnline = () => navigator.onLine;

const PRIMARY = "rounded-full bg-ink px-4 py-2 text-[13px] font-extrabold text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const GHOST = "rounded-full bg-fill px-4 py-2 text-[13px] font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent";

/**
 * What a page shows when it couldn't load (app/error.tsx and global-error.tsx). In production Next
 * hides a server error's message from the browser and sends only a short reference, so this can't
 * tell Google's rate limit from any other failure: it says what is true for all of them (Sheets can
 * be slow or busy, nothing here changes his data) and gives the reference for the logs. The one
 * thing the browser does know is being offline, and then it retries by itself when the network returns.
 */
export function ErrorScreen({ digest, retry, home }: { digest?: string; retry: () => void; home?: boolean }) {
  const online = useSyncExternalStore(subscribe, isOnline, () => true);
  const wasOffline = useRef(false);
  useEffect(() => {
    if (!online) wasOffline.current = true;
    else if (wasOffline.current) {
      wasOffline.current = false;
      retry();
    }
  }, [online, retry]);

  return (
    <div role="alert" className="mx-auto flex min-h-[60dvh] max-w-[420px] flex-col items-center justify-center gap-2 px-2 py-8 text-center">
      <div aria-hidden="true" className="grid size-10 place-items-center rounded-control bg-negative-tint text-lg font-extrabold text-negative">
        !
      </div>
      <h2 className="text-lg font-extrabold tracking-tight text-fg">{online ? "This page didn't load" : "You're offline"}</h2>
      <p className="text-sm text-muted">
        {online
          ? "Google Sheets can be slow or busy, and nothing here changes your data. Try again in a moment."
          : "This page reads your Google Sheet, so it needs the internet. It tries again by itself when you're back."}
      </p>
      {online ? (
        // A plain link: the root layout may be what failed, so the router may not be there. /setup says which part of the connection to the Sheet is wrong.
        <p className="text-[12.5px] text-muted">
          Keeps happening?{" "}
          <a href="/setup" className="font-bold text-fg underline underline-offset-2">
            Check the setup
          </a>
        </p>
      ) : null}
      <div className="mt-2 flex gap-2">
        <button type="button" className={PRIMARY} onClick={retry}>
          Try again
        </button>
        {home ? (
          <Link href="/" className={GHOST}>
            Overview
          </Link>
        ) : (
          // The root layout itself failed, so the router may not be there: a plain page load.
          <button type="button" className={GHOST} onClick={() => {
              // A full page load on purpose: this is the screen for when the root layout, and so maybe the router, is what failed.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.href = "/";
            }}>
            Overview
          </button>
        )}
      </div>
      {digest ? <p className="mt-1 font-mono text-[11.5px] text-muted">ref: {digest}</p> : null}
    </div>
  );
}

/** The reference Next gives a hidden server error, if this is one. */
export function digestOf(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "digest" in error && typeof (error as { digest: unknown }).digest === "string") return (error as { digest: string }).digest;
  return undefined;
}
