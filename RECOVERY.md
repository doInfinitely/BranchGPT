# BranchGPT Recovery - All File Contents

Total files: 72

---

## `.env.example`

```
# ── Database (Neon Postgres) ────────────────────────────────
DATABASE_URL=postgresql://user:password@host.neon.tech/branchgpt?sslmode=require

# ── NextAuth ────────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=   # Generate with: openssl rand -base64 32

# GitHub OAuth
GITHUB_ID=
GITHUB_SECRET=

# Email magic link (optional — omit to disable email auth)
# EMAIL_SERVER=smtp://user:pass@smtp.example.com:587
# EMAIL_FROM=noreply@branchgpt.com

# ── LLM API Keys (for managed/server-side mode) ────────────
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# ── Stripe ──────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

```

---

## `.env.local`

```
# Auth (required by NextAuth v5)
AUTH_SECRET=v0YvNjmdLp+Vu8T6PaBI0hBL7B5VVxQ4MRMBn+55IbY=

# GitHub OAuth (optional — leave empty to disable GitHub login)
GITHUB_ID=
GITHUB_SECRET=

# Database (optional — auth features disabled without this)
# DATABASE_URL=postgresql://...

# LLM keys for managed mode (optional)
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=

```

---

## `ORIGINAL_PROMPT.md`

```
# Original Prompt

I want a UI for ChatGPT/Claude that facilitates branching conversations. Basically a force directed tree or otherwise speech bubbles on a dot grid. I click an LLM message and respond and the entire path up to the root is sent as the chat history and a new edge is formed. I want the UI to allow me to spawn multiple textboxes so I can rapid fire reply and get my branches. You should be able to enter at the top a portion of message that is shared between all replies with a variable ending. We need to support file uploads and image analysis as well for both the shared message and the branching messages I should be able to select multiple nodes and they and all their ancestors are all passed as the context, then there should be some sort of representation of what nodes feed into the context of the new messages, perhaps a bezier contour around the nodes in the history with an arrow from the contour to the new messages. Give me a collapsable sidebar where I can see past chats, and expose all the model options that the providers have on their web Chat interfaces. Let's have light mode/dark mode when you use chatgpt and use the claude colors for claude, you can make light mode/dark mode variants for claude as well.

```

---

## `bin/branchgpt.js`

```
#!/usr/bin/env node

const { execSync, spawn } = require("child_process");
const path = require("path");

const APP_URL = "https://branchgpt.com";

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
  const pkg = require("../package.json");
  console.log(`branchgpt v${pkg.version}`);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
branchgpt - Branching conversation UI for AI

Usage:
  branchgpt           Open BranchGPT in your browser
  branchgpt --local   Start local dev server and open
  branchgpt --version Print version
  branchgpt --help    Show this help
`);
  process.exit(0);
}

if (args.includes("--local")) {
  console.log("Starting local dev server...");
  const projectDir = path.join(__dirname, "..");
  const child = spawn("npx", ["next", "dev"], {
    cwd: projectDir,
    stdio: "inherit",
    shell: true,
  });

  // Wait a moment then open browser
  setTimeout(() => {
    openBrowser("http://localhost:3000");
  }, 3000);

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
} else {
  // Open the hosted app
  console.log(`Opening ${APP_URL}...`);
  openBrowser(APP_URL);
}

function openBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === "darwin") {
      execSync(`open "${url}"`);
    } else if (platform === "win32") {
      execSync(`start "" "${url}"`);
    } else {
      execSync(`xdg-open "${url}"`);
    }
  } catch {
    console.log(`Open this URL in your browser: ${url}`);
  }
}

```

---

## `prisma.config.ts`

```
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
});

```

---

## `prisma/schema.prisma`

```
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── NextAuth models ──────────────────────────────────────────

model User {
  id               String    @id @default(cuid())
  name             String?
  email            String?   @unique
  emailVerified    DateTime?
  image            String?
  stripeCustomerId String?
  freeMessagesUsed Int       @default(0)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  accounts     Account[]
  sessions     Session[]
  usageRecords UsageRecord[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ── Usage metering ───────────────────────────────────────────

model UsageRecord {
  id               String   @id @default(cuid())
  userId           String
  provider         String
  model            String
  promptTokens     Int
  completionTokens Int
  costCents        Int      // cost in cents (our price with markup)
  createdAt        DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}

```

---

## `scripts/capture-features.ts`

```
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
  activeNodeId: "n4",
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

  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // Seed IndexedDB
  await page.evaluate(({ conv, nodes }) => {
    return new Promise<void>((resolve, reject) => {
      const delReq = indexedDB.deleteDatabase("branchgpt");
      delReq.onsuccess = () => {
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
      };
      delReq.onerror = () => reject(delReq.error);
    });
  }, { conv: SEED_CONV, nodes: SEED_NODES });

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

  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  console.log(`  Current URL: ${page.url()}`);
  await page.waitForTimeout(3000);

  // Click the conversation to load it
  const convItem = page.getByText("TCP vs UDP");
  if (await convItem.isVisible({ timeout: 3000 }).catch(() => false)) {
    await convItem.click();
    await page.waitForTimeout(2000);
  }
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

/** Finalize video: close context, convert WebM to MP4 */
async function finalizeVideo(context: BrowserContext, name: string) {
  const page = context.pages()[0];
  const videoPath = await page?.video()?.path();
  await context.close(); // closes page + finalizes video

  if (!videoPath || !fs.existsSync(videoPath)) {
    console.log(`  ⚠ No video for ${name}`);
    return;
  }

  const mp4Path = path.join(OUTPUT_DIR, `${name}.mp4`);
  try {
    execSync(
      `ffmpeg -y -i "${videoPath}" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -movflags +faststart -an "${mp4Path}"`,
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
        storageState,
        recordVideo: { dir: videoDir, size: { width: WIDTH, height: HEIGHT } },
      });
      const page = await ctx.newPage();

      // Navigate and wait for the tree to render
      await page.goto(`${BASE_URL}/app?noauth`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);

      // Click conversation
      const convItem = page.getByText("TCP vs UDP");
      if (await convItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await convItem.click();
        await page.waitForTimeout(2000);
      }

      // Perform the feature-specific action
      await action(page);

      // Finalize
      await finalizeVideo(ctx, name);
    } catch (e) {
      console.log(`  ✗ ${name} failed: ${e}`);
    }
  }

  // ── 1. Tree layout — just show the tree for a few seconds ──
  await recordFeature("tree-layout", async (page) => {
    await page.waitForTimeout(3000);
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

  // ── 4. Multi-provider — show the tree with different provider badges ──
  await recordFeature("multi-provider", async (page) => {
    await page.waitForTimeout(3000);
  });

  // ── 5. Collapse ──
  await recordFeature("collapse", async (page) => {
    await page.waitForTimeout(500);
    const collapseBtn = page.locator("button[title='Collapse']").first();
    if (await collapseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.waitForTimeout(500);
      await collapseBtn.click({ force: true });
      await page.waitForTimeout(1500);
      const expandBtn = page.locator("button[title='Expand']").first();
      if (await expandBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expandBtn.click({ force: true });
        await page.waitForTimeout(1500);
      }
    }
    await page.waitForTimeout(500);
  });

  // ── 6. Hide/restore ──
  await recordFeature("hide-restore", async (page) => {
    await page.waitForTimeout(500);
    const nodeToHide = page.locator(".react-flow__node").nth(2);
    if (await nodeToHide.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nodeToHide.hover();
      await page.waitForTimeout(500);
      const hideBtn = nodeToHide.locator("button[title='Hide node']");
      if (await hideBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await hideBtn.click({ force: true });
        await page.waitForTimeout(2000);
      }
    }
    await page.waitForTimeout(1000);
  });

  console.log("\n✅ Done!");
  await browser.close();
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

main();

```

---

## `src/app/(landing)/layout.tsx`

```
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

```

---

## `src/app/(landing)/page.tsx`

```
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { Pricing } from "@/components/landing/Pricing";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <FeatureShowcase />
      <Pricing />
    </>
  );
}

```

---

## `src/app/api/auth/[...nextauth]/route.ts`

```
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

```

---

## `src/app/api/chat/route.ts`

```
import { NextRequest } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { recordUsage, checkQuota } from "@/lib/usage";
import type { Provider, GenerationParams } from "@/types";

type MessageContent = string | ContentBlock[];

interface ContentBlock {
  type: string;
  text?: string;
  image_url?: { url: string };
  source?: { type: string; media_type: string; data: string };
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: MessageContent;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  model: string;
  provider: Provider;
  generationParams: GenerationParams;
}

const ANON_LIMIT = 5;

export async function POST(req: NextRequest) {
  const session = await auth();
  const byokKey =
    req.headers.get("x-openai-key") || req.headers.get("x-anthropic-key") || "";

  const body: ChatRequestBody = await req.json();
  const { messages, model, provider, generationParams } = body;

  // Determine which API key to use
  let apiKey: string;
  let isManaged = false;

  if (byokKey) {
    // BYOK mode — user provides their own key, no metering
    apiKey = byokKey;
  } else if (session?.user?.id) {
    // Authenticated + managed key
    const quota = await checkQuota(session.user.id);
    if (!quota.allowed) {
      return Response.json({ error: quota.reason }, { status: 402 });
    }
    apiKey =
      provider === "openai"
        ? process.env.OPENAI_API_KEY ?? ""
        : process.env.ANTHROPIC_API_KEY ?? "";
    if (!apiKey) {
      return Response.json(
        { error: `No server-side ${provider} API key configured` },
        { status: 500 }
      );
    }
    isManaged = true;
  } else {
    // Anonymous — use managed keys with strict IP-based limit
    const anonId = req.headers.get("x-forwarded-for") ?? req.ip ?? "unknown";
    const anonKey = `anon:${anonId}`;
    // Simple cookie-based throttle via header
    const anonCount = parseInt(req.cookies.get("bgpt_anon_count")?.value ?? "0");
    if (anonCount >= ANON_LIMIT) {
      return Response.json(
        { error: "Anonymous limit reached. Sign up for free to continue." },
        { status: 429 }
      );
    }
    apiKey =
      provider === "openai"
        ? process.env.OPENAI_API_KEY ?? ""
        : process.env.ANTHROPIC_API_KEY ?? "";
    if (!apiKey) {
      return Response.json(
        { error: `No server-side ${provider} API key configured. Please provide your own API key.` },
        { status: 500 }
      );
    }
    isManaged = true;
  }

  if (provider === "openai") {
    return streamOpenAI(messages, model, generationParams, apiKey, isManaged, session?.user?.id, req);
  } else {
    return streamAnthropic(messages, model, generationParams, apiKey, isManaged, session?.user?.id, req);
  }
}

function streamOpenAI(
  messages: ChatMessage[],
  model: string,
  params: GenerationParams,
  apiKey: string,
  isManaged: boolean,
  userId: string | undefined,
  req: NextRequest
) {
  const encoder = new TextEncoder();

  const openaiMessages = messages.map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role, content: m.content };
    }
    const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    for (const block of m.content) {
      if (block.type === "text" && block.text) {
        parts.push({ type: "text" as const, text: block.text });
      } else if (block.type === "image_url" && block.image_url) {
        parts.push({
          type: "image_url" as const,
          image_url: { url: block.image_url.url },
        });
      }
    }
    return { role: m.role, content: parts };
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = new OpenAI({ apiKey });
        const response = await client.chat.completions.create({
          model,
          messages: openaiMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          stream: true,
          stream_options: { include_usage: true },
          temperature: params.temperature,
          max_tokens: params.maxTokens,
          top_p: params.topP,
          frequency_penalty: params.frequencyPenalty,
          presence_penalty: params.presencePenalty,
        });

        let promptTokens = 0;
        let completionTokens = 0;

        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
            );
          }
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens;
            completionTokens = chunk.usage.completion_tokens;
          }
        }

        // Record usage for managed keys
        if (isManaged && userId && (promptTokens || completionTokens)) {
          recordUsage({ userId, provider: "openai", model, promptTokens, completionTokens }).catch(() => {});
        }

        // Increment anonymous counter
        if (isManaged && !userId) {
          const anonCount = parseInt(req.cookies.get("bgpt_anon_count")?.value ?? "0");
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ __setCookie: `bgpt_anon_count=${anonCount + 1}; Path=/; Max-Age=86400` })}\n\n`)
          );
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "OpenAI error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  const headers: HeadersInit = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };

  // Set anon cookie via Set-Cookie header
  if (isManaged && !userId) {
    const anonCount = parseInt(req.cookies.get("bgpt_anon_count")?.value ?? "0");
    headers["Set-Cookie"] = `bgpt_anon_count=${anonCount + 1}; Path=/; Max-Age=86400; SameSite=Lax`;
  }

  return new Response(stream, { headers });
}

function streamAnthropic(
  messages: ChatMessage[],
  model: string,
  params: GenerationParams,
  apiKey: string,
  isManaged: boolean,
  userId: string | undefined,
  req: NextRequest
) {
  const encoder = new TextEncoder();

  const systemMessages = messages.filter((m) => m.role === "system");
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      if (typeof m.content === "string") {
        return { role: m.role as "user" | "assistant", content: m.content };
      }
      const blocks: Anthropic.Messages.ContentBlockParam[] = [];
      for (const block of m.content) {
        if (block.type === "text" && block.text) {
          blocks.push({ type: "text", text: block.text });
        } else if (block.type === "image" && block.source) {
          blocks.push({
            type: "image",
            source: {
              type: "base64",
              media_type: block.source.media_type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: block.source.data,
            },
          });
        }
      }
      return { role: m.role as "user" | "assistant", content: blocks };
    });

  const systemText = systemMessages
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("\n");

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic({ apiKey });
        const response = await client.messages.stream({
          model,
          messages: chatMessages,
          max_tokens: params.maxTokens ?? 4096,
          temperature: params.temperature,
          top_p: params.topP,
          top_k: params.topK,
          ...(systemText && { system: systemText }),
        });

        let promptTokens = 0;
        let completionTokens = 0;

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ content: event.delta.text })}\n\n`
              )
            );
          }
          if (event.type === "message_delta" && "usage" in event) {
            const usage = (event as { usage?: { output_tokens?: number } }).usage;
            if (usage?.output_tokens) completionTokens = usage.output_tokens;
          }
          if (event.type === "message_start" && "message" in event) {
            const msg = (event as { message?: { usage?: { input_tokens?: number } } }).message;
            if (msg?.usage?.input_tokens) promptTokens = msg.usage.input_tokens;
          }
        }

        // Record usage for managed keys
        if (isManaged && userId && (promptTokens || completionTokens)) {
          recordUsage({ userId, provider: "anthropic", model, promptTokens, completionTokens }).catch(() => {});
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Anthropic error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  const headers: HeadersInit = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };

  if (isManaged && !userId) {
    const anonCount = parseInt(req.cookies.get("bgpt_anon_count")?.value ?? "0");
    headers["Set-Cookie"] = `bgpt_anon_count=${anonCount + 1}; Path=/; Max-Age=86400; SameSite=Lax`;
  }

  return new Response(stream, { headers });
}

```

---

## `src/app/api/stripe/checkout/route.ts`

```
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true, email: true },
  });

  let customerId = user?.stripeCustomerId;

  // Create Stripe customer if needed
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user?.email ?? undefined,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  // Create checkout session in setup mode (no immediate charge)
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "setup",
    payment_method_types: ["card"],
    success_url: `${req.nextUrl.origin}/app?billing=success`,
    cancel_url: `${req.nextUrl.origin}/app?billing=cancelled`,
  });

  return Response.json({ url: checkoutSession.url });
}

