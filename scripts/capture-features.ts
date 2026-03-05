/**
 * Capture feature videos for the landing page using Playwright.
 *
 * Usage: npx tsx scripts/capture-features.ts
 * Requires: dev server at localhost:3000, ffmpeg, npx playwright install chromium
 */

import { chromium, type Page, type BrowserContext } from "playwright";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = path.join(__dirname, "..", "public", "features");
const TEMP_DIR = path.join(__dirname, "..", ".playwright-temp");
const WIDTH = 1280;
const HEIGHT = 720;

const SEED_CONV = {
  id: "demo-1",
  title: "TCP vs UDP",
  rootNodeId: "n1",
  defaultProvider: "openai",
  defaultModel: "gpt-4.1",
  createdAt: Date.now() - 60000,
  updatedAt: Date.now(),
};

const SEED_NODES = [
  {
    id: "n1", conversationId: "demo-1", parentId: null, childIds: ["n2"],
    role: "user", content: "Explain the difference between TCP and UDP protocols.",
    attachments: [], provider: "openai", model: "gpt-4.1", status: "complete",
    createdAt: Date.now() - 50000,
  },
  {
    id: "n2", conversationId: "demo-1", parentId: "n1", childIds: ["n3", "n5"],
    role: "assistant",
    content: "TCP (Transmission Control Protocol) and UDP (User Datagram Protocol) are both transport layer protocols.\n\nTCP is connection-oriented, reliable, and ensures ordered delivery. It uses a three-way handshake and retransmits lost packets.\n\nUDP is connectionless, faster, and doesn't guarantee delivery or ordering. It's used for real-time applications like gaming and video streaming.",
    attachments: [], provider: "openai", model: "gpt-4.1", status: "complete",
    createdAt: Date.now() - 45000,
  },
  {
    id: "n3", conversationId: "demo-1", parentId: "n2", childIds: ["n4"],
    role: "user", content: "Can you give me a real-world analogy for each?",
    attachments: [], provider: "openai", model: "gpt-4.1", status: "complete",
    createdAt: Date.now() - 40000,
  },
  {
    id: "n4", conversationId: "demo-1", parentId: "n3", childIds: [],
    role: "assistant",
    content: "TCP is like sending a registered letter — you get confirmation that it was delivered, and if it's lost, it gets resent.\n\nUDP is like shouting across a room — fast and immediate, but some words might get lost in the noise.",
    attachments: [], provider: "openai", model: "gpt-4.1", status: "complete",
    createdAt: Date.now() - 35000,
  },
  {
    id: "n5", conversationId: "demo-1", parentId: "n2", childIds: ["n6"],
    role: "user", content: "Which one should I use for a chat application?",
    attachments: [], provider: "anthropic", model: "claude-sonnet-4-6", status: "complete",
    createdAt: Date.now() - 30000,
  },
  {
    id: "n6", conversationId: "demo-1", parentId: "n5", childIds: [],
    role: "assistant",
    content: "For a chat application, TCP is the better choice. You need reliable, ordered message delivery — you don't want messages arriving out of order or getting lost.\n\nWebSocket (which runs over TCP) is the standard for real-time chat.",
    attachments: [], provider: "anthropic", model: "claude-sonnet-4-6", status: "complete",
    createdAt: Date.now() - 25000,
  },
];

async function seedAndLoad(page: Page) {
  const appUrl = `${BASE_URL}/app?noauth`;

  // Navigate to a blank page on the same origin to manipulate storage
  // without Dexie interfering
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);

  // Delete the database (no Dexie connections on /login)
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("branchgpt");
      req.onsuccess = req.onblocked = req.onerror = () => resolve();
    });
  });

  // Set localStorage settings
  await page.evaluate(() => {
    localStorage.setItem("branchgpt-settings", JSON.stringify({
      state: {
        openaiApiKey: "demo",
        anthropicApiKey: "demo",
        activeProvider: "openai",
        activeModel: "gpt-4.1",
        generationParams: { temperature: 1, maxTokens: 4096 },
        theme: "light",
        keyMode: "byok",
      },
      version: 0,
    }));
  });

  // Create fresh IndexedDB with version 1
  await page.evaluate(({ conv, nodes }) => {
    return new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("branchgpt", 1);
      open.onupgradeneeded = () => {
        const db = open.result;
        const cs = db.createObjectStore("conversations", { keyPath: "id" });
        cs.createIndex("createdAt", "createdAt");
        cs.createIndex("updatedAt", "updatedAt");
        const ns = db.createObjectStore("messageNodes", { keyPath: "id" });
        ns.createIndex("conversationId", "conversationId");
        ns.createIndex("parentId", "parentId");
        ns.createIndex("createdAt", "createdAt");
      };
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction(["conversations", "messageNodes"], "readwrite");
        tx.objectStore("conversations").put(conv);
        for (const n of nodes) tx.objectStore("messageNodes").put(n);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      open.onerror = () => reject(open.error);
    });
  }, { conv: SEED_CONV, nodes: SEED_NODES });

  // Now navigate to the app — Dexie will open the DB we just seeded
  await page.goto(appUrl, { waitUntil: "networkidle" });
  console.log(`  Current URL: ${page.url()}`);

  // Wait for sidebar to show the conversation, then click it
  const convItem = page.getByText("TCP vs UDP");
  try {
    await convItem.waitFor({ state: "visible", timeout: 8000 });
    await convItem.click();
  } catch {
    console.log("  ⚠ Conversation item not found, retrying after reload...");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    if (await convItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await convItem.click();
    }
  }

  // Wait for all React Flow nodes to appear (6 message + 1 compose = 7)
  for (let attempt = 0; attempt < 20; attempt++) {
    const count = await page.locator(".react-flow__node").count();
    if (count >= 7) {
      console.log(`  ✓ ${count} React Flow nodes visible`);
      break;
    }
    if (attempt === 19) {
      console.log(`  ⚠ Only ${count} React Flow nodes visible after waiting`);
    }
    await page.waitForTimeout(500);
  }

  await page.waitForTimeout(500);
}

