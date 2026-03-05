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
