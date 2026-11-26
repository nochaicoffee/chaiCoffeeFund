/**
 * Screenshots of every dashboard from the demo app (docs/walkthrough.md), desktop and phone, full page.
 * Playwright isn't a project dependency: point PLAYWRIGHT_DIR at a folder where `npm i playwright` was run.
 *
 * Usage: PLAYWRIGHT_DIR=<dir> node scripts/walkthrough/shots.mjs [outDir] [page ...]
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(path.join(process.env.PLAYWRIGHT_DIR ?? ".", "package.json"));
const { chromium } = require("playwright");

const APP = process.env.DEMO_URL ?? "http://localhost:3100";
const OUT = process.argv[2] ?? "walkthrough-out/shots";
export const PAGES = [
  ["01-overview", "/"],
  ["02-accounts", "/accounts"],
  ["03-cards", "/cards"],
  ["04-subscriptions", "/subscriptions"],
  ["05-income", "/income"],
  ["06-expenses", "/expenses"],
  ["07-daily", "/daily"],
  ["08-loans", "/loans"],
  ["09-lent", "/lent"],
  ["10-insurance", "/insurance"],
  ["11-goals", "/goals"],
  ["12-investments", "/investments"],
  ["13-fixed-income", "/fixed-income"],
];
const only = process.argv.slice(3);
const pages = only.length ? PAGES.filter(([name]) => only.some((o) => name.includes(o))) : PAGES;

const devices = [
  ["desktop", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }],
  ["phone", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const HIDE_DEV_BADGE = "addEventListener('DOMContentLoaded', () => document.head.append(Object.assign(document.createElement('style'), { textContent: 'nextjs-portal { display: none !important; }' })));";
for (const [device, options] of devices) {
  const context = await browser.newContext({ ...options, colorScheme: "light" });
  await context.addInitScript(HIDE_DEV_BADGE);
  const page = await context.newPage();
  for (const [name, url] of pages) {
    await page.goto(APP + url, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForTimeout(1500); // charts and the phone splash settle
    // The first screen (what a friend sees on opening the page) and the whole page.
    await page.screenshot({ path: path.join(OUT, `${name}-${device}-top.png`) });
    await page.screenshot({ path: path.join(OUT, `${name}-${device}-full.png`), fullPage: true });
    console.log(name, device);
  }
  await context.close();
}
await browser.close();
