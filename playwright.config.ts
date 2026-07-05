import { defineConfig } from "@playwright/test";

const mnemosyncRoot =
  process.env.MNEMOSYNC_ROOT ?? "C:/Users/henry/mnemosync";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run preview -- --host 127.0.0.1 --port 4174",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: true,
    },
    {
      command: `npm --prefix "${mnemosyncRoot}" run dev -- --host 127.0.0.1 --port 4173`,
      url: "http://127.0.0.1:4173",
      reuseExistingServer: true,
    },
  ],
});
