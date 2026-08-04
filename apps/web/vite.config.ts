import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // sqlite-wasm ships prebuilt; excluding it from dep optimisation keeps Vite
  // from rewriting the module's own asset paths.
  optimizeDeps: { exclude: ["@sqlite.org/sqlite-wasm"] },
  server: {
    port: 5173,
    // NOTE: deliberately NO COOP/COEP.
    //
    // Cross-origin isolation is only needed by the worker-based OPFS VFS, and
    // turning it on actively breaks that worker's own script load. We use the
    // SyncAccessHandle Pool VFS instead, which persists to OPFS without it.
    // One less header for the NAS reverse proxy to get right.
    // See packages/db/src/drivers/web.ts and docs/07-sync.md.
  },
});
