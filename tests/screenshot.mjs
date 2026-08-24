// Screenshot the built app (vite preview) for visual UX review.
// Run from a dir that has playwright installed, e.g.:
//   cd ~/dev/actual-sst && node ~/dev/unbullshitify/tests/screenshot.mjs
import { chromium } from "/Users/astahmer/dev/actual-sst/node_modules/playwright/index.mjs";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const prefix = process.argv[2] ?? "/tmp/ubs-shots/shot";
mkdirSync("/tmp/ubs-shots", { recursive: true });

// serve dist/
const server = spawn("npx", ["vite", "preview", "--port", "5178", "--strictPort"], {
  cwd: process.cwd(),
  stdio: "ignore",
});
await new Promise((r) => setTimeout(r, 2500));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

const EXAMPLE = `Great question! I'd be happy to help you with that. 🚀

Here's a breakdown of the key considerations for migrating your monolith to microservices:

**1. Assess Your Current Architecture**
Before diving in, it's crucial to understand your existing system's boundaries and data flows.

**2. Start with a Strangler Fig Pattern**
Rather than a big-bang rewrite (which is often risky!), consider incrementally extracting services.

**3. Don't Forget Observability!**
Distributed systems require robust logging, tracing, and metrics from day one.

TL;DR: Start small, automate everything, and iterate. Let me know if you'd like me to elaborate on any of these points! 😊`;

try {
  // 1. initial state — no key configured
  await page.goto("http://localhost:5178/");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${prefix}-1-empty.png`, fullPage: true });

  // 2. with example text
  await page.fill("textarea", EXAMPLE);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${prefix}-2-filled.png`, fullPage: true });

  // 3. settings dialog
  await page.click('button:has-text("Set API key")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${prefix}-3-settings.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // 4. simulate a running + done state by injecting fake pipeline output via localStorage? 
  // simpler: fill key so banner disappears, then screenshot clean state
  await page.evaluate(() => {
    localStorage.setItem(
      "unbullshitify.settings.v2",
      JSON.stringify({
        presetId: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        model: "anthropic/claude-sonnet-4.5",
        rounds: 2,
        apiKeys: { openrouter: "sk-or-v1-fake" },
      }),
    );
  });
  await page.reload();
  await page.waitForTimeout(800);
  await page.fill("textarea", EXAMPLE);
  await page.screenshot({ path: `${prefix}-4-configured.png`, fullPage: true });

  console.log("screenshots written to /tmp/ubs-shots/");
} finally {
  await browser.close();
  server.kill();
}
