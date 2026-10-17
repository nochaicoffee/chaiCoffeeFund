import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Resolve the "@/..." import alias from tsconfig.json, so tests can import app code the way the app does.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
