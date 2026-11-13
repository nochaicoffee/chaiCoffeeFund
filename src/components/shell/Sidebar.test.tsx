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
