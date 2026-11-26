# 0018. Offer Neubrutalism as a second look, saved in the Sheet for every device and drawn only through tokens

- **Status:** Accepted
- **Date:** 2026-11-26

## Context
Prathik wants to choose between the app as it looks today ("Classic") and the Neubrutalism look mocked up in `design/neubrutalism/` (PR #471): every dashboard, widget for widget, on a cream dot grid with 3px black outlines, hard offset shadows, flat saturated colours and Space Grotesk with Space Mono. The choice is his, and the app should remember it.

Some of the groundwork is already there. `globals.css` says components use only its tokens, never literal colours, so that a dark palette (#57) can be added by redefining them under `[data-theme="dark"]`, and `colorGradient` already draws a card from `--card-<colour>-from` and `-to`. Most of the shape isn't on tokens, though. A rough count on 2026-11-26 found about 550 radii and shadows written into class names (`rounded-[26px]`, `shadow-[…]`); it counted `shadow-[var(--card-shadow)]` among them, and only 49 places read the shadow tokens at all. Step 1 below starts with an exact count. Cards assume white text on a dark gradient (`--on-card`), and there is one font, Manrope. A look switch that only swaps colours would leave every page half in one style and half in the other.

The 36 card colours in `COLORS` are saved in the Sheet, so they have to keep working under either look.

Three questions were settled with Prathik on 2026-11-26: where the choice is saved, whether Neubrutalism gets a dark version, and where the switch lives. He first picked a choice per device (a cookie), then, the same day, asked for one look that every device follows, with no flash of the wrong look.

A flash happens when the browser draws one look and switches to another once it learns the choice (from `localStorage` or a fetch). Whatever holds the choice, the server has to know it before it sends the HTML.

## Decision
- **A look is an attribute on `<html>`: `data-look="neubrutal"`, or no attribute for Classic.** It is separate from dark mode (`data-theme="dark"`, #57). The two are independent axes, so a third look later means another token block and another value for the attribute, not more component code.
- **The Sheet holds the choice, so every device follows it.** A new `Settings` tab holds key/value rows (`key`, `value`), with `look` = `Classic` or `Neubrutalism`. It is added like any other entity (CLAUDE.md, "Adding a new entity"): its type, a `lib/sheets/settings.ts` repository with a row schema that only accepts known keys and values, the two route files from `createCrudRoutes` (so the API and Claude's MCP endpoint can read and change it like any other tab), a cached read with a `settings` tag in `CACHE_TAGS`, and an entry in `checkedRepositories`. Dark mode's switch goes in the same tab later.
- **The root layout reads the look on the server, through the cache (ADR 0005), and writes it on `<html>` before any HTML is sent.** So the first paint is in the chosen look, with no flash, on every device, including one that has never been used before. The cache is shared on the server, not kept per device, so a change made on the phone reaches the laptop on its next page load. Most requests hit the cache; only the first read after a change goes to the Sheet.
- **A cookie, `look`, mirrors the Sheet for the sign-in page.** `/login` is the only page drawn for someone not signed in (the proxy sends every other request there), and it shouldn't read the Sheet for an anonymous visitor: the service account could, but every stray hit would cost a read. So `/login` draws from the cookie. The phone's wait screen (`app/loading.tsx`) only shows for a signed-in page, inside the root layout, so it already has the Sheet's look. A device that has never signed in shows Classic on `/login` once. The cookie is never the source of truth.
- **The cookie is written where cookies can be written.** A Server Component can't set a cookie while it renders (Next's `cookies()` docs), so the root layout can't. The switch's server action sets it (a year, `SameSite=Lax`). On another device, the layout compares the cookie it was sent with the Sheet's look, and when they differ it renders a small client component that rewrites the cookie (`document.cookie`, the same name and settings). So a device catches up on its first signed-in page after a change elsewhere.
- **If the Sheet can't be read, the layout falls back to the cookie, then to Classic.** The look never blocks or breaks a page.
- **Switching is optimistic.** Picking a look changes `data-look` in the browser at once. A server action then writes the Sheet, calls `updateTag("settings")` and sets the cookie. A Sheet write takes about 2.5 seconds, so nothing waits on it. If the write fails, the look switches back and a toast says why, as a failed add does on Daily.
- **A look changes the app only by redefining tokens**, in one block, `:root[data-look="neubrutal"] { … }`, in `globals.css`. That means the existing tokens (page, surface, lines, shadows, the accent and states, the chart colours, `--card-<colour>-from` and `-to`, `--on-card`) and these new ones, which Classic sets to exactly what is drawn today:
  - `--radius-card`, `--radius-tile`, `--radius-control` and `--radius-pill`
  - `--card-border` (none in Classic; `3px solid` ink in Neubrutalism)
  - `--card-shadow` and `--soft-shadow` (blurred in Classic, hard `6px 6px 0` ink in Neubrutalism)
  - `--page-pattern` (none, or the dot grid)
  - `--font-display` and `--font-label` (Manrope in Classic; Space Grotesk and Space Mono in Neubrutalism, loaded with `next/font`)

  A component never asks which look is on. **A card colour keeps its name and its saved value under both looks.** Neubrutalism gives each of the 36 names in `COLORS` its own flat shade, sets that name's `-from` and `-to` to it, and sets `--on-card` to ink, so a saved Ruby card is still Ruby. Each hue's "dusk" twin (Burgundy for Ruby, Spruce for Teal, Raspberry for Pink, and so on) gets a deeper, more saturated shade than its pair, never the same one, so two cards picked to look different still do. `colors.test.ts` checks that every name has a Neubrutalism shade and that no two names share one.
- **Neubrutalism is light only, for now.** Tokens alone can't make it win over dark mode: `globals.css`'s `@custom-variant dark` applies every `dark:` class whenever `data-theme="dark"` is on `<html>`. So **the layout leaves `data-theme` off `<html>` while the look is Neubrutalism**, and the dark switch shows as off and disabled, with a line saying why. The dark choice itself stays saved, and comes back when the look returns to Classic. A dark Neubrutalism would need boards drawn first, as any design change does, and is revisited after #57 ships.
- **The switch is "Look: Classic | Neubrutalism" at the foot of the sidebar, beside Sign out**, as an icon with a tooltip when the sidebar is collapsed, **and a row in the phone's More sheet** (#467). When dark mode lands and there is more than one switch, both move to a Settings page.
- **No per-device override.** Every device shows the Sheet's look. A device that wants its own would need an override cookie that wins over the Sheet; that is left out until it's asked for.
- **Build order, one PR per step:**
  1. A tokens-only refactor, area by area: shell, then Overview, then each dashboard. It starts with an exact count of the radii, shadows and borders written into class names (leaving out `shadow-[var(--…)]`, which already reads a token); those become the new tokens. Nothing visible changes, checked by before-and-after screenshots of each page at desktop and phone width.
  2. The Neubrutalism token block and fonts, switched on by hand, each page checked against its board in `design/neubrutalism/`.
  3. The `Settings` tab, its repository and routes, checked with a real round trip against the Sheet; the layout's cached read, its fallbacks, and the client component that brings a stale cookie up to date; `/login` drawing from the cookie; and the switch in the sidebar and the More sheet.
  4. Page-by-page fixes where a token isn't enough (the ring textures, chart strokes, the hero gradients), each one solved with a new token rather than a branch in a component.

## Consequences
- Step 1 is most of the work and touches every page; its value doesn't depend on Neubrutalism, since the dark palette (#57) needs the same tokens.
- Every new component from now on has to take its radius, border and shadow from tokens. `globals.css`'s rule on colours is widened to cover shape, and a lint or test that fails on a new arbitrary `rounded-[…]` or `shadow-[…]` would keep it that way (to decide in step 1).
- Each page now has two looks to check. The definition of done's browser check (real data and empty state, light and dark, desktop and phone) adds "both looks". While Neubrutalism is light only, that is three combinations, not four.
- Charts and textures that draw their own colours in SVG (`RingTexture`, the heatmaps, the stage) must read tokens too; any that can't yet are listed as known gaps in step 4.
- The look follows him everywhere. The cost is a new tab and a read in the root layout. The read is cached, but it makes the layout depend on the Sheet, so its fallbacks (cookie, then Classic) need tests.
- The sign-in page can be a step behind: it shows the look the device last saw, or Classic on a device never signed in.
- The phone's launch splash stays teal under both looks, since the manifest's colour can't vary by user.
- `design/neubrutalism/` stays the visual reference. When the look changes, its boards change first.

## Alternatives considered
- **A cookie alone, per device:** the least work, and right from the first paint everywhere, sign-in included. But each device keeps its own choice, and he asked for one look on every device. It was the first pick, replaced the same day.
- **Read the choice in the browser (`localStorage`, or a fetch after load):** every page would draw Classic and then switch, which is the flash this decision exists to avoid.
- **Read the Sheet on every request, uncached:** always fresh, but it would put a Sheet call in front of every page. The cached read with `updateTag` is just as fresh after a change and costs nothing between changes.
- **Branch in components (`look === "neubrutal" ? … : …`):** quicker for the first page, but it doubles every component's styling, drifts with each change, and repeats for dark mode. Tokens keep one component and many looks.
- **A second stylesheet that overrides the Tailwind classes:** fights specificity on hundreds of arbitrary classes and breaks silently whenever a class is renamed.
- **Build a dark Neubrutalism now:** the classic dark palette isn't built yet, and a dark Neubrutalism changes the look's character (white outlines on black). It is a design question to draw first, not a palette to guess.
- **The switch in each page's header:** the headers are full (period picker, refresh, add buttons), and the look belongs to the app, not to one page.
- **A Settings page now:** a page for one switch, two clicks away. It becomes worth building once dark mode needs a switch as well.

## Updates
- **2026-11-26, step 1 (first pass).** An exact count found 1,087 radius uses across 35 values (505 of them `rounded-full`, which stays round in both looks), 89 shadows (51 already on tokens) and 397 borders (317 of them 1px). The token list is narrowed: outlines get `surface-edge` (`--surface-edge-width`, `--surface-edge`), seven literal elevation shadows get named tokens, and only the card and control radii move to `--radius-card` and `--radius-control`; the other radii stay as numbers, since the Neubrutalism boards use nearly the same corners, so `--radius-tile` and `--radius-pill` aren't needed. Still to move: hairline dividers, chart marks and textures. Details in `system-design.md`, "Shape on tokens".
