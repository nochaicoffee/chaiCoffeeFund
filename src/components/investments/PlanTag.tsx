/** The share-plan tags beside a holding's name: RSU in blue, ESPP in violet, and a warm "Stale price" (design: srcb). */
export const PLAN_STYLE = {
  RSU: { background: "oklch(0.94 0.03 258)", color: "oklch(0.42 0.1 258)" },
  ESPP: { background: "oklch(0.94 0.04 300)", color: "oklch(0.42 0.12 300)" },
} as const;

export function PlanTag({ name }: { name: string }) {
  const plan = name === "RSU" || name === "ESPP" ? PLAN_STYLE[name] : undefined;
  return (
    <span className={`ml-1.5 inline-flex rounded-full px-[7px] py-px align-[1px] text-[9.5px] font-extrabold tracking-[0.03em] ${plan ? "" : "bg-warning-tint text-warning-text"}`} style={plan}>
      {name}
    </span>
  );
}
