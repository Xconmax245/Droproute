# DropRoute

> **A CLI that takes a real Expo Router app and performs a verifiable, inspectable AST-based code transformation that wires in a working referral/attribution growth system — plus a dashboard that shows which acquisition sources are actually producing activated users.**

---

## Demo quick-start

```bash
# 1. Clone & install
git clone https://github.com/your-org/droproute
cd droproute
pnpm install

# 2. Configure environment
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, SERVER_PUBLIC_URL

# 3. Run SQL migrations in your Supabase project (Settings → SQL Editor)
#    Copy packages/server/migrations/001_initial_schema.sql

# 4. Start the server
cd packages/server && pnpm dev

# 5. Start the dashboard
cd packages/dashboard && npm run dev

# 6. Dry-run the injection against the demo app
node packages/cli/dist/index.js inject --dry-run demo-app/

# 7. Apply the injection
node packages/cli/dist/index.js inject demo-app/

# 8. (Optional) Seed demo data for Judge Mode
pnpm seed:judge-mode
```

---

## What it does

DropRoute is a developer tool for mobile growth. You point it at an Expo Router app and it:

1. **Validates** the target is an Expo Router project on a clean git working tree
2. **Analyses** the project structure using an AI call (Claude) to identify the root layout and first screen
3. **Injects** an attribution SDK using AST-based transformations (ts-morph) — never regex, never string replacement, always semantic code edits
4. **Redirects** users from a generated referral link through the server to your app via deep link, with query params attached
5. **Records** attribution events in Postgres (via Supabase) every time a referred user opens the app or completes onboarding
6. **Shows** live attribution data in the dashboard — which sources produce the most activated users, per the formula below
7. **Recommends** one concrete change based on the actual live numbers, using Claude

---

## Build order (executed)

Per directive §9:

1. ✅ `packages/codemod` + `packages/cli` → acceptance test passed
2. ✅ `packages/server` — schema, all endpoints
3. 🔲 Wire CLI attribution SDK to deployed server → real device test
4. 🔲 `packages/dashboard` → leaderboard + live feed against real data
5. 🔲 `droproute status` / `rollback`
6. 🔲 §5.1 AI injection-point analysis retrofit
7. 🔲 §5.2 recommendation endpoint + dashboard button
8. 🔲 Judge Mode seeding
9. 🔲 Full demo script dry runs (×2)

---

## Activation score formula (§6.3)

For each `source`, across all referral codes tied to that source:

```
installs       = count(distinct referral_code WHERE events contain 'app_open')
activations    = count(distinct referral_code WHERE events contain 'completed_onboarding')
activation_rate = activations / installs   (null if installs = 0)
```

Sources are ranked by `activation_rate` descending. The dashboard shows `—` where rate is null.

---

## AI call sites (exactly two — §5)

| | Where | Input | Output | Validates |
|---|---|---|---|---|
| **§5.1** | `droproute inject` (CLI) | `/app` file tree + layout + first screen text | `{rootLayoutPath, firstScreenPath, hasExistingConditional, rationale}` | zod schema, retry once |
| **§5.2** | `POST /api/recommendation` (server) | Live activation score table | 1-2 sentences + one concrete suggestion | Threshold: ≥5 events |

---

## Monorepo structure

```
droproute/
  packages/
    cli/        commander, chalk, ora, boxen, diff
    codemod/    ts-morph AST engine + manifest system
    server/     Fastify + Supabase + Anthropic
    dashboard/  Next.js 14, Tailwind, Framer Motion
  demo-app/     Plain Expo Router app (the injection target)
  seed/         Judge Mode data generator
  .env.example  All required env vars
  README.md
  QUESTIONNAIRE.md
```

---

## What DropRoute is NOT

- Not an LLM that generates marketing copy
- Not a self-rewriting module (the AI outputs *structured data*, not code diffs)
- Not multi-framework (Expo Router only, by design)
- Not a SaaS billing system or campaign builder
