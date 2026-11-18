import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Every page is dynamic (it reads the Sheet), so Next keeps none of them in the browser by default and each click is a server trip.
    // Thirty seconds makes going back and forth between pages instant. A save in the app can't show stale data: every write is a
    // Server Action that calls updateTag, and that clears this browser cache, as does router.refresh() (the Refresh button).
    // An edit made straight in the Sheet can take up to this long to show on a page already visited, until Refresh.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