/** Create a new context with Playwright video recording enabled */
async function createRecordingContext(browser: ReturnType<typeof chromium.launch extends (...args: any[]) => Promise<infer R> ? R : never>, name: string) {
  const videoDir = path.join(TEMP_DIR, `${name}-video`);
  fs.mkdirSync(videoDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    recordVideo: { dir: videoDir, size: { width: WIDTH, height: HEIGHT } },
  });
  return context;
}

/** Finalize video: close context, convert WebM to MP4, optionally trimming the start */
async function finalizeVideo(context: BrowserContext, name: string, trimStartSecs = 0) {
  const page = context.pages()[0];
  const videoPath = await page?.video()?.path();
  await context.close(); // closes page + finalizes video

  if (!videoPath || !fs.existsSync(videoPath)) {
    console.log(`  ⚠ No video for ${name}`);
    return;
  }

  const mp4Path = path.join(OUTPUT_DIR, `${name}.mp4`);
  const ssFlag = trimStartSecs > 0 ? `-ss ${trimStartSecs.toFixed(1)}` : "";
  try {
    execSync(
      `ffmpeg -y ${ssFlag} -i "${videoPath}" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -movflags +faststart -an "${mp4Path}"`,
      { stdio: "pipe" }
    );
    const size = (fs.statSync(mp4Path).size / 1024).toFixed(0);
    console.log(`  ✓ ${name}.mp4 — ${size}KB`);
  } catch (e) {
    console.log(`  ✗ ffmpeg failed for ${name}: ${e}`);
  }
}