```

---

## `src/app/api/stripe/usage/route.ts`

```
import { auth } from "@/lib/auth";
import { getUserUsage } from "@/lib/usage";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const usage = await getUserUsage(session.user.id);
  return Response.json(usage);
}

```

---

## `src/app/api/stripe/webhook/route.ts`

```
import { NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const customerId = session.customer as string;
      if (customerId) {
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {},
        });
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object;
      console.log(`Invoice paid: ${invoice.id} for customer ${invoice.customer}`);
      break;
    }
  }

  return Response.json({ received: true });
}

```

---

## `src/app/app/layout.tsx`

```
import { ThemeProvider } from "@/lib/theme";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

```

---

## `src/app/app/page.tsx`

```
"use client";

import { useEffect, useCallback } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { GraphCanvas } from "@/components/canvas/GraphCanvas";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";

export default function AppPage() {
  const provider = useSettingsStore((s) => s.activeProvider);
  const model = useSettingsStore((s) => s.activeModel);
  const layoutMode = useUIStore((s) => s.layoutMode);
  const setLayoutMode = useUIStore((s) => s.setLayoutMode);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
      if (mod && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
      if (mod && e.key === "l") {
        e.preventDefault();
        setLayoutMode(layoutMode === "reactflow" ? "d3force" : "reactflow");
      }
    },
    [setSettingsOpen, toggleSidebar, setLayoutMode, layoutMode]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b text-xs"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-bg-secondary)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
              BranchGPT
            </span>
          </div>
          <div className="flex items-center gap-3" style={{ color: "var(--color-text-secondary)" }}>
            {/* Layout mode toggle */}
            <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "var(--color-border)" }}>
              <button
                onClick={() => setLayoutMode("reactflow")}
                className="px-2 py-0.5 text-[10px] cursor-pointer transition-colors"
                style={{
                  backgroundColor: layoutMode === "reactflow" ? "var(--color-accent)" : "var(--color-bg)",
                  color: layoutMode === "reactflow" ? "white" : "var(--color-text-secondary)",
                }}
              >
                Tree
              </button>
              <button
                onClick={() => setLayoutMode("d3force")}
                className="px-2 py-0.5 text-[10px] cursor-pointer transition-colors"
                style={{
                  backgroundColor: layoutMode === "d3force" ? "var(--color-accent)" : "var(--color-bg)",
                  color: layoutMode === "d3force" ? "white" : "var(--color-text-secondary)",
                }}
              >
                Force
              </button>
            </div>
            <span className="capitalize">{provider}</span>
            <span>/</span>
            <span>{model}</span>
          </div>
        </div>

        {/* Graph Canvas */}
        <GraphCanvas />
      </div>

      <SettingsModal />
    </div>
  );
}

```

---

## `src/app/globals.css`

```
@import "tailwindcss";

:root {
  /* Default: OpenAI Light */
  --color-bg: #ffffff;
  --color-bg-secondary: #f7f7f8;
  --color-bg-tertiary: #ececf1;
  --color-text: #1a1a2e;
  --color-text-secondary: #6e6e80;
  --color-text-tertiary: #8e8ea0;
  --color-accent: #10a37f;
  --color-accent-hover: #0d8a6b;
  --color-accent-light: #e6f7f2;
  --color-border: #d9d9e3;
  --color-border-light: #ececf1;
  --color-node-user: #e6f7f2;
  --color-node-assistant: #f7f7f8;
  --color-node-user-text: #1a1a2e;
  --color-node-assistant-text: #1a1a2e;
  --color-edge: #d9d9e3;
  --color-sidebar: #f7f7f8;
  --color-compose: #ffffff;
  --color-error: #ef4444;
  --color-streaming: #10a37f;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  background-color: var(--color-bg);
  color: var(--color-text);
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

/* React Flow overrides */
.react-flow__node {
  cursor: pointer !important;
}
.react-flow__node:hover {
  z-index: 10 !important;
}
.react-flow__edge-path {
  stroke-linecap: round;
}

```

---

## `src/app/layout.tsx`

```
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "BranchGPT",
  description: "Branching conversation UI for ChatGPT and Claude",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

```

---

## `src/app/login/LoginForm.tsx`

```
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/app";

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn("nodemailer", { email, callbackUrl });
    setEmailSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-gray-900 mb-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-emerald-600">
              <circle cx="12" cy="4" r="3" fill="currentColor" />
              <circle cx="6" cy="16" r="3" fill="currentColor" />
              <circle cx="18" cy="16" r="3" fill="currentColor" />
              <path d="M12 7v4M12 11l-6 5M12 11l6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            BranchGPT
          </Link>
          <p className="text-gray-500 text-sm">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <button
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => signIn("github", { callbackUrl })}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-400">or</span>
            </div>
          </div>

          {emailSent ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-700 font-medium">Check your email</p>
              <p className="text-xs text-gray-500 mt-1">
                We sent a magic link to <strong>{email}</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 mb-3"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors text-sm cursor-pointer"
              >
                Send magic link
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By signing in, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

```

---

## `src/app/login/page.tsx`

```
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

```

---

## `src/app/page.tsx`

```
"use client";

import { useEffect, useCallback } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { GraphCanvas } from "@/components/canvas/GraphCanvas";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";

export default function Home() {
  const provider = useSettingsStore((s) => s.activeProvider);
  const model = useSettingsStore((s) => s.activeModel);
  const layoutMode = useUIStore((s) => s.layoutMode);
  const setLayoutMode = useUIStore((s) => s.setLayoutMode);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
      if (mod && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
      if (mod && e.key === "l") {
        e.preventDefault();
        setLayoutMode(layoutMode === "reactflow" ? "d3force" : "reactflow");
      }
    },
    [setSettingsOpen, toggleSidebar, setLayoutMode, layoutMode]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b text-xs"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-bg-secondary)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
              BranchGPT
            </span>
          </div>
          <div className="flex items-center gap-3" style={{ color: "var(--color-text-secondary)" }}>
            {/* Layout mode toggle */}
            <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "var(--color-border)" }}>
              <button
                onClick={() => setLayoutMode("reactflow")}
                className="px-2 py-0.5 text-[10px] cursor-pointer transition-colors"
                style={{
                  backgroundColor: layoutMode === "reactflow" ? "var(--color-accent)" : "var(--color-bg)",
                  color: layoutMode === "reactflow" ? "white" : "var(--color-text-secondary)",
                }}
              >
                Tree
              </button>
              <button
                onClick={() => setLayoutMode("d3force")}
                className="px-2 py-0.5 text-[10px] cursor-pointer transition-colors"
                style={{
                  backgroundColor: layoutMode === "d3force" ? "var(--color-accent)" : "var(--color-bg)",
                  color: layoutMode === "d3force" ? "white" : "var(--color-text-secondary)",
                }}
              >
                Force
              </button>
            </div>
            <span className="capitalize">{provider}</span>
            <span>/</span>
            <span>{model}</span>
          </div>
        </div>

        {/* Graph Canvas */}
        <GraphCanvas />
      </div>

      <SettingsModal />
    </div>
  );
}

```

---

## `src/app/pricing/page.tsx`

```
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Pricing } from "@/components/landing/Pricing";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <div className="pt-16">
        <Pricing />
      </div>
      <Footer />
    </div>
  );
}

```

---

## `src/app/providers.tsx`

```
"use client";

export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

```

---

## `src/components/canvas/GraphCanvas.tsx`

```
"use client";

import { useUIStore } from "@/stores/uiStore";
import { ReactFlowCanvas } from "./reactflow/ReactFlowCanvas";
import { D3ForceCanvas } from "./d3force/D3ForceCanvas";

export function GraphCanvas() {
  const layoutMode = useUIStore((s) => s.layoutMode);

  if (layoutMode === "d3force") {
    return <D3ForceCanvas />;
  }

  return <ReactFlowCanvas />;
}

```

---

## `src/components/canvas/d3force/D3ForceCanvas.tsx`

```
"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceY,
  forceX,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";
import { useConversationStore } from "@/stores/conversationStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { streamChat, buildMessagesFromChain } from "@/lib/api";
import type { MessageNode } from "@/types";

interface SimNode extends SimulationNodeDatum {
  id: string;
  message?: MessageNode;
  isCompose?: boolean;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  id: string;
}

const NODE_W = 260;
const NODE_H = 100;

