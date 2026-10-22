"use client";

import { useRouter } from "next/navigation";
import { Select, type SelectOption } from "../Select";

/**
 * The app's dropdown (Select) as a filter: each option is a link, built on the server
 * with the page's other choices kept, so choosing one goes there without the page
 * needing to know how its address is written.
 */
export function LinkSelect({ label, options, hrefs, value, className }: { label: string; options: SelectOption[]; hrefs: Record<string, string>; value: string; className: string }) {
  const router = useRouter();
  return <Select variant="pill" aria-label={label} options={options} value={value} onChange={(next) => hrefs[next] && router.push(hrefs[next], { scroll: false })} className={className} />;
}
