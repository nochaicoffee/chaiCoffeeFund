import Link from "next/link";

/** A figure with its label. With `href` the whole tile is a link to the page behind it. */
export function StatTile({
  label,
  value,
  sublabel,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "neutral" | "positive" | "negative";
  href?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-negative"
        : "text-foreground";

  const body = (
    <>
      <div className="text-sm text-foreground/60">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {sublabel && <div className="mt-1 text-xs text-foreground/50">{sublabel}</div>}
    </>
  );
  const box = "rounded-lg border border-divider p-4";
  return href ? (
    <Link href={href} className={`${box} block hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-accent`}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}