export function D3ForceCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simLinks, setSimLinks] = useState<SimLink[]>([]);

  const activeConversationId = useConversationStore((s) => s.activeConversationId);
  const nodes = useConversationStore((s) => s.nodes);
  const selectedNodeIds = useSelectionStore((s) => s.selectedNodeIds);
  const selectNode = useSelectionStore((s) => s.selectNode);
  const toggleNode = useSelectionStore((s) => s.toggleNode);
  const composeParentId = useUIStore((s) => s.composeParentId);
  const setComposeParentId = useUIStore((s) => s.setComposeParentId);

  // Compose state
  const [composeText, setComposeText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const addUserMessage = useConversationStore((s) => s.addUserMessage);
  const addAssistantNode = useConversationStore((s) => s.addAssistantNode);
  const appendToNode = useConversationStore((s) => s.appendToNode);
  const setNodeStatus = useConversationStore((s) => s.setNodeStatus);
  const persistNode = useConversationStore((s) => s.persistNode);
  const getAncestorChain = useConversationStore((s) => s.getAncestorChain);
  const createConversation = useConversationStore((s) => s.createConversation);
  const updateConversationTitle = useConversationStore((s) => s.updateConversationTitle);

  const provider = useSettingsStore((s) => s.activeProvider);
  const model = useSettingsStore((s) => s.activeModel);
  const generationParams = useSettingsStore((s) => s.generationParams);
  const openaiKey = useSettingsStore((s) => s.openaiApiKey);
  const anthropicKey = useSettingsStore((s) => s.anthropicApiKey);
  const apiKey = provider === "openai" ? openaiKey : anthropicKey;

  // Build simulation data from conversation nodes
  const { nodeData, linkData } = useMemo(() => {
    const nd: SimNode[] = [];
    const ld: SimLink[] = [];

    if (!activeConversationId) {
      nd.push({ id: "compose", isCompose: true, x: 0, y: 0 });
      return { nodeData: nd, linkData: ld };
    }

    const convNodes = Object.values(nodes).filter(
      (n) => n.conversationId === activeConversationId
    );

    for (const n of convNodes) {
      nd.push({ id: n.id, message: n });
      if (n.parentId && nodes[n.parentId]) {
        ld.push({ id: `e-${n.parentId}-${n.id}`, source: n.parentId, target: n.id });
      }
    }

    // Compose node
    nd.push({ id: "compose", isCompose: true });
    if (composeParentId && nodes[composeParentId]) {
      ld.push({ id: `e-${composeParentId}-compose`, source: composeParentId, target: "compose" });
    }

    return { nodeData: nd, linkData: ld };
  }, [nodes, activeConversationId, composeParentId]);

  // Run force simulation
  useEffect(() => {
    const sim = forceSimulation<SimNode>(nodeData)
      .force(
        "link",
        forceLink<SimNode, SimLink>(linkData)
          .id((d) => d.id)
          .distance(160)
      )
      .force("charge", forceManyBody().strength(-400))
      .force("y", forceY(0).strength(0.05))
      .force("x", forceX(0).strength(0.02))
      .on("tick", () => {
        setSimNodes([...sim.nodes()]);
        setSimLinks([...linkData]);
      });

    sim.alpha(0.8).restart();

    return () => {
      sim.stop();
    };
  }, [nodeData, linkData]);

  // Setup zoom
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = select(svgRef.current);
    const g = select(gRef.current);

    const zoomBehavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior);
    svg.call(zoomBehavior.transform, zoomIdentity);

    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  const handleNodeClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if (nodeId === "compose") return;
      if (e.metaKey || e.ctrlKey) {
        toggleNode(nodeId);
      } else {
        const msg = nodes[nodeId];
        if (msg?.role === "assistant" && msg.status === "complete") {
          setComposeParentId(nodeId);
        }
        selectNode(nodeId);
      }
    },
    [nodes, setComposeParentId, selectNode, toggleNode]
  );

  const handleSend = useCallback(async () => {
    if (!composeText.trim() || isSending || !apiKey) return;
    setIsSending(true);
    const text = composeText.trim();
    setComposeText("");

    let convId = activeConversationId;
    if (!convId) convId = createConversation(provider, model);

    const userNodeId = addUserMessage(convId, composeParentId, text, provider, model);
    const assistantNodeId = addAssistantNode(convId, userNodeId, provider, model);
    selectNode(assistantNodeId);

    const chain = getAncestorChain(userNodeId);
    const messages = buildMessagesFromChain(chain, generationParams.systemPrompt);

    const convNodes = Object.values(nodes).filter((n) => n.conversationId === convId);
    if (convNodes.length <= 1) {
      updateConversationTitle(convId!, text.slice(0, 50) + (text.length > 50 ? "..." : ""));
    }

    const ac = new AbortController();
    abortRef.current = ac;

    await streamChat({
      messages,
      model,
      provider,
      generationParams,
      apiKey,
      signal: ac.signal,
      onChunk: (chunk) => appendToNode(assistantNodeId, chunk),
      onDone: () => {
        setNodeStatus(assistantNodeId, "complete");
        persistNode(assistantNodeId);
        persistNode(userNodeId);
        setComposeParentId(assistantNodeId);
      },
      onError: (error) => {
        setNodeStatus(assistantNodeId, "error");
        appendToNode(assistantNodeId, `\n\nError: ${error}`);
        persistNode(assistantNodeId);
      },
    });

    setIsSending(false);
    abortRef.current = null;
  }, [
    composeText, isSending, apiKey, activeConversationId, composeParentId,
    provider, model, generationParams, nodes,
    createConversation, addUserMessage, addAssistantNode, appendToNode,
    setNodeStatus, persistNode, getAncestorChain, selectNode,
    setComposeParentId, updateConversationTitle,
  ]);

  return (
    <div className="flex-1 h-full relative" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Dot grid background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <pattern id="dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1" fill="var(--color-border-light)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      <svg ref={svgRef} className="w-full h-full">
        <g ref={gRef}>
          {/* Edges */}
          {simLinks.map((link) => {
            const source = link.source as SimNode;
            const target = link.target as SimNode;
            if (!source.x || !source.y || !target.x || !target.y) return null;
            return (
              <line
                key={link.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="var(--color-edge)"
                strokeWidth={1.5}
              />
            );
          })}

          {/* Nodes via foreignObject */}
          {simNodes.map((sn) => {
            if (!sn.x || !sn.y) return null;

            if (sn.isCompose) {
              return (
                <foreignObject
                  key="compose"
                  x={(sn.x ?? 0) - 150}
                  y={(sn.y ?? 0) - 60}
                  width={300}
                  height={120}
                >
                  <div
                    className="rounded-xl shadow-lg p-3 flex flex-col gap-2"
                    style={{
                      backgroundColor: "var(--color-compose)",
                      border: "2px solid var(--color-accent)",
                    }}
                  >
                    <textarea
                      value={composeText}
                      onChange={(e) => setComposeText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Type a message..."
                      rows={2}
                      disabled={isSending}
                      className="resize-none rounded-lg border px-2 py-1.5 text-xs focus:outline-none"
                      style={{
                        borderColor: "var(--color-border)",
                        backgroundColor: "var(--color-bg)",
                        color: "var(--color-text)",
                      }}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSend}
                        disabled={!composeText.trim() || !apiKey || isSending}
                        className="rounded-lg px-3 py-1 text-[11px] font-medium text-white disabled:opacity-40 cursor-pointer"
                        style={{ backgroundColor: "var(--color-accent)" }}
                      >
                        {isSending ? "..." : "Send"}
                      </button>
                    </div>
                  </div>
                </foreignObject>
              );
            }

            const msg = sn.message!;
            const isUser = msg.role === "user";
            const isSelected = selectedNodeIds.has(msg.id);

            return (
              <foreignObject
                key={msg.id}
                x={(sn.x ?? 0) - NODE_W / 2}
                y={(sn.y ?? 0) - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                onClick={(e) => handleNodeClick(e, msg.id)}
                className="cursor-pointer"
              >
                <div
                  className="rounded-xl px-3 py-2 shadow-sm h-full overflow-hidden"
                  style={{
                    backgroundColor: isUser
                      ? "var(--color-node-user)"
                      : "var(--color-node-assistant)",
                    color: isUser
                      ? "var(--color-node-user-text)"
                      : "var(--color-node-assistant-text)",
                    border: isSelected
                      ? "2px solid var(--color-accent)"
                      : "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase opacity-60">
                      {msg.role}
                    </span>
                    <span
                      className="text-[8px] px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "var(--color-bg-tertiary)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {msg.model}
                    </span>
                  </div>
                  <div className="text-xs leading-relaxed whitespace-pre-wrap break-words max-h-16 overflow-hidden">
                    {msg.content || (msg.status === "streaming" ? "..." : "")}
                  </div>
                </div>
              </foreignObject>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

```

---

## `src/components/canvas/reactflow/ComposeNode.tsx`

```
"use client";

import { memo, useState, useRef, useCallback, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowComposeNode } from "@/types";
import { useConversationStore } from "@/stores/conversationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { streamChat, buildMessagesFromChain } from "@/lib/api";
import { gatherContextNodes } from "@/lib/graph";
import { FileUploadZone } from "@/components/compose/FileUploadZone";
import type { Attachment } from "@/types";

interface BranchInput {
  id: string;
  text: string;
  attachments: Attachment[];
}

function ComposeNodeComponent({ data }: NodeProps<FlowComposeNode>) {
  const [sharedPrefix, setSharedPrefix] = useState("");
  const [branches, setBranches] = useState<BranchInput[]>([
    { id: "1", text: "", attachments: [] },
  ]);
  const [sharedAttachments, setSharedAttachments] = useState<Attachment[]>([]);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const abortRefs = useRef<Map<string, AbortController>>(new Map());

  const activeConversationId = useConversationStore((s) => s.activeConversationId);
  const addUserMessage = useConversationStore((s) => s.addUserMessage);
  const addAssistantNode = useConversationStore((s) => s.addAssistantNode);
  const appendToNode = useConversationStore((s) => s.appendToNode);
  const setNodeStatus = useConversationStore((s) => s.setNodeStatus);
  const persistNode = useConversationStore((s) => s.persistNode);
  const getAncestorChain = useConversationStore((s) => s.getAncestorChain);
  const createConversation = useConversationStore((s) => s.createConversation);
  const updateConversationTitle = useConversationStore((s) => s.updateConversationTitle);
  const nodes = useConversationStore((s) => s.nodes);

  const provider = useSettingsStore((s) => s.activeProvider);
  const model = useSettingsStore((s) => s.activeModel);
  const generationParams = useSettingsStore((s) => s.generationParams);
  const openaiKey = useSettingsStore((s) => s.openaiApiKey);
  const anthropicKey = useSettingsStore((s) => s.anthropicApiKey);

  const setComposeParentId = useUIStore((s) => s.setComposeParentId);
  const selectNode = useSelectionStore((s) => s.selectNode);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

  const apiKey = provider === "openai" ? openaiKey : anthropicKey;
  const parentNodeId = data.parentNodeId;
  const selectedNodeIds = data.selectedNodeIds;
  const isSending = sendingIds.size > 0;

  // Multi-select mode: more than 1 node selected
  const isMultiContext = selectedNodeIds.length > 1;

  // Compute gathered context for display
  const contextNodes = useMemo(() => {
    if (!isMultiContext) return [];
    return gatherContextNodes(selectedNodeIds, nodes);
  }, [isMultiContext, selectedNodeIds, nodes]);

  // Rough token estimate (~4 chars per token)
  const estimatedTokens = useMemo(() => {
    if (contextNodes.length === 0) return 0;
    const totalChars = contextNodes.reduce((sum, n) => sum + n.content.length, 0);
    return Math.ceil(totalChars / 4);
  }, [contextNodes]);

  const sendBranch = useCallback(
    async (branchText: string, branchId: string, convId: string) => {
      const fullText = sharedPrefix
        ? `${sharedPrefix}\n${branchText}`.trim()
        : branchText.trim();

      if (!fullText) return;

      // In multi-select mode, attach the new user message to the most recent selected node
      // but send the gathered context from ALL selected nodes' ancestors
      const attachParent = isMultiContext
        ? selectedNodeIds[selectedNodeIds.length - 1]
        : parentNodeId;

      const userNodeId = addUserMessage(convId, attachParent, fullText, provider, model);
      const assistantNodeId = addAssistantNode(convId, userNodeId, provider, model);

      // Build messages: multi-select uses gathered context, single uses ancestor chain
      let messages;
      if (isMultiContext) {
        // Gather context from all selected nodes, then append the new user message
        const gathered = gatherContextNodes(selectedNodeIds, nodes);
        const contextWithUser = [...gathered, nodes[userNodeId]];
        messages = buildMessagesFromChain(contextWithUser, generationParams.systemPrompt, provider);
      } else {
        const chain = getAncestorChain(userNodeId);
        messages = buildMessagesFromChain(chain, generationParams.systemPrompt, provider);
      }

      const abortController = new AbortController();
      abortRefs.current.set(branchId, abortController);
      setSendingIds((prev) => new Set([...prev, branchId]));

      await streamChat({
        messages,
        model,
        provider,
        generationParams,
        apiKey,
        signal: abortController.signal,
        onChunk: (chunk) => appendToNode(assistantNodeId, chunk),
        onDone: () => {
          setNodeStatus(assistantNodeId, "complete");
          persistNode(assistantNodeId);
          persistNode(userNodeId);
          if (branches.length === 1) {
            setComposeParentId(assistantNodeId);
            clearSelection();
          }
        },
        onError: (error) => {
          setNodeStatus(assistantNodeId, "error");
          appendToNode(assistantNodeId, `\n\nError: ${error}`);
          persistNode(assistantNodeId);
        },
      });

      abortRefs.current.delete(branchId);
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(branchId);
        return next;
      });
    },
    [
      sharedPrefix, parentNodeId, isMultiContext, selectedNodeIds, nodes,
      provider, model, generationParams, apiKey,
      branches.length, addUserMessage, addAssistantNode, appendToNode,
      setNodeStatus, persistNode, getAncestorChain, setComposeParentId, clearSelection,
    ]
  );

  const handleSendAll = useCallback(async () => {
    if (!apiKey) {
      alert("Please set your API key in Settings first.");
      return;
    }

    let convId = activeConversationId;
    if (!convId) {
      convId = createConversation(provider, model);
    }

    // Auto-title
    const convNodes = Object.values(nodes).filter((n) => n.conversationId === convId);
    if (convNodes.length === 0) {
      const firstText = sharedPrefix || branches[0]?.text || "";
      const title = firstText.slice(0, 50) + (firstText.length > 50 ? "..." : "");
      if (title) updateConversationTitle(convId!, title);
    }

    const activeBranches = branches.filter((b) => b.text.trim() || sharedPrefix.trim());
    if (activeBranches.length === 0) return;

    const finalConvId = convId!;
    await Promise.all(
      activeBranches.map((b) => sendBranch(b.text, b.id, finalConvId))
    );

    setSharedPrefix("");
    setBranches([{ id: String(Date.now()), text: "", attachments: [] }]);
    setSharedAttachments([]);
  }, [
    apiKey, activeConversationId, branches, sharedPrefix, nodes,
    provider, model, createConversation, updateConversationTitle, sendBranch,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendAll();
    }
  };

  const addBranch = () => {
    setBranches((prev) => [...prev, { id: String(Date.now()), text: "", attachments: [] }]);
  };

  const removeBranch = (id: string) => {
    if (branches.length <= 1) return;
    setBranches((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBranchText = (id: string, text: string) => {
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));
  };

  const updateBranchAttachments = (id: string, attachments: Attachment[]) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, attachments: [...b.attachments, ...attachments] } : b))
    );
  };

  const removeBranchAttachment = (branchId: string, attachmentId: string) => {
    setBranches((prev) =>
      prev.map((b) =>
        b.id === branchId
          ? { ...b, attachments: b.attachments.filter((a) => a.id !== attachmentId) }
          : b
      )
    );
  };

  const handleAbortAll = () => {
    for (const [, ctrl] of abortRefs.current) {
      ctrl.abort();
    }
    setSendingIds(new Set());
  };

  const hasContent = sharedPrefix.trim() || branches.some((b) => b.text.trim());

  return (
    <div
      className="rounded-xl shadow-lg"
      style={{
        backgroundColor: "var(--color-compose)",
        border: isMultiContext
          ? "2px dashed var(--color-accent)"
          : "2px solid var(--color-accent)",
        width: 360,
        padding: 14,
      }}
    >
      {(parentNodeId || isMultiContext) && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-[var(--color-accent)] !w-2 !h-2 !border-none"
        />
      )}

      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {isMultiContext
              ? "Multi-context reply"
              : parentNodeId
                ? "Reply"
                : "New message"}
          </span>
          <span className="text-[9px]" style={{ color: "var(--color-text-tertiary)" }}>
            {model}
          </span>
        </div>

        {/* Multi-context info bar */}
        {isMultiContext && (
          <div
            className="rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[9px]"
            style={{
              backgroundColor: "var(--color-accent-light)",
              color: "var(--color-accent)",
            }}
          >
            <span>
              <strong>{selectedNodeIds.length}</strong> nodes selected
              {" / "}
              <strong>{contextNodes.length}</strong> in context
              {" / ~"}
              <strong>{estimatedTokens.toLocaleString()}</strong> tokens
            </span>
            <button
              onClick={clearSelection}
              className="nodrag nopan nowheel cursor-pointer font-medium hover:underline"
            >
              Clear
            </button>
          </div>
        )}

        {/* Context preview (collapsed) */}
        {isMultiContext && contextNodes.length > 0 && (
          <details className="nowheel nopan nodrag">
            <summary
              className="text-[9px] cursor-pointer select-none"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Preview context ({contextNodes.length} messages)
            </summary>
            <div
              className="mt-1 max-h-[120px] overflow-y-auto rounded border px-2 py-1 text-[9px] leading-relaxed"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-bg-secondary)",
                color: "var(--color-text-secondary)",
              }}
            >
              {contextNodes.map((n) => (
                <div key={n.id} className="mb-1">
                  <span className="font-semibold uppercase opacity-60">{n.role}: </span>
                  {n.content.slice(0, 100)}{n.content.length > 100 ? "..." : ""}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Shared Prefix */}
        {branches.length > 1 && (
          <div className="flex flex-col gap-1">
            <label
              className="text-[9px] font-medium uppercase tracking-wide"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Shared prefix
            </label>
            <textarea
              value={sharedPrefix}
              onChange={(e) => setSharedPrefix(e.target.value)}
              placeholder="Common beginning for all branches..."
              rows={2}
              disabled={isSending}
              className="nowheel nopan nodrag resize-none rounded-lg border px-2.5 py-1.5 text-xs leading-relaxed focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-accent)",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                borderStyle: "dashed",
              }}
            />
          </div>
        )}

        {/* Shared Attachments */}
        {branches.length > 1 && (
          <FileUploadZone
            attachments={sharedAttachments}
            onAttach={(files) => setSharedAttachments((prev) => [...prev, ...files])}
            onRemove={(id) => setSharedAttachments((prev) => prev.filter((a) => a.id !== id))}
            label="Shared files"
            compact
          />
        )}

        {/* Branch Textboxes */}
        <div className="flex flex-col gap-2">
          {branches.map((branch, i) => (
            <div key={branch.id} className="flex flex-col gap-1">
              {branches.length > 1 && (
                <div className="flex items-center justify-between">
                  <span
                    className="text-[9px] font-medium"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Branch {i + 1}
                  </span>
                  <button
                    onClick={() => removeBranch(branch.id)}
                    className="nodrag nopan nowheel text-[9px] cursor-pointer"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    &times;
                  </button>
                </div>
              )}
              <textarea
                value={branch.text}
                onChange={(e) => updateBranchText(branch.id, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  apiKey
                    ? branches.length > 1
                      ? "Variable ending..."
                      : "Type a message... (Enter to send)"
                    : "Set API key in Settings first"
                }
                rows={branches.length > 1 ? 2 : 3}
                disabled={sendingIds.has(branch.id)}
                className="nowheel nopan nodrag resize-none rounded-lg border px-2.5 py-2 text-xs leading-relaxed focus:outline-none focus:ring-2"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-text)",
                }}
              />
              {/* Per-branch attachments */}
              <FileUploadZone
                attachments={branch.attachments}
                onAttach={(files) => updateBranchAttachments(branch.id, files)}
                onRemove={(id) => removeBranchAttachment(branch.id, id)}
                compact
              />
              {sendingIds.has(branch.id) && (
                <span
                  className="text-[9px] animate-pulse"
                  style={{ color: "var(--color-streaming)" }}
                >
                  Streaming...
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={addBranch}
            disabled={isSending}
            className="nodrag nopan nowheel cursor-pointer rounded-lg px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-40"
            style={{
              color: "var(--color-accent)",
              border: "1px dashed var(--color-accent)",
              backgroundColor: "transparent",
            }}
          >
            + Branch
          </button>

          <div className="flex gap-2">
            {isSending ? (
              <button
                onClick={handleAbortAll}
                className="nodrag nopan nowheel cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-medium text-white"
                style={{ backgroundColor: "var(--color-error)" }}
              >
                Stop All
              </button>
            ) : (
              <button
                onClick={handleSendAll}
                disabled={!hasContent || !apiKey}
                className="nodrag nopan nowheel cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "var(--color-accent)" }}
              >
                {branches.length > 1 ? "Send All" : "Send"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const ComposeNodeMemo = memo(ComposeNodeComponent);

```

---

## `src/components/canvas/reactflow/HiddenNodesPanel.tsx`

```
"use client";

import { useCallback, useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import { getConnectedHiddenBranch } from "@/lib/graph";
import type { MessageNode, NodeId } from "@/types";

interface HiddenNodesPanelProps {
  nodes: Record<NodeId, MessageNode>;
}

export function HiddenNodesPanel({ nodes }: HiddenNodesPanelProps) {
  const [open, setOpen] = useState(false);
  const hiddenNodeIds = useUIStore((s) => s.hiddenNodeIds);
  const restoreNode = useUIStore((s) => s.restoreNode);
  const restoreAllNodes = useUIStore((s) => s.restoreAllNodes);
  const setPreviewRestoreIds = useUIStore((s) => s.setPreviewRestoreIds);
  const previewRestoreIds = useUIStore((s) => s.previewRestoreIds);

  const hiddenNodes = Array.from(hiddenNodeIds)
    .map((id) => nodes[id])
    .filter(Boolean)
    .sort((a, b) => a.createdAt - b.createdAt);

  const handleHover = useCallback(
    (nodeId: string) => {
      const branch = getConnectedHiddenBranch(nodeId, nodes, hiddenNodeIds);
      setPreviewRestoreIds(branch);
    },
    [nodes, hiddenNodeIds, setPreviewRestoreIds]
  );

  const handleHoverEnd = useCallback(() => {
    setPreviewRestoreIds(new Set());
  }, [setPreviewRestoreIds]);

  const handleRestore = useCallback(
    (nodeId: string) => {
      // Restore the full connected branch
      const branch = getConnectedHiddenBranch(nodeId, nodes, hiddenNodeIds);
      for (const id of branch) restoreNode(id);
      setPreviewRestoreIds(new Set());
    },
    [nodes, hiddenNodeIds, restoreNode, setPreviewRestoreIds]
  );

  if (hiddenNodes.length === 0) return null;

  return (
    <div className="absolute top-3 right-3 z-10">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg px-2.5 py-1.5 text-[10px] font-medium shadow-sm cursor-pointer flex items-center gap-1.5"
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-secondary)",
        }}
      >
        <span
          className="inline-flex items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{
            backgroundColor: "var(--color-text-tertiary)",
            width: 16,
            height: 16,
          }}
        >
          {hiddenNodes.length}
        </span>
        Hidden
        <span className="text-[8px]">{open ? "\u25B2" : "\u25BC"}</span>
      </button>

      {open && (
        <div
          className="mt-1 rounded-lg shadow-lg overflow-hidden"
          style={{
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            maxHeight: 300,
            width: 260,
          }}
        >
          <div
            className="flex items-center justify-between px-2.5 py-1.5 border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            <span
              className="text-[9px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Hidden nodes
            </span>
            <button
              onClick={() => {
                restoreAllNodes();
                setPreviewRestoreIds(new Set());
              }}
              className="text-[9px] font-medium cursor-pointer hover:underline"
              style={{ color: "var(--color-accent)" }}
            >
              Restore all
            </button>
          </div>
          <div
            className="overflow-y-auto"
            style={{ maxHeight: 260 }}
            onMouseLeave={handleHoverEnd}
          >
            {hiddenNodes.map((node) => {
              const isHighlighted = previewRestoreIds.has(node.id);
              return (
                <div
                  key={node.id}
                  className="flex items-center justify-between px-2.5 py-1.5 border-b last:border-b-0 transition-colors"
                  style={{
                    borderColor: "var(--color-border)",
                    backgroundColor: isHighlighted
                      ? "var(--color-accent-light)"
                      : "transparent",
                  }}
                  onMouseEnter={() => handleHover(node.id)}
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[8px] font-semibold uppercase"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        {node.role}
                      </span>
                      {node.status === "error" && (
                        <span
                          className="text-[7px] px-1 rounded"
                          style={{
                            backgroundColor: "var(--color-error)",
                            color: "white",
                          }}
                        >
                          error
                        </span>
                      )}
                      {node.status === "pending" && (
                        <span
                          className="text-[7px] px-1 rounded"
                          style={{
                            backgroundColor: "var(--color-text-tertiary)",
                            color: "white",
                          }}
                        >
                          pending
                        </span>
                      )}
                    </div>
                    <div
                      className="text-[10px] truncate"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {node.content.slice(0, 50) || "(empty)"}
                      {node.content.length > 50 ? "..." : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(node.id)}
                    className="text-[9px] font-medium cursor-pointer shrink-0 hover:underline"
                    style={{ color: "var(--color-accent)" }}
                  >
                    Restore
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

```

---

## `src/components/canvas/reactflow/MessageNode.tsx`

```
"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowMessageNode } from "@/types";

function MessageNodeComponent({ data }: NodeProps<FlowMessageNode>) {
  const { message, isSelected, isOnActivePath, isContextNode, isCollapsed, onBranch, onToggleCollapse } = data;
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const isError = message.status === "error";

  const bgColor = isUser
    ? "var(--color-node-user)"
    : "var(--color-node-assistant)";
  const textColor = isUser
    ? "var(--color-node-user-text)"
    : "var(--color-node-assistant-text)";

  const truncatedContent = message.content.length > 60
    ? message.content.slice(0, 60) + "..."
    : message.content;

  return (
    <div
      className="relative rounded-xl px-3 py-2 shadow-sm transition-all"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        width: 300,
        minHeight: isCollapsed ? 32 : 60,
        border: isSelected
          ? "2px solid var(--color-accent)"
          : isContextNode
            ? "2px dashed var(--color-accent)"
            : "1px solid var(--color-border)",
        opacity: isOnActivePath || isSelected || isContextNode ? 1 : 0.7,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-[var(--color-accent)] !w-2 !h-2 !border-none"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(message.id);
            }}
            className="text-[10px] opacity-50 hover:opacity-100 transition-opacity cursor-pointer select-none nodrag nopan"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? "\u25B6" : "\u25BC"}
          </button>
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
            {message.role}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[8px] px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: "var(--color-bg-tertiary)",
              color: "var(--color-text-secondary)",
            }}
          >
            {message.model}
          </span>
          {isStreaming && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: "var(--color-streaming)" }}
            />
          )}
        </div>
      </div>

      {isCollapsed ? (
        /* Collapsed: single line preview */
        <div className="text-[10px] leading-tight opacity-50 truncate">
          {truncatedContent || (isStreaming ? "..." : "")}
        </div>
      ) : (
        <>
          {/* Attachment thumbnails */}
          {message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="rounded border overflow-hidden"
                  style={{
                    borderColor: "var(--color-border)",
                    width: 36,
                    height: 36,
                  }}
                >
                  {att.mimeType.startsWith("image/") ? (
                    <img
                      src={`data:${att.mimeType};base64,${att.data}`}
                      alt={att.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-[7px]"
                      style={{
                        backgroundColor: "var(--color-bg-tertiary)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {att.fileName.split(".").pop()?.toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="text-xs leading-relaxed whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto nowheel">
            {message.content || (isStreaming ? "..." : "")}
            {isError && (
              <span className="text-[var(--color-error)]"> (Error)</span>
            )}
          </div>
        </>
      )}

      {/* Branch button for assistant nodes */}
      {!isUser && message.status === "complete" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBranch(message.id);
          }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[var(--color-accent)] text-white text-[9px] px-2 py-0.5 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
          title="Branch from here"
        >
          + Branch
        </button>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-[var(--color-accent)] !w-2 !h-2 !border-none"
      />
    </div>
  );
}

export const MessageNodeMemo = memo(MessageNodeComponent);

```

---

## `src/components/canvas/reactflow/ReactFlowCanvas.tsx`

```
"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useConversationStore } from "@/stores/conversationStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUIStore } from "@/stores/uiStore";
import { computeLayout } from "@/lib/graph";
import { gatherContextNodes } from "@/lib/graph";
import { MessageNodeMemo } from "./MessageNode";
import { ComposeNodeMemo } from "./ComposeNode";
import { SelectionContour } from "./SelectionContour";

const nodeTypes: NodeTypes = {
  message: MessageNodeMemo,
  compose: ComposeNodeMemo,
};

function ReactFlowCanvasInner() {
  const activeConversationId = useConversationStore((s) => s.activeConversationId);
  const nodes = useConversationStore((s) => s.nodes);
  const selectedNodeIds = useSelectionStore((s) => s.selectedNodeIds);
  const toggleNode = useSelectionStore((s) => s.toggleNode);
  const selectNode = useSelectionStore((s) => s.selectNode);
  const composeParentId = useUIStore((s) => s.composeParentId);
  const setComposeParentId = useUIStore((s) => s.setComposeParentId);
  const { fitView } = useReactFlow();

  const handleBranch = useCallback(
    (nodeId: string) => {
      setComposeParentId(nodeId);
      selectNode(nodeId);
    },
    [setComposeParentId, selectNode]
  );

  // Compute active path: ancestors of compose parent
  const activePathIds = useMemo(() => {
    const set = new Set<string>();
    if (!composeParentId) return set;
    let current = nodes[composeParentId];
    while (current) {
      set.add(current.id);
      current = current.parentId ? nodes[current.parentId] : undefined;
    }
    return set;
  }, [nodes, composeParentId]);

  // Compute context nodes from multi-selection
  const contextNodeIds = useMemo(() => {
    if (selectedNodeIds.size <= 1) return new Set<string>();
    const gathered = gatherContextNodes(Array.from(selectedNodeIds), nodes);
    return new Set(gathered.map((n) => n.id));
  }, [selectedNodeIds, nodes]);

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!activeConversationId) {
      return {
        flowNodes: [
          {
            id: "compose",
            type: "compose" as const,
            position: { x: -160, y: -80 },
            data: { parentNodeId: null },
          },
        ],
        flowEdges: [],
      };
    }

    return computeLayout(
      nodes,
      activeConversationId,
      selectedNodeIds,
      contextNodeIds,
      activePathIds,
      composeParentId,
      handleBranch
    );
  }, [nodes, activeConversationId, selectedNodeIds, contextNodeIds, activePathIds, composeParentId, handleBranch]);

  // Re-fit view when node count changes
  useEffect(() => {
    const timeout = setTimeout(() => fitView({ padding: 0.3, duration: 200 }), 50);
    return () => clearTimeout(timeout);
  }, [flowNodes.length, fitView]);

  // Cmd/Ctrl+click for multi-select, plain click for single select + branch
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      if (node.id === "compose") return;

      if (event.metaKey || event.ctrlKey) {
        // Multi-select toggle
        toggleNode(node.id);
      } else {
        const messageNode = nodes[node.id];
        if (messageNode?.role === "assistant" && messageNode.status === "complete") {
          setComposeParentId(node.id);
        }
        selectNode(node.id);
      }
    },
    [nodes, setComposeParentId, selectNode, toggleNode]
  );

  // Collect positions for the contour overlay
  const contextPositions = useMemo(() => {
    if (contextNodeIds.size === 0) return [];
    return flowNodes
      .filter((n) => n.type === "message" && contextNodeIds.has(n.id))
      .map((n) => ({
        x: n.position.x,
        y: n.position.y,
        width: 280,
        height: 120,
      }));
  }, [flowNodes, contextNodeIds]);

  const composePosition = useMemo(() => {
    const cn = flowNodes.find((n) => n.id === "compose");
    return cn ? { x: cn.position.x + 160, y: cn.position.y } : null;
  }, [flowNodes]);

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-border-light)"
        />
        <Controls
          showInteractive={false}
          className="!bg-[var(--color-bg)] !border-[var(--color-border)] !shadow-sm [&>button]:!bg-[var(--color-bg)] [&>button]:!border-[var(--color-border)] [&>button]:!fill-[var(--color-text-secondary)]"
        />
        {contextPositions.length > 0 && (
          <SelectionContour
            nodeRects={contextPositions}
            composeTarget={composePosition}
          />
        )}
      </ReactFlow>
    </div>
  );
}

export function ReactFlowCanvas() {
  return (
    <ReactFlowProvider>
      <ReactFlowCanvasInner />
    </ReactFlowProvider>
  );
}

```

---

## `src/components/canvas/reactflow/SelectionContour.tsx`

```
"use client";

import { useViewport } from "@xyflow/react";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContourGroup {
  nodeRects: Rect[];
  arrowTarget: { x: number; y: number } | null;
}

interface SelectionContourProps {
  groups: ContourGroup[];
}

/**
 * Renders one contour + arrow per group. Each group wraps a set of context
 * nodes with a convex-hull contour and draws an arrow to its target node.
 */
export function SelectionContour({ groups }: SelectionContourProps) {
  const { x: vpX, y: vpY, zoom } = useViewport();

  const validGroups = groups.filter((g) => g.nodeRects.length > 0);
  if (validGroups.length === 0) return null;

  const padding = 20;

  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={{
        transform: `translate(${vpX}px, ${vpY}px) scale(${zoom})`,
        transformOrigin: "0 0",
        zIndex: 0,
      }}
    >
      <defs>
        {validGroups.map((_, i) => (
          <marker
            key={`marker-${i}`}
            id={`contour-arrow-${i}`}
            markerWidth="10"
            markerHeight="8"
            refX="9"
            refY="4"
            orient="auto"
          >
            <path
              d="M0,0 L10,4 L0,8"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </marker>
        ))}
      </defs>

      {validGroups.map((group, i) => {
        const points: [number, number][] = [];
        for (const r of group.nodeRects) {
          points.push(
            [r.x - padding, r.y - padding],
            [r.x + r.width + padding, r.y - padding],
            [r.x + r.width + padding, r.y + r.height + padding],
            [r.x - padding, r.y + r.height + padding]
          );
        }

        const hull = convexHull(points);
        if (hull.length < 3) return null;

        const contourPath = smoothHullPath(hull, 18);

        let arrowPath = "";
        if (group.arrowTarget) {
          let closest = hull[0];
          let minDist = Infinity;
          for (const p of hull) {
            const d = Math.hypot(p[0] - group.arrowTarget.x, p[1] - group.arrowTarget.y);
            if (d < minDist) {
              minDist = d;
              closest = p;
            }
          }

          const dx = group.arrowTarget.x - closest[0];
          const dy = group.arrowTarget.y - closest[1];
          const dist = Math.hypot(dx, dy);

          if (dist > 10) {
            const midX = (closest[0] + group.arrowTarget.x) / 2;
            const midY = (closest[1] + group.arrowTarget.y) / 2;
            const perpX = -(dy / dist) * 25;
            const perpY = (dx / dist) * 25;
            const cpX = midX + perpX;
            const cpY = midY + perpY;

            arrowPath = `M ${closest[0]} ${closest[1]} Q ${cpX} ${cpY} ${group.arrowTarget.x} ${group.arrowTarget.y}`;
          }
        }

        return (
          <g key={`contour-group-${i}`}>
            <path
              d={contourPath}
              fill="var(--color-accent)"
              fillOpacity={0.06}
              stroke="var(--color-accent)"
              strokeWidth={2}
              strokeDasharray="8 4"
              strokeOpacity={0.5}
            />
            {arrowPath && (
              <path
                d={arrowPath}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
                strokeOpacity={0.6}
                markerEnd={`url(#contour-arrow-${i})`}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Graham scan convex hull */
function convexHull(points: [number, number][]): [number, number][] {
  if (points.length <= 3) return points;

  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

/** Catmull-Rom to cubic bezier smoothing of hull points */
function smoothHullPath(hull: [number, number][], tension: number): string {
  if (hull.length < 3) return "";

  const n = hull.length;
  const parts: string[] = [];
  parts.push(`M ${hull[0][0]} ${hull[0][1]}`);

  for (let i = 0; i < n; i++) {
    const p0 = hull[(i - 1 + n) % n];
    const p1 = hull[i];
    const p2 = hull[(i + 1) % n];
    const p3 = hull[(i + 2) % n];

    const cp1x = p1[0] + (p2[0] - p0[0]) / tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) / tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) / tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) / tension;

    parts.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`);
  }

  parts.push("Z");
  return parts.join(" ");
}

```

---

## `src/components/compose/ComposePanel.tsx`

```
"use client";

import { useState, useRef, useCallback } from "react";
import { useConversationStore } from "@/stores/conversationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { streamChat, buildMessagesFromChain } from "@/lib/api";
import { Button } from "@/components/ui";

export function ComposePanel() {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeConversationId = useConversationStore((s) => s.activeConversationId);
  const addUserMessage = useConversationStore((s) => s.addUserMessage);
  const addAssistantNode = useConversationStore((s) => s.addAssistantNode);
  const appendToNode = useConversationStore((s) => s.appendToNode);
  const setNodeStatus = useConversationStore((s) => s.setNodeStatus);
  const persistNode = useConversationStore((s) => s.persistNode);
  const getAncestorChain = useConversationStore((s) => s.getAncestorChain);
  const createConversation = useConversationStore((s) => s.createConversation);
  const updateConversationTitle = useConversationStore((s) => s.updateConversationTitle);
  const nodes = useConversationStore((s) => s.nodes);

  const provider = useSettingsStore((s) => s.activeProvider);
  const model = useSettingsStore((s) => s.activeModel);
  const generationParams = useSettingsStore((s) => s.generationParams);
  const openaiKey = useSettingsStore((s) => s.openaiApiKey);
  const anthropicKey = useSettingsStore((s) => s.anthropicApiKey);
  const keyMode = useSettingsStore((s) => s.keyMode);

  const composeParentId = useUIStore((s) => s.composeParentId);
  const setComposeParentId = useUIStore((s) => s.setComposeParentId);
  const selectNode = useSelectionStore((s) => s.selectNode);

  const apiKey = provider === "openai" ? openaiKey : anthropicKey;
  const needsKey = keyMode === "byok" && !apiKey;

  const handleSend = useCallback(async () => {
    if (!text.trim() || isSending) return;
    if (needsKey) {
      alert("Please set your API key in Settings first.");
      return;
    }

    setIsSending(true);
    setQuotaError(null);
    const messageText = text.trim();
    setText("");

    let convId = activeConversationId;
    if (!convId) {
      convId = createConversation(provider, model);
    }

    // Add user message
    const userNodeId = addUserMessage(
      convId,
      composeParentId,
      messageText,
      provider,
      model
    );

    // Add streaming assistant node
    const assistantNodeId = addAssistantNode(convId, userNodeId, provider, model);
    selectNode(assistantNodeId);

    // Build messages from ancestor chain
    const chain = getAncestorChain(userNodeId);
    const messages = buildMessagesFromChain(chain, generationParams.systemPrompt);

    // Auto-title: if this is the first message, set conversation title
    const convNodes = Object.values(nodes).filter(
      (n) => n.conversationId === convId
    );
    if (convNodes.length <= 1) {
      const title = messageText.slice(0, 50) + (messageText.length > 50 ? "..." : "");
      updateConversationTitle(convId!, title);
    }

    const abortController = new AbortController();
    abortRef.current = abortController;

    await streamChat({
      messages,
      model,
      provider,
      generationParams,
      apiKey,
      keyMode,
      signal: abortController.signal,
      onChunk: (chunk) => {
        appendToNode(assistantNodeId, chunk);
      },
      onDone: () => {
        setNodeStatus(assistantNodeId, "complete");
        persistNode(assistantNodeId);
        persistNode(userNodeId);
        setComposeParentId(assistantNodeId);
      },
      onError: (error) => {
        // Check for quota/throttle errors
        if (error.includes("402") || error.includes("Free tier limit") || error.includes("429") || error.includes("Anonymous limit")) {
          setQuotaError(error);
        }
        setNodeStatus(assistantNodeId, "error");
        appendToNode(assistantNodeId, `\n\nError: ${error}`);
        persistNode(assistantNodeId);
      },
    });

    setIsSending(false);
    abortRef.current = null;
  }, [
    text, isSending, needsKey, apiKey, keyMode, activeConversationId, composeParentId,
    provider, model, generationParams, nodes,
    createConversation, addUserMessage, addAssistantNode, appendToNode,
    setNodeStatus, persistNode, getAncestorChain, selectNode,
    setComposeParentId, updateConversationTitle,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAbort = () => {
    abortRef.current?.abort();
    setIsSending(false);
  };

  const parentNode = composeParentId ? nodes[composeParentId] : null;

  return (
    <div
      className="border-t px-4 py-3 flex flex-col gap-2"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-compose)",
      }}
    >
      {/* Quota / throttle banner */}
      {quotaError && (
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs"
          style={{
            backgroundColor: "var(--color-accent-light)",
            color: "var(--color-accent)",
            border: "1px solid var(--color-accent)",
          }}
        >
          <span>
            {quotaError.includes("Anonymous")
              ? "You've used all free anonymous messages. Sign up or add your own API key in Settings to continue."
              : quotaError.includes("Free tier")
                ? "Free tier limit reached. Add a payment method in Settings or switch to your own API key (BYOK) for unlimited use."
                : quotaError}
          </span>
          <button
            onClick={() => setQuotaError(null)}
            className="shrink-0 font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Managed mode info banner (only when no BYOK key is set) */}
      {keyMode === "managed" && (
        <div
          className="text-[10px] px-2 py-1 rounded"
          style={{ color: "var(--color-text-tertiary)", backgroundColor: "var(--color-bg-secondary)" }}
        >
          Using managed API keys (5 free messages, then pay-as-you-go). Switch to &quot;Bring your own key&quot; in Settings for unlimited free use.
        </div>
      )}

      {parentNode && (
        <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
          <span>Replying to:</span>
          <span className="truncate max-w-[300px] italic">
            {parentNode.content.slice(0, 80)}...
          </span>
          <button
            onClick={() => setComposeParentId(null)}
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            needsKey
              ? "Set your API key in Settings to start chatting"
              : "Type your message... (Enter to send, Shift+Enter for newline)"
          }
          rows={2}
          className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-bg)",
            color: "var(--color-text)",
            // @ts-expect-error CSS custom property
            "--tw-ring-color": "var(--color-accent)",
          }}
          disabled={isSending}
        />
        {isSending ? (
          <Button variant="danger" size="md" onClick={handleAbort}>
            Stop
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={handleSend}
            disabled={!text.trim() || needsKey}
          >
            Send
          </Button>
        )}
      </div>
    </div>
  );
}

```

---

## `src/components/compose/FileUploadZone.tsx`

```
"use client";

import { useRef, useCallback, useState } from "react";
import { nanoid } from "nanoid";
import type { Attachment } from "@/types";

interface FileUploadZoneProps {
  attachments: Attachment[];
  onAttach: (attachments: Attachment[]) => void;
  onRemove: (id: string) => void;
  label?: string;
  compact?: boolean;
}

const MAX_IMAGE_DIM = 1024;
const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
];

export function FileUploadZone({
  attachments,
  onAttach,
  onRemove,
  label,
  compact = false,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const results: Attachment[] = [];

      for (const file of Array.from(files)) {
        if (!ACCEPTED_TYPES.includes(file.type)) continue;

        if (file.type.startsWith("image/")) {
          const attachment = await processImage(file);
          if (attachment) results.push(attachment);
        } else {
          const data = await readAsBase64(file);
          results.push({
            id: nanoid(),
            fileName: file.name,
            mimeType: file.type,
            data,
          });
        }
      }

      if (results.length > 0) onAttach(results);
    },
    [onAttach]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1 nodrag nopan nowheel">
      {/* Thumbnails */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group rounded border overflow-hidden"
              style={{
                borderColor: "var(--color-border)",
                width: compact ? 32 : 48,
                height: compact ? 32 : 48,
              }}
            >
              {att.mimeType.startsWith("image/") ? (
                <img
                  src={`data:${att.mimeType};base64,${att.data}`}
                  alt={att.fileName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-[7px]"
                  style={{ backgroundColor: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)" }}
                >
                  {att.fileName.split(".").pop()?.toUpperCase()}
                </div>
              )}
              <button
                onClick={() => onRemove(att.id)}
                className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full text-[8px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                style={{ backgroundColor: "var(--color-error)", color: "white" }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="rounded border border-dashed cursor-pointer transition-colors flex items-center justify-center"
        style={{
          borderColor: dragOver ? "var(--color-accent)" : "var(--color-border)",
          backgroundColor: dragOver ? "var(--color-accent-light)" : "transparent",
          padding: compact ? "3px 6px" : "6px 10px",
        }}
      >
        <span
          className="text-center"
          style={{
            color: "var(--color-text-tertiary)",
            fontSize: compact ? "8px" : "10px",
          }}
        >
          {label || (compact ? "+" : "Drop files or click to upload")}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

async function processImage(file: File): Promise<Attachment | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Resize if too large
        if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
          const scale = MAX_IMAGE_DIM / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, 0.85);
        const base64 = dataUrl.split(",")[1];

        resolve({
          id: nanoid(),
          fileName: file.name,
          mimeType,
          data: base64,
          width,
          height,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  });
}

```

---

## `src/components/landing/FeatureShowcase.tsx`

```
"use client";

import { useState } from "react";

interface Feature {
  title: string;
  description: string;
  videoPath: string;
  videoAlt: string;
}

const features: Feature[] = [
  {
    title: "Branching conversations",
    description:
      "Click branch on any message to fork the conversation. Explore alternative responses, compare approaches, and never lose a thought.",
    videoPath: "/features/branching.mp4",
    videoAlt: "Branching a conversation into two paths",
  },
  {
    title: "Multi-select context",
    description:
      "Cmd+click multiple nodes to select them as context. A visual contour groups your selection, and you can send a message informed by all of them.",
    videoPath: "/features/multi-select.mp4",
    videoAlt: "Selecting multiple nodes as context",
  },
  {
    title: "Visual tree layout",
    description:
      "See your entire conversation as an interactive tree. Zoom, pan, and navigate branches visually as your discussion grows.",
    videoPath: "/features/tree-layout.mp4",
    videoAlt: "Visual tree growing with conversation",
  },
  {
    title: "Multi-provider support",
    description:
      "Switch between OpenAI and Anthropic models mid-conversation. Compare GPT-4o and Claude side-by-side on the same prompt.",
    videoPath: "/features/multi-provider.mp4",
    videoAlt: "Switching between GPT-4o and Claude",
  },
  {
    title: "Collapsible nodes",
    description:
      "Collapse long messages to keep your tree tidy. Expand them anytime to see the full content.",
    videoPath: "/features/collapse.mp4",
    videoAlt: "Collapsing and expanding nodes",
  },
  {
    title: "Hidden nodes panel",
    description:
      "Hide branches you don't need right now. Peek at hidden nodes with a hover preview and restore them instantly.",
    videoPath: "/features/hide-restore.mp4",
    videoAlt: "Hiding and restoring nodes",
  },
];

function FeatureVideo({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="text-gray-400 text-sm text-center p-8">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mx-auto mb-2 opacity-40"
        >
          <polygon points="5,3 19,12 5,21" />
        </svg>
        {alt}
      </div>
    );
  }

  return (
    <video
      src={src}
      autoPlay
      loop
      muted
      playsInline
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function FeatureShowcase() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
          Everything you need to explore ideas
        </h2>
        <p className="text-lg text-gray-500 text-center max-w-2xl mx-auto mb-16">
          BranchGPT gives you superpowers for AI conversations with a visual, branching interface.
        </p>

        <div className="space-y-24">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`flex flex-col ${
                i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              } items-center gap-12`}
            >
              {/* Video / fallback placeholder */}
              <div className="flex-1 w-full">
                <div className="rounded-xl border border-gray-200 bg-gray-100 shadow-lg overflow-hidden aspect-video flex items-center justify-center">
                  <FeatureVideo src={feature.videoPath} alt={feature.videoAlt} />
                </div>
              </div>

              {/* Text */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-lg leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

```

---

## `src/components/landing/Features.tsx`

```
const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="4" r="2" />
        <circle cx="6" cy="16" r="2" />
        <circle cx="18" cy="16" r="2" />
        <path d="M12 6v4M12 10l-6 6M12 10l6 6" />
      </svg>
    ),
    title: "Branch anything",
    description: "Fork any message to explore alternative paths. Your conversation becomes a tree of possibilities.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 17h7" />
      </svg>
    ),
    title: "Multi-select context",
    description: "Select nodes from different branches as context for a single prompt. Synthesize ideas across paths.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    title: "Visual tree",
    description: "See your full conversation as an interactive graph. Zoom, pan, and click to navigate.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="8" cy="6" r="1" fill="currentColor" />
        <circle cx="16" cy="12" r="1" fill="currentColor" />
        <circle cx="10" cy="18" r="1" fill="currentColor" />
      </svg>
    ),
    title: "Multi-provider",
    description: "Switch between OpenAI and Anthropic mid-conversation. Compare models on the same prompt.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path d="M9 12h6M12 9v6" />
      </svg>
    ),
    title: "Collapse & hide",
    description: "Collapse long messages or hide entire branches to keep your workspace clean.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: "Bring your own key",
    description: "Use your own API keys for unlimited free access, or let us handle it with pay-as-you-go.",
  },
];

export function Features() {
  return (
    <section className="py-24 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
          Built for power users
        </h2>
        <p className="text-lg text-gray-500 text-center max-w-2xl mx-auto mb-16">
          Everything you need to have better, more productive conversations with AI.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

```

---

## `src/components/landing/Footer.tsx`

```
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-emerald-600">
                <circle cx="12" cy="4" r="3" fill="currentColor" />
                <circle cx="6" cy="16" r="3" fill="currentColor" />
                <circle cx="18" cy="16" r="3" fill="currentColor" />
                <path d="M12 7v4M12 11l-6 5M12 11l6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              BranchGPT
            </Link>
            <p className="text-sm text-gray-500">
              Branching conversations for AI power users.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#features" className="hover:text-gray-700">Features</a></li>
              <li><Link href="/pricing" className="hover:text-gray-700">Pricing</Link></li>
              <li><a href="https://github.com/your-repo/branchgpt" className="hover:text-gray-700">GitHub</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Developers</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="https://www.npmjs.com/package/branchgpt" className="hover:text-gray-700">npm Package</a></li>
              <li><a href="https://github.com/your-repo/branchgpt" className="hover:text-gray-700">Source Code</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#" className="hover:text-gray-700">Privacy</a></li>
              <li><a href="#" className="hover:text-gray-700">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} BranchGPT. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

```

---

## `src/components/landing/Hero.tsx`

```
import Link from "next/link";

export function Hero() {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Now with pay-as-you-go pricing
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight leading-tight mb-6">
          Branch your AI conversations
          <br />
          <span className="text-emerald-600">like a pro</span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Explore multiple paths in one conversation. Fork replies, compare models side-by-side,
          and navigate your chat history as a visual tree.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-xl bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
          >
            Start for free
          </Link>
          <Link
            href="/app"
            className="px-8 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-lg hover:bg-gray-50 transition-colors"
          >
            Open app
          </Link>
        </div>

        {/* App preview */}
        <div className="relative max-w-5xl mx-auto">
          <div className="rounded-xl border border-gray-200 bg-gray-100 shadow-2xl overflow-hidden aspect-video flex items-center justify-center">
            {/* Placeholder for app preview GIF — will be replaced by Playwright capture */}
            <div className="text-gray-400 text-sm">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mx-auto mb-3 opacity-50"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              App preview
            </div>
          </div>
          {/* Gradient glow behind the preview */}
          <div className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-b from-emerald-100/50 to-transparent blur-2xl" />
        </div>
      </div>
    </section>
  );
}

```

---

## `src/components/landing/Navbar.tsx`

```
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-emerald-600">
            <circle cx="12" cy="4" r="3" fill="currentColor" />
            <circle cx="6" cy="16" r="3" fill="currentColor" />
            <circle cx="18" cy="16" r="3" fill="currentColor" />
            <path d="M12 7v4M12 11l-6 5M12 11l6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          BranchGPT
        </Link>

        <div className="hidden sm:flex items-center gap-8 text-sm text-gray-600">
          <a href="#features" className="hover:text-gray-900 transition-colors">
            Features
          </a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">
            Pricing
          </a>
          <Link
            href="/login"
            className="text-gray-900 font-medium hover:text-emerald-600 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

```

---

## `src/components/landing/Pricing.tsx`

```
import Link from "next/link";

const models = [
  { name: "GPT-4o", input: "$3.50", output: "$14.00" },
  { name: "GPT-4o mini", input: "$0.21", output: "$0.84" },
  { name: "Claude Sonnet 4.6", input: "$4.20", output: "$21.00" },
  { name: "Claude Haiku 4.5", input: "$1.12", output: "$5.60" },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
          Simple, pay-as-you-go pricing
        </h2>
        <p className="text-lg text-gray-500 text-center max-w-2xl mx-auto mb-12">
          Start free with 5 messages. Then pay only for what you use — no subscriptions, no commitments.
          Or bring your own API key for unlimited use at no charge.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Free tier */}
          <div className="rounded-xl border border-gray-200 bg-white p-8">
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Free
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-1">$0</div>
            <p className="text-gray-500 mb-6">5 free messages to try it out</p>
            <ul className="space-y-3 text-sm text-gray-600 mb-8">
              <li className="flex items-center gap-2">
                <Check /> 5 AI messages included
              </li>
              <li className="flex items-center gap-2">
                <Check /> All models available
              </li>
              <li className="flex items-center gap-2">
                <Check /> Full branching features
              </li>
              <li className="flex items-center gap-2">
                <Check /> Bring your own key (unlimited)
              </li>
            </ul>
            <Link
              href="/login"
              className="block w-full text-center py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Get started
            </Link>
          </div>

          {/* Pay as you go */}
          <div className="rounded-xl border-2 border-emerald-600 bg-white p-8 relative">
            <div className="absolute -top-3 left-6 px-3 py-0.5 bg-emerald-600 text-white text-xs font-semibold rounded-full">
              Popular
            </div>
            <div className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-2">
              Pay as you go
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-1">
              Usage-based
            </div>
            <p className="text-gray-500 mb-6">Per-token pricing with no minimum</p>
            <ul className="space-y-3 text-sm text-gray-600 mb-8">
              <li className="flex items-center gap-2">
                <Check /> Unlimited messages
              </li>
              <li className="flex items-center gap-2">
                <Check /> All models available
              </li>
              <li className="flex items-center gap-2">
                <Check /> Monthly invoicing via Stripe
              </li>
              <li className="flex items-center gap-2">
                <Check /> Usage dashboard in settings
              </li>
            </ul>
            <Link
              href="/login"
              className="block w-full text-center py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
            >
              Start for free
            </Link>
          </div>
        </div>

        {/* Per-model pricing table */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-6 font-semibold text-gray-900">Model</th>
                <th className="text-right py-3 px-6 font-semibold text-gray-900">Input / 1M tokens</th>
                <th className="text-right py-3 px-6 font-semibold text-gray-900">Output / 1M tokens</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.name} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 px-6 text-gray-700 font-medium">{m.name}</td>
                  <td className="py-3 px-6 text-right text-gray-600">{m.input}</td>
                  <td className="py-3 px-6 text-right text-gray-600">{m.output}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-emerald-600 shrink-0">
      <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

```

---

## `src/components/settings/SettingsModal.tsx`

```
"use client";

import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";
import { useConversationStore } from "@/stores/conversationStore";
import { Modal, Input, Button } from "@/components/ui";
import { getModelsForProvider } from "@/types";
import type { Provider } from "@/types";
import { conversationRepo } from "@/lib/db";

export function SettingsModal() {
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);

  const openaiKey = useSettingsStore((s) => s.openaiApiKey);
  const anthropicKey = useSettingsStore((s) => s.anthropicApiKey);
  const activeProvider = useSettingsStore((s) => s.activeProvider);
  const activeModel = useSettingsStore((s) => s.activeModel);
  const generationParams = useSettingsStore((s) => s.generationParams);
  const theme = useSettingsStore((s) => s.theme);

  const setOpenaiKey = useSettingsStore((s) => s.setOpenaiApiKey);
  const setAnthropicKey = useSettingsStore((s) => s.setAnthropicApiKey);
  const setActiveProvider = useSettingsStore((s) => s.setActiveProvider);
  const setActiveModel = useSettingsStore((s) => s.setActiveModel);
  const setGenerationParams = useSettingsStore((s) => s.setGenerationParams);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const conversations = useConversationStore((s) => s.conversations);
  const nodes = useConversationStore((s) => s.nodes);
  const loadConversations = useConversationStore((s) => s.loadConversations);

  const models = getModelsForProvider(activeProvider);

  const handleExport = () => {
    const data = {
      conversations: Object.values(conversations),
      nodes: Object.values(nodes),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `branchgpt-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.conversations && data.nodes) {
          for (const conv of data.conversations) {
            await conversationRepo.saveConversation(conv);
          }
          await conversationRepo.saveNodes(data.nodes);
          await loadConversations();
          alert("Import successful!");
        }
      } catch {
        alert("Invalid export file.");
      }
    };
    input.click();
  };

  return (
    <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
      <div className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* API Keys */}
        <section>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text)" }}>
            API Keys
          </h3>
          <div className="flex flex-col gap-3">
            <Input
              label="OpenAI API Key"
              type="password"
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
            <Input
              label="Anthropic API Key"
              type="password"
              placeholder="sk-ant-..."
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
          </div>
        </section>

        {/* Provider & Model */}
        <section>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text)" }}>
            Model
          </h3>
          <div className="flex gap-2 mb-3">
            {(["openai", "anthropic"] as Provider[]).map((p) => (
              <Button
                key={p}
                variant={activeProvider === p ? "primary" : "secondary"}
                size="sm"
                onClick={() => setActiveProvider(p)}
              >
                {p === "openai" ? "OpenAI" : "Anthropic"}
              </Button>
            ))}
          </div>
          <select
            value={activeModel}
            onChange={(e) => setActiveModel(e.target.value)}
            className="w-full h-9 rounded-lg border px-2 text-sm focus:outline-none focus:ring-2"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text)",
            }}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </section>

        {/* Generation Params — all options */}
        <section>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text)" }}>
            Parameters
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <SliderParam
              label="Temperature"
              value={generationParams.temperature ?? 1}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) => setGenerationParams({ temperature: v })}
            />
            <SliderParam
              label="Max Tokens"
              value={generationParams.maxTokens ?? 4096}
              min={256}
              max={16384}
              step={256}
              onChange={(v) => setGenerationParams({ maxTokens: v })}
            />
            <SliderParam
              label="Top P"
              value={generationParams.topP ?? 1}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => setGenerationParams({ topP: v })}
            />
            {activeProvider === "anthropic" && (
              <SliderParam
                label="Top K"
                value={generationParams.topK ?? 0}
                min={0}
                max={500}
                step={1}
                onChange={(v) => setGenerationParams({ topK: v })}
              />
            )}
            {activeProvider === "openai" && (
              <>
                <SliderParam
                  label="Freq. Penalty"
                  value={generationParams.frequencyPenalty ?? 0}
                  min={-2}
                  max={2}
                  step={0.1}
                  onChange={(v) => setGenerationParams({ frequencyPenalty: v })}
                />
                <SliderParam
                  label="Pres. Penalty"
                  value={generationParams.presencePenalty ?? 0}
                  min={-2}
                  max={2}
                  step={0.1}
                  onChange={(v) => setGenerationParams({ presencePenalty: v })}
                />
              </>
            )}
          </div>
          <div className="mt-3">
            <Input
              label="System Prompt"
              placeholder="You are a helpful assistant..."
              value={generationParams.systemPrompt ?? ""}
              onChange={(e) =>
                setGenerationParams({ systemPrompt: e.target.value })
              }
            />
          </div>
        </section>

        {/* Theme */}
        <section>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text)" }}>
            Theme
          </h3>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTheme("light")}
            >
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTheme("dark")}
            >
              Dark
            </Button>
          </div>
        </section>

        {/* Export / Import */}
        <section>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text)" }}>
            Data
          </h3>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleExport}>
              Export All
            </Button>
            <Button variant="secondary" size="sm" onClick={handleImport}>
              Import
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
}

