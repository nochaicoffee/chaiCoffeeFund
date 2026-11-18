import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/cards" }));
import { RETRY_MS, SLOW_MS } from "@/lib/wait/phase";
import { digestOf, ErrorScreen } from "./ErrorScreen";
import { WaitScreen } from "./WaitScreen";

describe("WaitScreen, as it is before any script has run (what a hard load shows)", () => {
  const html = renderToStaticMarkup(<WaitScreen />);

  it("is the Kulhad with its three coins, in the page itself", () => {
    expect(html).toContain('class="kh"');
    expect(html.match(/class="kh-coin"/g)).toHaveLength(3);
    expect(html).toContain("overflow: visible");
  });

  it("fades in by CSS after 250 ms rather than by a timer", () => {
    expect(html).toMatch(/class="wait-in /);
  });

  it("says each line in its own window, and 'Still on it.' from 8 s, all by animation delays", () => {
    expect(html).toContain("Counting the coins…");
    expect(html).toContain('style="animation-delay:250ms;animation-duration:2400ms"');
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

  it("gives screen readers one calm status region, empty until script fills it, not every line as it changes", () => {
    expect(html).toMatch(/<p role="status" class="sr-only"><\/p>/);
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
