import { useId } from "react";
import { splitWordmark } from "@/lib/brand/wordmark";

/** The mark's drawing is 552 × 724 units (design/phone-nav-logo/PhoneNavAndLogo.html, logo A, bare). */
const ASPECT = 552 / 724;

/**
 * The logo's mark: the home-screen icon's kulhad with a gold coin dropping in, without the teal tile.
 * Colours are the --logo-* tokens, so a dark palette can change the clay; the coin's gold is fixed.
 * Decorative: the name next to it (or the link's own label) says what it is. Ids come from useId, because
 * a repeated id would resolve to the first copy on the page, and the rail's is hidden on a phone.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const clay = `${uid}-clay`;
  const coin = `${uid}-coin`;
  return (
    <svg
      width={Math.round(size * ASPECT * 10) / 10}
      height={size}
      viewBox="236 160 552 724"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id={clay} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: "var(--logo-clay-0)" }} />
          <stop offset="0.55" style={{ stopColor: "var(--logo-clay-1)" }} />
          <stop offset="1" style={{ stopColor: "var(--logo-clay-2)" }} />
        </linearGradient>
        <radialGradient id={coin} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFF3B5" />
          <stop offset="0.5" stopColor="#FFCB3D" />
          <stop offset="1" stopColor="#E09A1B" />
        </radialGradient>
      </defs>
      <ellipse cx="512" cy="878" rx="250" ry="30" fill="#000" fillOpacity="0.14" />
      <path
        d="M258 430H766C760 520 720 600 716 720C714 810 690 862 630 862H394C334 862 310 810 308 720C304 600 264 520 258 430Z"
        fill={`url(#${clay})`}
      />
      <path d="M296 585H728M308 680H716" stroke="#000" strokeOpacity="0.2" strokeWidth="14" strokeLinecap="round" />
      <path d="M322 480C340 600 340 720 366 800" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="22" strokeLinecap="round" />
      <ellipse cx="512" cy="430" rx="254" ry="60" style={{ fill: "var(--logo-rim)" }} />
      <ellipse cx="512" cy="438" rx="222" ry="42" fill="#C98233" />
      <ellipse cx="512" cy="436" rx="150" ry="24" fill="#E3A04A" fillOpacity="0.7" />
      <circle cx="512" cy="282" r="104" fill={`url(#${coin})`} />
      <circle cx="512" cy="282" r="86" fill="none" stroke="#B87A12" strokeOpacity="0.45" strokeWidth="7" strokeDasharray="5 9" />
      <circle cx="512" cy="282" r="68" fill="none" stroke="#B87A12" strokeOpacity="0.55" strokeWidth="8" />
      <circle cx="512" cy="282" r="68" fill="#FFF3B5" fillOpacity="0.35" />
      <path d="M440 250A78 78 0 0 1 492 208" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

/** The mark and the app's name, the name's last word in teal; `size` is the mark's height in px. */
export function LogoLockup({ appName, size = 26 }: { appName: string; size?: number }) {
  const { lead, accent } = splitWordmark(appName);
  return (
    <span className="inline-flex items-center gap-[0.42em] whitespace-nowrap font-extrabold leading-none tracking-[-0.02em] text-fg" style={{ fontSize: Math.round(size * 0.68) }}>
      <LogoMark size={size} />
      <span>
        {lead}
        {accent && <span className="text-(--logo-accent)">{accent}</span>}
      </span>
    </span>
  );
}