function SliderParam({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">
        {label}: {Number.isInteger(value) ? value : value.toFixed(2)}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--color-accent)]"
      />
    </div>
  );
}

```

---

## `src/components/settings/UsageDashboard.tsx`

```
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui";

interface UsageData {
  totalCents: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  messageCount: number;
}

export function UsageDashboard() {
  const { data: session } = useSession();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingPayment, setAddingPayment] = useState(false);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    fetch("/api/stripe/usage")
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const handleAddPayment = async () => {
    setAddingPayment(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      alert("Failed to create checkout session.");
    }
    setAddingPayment(false);
  };

  if (!session?.user) {
    return (
      <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Sign in to view usage and billing.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Loading usage data...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Messages this month" value={usage?.messageCount ?? 0} />
        <Stat label="Cost this month" value={`$${((usage?.totalCents ?? 0) / 100).toFixed(2)}`} />
        <Stat label="Input tokens" value={(usage?.totalPromptTokens ?? 0).toLocaleString()} />
        <Stat label="Output tokens" value={(usage?.totalCompletionTokens ?? 0).toLocaleString()} />
      </div>

      <Button variant="primary" size="sm" onClick={handleAddPayment} disabled={addingPayment}>
        {addingPayment ? "Redirecting..." : "Add / update payment method"}
      </Button>

      <p className="text-[10px] leading-relaxed" style={{ color: "var(--color-text-tertiary)" }}>
        Usage is billed monthly via Stripe. You can also switch to &quot;Bring your own key&quot; mode
        in the API Keys section above to use your own keys at no charge.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-lg border px-3 py-2"
      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-secondary)" }}
    >
      <div className="text-[10px] mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>
        {label}
      </div>
      <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
        {value}
      </div>
    </div>
  );
}

