// Find Chrome (or Edge/Chromium) and run it headless. Plain CLI flags, no DevTools protocol.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

export function chromePath() {
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new Error("Chrome not found. Set CHROME_PATH to a Chrome or Chromium binary.");
  return found;
}

export function pageUrl(file, params = {}) {
  const url = /^https?:|^file:/.test(file) ? new URL(file) : pathToFileURL(resolve(file));
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, String(v));
  return url.href;
}

export function chrome(args, { timeout = Number(process.env.BP_CHROME_TIMEOUT) || 180000 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), "bp-chrome-"));
  try {
    return execFileSync(
      chromePath(),
      [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--hide-scrollbars",
        "--allow-file-access-from-files",
        `--user-data-dir=${profile}`,
        ...args,
      ],
      { encoding: "utf8", timeout, maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }
    );
  } finally {
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {}
  }
}
