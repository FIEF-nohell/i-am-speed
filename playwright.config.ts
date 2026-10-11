import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  // Only the PRESERVE pixel guard (e2e/preserve.spec.ts) uses snapshots; they are git-ignored.
  snapshotPathTemplate: "screenshots/preserve/{arg}{ext}",
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    // Serves the static export. Run `npm run build` first (npm run check does).
    command: `npx serve out -l ${PORT} -n`,
    port: PORT,
    // Never silently test another build: a stale server on this port fails the run. Set
    // PW_REUSE_SERVER=1 only when you deliberately serve `out/` yourself.
    reuseExistingServer: Boolean(process.env.PW_REUSE_SERVER),
  },
});