```

---

## `src/components/sidebar/Sidebar.tsx`

```
"use client";

import { useEffect } from "react";
import { useConversationStore } from "@/stores/conversationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui";

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const setComposeParentId = useUIStore((s) => s.setComposeParentId);

  const conversations = useConversationStore((s) => s.conversations);
  const activeConversationId = useConversationStore((s) => s.activeConversationId);
  const loadConversations = useConversationStore((s) => s.loadConversations);
  const loadConversation = useConversationStore((s) => s.loadConversation);
  const createConversation = useConversationStore((s) => s.createConversation);
  const deleteConversation = useConversationStore((s) => s.deleteConversation);

  const provider = useSettingsStore((s) => s.activeProvider);
  const model = useSettingsStore((s) => s.activeModel);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const sortedConvs = Object.values(conversations).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  const handleNewChat = () => {
    createConversation(provider, model);
    setComposeParentId(null);
  };

  const handleSelectConv = (id: string) => {
    loadConversation(id);
    setComposeParentId(null);
  };

  if (!sidebarOpen) {
    return (
      <div
        className="w-10 border-r flex flex-col items-center pt-3 gap-2"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-sidebar)",
        }}
      >
        <button
          onClick={toggleSidebar}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] text-sm cursor-pointer"
          title="Open sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-64 border-r flex flex-col h-full"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-sidebar)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Chats
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleSidebar}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] p-1 cursor-pointer"
            title="Close sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* New Chat */}
      <div className="px-3 py-2">
        <Button variant="primary" size="sm" className="w-full" onClick={handleNewChat}>
          + New Chat
        </Button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2">
        {sortedConvs.map((conv) => (
          <div
            key={conv.id}
            className="group flex items-center gap-1 rounded-lg px-2 py-1.5 mb-0.5 cursor-pointer transition-colors"
            style={{
              backgroundColor:
                conv.id === activeConversationId
                  ? "var(--color-accent-light)"
                  : "transparent",
            }}
            onClick={() => handleSelectConv(conv.id)}
            onMouseEnter={(e) => {
              if (conv.id !== activeConversationId) {
                e.currentTarget.style.backgroundColor = "var(--color-bg-tertiary)";
              }
            }}
            onMouseLeave={(e) => {
              if (conv.id !== activeConversationId) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <span
              className="flex-1 text-xs truncate"
              style={{ color: "var(--color-text)" }}
            >
              {conv.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete this conversation?")) {
                  deleteConversation(conv.id);
                }
              }}
              className="opacity-0 group-hover:opacity-100 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] transition-opacity cursor-pointer text-xs"
              title="Delete"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
              </svg>
            </button>
          </div>
        ))}

        {sortedConvs.length === 0 && (
          <p className="text-xs text-center mt-4" style={{ color: "var(--color-text-tertiary)" }}>
            No conversations yet
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => setSettingsOpen(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          Settings
        </Button>
      </div>
    </div>
  );
}

```

---

## `src/components/ui/Button.tsx`

```
"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

    const variantClasses = {
      primary: "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]",
      secondary: "bg-[var(--color-bg-secondary)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]",
      ghost: "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]",
      danger: "bg-[var(--color-error)] text-white hover:opacity-90",
    };

    const sizeClasses = {
      sm: "h-7 px-2 text-xs gap-1",
      md: "h-9 px-3 text-sm gap-2",
      lg: "h-11 px-4 text-base gap-2",
    };

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

```

---

## `src/components/ui/Input.tsx`

```
"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-medium text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${className}`}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

```

---

## `src/components/ui/Modal.tsx`

```
"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] text-lg cursor-pointer"
          >
            &times;
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

```

---

## `src/components/ui/index.ts`

```
export { Button } from "./Button";
export { Input } from "./Input";
export { Modal } from "./Modal";

```

---

## `src/lib/api/index.ts`

```
export { streamChat, buildMessagesFromChain } from "./streamChat";

```

---

## `src/lib/api/streamChat.ts`

```
import type { Provider, GenerationParams, MessageNode, Attachment } from "@/types";

type MessageContent = string | ContentBlock[];

interface ContentBlock {
  type: string;
  text?: string;
  image_url?: { url: string };
  source?: { type: string; media_type: string; data: string };
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: MessageContent;
}

export interface StreamChatParams {
  messages: ChatMessage[];
  model: string;
  provider: Provider;
  generationParams: GenerationParams;
  apiKey: string;
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function streamChat({
  messages,
  model,
  provider,
  generationParams,
  apiKey,
  onChunk,
  onDone,
  onError,
  signal,
}: StreamChatParams): Promise<void> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (provider === "openai") {
      headers["x-openai-key"] = apiKey;
    } else {
      headers["x-anthropic-key"] = apiKey;
    }

    const response = await fetch("/api/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages,
        model,
        provider,
        generationParams,
      }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      onError(`API error: ${response.status} - ${text}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              onChunk(parsed.content);
            }
            if (parsed.error) {
              onError(parsed.error);
              return;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    }

    onDone();
  } catch (err) {
    if (signal?.aborted) return;
    onError(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Build the messages array from an ancestor chain for sending to the API.
 * Handles image attachments by converting them to provider-specific content blocks.
 */
export function buildMessagesFromChain(
  chain: MessageNode[],
  systemPrompt?: string,
  provider?: Provider
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  for (const node of chain) {
    if (node.role === "system") continue;

    if (node.attachments.length > 0) {
      // Build multi-modal content blocks
      const blocks: ContentBlock[] = [];

      // Add text content
      if (node.content) {
        blocks.push({ type: "text", text: node.content });
      }

      // Add image attachments
      for (const att of node.attachments) {
        if (att.mimeType.startsWith("image/")) {
          if (provider === "anthropic") {
            blocks.push({
              type: "image",
              source: {
                type: "base64",
                media_type: att.mimeType,
                data: att.data,
              },
            });
          } else {
            // OpenAI format
            blocks.push({
              type: "image_url",
              image_url: {
                url: `data:${att.mimeType};base64,${att.data}`,
              },
            });
          }
        }
      }

      messages.push({ role: node.role, content: blocks });
    } else {
      messages.push({ role: node.role, content: node.content });
    }
  }

  return messages;
}

```

---

## `src/lib/auth.config.ts`

```
import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config (no Prisma adapter, no Nodemailer)
// Used by middleware for session checks
export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAppRoute = nextUrl.pathname.startsWith("/app");

      if (isAppRoute && !isLoggedIn) {
        return false; // Redirect to login
      }
      return true;
    },
  },
};

```

---

## `src/lib/auth.ts`

```
import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";
import type { Provider } from "next-auth/providers";

// Full auth config with Prisma adapter — used by route handlers (Node.js runtime)
const providers: Provider[] = [...authConfig.providers];

if (process.env.EMAIL_SERVER) {
  providers.push(
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM ?? "noreply@branchgpt.com",
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});

```

---

## `src/lib/db/conversationRepo.ts`

```
import { db } from "./database";
import type { Conversation, MessageNode, ConversationId } from "@/types";

export const conversationRepo = {
  async listConversations(): Promise<Conversation[]> {
    return db.conversations.orderBy("updatedAt").reverse().toArray();
  },

  async getConversation(id: ConversationId): Promise<Conversation | undefined> {
    return db.conversations.get(id);
  },

  async saveConversation(conv: Conversation): Promise<void> {
    await db.conversations.put(conv);
  },

  async deleteConversation(id: ConversationId): Promise<void> {
    await db.transaction("rw", db.conversations, db.messageNodes, async () => {
      await db.messageNodes.where("conversationId").equals(id).delete();
      await db.conversations.delete(id);
    });
  },

  async getNodesForConversation(id: ConversationId): Promise<MessageNode[]> {
    return db.messageNodes.where("conversationId").equals(id).toArray();
  },

  async saveNode(node: MessageNode): Promise<void> {
    await db.messageNodes.put(node);
  },

  async saveNodes(nodes: MessageNode[]): Promise<void> {
    await db.messageNodes.bulkPut(nodes);
  },

  async updateNodeContent(id: string, content: string, status: MessageNode["status"]): Promise<void> {
    await db.messageNodes.update(id, { content, status });
  },
};

```

---

## `src/lib/db/database.ts`

```
import Dexie, { type EntityTable } from "dexie";
import type { MessageNode, Conversation } from "@/types";

class BranchGPTDatabase extends Dexie {
  conversations!: EntityTable<Conversation, "id">;
  messageNodes!: EntityTable<MessageNode, "id">;

  constructor() {
    super("branchgpt");
    this.version(1).stores({
      conversations: "id, createdAt, updatedAt",
      messageNodes: "id, conversationId, parentId, createdAt",
    });
  }
}

export const db = new BranchGPTDatabase();

```

---

## `src/lib/db/index.ts`

```
export { db } from "./database";
export { conversationRepo } from "./conversationRepo";

```

---

## `src/lib/graph/index.ts`

```
export { getAncestorChain, gatherContextNodes, getConversationNodes, getLeafNodes } from "./treeUtils";
export { computeLayout } from "./layoutEngine";

```

---

## `src/lib/graph/layoutEngine.ts`

```
import dagre from "dagre";
import type { MessageNode, NodeId } from "@/types";
import type { FlowNode, FlowEdge, MessageNodeData, ComposeNodeData } from "@/types";

const NODE_WIDTH = 280;
const NODE_HEIGHT = 120;
const COMPOSE_NODE_WIDTH = 320;
const COMPOSE_NODE_HEIGHT = 160;

interface LayoutOptions {
  rankSeparation?: number;
  nodeSeparation?: number;
  direction?: "TB" | "LR";
}

export function computeLayout(
  nodes: Record<NodeId, MessageNode>,
  conversationId: string,
  selectedNodeIds: Set<NodeId>,
  contextNodeIds: Set<NodeId>,
  activePathIds: Set<NodeId>,
  composeParentId: string | null,
  onBranch: (nodeId: string) => void,
  options: LayoutOptions = {}
): { flowNodes: FlowNode[]; flowEdges: FlowEdge[] } {
  const {
    rankSeparation = 100,
    nodeSeparation = 40,
    direction = "TB",
  } = options;

  const convNodes = Object.values(nodes).filter(
    (n) => n.conversationId === conversationId
  );

  // Empty conversation: just show the compose node centered
  if (convNodes.length === 0 && !composeParentId) {
    return {
      flowNodes: [
        {
          id: "compose",
          type: "compose",
          position: { x: -COMPOSE_NODE_WIDTH / 2, y: -COMPOSE_NODE_HEIGHT / 2 },
          data: { parentNodeId: null } satisfies ComposeNodeData,
        },
      ],
      flowEdges: [],
    };
  }

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    ranksep: rankSeparation,
    nodesep: nodeSeparation,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of convNodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const node of convNodes) {
    if (node.parentId && nodes[node.parentId]) {
      g.setEdge(node.parentId, node.id);
    }
  }

  // Always add compose node — connected to parent if one is selected
  g.setNode("compose", {
    width: COMPOSE_NODE_WIDTH,
    height: COMPOSE_NODE_HEIGHT,
  });
  if (composeParentId && nodes[composeParentId]) {
    g.setEdge(composeParentId, "compose");
  } else {
    // Attach to deepest leaf to keep it at the bottom of the tree
    const leaves = convNodes.filter((n) => n.childIds.length === 0);
    if (leaves.length > 0) {
      // Pick the most recently created leaf
      const latest = leaves.sort((a, b) => b.createdAt - a.createdAt)[0];
      g.setEdge(latest.id, "compose");
    }
  }

  dagre.layout(g);

  const flowNodes: FlowNode[] = [];
  const flowEdges: FlowEdge[] = [];

  for (const node of convNodes) {
    const pos = g.node(node.id);
    if (!pos) continue;

    flowNodes.push({
      id: node.id,
      type: "message",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: {
        message: node,
        isSelected: selectedNodeIds.has(node.id),
        isOnActivePath: activePathIds.has(node.id),
        isContextNode: contextNodeIds.has(node.id),
        onBranch,
      } satisfies MessageNodeData,
    });
  }

  // Compose node
  const composePos = g.node("compose");
  if (composePos) {
    flowNodes.push({
      id: "compose",
      type: "compose",
      position: {
        x: composePos.x - COMPOSE_NODE_WIDTH / 2,
        y: composePos.y - COMPOSE_NODE_HEIGHT / 2,
      },
      data: { parentNodeId: composeParentId } satisfies ComposeNodeData,
    });
  }

  // Message edges
  for (const node of convNodes) {
    if (node.parentId && nodes[node.parentId]) {
      flowEdges.push({
        id: `e-${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
        animated: node.status === "streaming",
        style: {
          stroke: activePathIds.has(node.id) && activePathIds.has(node.parentId)
            ? "var(--color-accent)"
            : "var(--color-edge)",
          strokeWidth: activePathIds.has(node.id) ? 2.5 : 1.5,
        },
      });
    }
  }

  // Compose edge
  if (composeParentId && nodes[composeParentId]) {
    flowEdges.push({
      id: `e-${composeParentId}-compose`,
      source: composeParentId,
      target: "compose",
      animated: true,
      style: { stroke: "var(--color-accent)", strokeDasharray: "5 5" },
    });
  }

  return { flowNodes, flowEdges };
}

