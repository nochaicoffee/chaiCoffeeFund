# Sign-in page and wait screen: design round 1

Status: **picked and being built** (2026-11-18, epic #436): he approved the round-1 picks and chose the **Kulhad** as the cup. The sign-in page is built (#437); the wait screen, Coin catch and error screens are built (#438). Notes on what differs from the board are in "Build notes" at the end. The live board is [`design/login/LoginAndLoading.html`](../../design/login/LoginAndLoading.html): open it in a browser. Every figure on it is made up, and the wait screen never shows real data.

## What was asked
A redesign of the login page, and an animation (or a game) while a page is loading, with every corner case thought through.

## What the code does today (checked 2026-11-18)
- `/login` is a route handler that returns one HTML string ([`loginPage.ts`](../../src/app/login/loginPage.ts)), no React, no script. One button to `/login/google`; three error codes (`denied`, `cancelled`, `failed`) and a "not set up" line that names the four missing settings.
- A signed-in visitor to `/login` sees the sign-in again: the proxy lets every `/login` path through and the page never looks at the cookie.
- Sign out redirects to `/login` with nothing to say it worked.
- The Google step never asks for the account picker, so after "isn't allowed here" the same account can come straight back.
- There is no `loading.tsx` or `error.tsx` anywhere. Every page waits on Google Sheets, and while it does the browser shows the old page or a blank one.

## Design
**Sign-in page: "The Cup".** The app's tokens, rings behind a centered card, a chai cup that drops a coin in every 2.6 s (CSS only), the greeting used on the dashboards, one button. Thirteen states, all one HTML response with a different note and button: idle, opening Google, Google slow (8 s), offline, wrong account, cancelled, didn't work, session ended, signed out, already signed in, not set up, in-app browser, no JavaScript.

**The cup, round 2 (2026-11-18).** He liked round 1's picks and asked for the coins to stop being clipped at the top and for a cooler, 3D cup. Fixed: the picture clipped its own overflow, so a coin was cut by its top edge. The coins now start above the picture (`overflow: visible`), small and faint, grow into view, fall with gravity, spin, and are hidden by the cup's own front lip before they vanish (each look's coin ends deeper than its lip, so nothing pops), with a ripple on the chai where they land. Five looks share one generator and one timing, so the choice is only taste: **Flat** (round 1's), **Ceramic 3D** (cream porcelain, green band, lit rim, soft shadow; my pick), **Clay** (chunky matte green), **Cutting-chai glass** (see-through tumbler, creamy head) and **Kulhad** (terracotta, grooves, no handle). The cup tilts toward the pointer (CSS perspective, off with reduced motion and on touch) and bobs a little. On the board, picking a look changes the sign-in page, the wait screen and the game's cup everywhere.

**Wait screen.** Content area only, the sidebar stays. Rules (the picture matters less than these):

| Time | Does |
|---|---|
| 0 – 250 ms | Nothing; the old page stays |
| 250 ms | Cup fades in, lines change every 2.4 s, no percentage (nothing true to count) |
| once shown | Stays at least 600 ms |
| 3 s | "Play while you wait" appears; never auto-plays, never takes focus |
| 8 s | Lines stop: "Still on it. Google Sheets is slow today." |
| 20 s | Retry bar; an open game keeps going |
| fails | Cup and game stop; an error card |
| data arrives | Instant swap; best score saved |

**Games.** *Coin catch* (picked): slide a cup under falling ₹, dodge red EMI slips (-3), never ends. *Coin hop* (alternative): one tap to jump cardamom pods. Best score in `localStorage` (try/catch), nothing sent anywhere. Keys only when the canvas has focus; `touch-action: pan-y` so a vertical swipe still scrolls; Esc/Tab leave; pauses when the tab is hidden or scrolled off; pixel ratio capped at 2.

**Error cards.** Can't reach Sheets (retries on `online`), Sheets rate limit (429, countdown), session ended (to the sign-in's "session ended" state), our bug (short reference only, no stack).

