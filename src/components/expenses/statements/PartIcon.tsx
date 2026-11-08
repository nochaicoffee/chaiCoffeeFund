import type { PartKey } from "@/lib/aggregate/expenses";

const PATHS: Record<PartKey, string[]> = {
  card: ["M2 6h20v14H2Z", "M2 10h20"],
  emi: ["M19 5 5 19", "M6.5 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z", "M17.5 15a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"],
  subs: ["M17 2l4 4-4 4", "M3 11V9a4 4 0 0 1 4-4h14", "M7 22l-4-4 4-4", "M21 13v2a4 4 0 0 1-4 4H3"],
  ins: ["M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"],
  cash: ["M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z", "M9 9h6", "M9 12h6", "M11 9c2 0 3 1.5 3 3s-1 3-3 3l3 3"],
};

/** A statement line's kind as a line icon: a card bill, an EMI, a subscription, insurance, or cash and UPI. */
export function PartIcon({ part, size = 15 }: { part: PartKey; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[part].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
