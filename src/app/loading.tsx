/**
 * What a page shows while its data is still being read. Every page reads the Sheet on the server, and a cold read takes one to
 * three seconds; with this boundary the sidebar and a page-shaped skeleton appear at once on a click, and Next can prefetch the
 * route up to here (without it a dynamic route isn't prefetched at all).
 * Only the page area is drawn: the sidebar belongs to the root layout and stays put. The pulse stops for anyone who asks for less motion.
 */
export default function Loading() {
  const block = "rounded-2xl bg-fill motion-safe:animate-pulse";
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col gap-3">
        <div className={`${block} h-3 w-32`} />
        <div className={`${block} h-9 w-64 max-w-full`} />
        <div className={`${block} h-4 w-full max-w-xl`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className={`${block} h-40`} />
        <div className={`${block} h-40`} />
        <div className={`${block} h-40 sm:col-span-2 xl:col-span-1`} />
      </div>
      <div className={`${block} h-72`} />
    </div>
  );
}