async function main() {
  console.log("🎬 BranchGPT Feature Video Capture\n");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // First pass: seed data with a throwaway context
  const setupCtx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
  const setupPage = await setupCtx.newPage();
  console.log("Seeding demo data and loading app...");
  await seedAndLoad(setupPage);

  const hasNodes = await setupPage.locator(".react-flow__node").count();
  console.log(`  React Flow nodes visible: ${hasNodes}\n`);

  // Save cookies/storage state so recording contexts can reuse it
  const storageState = await setupCtx.storageState();
  await setupCtx.close();

  // Helper: create a recording page with seeded state
  async function recordFeature(name: string, action: (page: Page) => Promise<void>) {
    console.log(`Recording ${name}...`);
    try {
      const videoDir = path.join(TEMP_DIR, `${name}-video`);
      fs.mkdirSync(videoDir, { recursive: true });
      const ctx = await browser.newContext({
        viewport: { width: WIDTH, height: HEIGHT },
        recordVideo: { dir: videoDir, size: { width: WIDTH, height: HEIGHT } },
      });
      const page = await ctx.newPage();

      // Seed IndexedDB + localStorage and load the conversation
      const seedStart = Date.now();
      await seedAndLoad(page);
      const trimSecs = (Date.now() - seedStart) / 1000;

      // Perform the feature-specific action
      await action(page);

      // Finalize — trim the seeding portion from the start
      await finalizeVideo(ctx, name, trimSecs);
    } catch (e) {
      console.log(`  ✗ ${name} failed: ${e}`);
    }
  }

  // ── 1. Tree layout — zoom and pan to showcase the visual tree ──
  await recordFeature("tree-layout", async (page) => {
    await page.waitForTimeout(1000);
    // Use the viewport center for mouse interactions
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    // Zoom in
    await page.mouse.move(cx, cy);
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(800);
    // Pan around by dragging
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let step = 0; step < 20; step++) {
      await page.mouse.move(cx - step * 10, cy - step * 5, { steps: 2 });
      await page.waitForTimeout(40);
    }
    await page.mouse.up();
    await page.waitForTimeout(600);
    // Zoom back out
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(500);
    // Click fit-view button in controls
    const fitBtn = page.locator(".react-flow__controls button").last();
    if (await fitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await fitBtn.click();
    }
    await page.waitForTimeout(1000);
  });

  // ── 2. Branching ──
  await recordFeature("branching", async (page) => {
    await page.waitForTimeout(1000);
    const assistantNode = page.locator(".react-flow__node").filter({ hasText: "assistant" }).first();
    if (await assistantNode.isVisible({ timeout: 2000 }).catch(() => false)) {
      await assistantNode.hover();
      await page.waitForTimeout(500);
      const branchBtn = page.locator("button:has-text('+ Branch')").first();
      if (await branchBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await branchBtn.click({ force: true });
        await page.waitForTimeout(1500);
      }
    }
    await page.waitForTimeout(1000);
  });

  // ── 3. Multi-select ──
  await recordFeature("multi-select", async (page) => {
    const flowNodes = page.locator(".react-flow__node");
    const nc = await flowNodes.count();
    if (nc >= 3) {
      await page.waitForTimeout(500);
      await flowNodes.nth(0).click({ force: true });
      await page.waitForTimeout(800);
      await flowNodes.nth(2).click({ modifiers: ["Meta"], force: true });
      await page.waitForTimeout(800);
      if (nc > 4) {
        await flowNodes.nth(4).click({ modifiers: ["Meta"], force: true });
        await page.waitForTimeout(800);
      }
      await page.waitForTimeout(1500);
      await page.locator(".react-flow__pane").click();
      await page.waitForTimeout(500);
    } else {
      await page.waitForTimeout(3000);
    }
  });

  // ── 4. Multi-provider — click between OpenAI and Anthropic branches ──
  await recordFeature("multi-provider", async (page) => {
    const flowNodes = page.locator(".react-flow__node");
    const nc = await flowNodes.count();
    await page.waitForTimeout(800);
    // Click node n3 (OpenAI branch) to highlight it
    if (nc >= 3) {
      await flowNodes.nth(2).click({ force: true });
      await page.waitForTimeout(1500);
    }
    // Click node n5 (Anthropic branch) to switch active path
    if (nc >= 5) {
      await flowNodes.nth(4).click({ force: true });
      await page.waitForTimeout(1500);
    }
    // Click back to n4 (OpenAI branch leaf)
    if (nc >= 4) {
      await flowNodes.nth(3).click({ force: true });
      await page.waitForTimeout(1500);
    }
    await page.waitForTimeout(500);
  });

  // ── 5. Collapse — collapse multiple nodes then expand them ──
  await recordFeature("collapse", async (page) => {
    await page.waitForTimeout(800);
    // Collapse the first few message nodes via their ▼ buttons
    const collapseBtns = page.locator("button[title='Collapse']");
    const btnCount = await collapseBtns.count();
    console.log(`  Collapse buttons found: ${btnCount}`);
    // Collapse nodes one by one with delay
    for (let i = 0; i < Math.min(btnCount, 3); i++) {
      const btn = collapseBtns.nth(0); // always first since collapsed ones become "Expand"
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(700);
      }
    }
    await page.waitForTimeout(1200);
    // Expand them back
    const expandBtns = page.locator("button[title='Expand']");
    const expCount = await expandBtns.count();
    for (let i = 0; i < Math.min(expCount, 3); i++) {
      const btn = expandBtns.nth(0);
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(700);
      }
    }
    await page.waitForTimeout(800);
  });

  // ── 6. Hide/restore — hide nodes via store, then use the panel to restore ──
  await recordFeature("hide-restore", async (page) => {
    await page.waitForTimeout(800);
    // Hide nodes n5 and n6 (the Anthropic branch) via Zustand store
    await page.evaluate(() => {
      // Access the Zustand store directly
      const store = (window as any).__ZUSTAND_UI_STORE__;
      if (store) {
        store.getState().hideNode("n5");
        store.getState().hideNode("n6");
      }
    });
    await page.waitForTimeout(1500);
    // Open the Hidden panel
    const hiddenBtn = page.locator("button").filter({ hasText: "Hidden" });
    if (await hiddenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hiddenBtn.click();
      await page.waitForTimeout(1000);
      // Hover over a hidden node to preview
      const restoreBtn = page.locator("button").filter({ hasText: "Restore" }).first();
      if (await restoreBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await restoreBtn.hover();
        await page.waitForTimeout(1200);
        // Click "Restore all"
        const restoreAll = page.locator("button").filter({ hasText: "Restore all" });
        if (await restoreAll.isVisible({ timeout: 500 }).catch(() => false)) {
          await restoreAll.click();
          await page.waitForTimeout(1500);
        }
      }
    }
    await page.waitForTimeout(500);
  });

  console.log("\n✅ Done!");
  await browser.close();
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

main();
