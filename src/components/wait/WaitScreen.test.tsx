import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/cards" }));
import { lineWindows, RETRY_MS, SHOW_AFTER_MS, SLOW_MS } from "@/lib/wait/phase";
import { digestOf, ErrorScreen } from "./ErrorScreen";
import { PageSkeleton } from "./PageSkeleton";
import { WaitScreen } from "./WaitScreen";

describe("WaitScreen, as it is before any script has run (what a hard load shows)", () => {
  const html = renderToStaticMarkup(<WaitScreen skeleton={<PageSkeleton />} />);

  it("is the Kulhad with its three coins, in the page itself", () => {
    expect(html).toContain('class="kh"');
    expect(html.match(/class="kh-coin"/g)).toHaveLength(3);
    expect(html).toContain("overflow: visible");
  });

  it("shows the page skeleton at once and fades the cup in over it by CSS, at the hand-off time, rather than by a timer", () => {
    expect(html).toContain('class="wait-skeleton-out"');
    expect(html).toContain("animate-pulse");
    expect(html).toMatch(/class="wait-in wait-splash wait-hard absolute /);
    expect(html.match(new RegExp(`animation-delay:${SHOW_AFTER_MS}ms`, "g"))!.length).toBeGreaterThanOrEqual(2);
  });

  it("is the phone's teal splash from the first paint on a hard load: the cup is big, the button is white, and nothing fades in", () => {
    expect(html).toContain("wait-splash");
    expect(html).toContain("wait-hard");
    expect(html).toContain("max-md:w-[230px]");
  });

  it("says each line in its own window, and 'Still on it.' from 8 s, all by animation delays", () => {
    expect(html).toContain("Counting the coins…");
    const first = lineWindows()[0];
    expect(html).toContain(`style="animation-delay:${first.startMs}ms;animation-duration:${first.endMs - first.startMs}ms"`);
    expect(html).toContain(`style="animation-delay:${SLOW_MS}ms"`);
    expect(html).toContain("Still on it.");
  });

  it("offers Try again from 20 s as a plain link to this page, which works with no script", () => {
    expect(html).toContain(`style="animation-delay:${RETRY_MS}ms"`);
    expect(html).toMatch(/<a href="" [^>]*>Try again<\/a>/);
  });

  it("has no game button until script is running, and no percentage", () => {
    expect(html).not.toContain("Play while you wait");
    const visibleText = html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ");
    expect(visibleText).not.toMatch(/\d|%/);
  });

  it("gives screen readers one calm status region with its text in the page from the start, not every line as it changes", () => {
    expect(html).toMatch(/<p role="status" class="sr-only">Loading your money<\/p>/);
    expect(html).toContain('aria-busy="true"');
    expect(html).toMatch(/aria-hidden="true" class="grid[^"]*"/);
  });
});

describe("ErrorScreen", () => {
  const html = renderToStaticMarkup(<ErrorScreen digest="7f3a91c2" retry={() => {}} home />);

  it("says what is true for any failure, and gives the reference for the logs", () => {
    expect(html).toContain('role="alert"');
    expect(html).toContain("This page didn&#x27;t load");
    expect(html).toContain("nothing here changes your data");
    expect(html).toContain("ref: 7f3a91c2");
  });

  it("has Try again and a way home", () => {
    expect(html).toContain("Try again");
    expect(html).toContain('href="/"');
  });

  it("has no reference line when there is none", () => {
    expect(renderToStaticMarkup(<ErrorScreen retry={() => {}} />)).not.toContain("ref:");
  });
});

describe("digestOf", () => {
  it("reads Next's reference from a hidden server error and nothing else", () => {
    expect(digestOf(Object.assign(new Error("x"), { digest: "abc" }))).toBe("abc");
    for (const other of [new Error("no digest"), "text", null, undefined, { digest: 5 }]) expect(digestOf(other)).toBeUndefined();
  });
});

describe("the phone splash's CSS (globals.css)", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const phoneOnly = css.slice(css.indexOf("@media (max-width: 767px)"));

  it("is fixed over the screen only under 768 px, and a hard load skips the fade, all inside that one media query", () => {
    const block = phoneOnly.slice(0, phoneOnly.indexOf("@keyframes splash-glow"));
    expect(block).toMatch(/\.wait-splash \{[^}]*position: fixed;/);
    expect(block).toMatch(/\.wait-hard \{\s*animation: none;/);
    // Nothing of the splash is outside the phone query, so desktop keeps the cup over the skeleton.
    expect(css.slice(0, css.indexOf("@media (max-width: 767px)"))).not.toContain(".wait-splash {");
  });

  it("lets taps through before the screen has faded in", () => {
    expect(css).toMatch(/@keyframes wait-in \{\s*from \{\s*opacity: 0;\s*visibility: hidden;/);
  });
});
