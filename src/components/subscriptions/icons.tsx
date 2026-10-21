import type { ReactNode } from "react";

/** The Subscriptions design's line icons (design/subscriptions/generator/lib.mjs). */
function Icon({ size, stroke = 2, children }: { size: number; stroke?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const RenewIcon = ({ size = 14 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </Icon>
);
export const ChevronIcon = ({ direction, size = 14 }: { direction: "left" | "right"; size?: number }) => (
  <Icon size={size} stroke={2.5}>
    <polyline points={direction === "left" ? "15 6 9 12 15 18" : "9 6 15 12 9 18"} />
  </Icon>
);
export const CheckIcon = ({ size = 11 }: { size?: number }) => (
  <Icon size={size} stroke={3}>
    <polyline points="20 6 9 17 4 12" />
  </Icon>
);
export const PlusIcon = ({ size = 11 }: { size?: number }) => (
  <Icon size={size} stroke={2.5}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Icon>
);
export const EditIcon = ({ size = 11 }: { size?: number }) => (
  <Icon size={size} stroke={2.2}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icon>
);
export const MoreIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size} stroke={2.6}>
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </Icon>
);
export const PlayIcon = ({ size = 10 }: { size?: number }) => (
  <Icon size={size} stroke={2.2}>
    <polygon points="7 4 19 12 7 20 7 4" />
  </Icon>
);
export const BankIcon = ({ size = 10 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M3 21h18" />
    <path d="M5 21V10" />
    <path d="M19 21V10" />
    <path d="M3 10l9-6 9 6" />
  </Icon>
);
export const ArrowIcon = ({ up, size = 10 }: { up: boolean; size?: number }) => (
  <Icon size={size} stroke={2.6}>
    <line x1="12" y1={up ? 19 : 5} x2="12" y2={up ? 5 : 19} />
    <polyline points={up ? "6 11 12 5 18 11" : "6 13 12 19 18 13"} />
  </Icon>
);
