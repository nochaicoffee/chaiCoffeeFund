import { WaitScreen } from "@/components/wait/WaitScreen";

/** Shown in the content area (the sidebar stays) while any page waits on Google Sheets. See lib/wait/phase.ts for the timing. */
export default function Loading() {
  return <WaitScreen />;
}