```

---

## `src/lib/graph/treeUtils.ts`

```
import type { MessageNode, NodeId } from "@/types";

/**
 * Walk the ancestor chain from a node to the root, collecting unique nodes.
 * Returns nodes in root-first (topological) order.
 */
export function getAncestorChain(
  nodeId: NodeId,
  nodes: Record<NodeId, MessageNode>
): MessageNode[] {
  const chain: MessageNode[] = [];
  let current = nodes[nodeId];
  while (current) {
    chain.unshift(current);
    current = current.parentId ? nodes[current.parentId] : undefined;
  }
  return chain;
}

/**
 * Gather context from multiple selected nodes.
 * Walks ancestor chains and deduplicates, returning unique nodes in topological order.
 */
export function gatherContextNodes(
  selectedIds: NodeId[],
  nodes: Record<NodeId, MessageNode>
): MessageNode[] {
  const visited = new Set<NodeId>();
  const result: MessageNode[] = [];

  // Collect all ancestors for each selected node
  for (const id of selectedIds) {
    const chain = getAncestorChain(id, nodes);
    for (const node of chain) {
      if (!visited.has(node.id)) {
        visited.add(node.id);
        result.push(node);
      }
    }
  }

  // Topological sort: since chains are root-first and we deduplicate,
  // we just need to sort by createdAt to get proper ordering
  result.sort((a, b) => a.createdAt - b.createdAt);
  return result;
}

