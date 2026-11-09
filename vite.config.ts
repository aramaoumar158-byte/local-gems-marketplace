// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Public (publishable) Lovable Cloud values. They are safe to ship in the browser
// bundle and act as a fallback when the hosted build has no .env file.
const PUBLIC_BACKEND = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "https://wulqncjchamtdkdyinfl.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY:
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_0UJd-R_5UkZSxMkz_TXA_g_F-VaiRE1",
  VITE_SUPABASE_PROJECT_ID: process.env.VITE_SUPABASE_PROJECT_ID || "wulqncjchamtdkdyinfl",
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: Object.fromEntries(
      Object.entries(PUBLIC_BACKEND).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
    ),
  },
});
