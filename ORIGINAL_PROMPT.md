# BranchGPT

Branching conversation UI for ChatGPT and Claude.

A visual, tree-based interface for AI conversations. Fork any message to explore alternative paths, compare models side-by-side, and navigate your chat history as an interactive graph.

## Features

- **Branching conversations** — Fork any message to explore alternative responses
- **Multi-select context** — Cmd+click nodes from different branches as context for a single prompt
- **Visual tree** — See your full conversation as an interactive graph (React Flow tree or D3 force-directed)
- **Multi-provider** — Switch between OpenAI and Anthropic mid-conversation
- **Collapse & hide** — Collapse long messages or hide entire branches
- **Bring your own key** — Use your own API keys or use managed pay-as-you-go

## Stack

- Next.js 16 (App Router)
- React 19
- Zustand (state management)
- Dexie/IndexedDB (local persistence)
- React Flow + D3 Force (visualization)
- OpenAI + Anthropic SDKs
- NextAuth.js v5 (authentication)
- Prisma + Neon Postgres (server-side)
- Stripe (billing)
- Tailwind CSS 4