/**
 * Get all nodes belonging to a conversation, organized as a tree.
 */
export function getConversationNodes(
  conversationId: string,
  nodes: Record<NodeId, MessageNode>
): MessageNode[] {
  return Object.values(nodes).filter(
    (n) => n.conversationId === conversationId
  );
}

/**
 * Find all leaf nodes (nodes with no children) in a conversation.
 */
export function getLeafNodes(
  conversationId: string,
  nodes: Record<NodeId, MessageNode>
): MessageNode[] {
  return getConversationNodes(conversationId, nodes).filter(
    (n) => n.childIds.length === 0
  );
}

```

---

## `src/lib/migrations/contextSourceMigration.ts`

```
import type { MessageNode, NodeId } from "@/types";
import { conversationRepo } from "@/lib/db";

/**
 * One-time migration: find user messages that were sent via multi-select
 * (identifiable by content like "which example") and backfill their
 * contextSourceIds from the tree structure.
 *
 * Heuristic: if a user node's parent is an assistant node, and that
 * assistant's parent has multiple assistant children, the user was likely
 * comparing those siblings. Set contextSourceIds to those sibling IDs.
 */
export async function migrateContextSourceIds(
  nodes: Record<NodeId, MessageNode>
): Promise<MessageNode[]> {
  const updated: MessageNode[] = [];

  for (const node of Object.values(nodes)) {
    // Only migrate user messages that don't already have contextSourceIds
    if (node.role !== "user") continue;
    if (node.contextSourceIds && node.contextSourceIds.length > 0) continue;

    // Look for the known multi-select message
    const lower = node.content.toLowerCase();
    if (!lower.includes("which example")) continue;

    // Parent should be an assistant node (the last selected node)
    const parent = node.parentId ? nodes[node.parentId] : undefined;
    if (!parent || parent.role !== "assistant") continue;

    // Grandparent: the user message that spawned the compared examples
    const grandparent = parent.parentId ? nodes[parent.parentId] : undefined;
    if (!grandparent) continue;

    // Sibling assistant nodes of the parent = the compared examples
    const siblingAssistants = grandparent.childIds
      .map((id) => nodes[id])
      .filter((n) => n && n.role === "assistant" && n.status === "complete")
      .map((n) => n.id);

    if (siblingAssistants.length < 2) continue;

    // Set contextSourceIds
    node.contextSourceIds = siblingAssistants;
    updated.push(node);
  }

  // Persist updated nodes
  if (updated.length > 0) {
    await conversationRepo.saveNodes(updated);
  }

  return updated;
}

```

---

## `src/lib/pricing.ts`

```
// Per-model pricing in cents per 1M tokens (our price with ~40% markup over cost)
interface ModelPricing {
  inputCentsPer1M: number;
  outputCentsPer1M: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  "gpt-4o": { inputCentsPer1M: 350, outputCentsPer1M: 1400 },
  "gpt-4o-mini": { inputCentsPer1M: 21, outputCentsPer1M: 84 },
  "gpt-4.1": { inputCentsPer1M: 280, outputCentsPer1M: 1120 },
  "gpt-4.1-mini": { inputCentsPer1M: 56, outputCentsPer1M: 224 },
  "gpt-4.1-nano": { inputCentsPer1M: 14, outputCentsPer1M: 56 },
  "o3": { inputCentsPer1M: 1400, outputCentsPer1M: 5600 },
  "o3-mini": { inputCentsPer1M: 154, outputCentsPer1M: 616 },
  "o4-mini": { inputCentsPer1M: 154, outputCentsPer1M: 616 },
  "gpt-4.5-preview": { inputCentsPer1M: 10500, outputCentsPer1M: 21000 },
  // Anthropic
  "claude-opus-4-6": { inputCentsPer1M: 2100, outputCentsPer1M: 10500 },
  "claude-sonnet-4-6": { inputCentsPer1M: 420, outputCentsPer1M: 2100 },
  "claude-haiku-4-5-20251001": { inputCentsPer1M: 112, outputCentsPer1M: 560 },
};

// Default pricing for unknown models (generous margin)
const DEFAULT_PRICING: ModelPricing = { inputCentsPer1M: 500, outputCentsPer1M: 2000 };

export function getPricing(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? DEFAULT_PRICING;
}

export function computeCostCents(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = getPricing(model);
  const inputCost = (promptTokens / 1_000_000) * pricing.inputCentsPer1M;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputCentsPer1M;
  return Math.ceil(inputCost + outputCost);
}

```

---

## `src/lib/prisma.ts`

```
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function makePrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || makePrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

```

---

## `src/lib/stripe.ts`

```
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
}

```

---

## `src/lib/theme/ThemeProvider.tsx`

```
"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { applyTheme } from "./themeConfig";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const provider = useSettingsStore((s) => s.activeProvider);
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    applyTheme(provider, theme);
  }, [provider, theme]);

  return <>{children}</>;
}

```

---

## `src/lib/theme/index.ts`

```
export { ThemeProvider } from "./ThemeProvider";
export { applyTheme, getThemePalette, getThemeVariant } from "./themeConfig";

```

---

## `src/lib/theme/themeConfig.ts`

```
import type { Provider } from "@/types";

export type ThemeVariant = "openai-light" | "openai-dark" | "anthropic-light" | "anthropic-dark";

interface ThemePalette {
  "--color-bg": string;
  "--color-bg-secondary": string;
  "--color-bg-tertiary": string;
  "--color-text": string;
  "--color-text-secondary": string;
  "--color-text-tertiary": string;
  "--color-accent": string;
  "--color-accent-hover": string;
  "--color-accent-light": string;
  "--color-border": string;
  "--color-border-light": string;
  "--color-node-user": string;
  "--color-node-assistant": string;
  "--color-node-user-text": string;
  "--color-node-assistant-text": string;
  "--color-edge": string;
  "--color-sidebar": string;
  "--color-compose": string;
  "--color-error": string;
  "--color-streaming": string;
}

const palettes: Record<ThemeVariant, ThemePalette> = {
  "openai-light": {
    "--color-bg": "#ffffff",
    "--color-bg-secondary": "#f7f7f8",
    "--color-bg-tertiary": "#ececf1",
    "--color-text": "#1a1a2e",
    "--color-text-secondary": "#6e6e80",
    "--color-text-tertiary": "#8e8ea0",
    "--color-accent": "#10a37f",
    "--color-accent-hover": "#0d8a6b",
    "--color-accent-light": "#e6f7f2",
    "--color-border": "#d9d9e3",
    "--color-border-light": "#ececf1",
    "--color-node-user": "#e6f7f2",
    "--color-node-assistant": "#f7f7f8",
    "--color-node-user-text": "#1a1a2e",
    "--color-node-assistant-text": "#1a1a2e",
    "--color-edge": "#d9d9e3",
    "--color-sidebar": "#f7f7f8",
    "--color-compose": "#ffffff",
    "--color-error": "#ef4444",
    "--color-streaming": "#10a37f",
  },
  "openai-dark": {
    "--color-bg": "#1a1a2e",
    "--color-bg-secondary": "#2a2a3e",
    "--color-bg-tertiary": "#3a3a4e",
    "--color-text": "#ececf1",
    "--color-text-secondary": "#8e8ea0",
    "--color-text-tertiary": "#6e6e80",
    "--color-accent": "#10a37f",
    "--color-accent-hover": "#14bf93",
    "--color-accent-light": "#1a3a30",
    "--color-border": "#3a3a4e",
    "--color-border-light": "#2a2a3e",
    "--color-node-user": "#1a3a30",
    "--color-node-assistant": "#2a2a3e",
    "--color-node-user-text": "#ececf1",
    "--color-node-assistant-text": "#ececf1",
    "--color-edge": "#3a3a4e",
    "--color-sidebar": "#16162a",
    "--color-compose": "#2a2a3e",
    "--color-error": "#ef4444",
    "--color-streaming": "#10a37f",
  },
  "anthropic-light": {
    "--color-bg": "#ffffff",
    "--color-bg-secondary": "#faf6f1",
    "--color-bg-tertiary": "#f0e8df",
    "--color-text": "#2d2017",
    "--color-text-secondary": "#7a6b5d",
    "--color-text-tertiary": "#9a8b7d",
    "--color-accent": "#c96442",
    "--color-accent-hover": "#b55638",
    "--color-accent-light": "#fdf0eb",
    "--color-border": "#e0d5c9",
    "--color-border-light": "#f0e8df",
    "--color-node-user": "#fdf0eb",
    "--color-node-assistant": "#faf6f1",
    "--color-node-user-text": "#2d2017",
    "--color-node-assistant-text": "#2d2017",
    "--color-edge": "#e0d5c9",
    "--color-sidebar": "#faf6f1",
    "--color-compose": "#ffffff",
    "--color-error": "#ef4444",
    "--color-streaming": "#c96442",
  },
  "anthropic-dark": {
    "--color-bg": "#1c1510",
    "--color-bg-secondary": "#2c2219",
    "--color-bg-tertiary": "#3c3229",
    "--color-text": "#f0e8df",
    "--color-text-secondary": "#9a8b7d",
    "--color-text-tertiary": "#7a6b5d",
    "--color-accent": "#d97a58",
    "--color-accent-hover": "#e68a66",
    "--color-accent-light": "#3c2a1f",
    "--color-border": "#3c3229",
    "--color-border-light": "#2c2219",
    "--color-node-user": "#3c2a1f",
    "--color-node-assistant": "#2c2219",
    "--color-node-user-text": "#f0e8df",
    "--color-node-assistant-text": "#f0e8df",
    "--color-edge": "#3c3229",
    "--color-sidebar": "#161110",
    "--color-compose": "#2c2219",
    "--color-error": "#ef4444",
    "--color-streaming": "#d97a58",
  },
};

