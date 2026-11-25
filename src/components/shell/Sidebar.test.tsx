import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const { Sidebar } = await import("./Sidebar");

const render = (showSignOut: boolean) => renderToStaticMarkup(<Sidebar initiallyExpanded appName="App" ownerName="Owner" showSignOut={showSignOut} />);

describe("Sidebar sign out", () => {
  it("posts to /logout from a button, so a link on another site can't sign him out", () => {
    const html = render(true);
    const form = /<form[^>]*>/.exec(html)?.[0] ?? "";
    expect(form).toContain('action="/logout"');
    expect(form).toContain('method="post"');
    expect(html).toContain('aria-label="Sign out"');
  });

  it("has no Sign out when the app isn't behind a login", () => {
    const html = render(false);
    expect(html).not.toContain("/logout");
    expect(html).not.toContain("Sign out");
  });
});

describe("Sidebar on a phone", () => {
  const html = render(true);

  it("has a bottom bar with the four tabs and a More button, and no hamburger", () => {
    const bar = /<nav[^>]*fixed[^>]*>[\s\S]*?<\/nav>/.exec(html)?.[0] ?? "";
    for (const label of ["Overview", "Accounts", "Cards", "Daily", "More"]) expect(bar).toContain(label);
    expect(bar).toContain('aria-controls="phone-menu"');
    expect(bar).toContain('aria-expanded="false"');
    expect(html).not.toContain("Open menu");
  });

  it("marks the page you are on in the bar", () => {
    const bar = /<nav[^>]*fixed[^>]*>[\s\S]*?<\/nav>/.exec(html)?.[0] ?? "";
    const current = [...bar.matchAll(/<a [^>]*>/g)].map((m) => m[0]).filter((tag) => tag.includes('aria-current="page"'));
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/"');
  });

  it("wears the logo in the top bar and the rail", () => {
    expect(html.match(/viewBox="236 160 552 724"/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps the More sheet out of the page until it is opened", () => {
    expect(html).not.toContain('id="phone-menu"');
  });
});
