import type { Metadata } from "next";
import { Manrope, Space_Grotesk, Space_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { LookCookieSync } from "@/components/shell/LookCookieSync";
import { Sidebar } from "@/components/shell/Sidebar";
import { SIDEBAR_COOKIE } from "@/components/shell/sections";
import { appConfig } from "@/lib/appConfig";
import { loginRequired, sessionKey } from "@/lib/auth/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { dataLookOf, LOOK_COOKIE, lookFromSettings, resolveLook } from "@/lib/look/look";
import { getCachedSettings } from "@/lib/sheets/cached";
import type { Look } from "@/lib/sheets/types";
import "./globals.css";

// The design's typeface (design/dashboards/CardsListLight.dc.html), exposed as
// --font-manrope for the --font-sans theme token in globals.css.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

// Neubrutalism's typeface (ADR 0018, design/neubrutalism/), as --font-space-grotesk for --font-body under that look.
// Preloaded like Manrope, so a page drawn in that look never flashes the fallback font first.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

// Neubrutalism's label face (ADR 0018 steps 5b, 5c): the page tag and every small uppercase label. One weight, and not
// preloaded: Classic never draws with it, so a Classic visit shouldn't fetch it. The cost is on a first Neubrutalism
// visit only: labels draw in next/font's metric-matched fallback until the file arrives (so they barely move), then
// swap. After that it's cached. next/font can't preload per look, since the call is static.
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: "700",
  preload: false,
});

export const metadata: Metadata = {
  title: { default: appConfig.appName, template: `%s · ${appConfig.appName}` },
  description: "Personal finance dashboard",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const sidebarExpanded = cookieStore.get(SIDEBAR_COOKIE)?.value === "expanded";
  // The proxy lets only the public /setup guide reach a page without a session; it gets no sidebar, whose links would all bounce to the sign-in.
  const showShell = !loginRequired(process.env) || (await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value, sessionKey(process.env)));
  // The look (ADR 0018): the Settings tab's, read through the cache before anything is drawn, so every device follows it
  // with no flash. Signed out (the sign-in page), or when the Sheet can't be read, the cookie mirror decides, then Classic.
  const cookieLook = cookieStore.get(LOOK_COOKIE)?.value;
  let sheetLook: Look | null | undefined;
  if (showShell) {
    try {
      sheetLook = lookFromSettings(await getCachedSettings());
    } catch {
      sheetLook = undefined;
    }
  }
  const look = resolveLook(sheetLook, cookieLook);

  return (
    <html lang="en" data-look={dataLookOf(look)} className={`${manrope.variable} ${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {sheetLook !== undefined && cookieLook !== look && <LookCookieSync look={look} />}
        {showShell ? (
          <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max,1760px)] flex-col md:flex-row md:items-start md:gap-[var(--frame-gap,1.25rem)] md:p-[var(--frame-pad,1.5rem)]">
            <Sidebar initiallyExpanded={sidebarExpanded} appName={appConfig.appName} ownerName={appConfig.ownerName} showSignOut={loginRequired(process.env)} look={look} />
            <main className="min-w-0 flex-1 max-md:relative max-md:[overflow-x:clip] md:max-w-[var(--frame-content-max,none)] bg-[var(--frame-bg,var(--surface))] py-5 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] max-md:pb-[calc(var(--phone-nav-h)+1.25rem)] md:min-h-[calc(100dvh-var(--frame-inset,3rem))] md:rounded-[var(--frame-radius,36px)] md:border-solid md:border-[length:var(--frame-edge-width,var(--surface-edge-width))] md:border-[color:var(--surface-edge,var(--surface-line))] md:px-[var(--frame-inner-x,26px)] md:py-[var(--frame-inner-y,26px)] md:shadow-[var(--frame-shadow,var(--card-shadow))]">
              {children}
            </main>
          </div>
        ) : (
          <main className="min-h-dvh bg-surface px-4 py-8 md:py-12">{children}</main>
        )}
      </body>
    </html>
  );
}
