# DropRoute

> **A CLI that performs a verifiable, inspectable AST-based code transformation that wires a complete referral attribution pipeline into any Expo Router app — then shows you which acquisition sources actually produce activated users, in real time.**

---

## What it does

DropRoute is a developer tool for mobile growth. Run one command against any Expo Router project and it:

1. **Validates** the target is an Expo Router project on a clean git working tree
2. **Analyses** the project structure using an AI call to identify the root layout and first screen
3. **Injects** an attribution SDK using AST-based transformations (ts-morph) — no regex, no string replacement, always semantic code edits
4. **Redirects** users from a generated referral link through the server to your app via deep link, with query params attached
5. **Records** attribution events in Postgres (via Supabase) every time a referred user opens the app or completes onboarding
6. **Shows** live attribution data in the dashboard — which sources produce the most activated users
7. **Recommends** one concrete change based on the actual numbers, using Claude via OpenRouter

---

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/Xconmax245/Droproute
cd droproute
pnpm install

# 2. Configure environment
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY, SERVER_PUBLIC_URL

# 3. Run migrations (Supabase SQL Editor)
#    Copy and run: packages/server/migrations/001_initial_schema.sql

# 4. Start everything
npm run dev

# 5. Run the CLI against the included demo app
node packages/cli/dist/index.js inject demo-app/

# 6. Open the generated referral link on a device, watch events appear live
```



## Architecture

```
droproute/
  packages/
    cli/          Commander CLI — inject, status, dry-run
    codemod/      ts-morph AST engine + manifest system
    server/       Fastify + Supabase + OpenRouter (AI)
    dashboard/    Next.js 14 + Framer Motion live dashboard
  demo-app/       Plain Expo Router app (the injection target)
  .env.example    All required env vars
```

---

## AI calls (exactly two)

| | Where | Input | Output |
|---|---|---|---|
| **§5.1** | `droproute inject` CLI | Project file tree + layout + first screen | `{rootLayoutPath, firstScreenPath, hasExistingConditional, rationale}` — validated by Zod |
| **§5.2** | `POST /api/recommendation` | Live activation score table | 1-2 sentences + one concrete suggestion — gated on ≥5 real events |

---

## Activation score formula

For each `source`, across all referral codes tied to that source:

```
installs        = count(distinct referral_code WHERE events contain 'app_open')
activations     = count(distinct referral_code WHERE events contain 'completed_onboarding')
activation_rate = activations / installs   (null if installs = 0)
```

Sources are ranked by `activation_rate` descending. The dashboard shows `—` where rate is null.

---

## What DropRoute is NOT

- Not an LLM that generates marketing copy
- Not a self-rewriting module (the AI outputs structured data, not code diffs)
- Not multi-framework (Expo Router only, by design)
- Not a SaaS billing system or campaign builder
