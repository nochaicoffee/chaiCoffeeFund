import type { ReactNode } from "react";

/** Line icons from the design's sidebar rail (design/dashboards/CardsListLight.dc.html). */
function Icon({ children, size = 17 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const icons = {
  overview: (
    <Icon>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Icon>
  ),
  accounts: (
    <Icon>
      <path d="M3 21h18" />
      <path d="M5 21V10" />
      <path d="M19 21V10" />
      <path d="M3 10l9-6 9 6" />
      <path d="M9 21v-6" />
      <path d="M15 21v-6" />
    </Icon>
  ),
  cards: (
    <Icon>
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </Icon>
  ),
  subscriptions: (
    <Icon>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </Icon>
  ),
  income: (
    <Icon>
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </Icon>
  ),
  loans: (
    <Icon>
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </Icon>
  ),
  insurance: (
    <Icon>
      <path d="M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6l8-3z" />
      <polyline points="9 12 11 14 15 10" />
    </Icon>
  ),
  fixedIncome: (
    <Icon>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M7 10V7a5 5 0 0 1 10 0v3" />
    </Icon>
  ),
  investments: (
    <Icon>
      <line x1="4" y1="20" x2="4" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="20" y1="20" x2="20" y2="14" />
    </Icon>
  ),
  expand: (
    <Icon size={15}>
      <polyline points="13 17 18 12 13 7" />
      <polyline points="6 17 11 12 6 7" />
    </Icon>
  ),
  collapse: (
    <Icon size={15}>
      <polyline points="11 17 6 12 11 7" />
      <polyline points="18 17 13 12 18 7" />
    </Icon>
  ),
  menu: (
    <Icon size={20}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </Icon>
  ),
  close: (
    <Icon size={20}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </Icon>
  ),
};
