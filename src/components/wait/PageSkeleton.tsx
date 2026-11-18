/**
 * What a page shows the instant a link is clicked, while its data is still being read. Every page
 * reads the Sheet on the server, and a cold read takes one to three seconds; with this on screen at
 * once the sidebar and a page-shaped skeleton appear on a click, and Next can prefetch the route up
 * to the loading boundary (without one a dynamic route isn't prefetched at all). Written for the
 * page-load work in #401; the Kulhad wait screen takes over from it when the wait runs long
 * (components/wait/WaitScreen.tsx). The pulse stops for anyone who asks for less motion.
 */
export function PageSkeleton() {
  const block = "rounded-2xl bg-fill motion-safe:animate-pulse";
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
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