export function getThemeVariant(provider: Provider, theme: "light" | "dark"): ThemeVariant {
  return `${provider}-${theme}` as ThemeVariant;
}

export function getThemePalette(variant: ThemeVariant): ThemePalette {
  return palettes[variant];
}

export function applyTheme(provider: Provider, theme: "light" | "dark"): void {
  const variant = getThemeVariant(provider, theme);
  const palette = getThemePalette(variant);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(palette)) {
    root.style.setProperty(key, value);
  }
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-provider", provider);
}

```

---

## `src/lib/usage.ts`

```
import { prisma } from "./prisma";
import { computeCostCents } from "./pricing";

const FREE_MESSAGE_LIMIT = 5;

export async function recordUsage(params: {
  userId: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}) {
  const costCents = computeCostCents(params.model, params.promptTokens, params.completionTokens);

  await prisma.usageRecord.create({
    data: {
      userId: params.userId,
      provider: params.provider,
      model: params.model,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      costCents,
    },
  });

  // Increment free message counter
  await prisma.user.update({
    where: { id: params.userId },
    data: { freeMessagesUsed: { increment: 1 } },
  });

  return costCents;
}

export async function getUserUsage(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const records = await prisma.usageRecord.findMany({
    where: { userId, createdAt: { gte: startOfMonth } },
    orderBy: { createdAt: "desc" },
  });

  const totalCents = records.reduce((sum, r) => sum + r.costCents, 0);
  const totalPromptTokens = records.reduce((sum, r) => sum + r.promptTokens, 0);
  const totalCompletionTokens = records.reduce((sum, r) => sum + r.completionTokens, 0);

  return {
    records,
    totalCents,
    totalPromptTokens,
    totalCompletionTokens,
    messageCount: records.length,
  };
}

export async function checkQuota(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { freeMessagesUsed: true, stripeCustomerId: true },
  });

  if (!user) return { allowed: false, reason: "User not found" };

  // Has payment method → unlimited
  if (user.stripeCustomerId) return { allowed: true };

  // Within free tier
  if (user.freeMessagesUsed < FREE_MESSAGE_LIMIT) return { allowed: true };

  return {
    allowed: false,
    reason: `Free tier limit reached (${FREE_MESSAGE_LIMIT} messages). Add a payment method to continue.`,
  };
}

```

---

## `src/middleware.ts`

```
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|features|api/auth).*)"],
};

```

---

## `src/stores/conversationStore.ts`

```
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type {
  Conversation,
  ConversationId,
  MessageNode,
  NodeId,
  Provider,
  NodeStatus,
} from "@/types";
import { conversationRepo } from "@/lib/db";

interface ConversationState {
  conversations: Record<ConversationId, Conversation>;
  nodes: Record<NodeId, MessageNode>;
  activeConversationId: ConversationId | null;

  // Actions
  loadConversations: () => Promise<void>;
  loadConversation: (id: ConversationId) => Promise<void>;
  createConversation: (provider: Provider, model: string) => ConversationId;
  deleteConversation: (id: ConversationId) => Promise<void>;
  setActiveConversation: (id: ConversationId | null) => void;
  updateConversationTitle: (id: ConversationId, title: string) => void;

  addUserMessage: (
    conversationId: ConversationId,
    parentId: NodeId | null,
    content: string,
    provider: Provider,
    model: string
  ) => NodeId;

  addAssistantNode: (
    conversationId: ConversationId,
    parentId: NodeId,
    provider: Provider,
    model: string
  ) => NodeId;

  appendToNode: (nodeId: NodeId, chunk: string) => void;
  setNodeStatus: (nodeId: NodeId, status: NodeStatus) => void;
  setNodeContent: (nodeId: NodeId, content: string) => void;
  persistNode: (nodeId: NodeId) => Promise<void>;

  getActiveConversation: () => Conversation | null;
  getAncestorChain: (nodeId: NodeId) => MessageNode[];
}

export const useConversationStore = create<ConversationState>()(
  immer((set, get) => ({
    conversations: {},
    nodes: {},
    activeConversationId: null,

    async loadConversations() {
      const convs = await conversationRepo.listConversations();
      set((state) => {
        for (const c of convs) {
          state.conversations[c.id] = c;
        }
      });
    },

    async loadConversation(id) {
      const nodes = await conversationRepo.getNodesForConversation(id);
      set((state) => {
        for (const n of nodes) {
          state.nodes[n.id] = n;
        }
        state.activeConversationId = id;
      });
    },

    createConversation(provider, model) {
      const id = nanoid();
      const conv: Conversation = {
        id,
        title: "New Chat",
        rootNodeId: null,
        defaultProvider: provider,
        defaultModel: model,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      set((state) => {
        state.conversations[id] = conv;
        state.activeConversationId = id;
      });
      conversationRepo.saveConversation(conv);
      return id;
    },

    async deleteConversation(id) {
      await conversationRepo.deleteConversation(id);
      set((state) => {
        delete state.conversations[id];
        // Remove nodes belonging to this conversation
        for (const [nodeId, node] of Object.entries(state.nodes)) {
          if (node.conversationId === id) {
            delete state.nodes[nodeId];
          }
        }
        if (state.activeConversationId === id) {
          state.activeConversationId = null;
        }
      });
    },

    setActiveConversation(id) {
      set({ activeConversationId: id });
    },

    updateConversationTitle(id, title) {
      set((state) => {
        if (state.conversations[id]) {
          state.conversations[id].title = title;
          state.conversations[id].updatedAt = Date.now();
        }
      });
      const conv = get().conversations[id];
      if (conv) conversationRepo.saveConversation(conv);
    },

    addUserMessage(conversationId, parentId, content, provider, model) {
      const id = nanoid();
      const node: MessageNode = {
        id,
        conversationId,
        parentId,
        childIds: [],
        role: "user",
        content,
        attachments: [],
        provider,
        model,
        status: "complete",
        createdAt: Date.now(),
      };

      set((state) => {
        state.nodes[id] = node;
        if (parentId && state.nodes[parentId]) {
          state.nodes[parentId].childIds.push(id);
        }
        // Set as root if no parent
        if (!parentId && state.conversations[conversationId]) {
          state.conversations[conversationId].rootNodeId = id;
          state.conversations[conversationId].updatedAt = Date.now();
        }
      });

      // Persist
      conversationRepo.saveNode(node);
      if (parentId) {
        const parent = get().nodes[parentId];
        if (parent) conversationRepo.saveNode(parent);
      }
      const conv = get().conversations[conversationId];
      if (conv) conversationRepo.saveConversation(conv);

      return id;
    },

    addAssistantNode(conversationId, parentId, provider, model) {
      const id = nanoid();
      const node: MessageNode = {
        id,
        conversationId,
        parentId,
        childIds: [],
        role: "assistant",
        content: "",
        attachments: [],
        provider,
        model,
        status: "streaming",
        createdAt: Date.now(),
      };

      set((state) => {
        state.nodes[id] = node;
        if (state.nodes[parentId]) {
          state.nodes[parentId].childIds.push(id);
        }
      });

      return id;
    },

    appendToNode(nodeId, chunk) {
      set((state) => {
        if (state.nodes[nodeId]) {
          state.nodes[nodeId].content += chunk;
        }
      });
    },

    setNodeStatus(nodeId, status) {
      set((state) => {
        if (state.nodes[nodeId]) {
          state.nodes[nodeId].status = status;
        }
      });
    },

    setNodeContent(nodeId, content) {
      set((state) => {
        if (state.nodes[nodeId]) {
          state.nodes[nodeId].content = content;
        }
      });
    },

    async persistNode(nodeId) {
      const node = get().nodes[nodeId];
      if (node) {
        await conversationRepo.saveNode(node);
      }
    },

    getActiveConversation() {
      const { activeConversationId, conversations } = get();
      if (!activeConversationId) return null;
      return conversations[activeConversationId] ?? null;
    },

    getAncestorChain(nodeId) {
      const { nodes } = get();
      const chain: MessageNode[] = [];
      let current: MessageNode | undefined = nodes[nodeId];
      while (current) {
        chain.unshift(current);
        current = current.parentId ? nodes[current.parentId] : undefined;
      }
      return chain;
    },
  }))
);

```

---

## `src/stores/selectionStore.ts`

```
import { create } from "zustand";
import type { NodeId } from "@/types";

interface SelectionState {
  selectedNodeIds: Set<NodeId>;
  toggleNode: (id: NodeId) => void;
  selectNode: (id: NodeId) => void;
  clearSelection: () => void;
  setSelection: (ids: NodeId[]) => void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  selectedNodeIds: new Set<NodeId>(),

  toggleNode: (id) =>
    set((state) => {
      const next = new Set(state.selectedNodeIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedNodeIds: next };
    }),

  selectNode: (id) => set({ selectedNodeIds: new Set([id]) }),

  clearSelection: () => set({ selectedNodeIds: new Set() }),

  setSelection: (ids) => set({ selectedNodeIds: new Set(ids) }),
}));

```

---

## `src/stores/settingsStore.ts`

```
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Provider, GenerationParams } from "@/types";
import { getDefaultModel } from "@/types";

interface SettingsState {
  openaiApiKey: string;
  anthropicApiKey: string;
  activeProvider: Provider;
  activeModel: string;
  generationParams: GenerationParams;
  theme: "light" | "dark";

  setOpenaiApiKey: (key: string) => void;
  setAnthropicApiKey: (key: string) => void;
  setActiveProvider: (provider: Provider) => void;
  setActiveModel: (model: string) => void;
  setGenerationParams: (params: Partial<GenerationParams>) => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      openaiApiKey: "",
      anthropicApiKey: "",
      activeProvider: "openai",
      activeModel: "gpt-4o",
      generationParams: {
        temperature: 1,
        maxTokens: 4096,
      },
      theme: "light",

      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
      setAnthropicApiKey: (key) => set({ anthropicApiKey: key }),
      setActiveProvider: (provider) =>
        set({ activeProvider: provider, activeModel: getDefaultModel(provider) }),
      setActiveModel: (model) => set({ activeModel: model }),
      setGenerationParams: (params) =>
        set((state) => ({
          generationParams: { ...state.generationParams, ...params },
        })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "branchgpt-settings" }
  )
);

```

---

## `src/stores/uiStore.ts`

```
import { create } from "zustand";
import type { LayoutMode } from "@/types";

interface UIState {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  layoutMode: LayoutMode;
  composeParentId: string | null;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setComposeParentId: (id: string | null) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  settingsOpen: false,
  layoutMode: "reactflow",
  composeParentId: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setComposeParentId: (id) => set({ composeParentId: id }),
}));

```

---

## `src/types/conversation.ts`

```
export type NodeId = string;
export type ConversationId = string;
export type Provider = "openai" | "anthropic";
export type Role = "system" | "user" | "assistant";
export type NodeStatus = "pending" | "streaming" | "complete" | "error";

export interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  /** base64-encoded data */
  data: string;
  width?: number;
  height?: number;
}

export interface MessageNode {
  id: NodeId;
  conversationId: ConversationId;
  parentId: NodeId | null;
  childIds: NodeId[];
  role: Role;
  content: string;
  attachments: Attachment[];
  provider: Provider;
  model: string;
  generationParams?: GenerationParams;
  usage?: TokenUsage;
  status: NodeStatus;
  createdAt: number;
}

export interface GenerationParams {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  systemPrompt?: string;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface Conversation {
  id: ConversationId;
  title: string;
  rootNodeId: NodeId | null;
  defaultProvider: Provider;
  defaultModel: string;
  createdAt: number;
  updatedAt: number;
}

```

---

## `src/types/graph.ts`

```
import type { Node, Edge } from "@xyflow/react";
import type { MessageNode as MessageNodeType } from "./conversation";

export interface MessageNodeData extends Record<string, unknown> {
  message: MessageNodeType;
  isSelected: boolean;
  isOnActivePath: boolean;
  isContextNode: boolean;
  onBranch: (nodeId: string) => void;
}

export type FlowMessageNode = Node<MessageNodeData, "message">;

export interface ComposeNodeData extends Record<string, unknown> {
  parentNodeId: string | null;
}

export type FlowComposeNode = Node<ComposeNodeData, "compose">;

export type FlowNode = FlowMessageNode | FlowComposeNode;
export type FlowEdge = Edge;

export type LayoutMode = "reactflow" | "d3force";

```

---

## `src/types/index.ts`

```
export * from "./conversation";
export * from "./providers";
export * from "./graph";

```

---

## `src/types/providers.ts`

```
import type { Provider, GenerationParams } from "./conversation";

export interface ModelOption {
  id: string;
  name: string;
  provider: Provider;
  supportsVision: boolean;
  maxContextTokens: number;
}

export const OPENAI_MODELS: ModelOption[] = [
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", supportsVision: true, maxContextTokens: 128000 },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", supportsVision: true, maxContextTokens: 128000 },
  { id: "gpt-4.1", name: "GPT-4.1", provider: "openai", supportsVision: true, maxContextTokens: 1047576 },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "openai", supportsVision: true, maxContextTokens: 1047576 },
  { id: "o3-mini", name: "o3-mini", provider: "openai", supportsVision: false, maxContextTokens: 200000 },
];

export const ANTHROPIC_MODELS: ModelOption[] = [
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "anthropic", supportsVision: true, maxContextTokens: 200000 },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic", supportsVision: true, maxContextTokens: 200000 },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "anthropic", supportsVision: true, maxContextTokens: 200000 },
];

export const ALL_MODELS = [...OPENAI_MODELS, ...ANTHROPIC_MODELS];

export function getModelsForProvider(provider: Provider): ModelOption[] {
  return provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;
}

export function getDefaultModel(provider: Provider): string {
  return provider === "openai" ? "gpt-4o" : "claude-sonnet-4-6";
}

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  provider: Provider;
  generationParams: GenerationParams;
  apiKey: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: "text" | "image_url" | "image";
  text?: string;
  image_url?: { url: string };
  source?: { type: "base64"; media_type: string; data: string };
}

```

