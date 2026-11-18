import { PageSkeleton } from "@/components/wait/PageSkeleton";
import { WaitScreen } from "@/components/wait/WaitScreen";

/**
 * Shown in the content area (the sidebar stays) while any page waits on Google Sheets: the page-shaped
 * skeleton at once, and the Kulhad wait screen once the wait runs long. Timing: lib/wait/phase.ts.
 */
export default function Loading() {
  // The skeleton is passed in, not imported by the screen, so it stays server markup rather than becoming client JS.
  return <WaitScreen skeleton={<PageSkeleton />} />;
}
