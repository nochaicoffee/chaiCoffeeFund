import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Resolve the "@/..." import alias from tsconfig.json, so tests can import app code the way the app does.
// "server-only" resolves to its no-op build, as it does for the server inside Next, so tests can load
// server modules (the Sheets repositories) without a Next runtime.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
});
