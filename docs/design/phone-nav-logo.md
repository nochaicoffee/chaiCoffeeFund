# Phone navigation and logo: design round 1

Status: **picked and built** (2026-11-26): he chose navigation **1 (Dock + More)** and logo **A (Kulhad)**. Notes on the build are at the end. The live board is [`design/phone-nav-logo/PhoneNavAndLogo.html`](../../design/phone-nav-logo/PhoneNavAndLogo.html): open it in a browser. Every figure on it is made up.

## What was asked
He doesn't like the phone's navigation bar, and the app looks plain without a logo.

## What the code does today (checked 2026-11-26)
- Phone: `components/shell/Sidebar.tsx` renders a top bar with the plain text name and a hamburger that opens a left drawer holding all 13 sections (`sections.ts`). Everything is two taps away, in the far top corner.
- Desktop: a pill rail; expanded it shows the name as text, collapsed it shows nothing.
- The only logo is the home-screen icon (a dark kulhad with a gold coin on teal, `design/app-icon/`, `src/app/icon.svg`). It appears nowhere inside the app.

## Navigation options (board part 1)
1. **Dock + More** (my pick): bottom tab bar of Overview, Accounts, Cards, Daily, and More, which lifts a sheet with the other nine; slim top bar with the logo.
2. **Floating pill dock**: a dark pill over the page, only the active tab shows its name, a gold coin button opens a dark card of the rest.
3. **Section switcher**: no bottom bar; the top bar names the page in a chip, and tapping it drops a grouped panel of all 13.
4. **Chip strip**: a sideways-scrolling row of section pills under the top bar.
5. **Thumb button**: one round button at the bottom right opens a right-aligned stack of all 13.

If one with a bottom bar is picked: bottom padding on every page, the phone's safe area (`env(safe-area-inset-bottom)`), the focus trap and Esc handling the drawer has today carried over to the sheet.

## Logo options (board part 2)
All five are built from the home-screen icon's kulhad and coin so the app and its icon agree: **A Kulhad** (the icon itself; my pick), **B Steam ₹**, **C Coin o** (the o of "Coffee" is a coin), **D cC** monogram, **E Sunrise cup**. Each is shown on light, dark and teal, at 56 to 16 px, as a home-screen tile and as a tab icon. The picker on the board makes every phone and the rail wear the chosen one.

## Open questions (defaults taken)
1. Navigation: **1**. 2. The four on the bar: **Overview, Accounts, Cards, Daily**. 3. Logo: **A**. 4. Sections not built yet are shown, as before.

## Build notes (2026-11-26)
- **Logo:** `components/shell/Logo.tsx` (`LogoMark`, `LogoLockup`), the home-screen icon's kulhad and coin without the teal tile. Colours are the `--logo-*` tokens in `globals.css` (the clay and rim, the teal of "Fund"), so a dark palette can swap the clay for terracotta, which the board showed stays visible on a dark page. Gradient ids come from `useId`: the rail's copy is hidden on a phone, and a repeated id resolves to the first copy on the page. `lib/brand/wordmark.ts` splits the name into "chaiCoffee" and a teal "Fund" only when it really ends in "Fund".
- **Where it shows:** the phone's top bar (a link to Overview, with a decorative initial at the right), the desktop rail (the mark when collapsed, the lockup when expanded). The sign-in page is not done yet.
- **Phone navigation:** `Sidebar.tsx` has a fixed bottom bar (`PHONE_TAB_HREFS` in `sections.ts`: Overview, Accounts, Cards, Daily) and a More button that lifts a sheet with the other nine. More wears the ink pill while the sheet is open and whenever the page you are on is one of the nine, so the bar always says where you are. The sheet keeps the old drawer's behaviour: focus trap (the More button is part of it, since it is how you close the sheet), Esc, a scrim tap, scroll lock, and closing when the window grows to desktop width. The hamburger and the left drawer are gone.
- **Room for the bar:** `--phone-nav-h` (63 px plus the bottom safe area) is the one number. The page pads by it (`layout.tsx`), and what is pinned to the foot sits above it: Daily's quick-add bar, the Cards and Subscriptions toasts. The wait splash (z 40) still covers the bar on a hard load.
- **Not changed:** the desktop rail's behaviour, the phone splash, the home-screen icon.