## Corner cases (full list is on the board, section 7)
Already signed in; double tap; back-button from Google restoring a frozen "Opening…" (`pageshow`); Google never answers; offline; wrong account (button becomes "Choose another account", `prompt=select_account`); cancel; second tab / expired 10-minute cookie / blocked cookies; session ended (page named from a fixed list, never the raw address); just signed out; not configured (setting names only when run locally); Instagram / Facebook / LINE web views (Google answers `disallowed_useragent`); no JavaScript; `?error=` and `next` abuse; keyboard and screen readers; 320 px and short landscape; light-only until #57; reduced motion; fast loads (no flash) and slow loads; page arriving mid-game; failing mid-game; private windows; no real data on the loader; game code fetched only on tap.

## If picked: the build
Files: `loginPage.ts` (new page and a small inline script for the lock, offline, `pageshow` and in-app checks), `login/route.ts` (valid session redirects on; `signedout` and `session=ended`), `logout/route.ts` (`?signedout=1`), `proxy.ts` and the gate (`session=ended` when a bad cookie sent him there), `login/google/route.ts` (optional `prompt=select_account`), `app/loading.tsx` with a server-rendered cup and a small client wrapper for the timers, a lazy `WaitGame`, `app/error.tsx` and `global-error.tsx`. Pure functions with tests: state to copy, next-page names, in-app user-agent detection, the loader's phase as a function of elapsed time, the 429 countdown. Per [process.md](../process.md): a PRD feature and an epic with tasks first, then one PR per task, `/code-review` before each merge.

## Open questions (defaults in bold)
1. Look: **The Cup**, or a split layout with a bigger picture on desktop.
2. Wait screen: **cup first, game offered at 3 s**, or cup only.
3. Game: **Coin catch**, Hop inside it or dropped.
4. A game on the login page itself: **no** (a server-built page whose wait is a redirect; only the "Opening Google…" lock).
5. Greeting on the sign-in page: **"Good evening, Prathik"** or no name (in case someone else sees the page).
6. A shared `loading.tsx` for every page: **yes, one screen**.
7. Cup look: **Ceramic 3D**, or Flat, Clay, Glass or Kulhad (the board's section 1b has all five live).

## Build notes (2026-11-18)
- **Picked:** Kulhad, Coin catch (Hop dropped), cup first with the game offered at 3 s, no game on the sign-in page, one shared loading screen.
- **Google's account picker** was already always requested, so "Choose another account" only re-opens it; no change to `/login/google`.
- **Copy link only** in an in-app browser; there is no reliable way for a page to open another browser, so the board's "Open in browser" button is not built.
- **A first visit to a page** (no cookie) says "Sign in to carry on to Cards", not "Your session ended": that wording only follows a cookie that no longer works (`session=ended`, set by the proxy).
- **The wait screen's "stays at least 600 ms"** cannot be built with `loading.tsx` (Next removes the fallback the moment the page is ready), so it is dropped; instead the cup fades in over 250 ms starting at 250 ms, which hides a quick swap. On a client navigation the old page is replaced at once by an empty content area for those 250 ms (the fallback can't keep the old page).
- **The timeline is CSS, not timers.** Found by testing: on a hard load (reload, new tab, the first page after signing in) Next does not start running the page's script until the whole HTML has streamed, which is when the wait is over. So the lines, "Still on it." (8 s) and Try again (20 s) are animation delays computed from `lib/wait/phase.ts` and run from the first paint. Try again is a plain link to the same address. Only the game button needs script, so it appears 3 s after the script starts, which in practice means on client navigations (a sidebar click), where the game matters.
- **Rate-limit countdown** is dropped: in production Next replaces a server error's message with a digest, so the browser cannot tell a Google quota error from any other. The error screen is honest and generic instead (and says the offline case itself, which the browser does know, retrying when the network returns). In development the message is still in the page source, as Next documents; the screen never prints it.
- **Hop** is dropped; Coin catch only.
- **In-app browsers:** the button is not disabled, as the board draws it. Detection is a guess from the user agent, and a wrong guess must never lock him out, so the page warns, offers Copy link and labels the button "Try anyway". (Found in review.)
- **Space** does not activate the sign-in link (it is an `<a>`); Enter does.
