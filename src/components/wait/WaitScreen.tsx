"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { KULHAD_CSS, kulhadSvg } from "@/lib/brand/kulhad";
import { lineWindows, OFFER_GAME_MS, RETRY_MS, SHOW_AFTER_MS, SLOW_DETAIL, SLOW_HEADLINE, SLOW_MS } from "@/lib/wait/phase";

const ANNOUNCE = { start: "Loading your money", slow: "Still loading. Google Sheets is slow today.", retry: "Taking too long to load. There is a Try again link." } as const;

/** Fetched only when he taps Play, so a normal load pays nothing for the game. */
const CoinCatch = dynamic(() => import("./CoinCatch").then((m) => m.CoinCatch), { ssr: false });

/** A constant drawing of our own, never built from input. */
const CUP_HTML = kulhadSvg();
const WINDOWS = lineWindows();

// On the phone's teal splash the button is white (the light pill is the design's; ink on teal read dull).
const CHIP =
  "rounded-full bg-ink px-4 py-2 text-[13px] font-extrabold text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent max-md:bg-splash-fg max-md:text-ink";

/**
 * True when this screen came in the page's own HTML (a hard load: the first open of the app, a reload, a
 * new tab) and false when it was drawn in the browser (a click on a link). The server snapshot is what
 * hydration starts from too, but a hard load only hydrates once the whole page has streamed, which is
 * after the wait is over, so it never flips on screen.
 */
const noSubscription = () => () => {};
const useHardLoad = () =>
  useSyncExternalStore(
    noSubscription,
    () => false,
    () => true,
  );

/**
 * What a page shows while it waits for Google Sheets (the fallback of app/loading.tsx). The timeline
 * (lib/wait/phase.ts) is all CSS animation delays, so it runs from the first paint, before any script:
 * a hard load only starts running script when the page is already done. The game button is the one
 * thing that needs script, so it appears once the script is running and 3 s have passed.
 */
export function WaitScreen({ skeleton }: { skeleton: ReactNode }) {
  // One screen per navigation: if he clicks another page while this one waits, the timeline starts again rather than carrying on from the first click.
  return <Wait key={usePathname()} skeleton={skeleton} />;
}

function Wait({ skeleton }: { skeleton: ReactNode }) {
  const [offer, setOffer] = useState(false);
  // In the server HTML from the start, so it is there for anyone reading the page during a long wait; later changes are announced.
  const [announcement, setAnnouncement] = useState<string>(ANNOUNCE.start);
  const [playing, setPlaying] = useState(false);
  const playButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const hardLoad = useHardLoad();

  useEffect(() => {
    // A screen reader hears each change to the status region; the text it starts with is just there to be read.
    const timers = [
      setTimeout(() => setOffer(true), OFFER_GAME_MS),
      setTimeout(() => setAnnouncement(ANNOUNCE.slow), SLOW_MS),
      setTimeout(() => setAnnouncement(ANNOUNCE.retry), RETRY_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!playing && returnFocus.current) {
      returnFocus.current = false;
      playButton.current?.focus();
    }
  }, [playing]);

  return (
    // The skeleton sets the height and is there at once; the Kulhad screen lies over it and takes over at SHOW_AFTER_MS.
    <div aria-busy="true" className="relative min-h-[60dvh]">
      <div className="wait-skeleton-out" style={{ animationDelay: `${SHOW_AFTER_MS}ms` }}>
        {skeleton}
      </div>
      {/* On a phone this is the teal splash over the whole screen (globals.css, .wait-splash); on desktop it is the cup over the skeleton. */}
      <div
        className={`wait-in wait-splash ${hardLoad ? "wait-hard " : ""}absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 py-8 text-center`}
        style={{ animationDelay: `${SHOW_AFTER_MS}ms` }}
      >
        <style href="kulhad-cup" precedence="default">
          {KULHAD_CSS}
        </style>
        {playing ? (
          <CoinCatch
            onExit={() => {
              returnFocus.current = true;
              setPlaying(false);
            }}
          />
        ) : (
          <div className="w-[168px] max-md:w-[230px]" aria-hidden="true" dangerouslySetInnerHTML={{ __html: CUP_HTML }} />
        )}
        <p role="status" className="sr-only">
          {announcement}
        </p>
        {/* The lines take turns in one spot; the visual lines are hidden from screen readers, which get the status above. */}
        <div aria-hidden="true" className="grid min-h-[26px] text-[17px] font-extrabold tracking-tight text-fg">
          {WINDOWS.map((w) => (
            <p key={w.startMs} className="wait-line [grid-area:1/1]" style={{ animationDelay: `${w.startMs}ms`, animationDuration: `${w.endMs - w.startMs}ms` }}>
              {w.text}
            </p>
          ))}
          <p className="wait-late [grid-area:1/1]" style={{ animationDelay: `${SLOW_MS}ms` }}>
            {SLOW_HEADLINE}
          </p>
        </div>
        <p className="wait-late min-h-5 max-w-[34ch] text-[13.5px] text-muted" style={{ animationDelay: `${SLOW_MS}ms` }}>
          {SLOW_DETAIL}
        </p>
        {offer && !playing ? (
          <button ref={playButton} type="button" className={`${CHIP} wait-in-quick mt-2`} onClick={() => setPlaying(true)}>
            Play while you wait
          </button>
        ) : null}
        {/* A plain link to the same address: it works with no script, which is when this matters most. */}
        <div className="wait-late mt-3 flex flex-wrap items-center justify-center gap-2.5 rounded-2xl bg-warning-tint px-3.5 py-2.5 text-[13px] font-semibold text-warning-text" style={{ animationDelay: `${RETRY_MS}ms` }}>
          <span>Taking too long.</span>
          <a href="" className="rounded-[10px] bg-ink px-3 py-1.5 text-[13px] font-extrabold text-on-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            Try again
          </a>
        </div>
      </div>
    </div>
  );
}
